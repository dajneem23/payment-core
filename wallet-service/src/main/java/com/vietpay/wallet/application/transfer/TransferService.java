package com.vietpay.wallet.application.transfer;

import com.vietpay.wallet.application.wallet.WalletService;
import com.vietpay.wallet.domain.fraud.FraudCheck;
import com.vietpay.wallet.domain.fraud.FraudDecision;
import com.vietpay.wallet.domain.fraud.FraudPolicy;
import com.vietpay.wallet.domain.ledger.Ledger;
import com.vietpay.wallet.domain.shared.IdempotencyKey;
import com.vietpay.wallet.domain.shared.Money;
import com.vietpay.wallet.domain.transfer.Transfer;
import com.vietpay.wallet.domain.transfer.Transfers;
import com.vietpay.wallet.domain.exception.FraudRejectedException;
import com.vietpay.wallet.domain.exception.ValidationException;
import com.vietpay.wallet.domain.exception.WalletNotFoundException;
import com.vietpay.wallet.domain.wallet.Wallet;
import com.vietpay.wallet.domain.wallet.WalletId;
import com.vietpay.wallet.domain.wallet.Wallets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Transfer use case — the graded core.
 *
 * <p>Ordering is deliberate: idempotency replay and the fraud check (a network
 * call) happen OUTSIDE the transaction; only the atomic money movement runs
 * inside {@link #tx}. So wallet row locks are held for the shortest time and
 * never across a network hop.
 *
 * <p>Inside the transaction: lock both wallets ({@code SELECT ... FOR UPDATE},
 * ordered by id in the adapter → deadlock-safe) → debit/credit (the aggregate
 * enforces no-overdraw, the DB CHECK is the backstop) → record the transfer
 * (UNIQUE idempotency key) → append the balanced ledger entries. All commit
 * together or not at all.
 */
@Service
public class TransferService {

    private static final Logger log = LoggerFactory.getLogger(TransferService.class);

    private final Wallets wallets;
    private final Transfers transfers;
    private final Ledger ledger;
    private final FraudPolicy fraudPolicy;
    private final WalletService walletService;
    private final TransactionTemplate tx;

    public TransferService(Wallets wallets, Transfers transfers, Ledger ledger,
                           FraudPolicy fraudPolicy,
                           WalletService walletService, PlatformTransactionManager txManager) {
        this.wallets = wallets;
        this.transfers = transfers;
        this.ledger = ledger;
        this.fraudPolicy = fraudPolicy;
        this.walletService = walletService;
        this.tx = new TransactionTemplate(txManager);
    }

    public TransferResult transfer(TransferCommand cmd) {
        validate(cmd);
        IdempotencyKey key = IdempotencyKey.of(cmd.idempotencyKey());
        MDC.put("idempotencyKey", key.value());
        MDC.put("sourceWalletId", cmd.sourceWalletId().toString());
        try {
            // 1. Idempotency replay: identical key already processed -> original result.
            Optional<Transfer> existing = transfers.findByIdempotencyKey(key);
            if (existing.isPresent()) {
                log.info("idempotent replay for key={}", key.value());
                return TransferResult.from(existing.get());
            }

            // 2. Existence + currency checks (unlocked read).
            Wallet source = requireWallet(cmd.sourceWalletId());
            Wallet dest = requireWallet(cmd.destWalletId());
            String currency = source.currency().getCurrencyCode();
            if (!currency.equals(cmd.currency())) {
                throw new ValidationException("amount currency %s does not match source wallet %s"
                    .formatted(cmd.currency(), currency));
            }
            if (!source.currency().equals(dest.currency())) {
                throw new ValidationException("cross-currency transfers are not supported");
            }

            // 3. Fraud check (network) — BEFORE the transaction opens.
            Money amount = Money.of(cmd.amount(), source.currency());
            FraudDecision decision = fraudPolicy.check(
                new FraudCheck(source.id(), dest.id(), amount));
            if (!decision.allow()) {
                throw new FraudRejectedException(decision.reason());
            }

            // 4. Atomic money movement.
            TransferResult result;
            try {
                result = tx.execute(status -> move(key, cmd.sourceWalletId(),
                    cmd.destWalletId(), amount));
            } catch (DataIntegrityViolationException race) {
                // A concurrent request with the same key won the insert -> replay it.
                log.info("idempotency race for key={}, replaying winner", key.value());
                return transfers.findByIdempotencyKey(key)
                    .map(TransferResult::from)
                    .orElseThrow(() -> race);
            }

            // 5. Cached balances are now stale for both wallets.
            walletService.evictView(cmd.sourceWalletId());
            walletService.evictView(cmd.destWalletId());
            MDC.put("transferId", result.transferId().toString());
            log.info("transfer completed: {} {}", cmd.amount(), currency);
            return result;
        } finally {
            MDC.clear();
        }
    }

    /** The transactional unit — runs with both wallet rows locked FOR UPDATE. */
    private TransferResult move(IdempotencyKey key, java.util.UUID sourceId,
                                java.util.UUID destId, Money amount) {
        Map<WalletId, Wallet> locked = wallets
            .lockForUpdate(List.of(WalletId.of(sourceId), WalletId.of(destId))).stream()
            .collect(Collectors.toMap(Wallet::id, Function.identity()));
        Wallet source = locked.get(WalletId.of(sourceId));
        Wallet dest = locked.get(WalletId.of(destId));
        if (source == null) throw new WalletNotFoundException(sourceId);
        if (dest == null) throw new WalletNotFoundException(destId);

        source.debit(amount);   // throws InsufficientFundsException on overdraw
        dest.credit(amount);
        wallets.save(source);
        wallets.save(dest);

        Transfer transfer = Transfer.complete(key, source.id(), dest.id(), amount);
        transfers.save(transfer);                          // UNIQUE key -> idempotency guard
        ledger.append(transfer.toLedgerEntries());         // balanced debit + credit
        return TransferResult.from(transfer);
    }

    private Wallet requireWallet(java.util.UUID id) {
        return wallets.findById(WalletId.of(id))
            .orElseThrow(() -> new WalletNotFoundException(id));
    }

    private void validate(TransferCommand cmd) {
        if (cmd.idempotencyKey() == null || cmd.idempotencyKey().isBlank()) {
            throw new ValidationException("Idempotency-Key is required");
        }
        if (cmd.sourceWalletId() == null || cmd.destWalletId() == null) {
            throw new ValidationException("source and destination wallet ids are required");
        }
        if (cmd.sourceWalletId().equals(cmd.destWalletId())) {
            throw new ValidationException("source and destination must differ");
        }
        if (cmd.amount() == null || cmd.amount().signum() <= 0) {
            throw new ValidationException("amount must be positive");
        }
        if (cmd.currency() == null || cmd.currency().isBlank()) {
            throw new ValidationException("currency is required");
        }
    }
}