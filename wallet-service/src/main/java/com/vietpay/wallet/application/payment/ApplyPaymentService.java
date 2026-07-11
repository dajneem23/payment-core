package com.vietpay.wallet.application.payment;

import com.vietpay.wallet.application.wallet.WalletService;
import com.vietpay.wallet.domain.exception.ValidationException;
import com.vietpay.wallet.domain.exception.WalletNotFoundException;
import com.vietpay.wallet.domain.ledger.Ledger;
import com.vietpay.wallet.domain.ledger.LedgerEntry;
import com.vietpay.wallet.domain.ledger.SourceType;
import com.vietpay.wallet.domain.payment.AppliedPayments;
import com.vietpay.wallet.domain.shared.Money;
import com.vietpay.wallet.domain.wallet.Wallet;
import com.vietpay.wallet.domain.wallet.WalletId;
import com.vietpay.wallet.domain.wallet.Wallets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Applies the MONEY effect of a settled card top-up: DEBIT the SYSTEM
 * {@code card_clearing} account, CREDIT the user wallet — the double-entry that
 * keeps external card money reconcilable. This is the wallet-service half of the
 * card flow; the gateway owns the payment lifecycle and publishes the settled
 * fact on Kafka.
 *
 * <p>Exactly-once under at-least-once delivery: the transaction first checks the
 * {@link AppliedPayments} guard, and writes the guard row alongside the ledger
 * entries, so a redelivered {@code PaymentCaptured} posts nothing twice. The
 * locking/debit/credit shape mirrors {@code TransferService.move}.
 */
@Service
public class ApplyPaymentService {

    private static final Logger log = LoggerFactory.getLogger(ApplyPaymentService.class);

    /** SYSTEM card-clearing account seeded in V3 (external counter-account). */
    private static final WalletId CARD_CLEARING =
        WalletId.of(UUID.fromString("00000000-0000-0000-0000-000000000001"));

    private final Wallets wallets;
    private final Ledger ledger;
    private final AppliedPayments appliedPayments;
    private final WalletService walletService;
    private final TransactionTemplate tx;

    public ApplyPaymentService(Wallets wallets, Ledger ledger, AppliedPayments appliedPayments,
                               WalletService walletService, PlatformTransactionManager txManager) {
        this.wallets = wallets;
        this.ledger = ledger;
        this.appliedPayments = appliedPayments;
        this.walletService = walletService;
        this.tx = new TransactionTemplate(txManager);
    }

    /** Post the top-up's double-entry, idempotently. Safe to call repeatedly for
     *  the same payment id — subsequent calls are no-ops. */
    public void applyCapturedTopup(CapturedPayment cmd) {
        MDC.put("paymentId", cmd.paymentId().toString());
        try {
            boolean applied = Boolean.TRUE.equals(tx.execute(status -> post(cmd)));
            if (applied) {
                walletService.evictView(cmd.walletId());   // cached balance is now stale
                log.info("card top-up applied: {} {} -> wallet {}",
                    cmd.amount(), cmd.currency(), cmd.walletId());
            }
        } finally {
            MDC.clear();
        }
    }

    /** @return true if this call posted the entries; false if already applied. */
    private boolean post(CapturedPayment cmd) {
        if (appliedPayments.isApplied(cmd.paymentId())) {
            log.info("payment {} already applied — skipping", cmd.paymentId());
            return false;
        }

        Map<WalletId, Wallet> locked = wallets
            .lockForUpdate(List.of(CARD_CLEARING, WalletId.of(cmd.walletId()))).stream()
            .collect(Collectors.toMap(Wallet::id, Function.identity()));
        Wallet clearing = locked.get(CARD_CLEARING);
        Wallet wallet = locked.get(WalletId.of(cmd.walletId()));
        if (clearing == null) {
            throw new IllegalStateException("card_clearing account missing — database not seeded?");
        }
        if (wallet == null) {
            throw new WalletNotFoundException(cmd.walletId());
        }
        if (!wallet.currency().getCurrencyCode().equals(cmd.currency())) {
            throw new ValidationException("payment currency %s does not match wallet %s"
                .formatted(cmd.currency(), wallet.currency().getCurrencyCode()));
        }

        Money amount = Money.of(cmd.amount(), cmd.currency());
        clearing.debit(amount);   // SYSTEM — exempt from balance>=0, swings negative
        wallet.credit(amount);
        wallets.save(clearing);
        wallets.save(wallet);

        ledger.append(List.of(
            LedgerEntry.debit(cmd.paymentId(), SourceType.PAYMENT, clearing.id(), amount),
            LedgerEntry.credit(cmd.paymentId(), SourceType.PAYMENT, wallet.id(), amount)));
        appliedPayments.markApplied(cmd.paymentId());
        return true;
    }
}
