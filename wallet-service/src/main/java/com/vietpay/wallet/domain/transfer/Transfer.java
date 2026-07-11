package com.vietpay.wallet.domain.transfer;

import com.vietpay.wallet.domain.ledger.LedgerEntry;
import com.vietpay.wallet.domain.ledger.SourceType;
import com.vietpay.wallet.domain.shared.AggregateRoot;
import com.vietpay.wallet.domain.shared.IdempotencyKey;
import com.vietpay.wallet.domain.shared.Money;
import com.vietpay.wallet.domain.wallet.WalletId;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Transfer aggregate root — the record that a specific money movement happened.
 *
 * <p>Scope (kept intentionally simple): a transfer is <b>same-currency</b>. The
 * amount, source and destination therefore share one currency, so the two
 * ledger entries it produces are equal and opposite and always balance. FX is
 * out of scope (documented as future work) precisely so the ledger is provably
 * correct.
 *
 * <p>Boundary note: the aggregate does NOT touch {@code Wallet} balances — that
 * would reach across aggregate boundaries. It records the fact, knows how the
 * fact maps to ledger entries ({@link #toLedgerEntries()}), and raises
 * {@link TransferCompleted}. The application service performs the wallet debits
 * and credits on the locked wallets and appends these entries.
 */
public class Transfer extends AggregateRoot {

    private final TransferId id;
    private final IdempotencyKey idempotencyKey;
    private final WalletId sourceWalletId;
    private final WalletId destWalletId;
    private final Money amount;
    private final TransferStatus status;
    private final String remark;
    private final Instant timestamp;

    private Transfer(TransferId id, IdempotencyKey idempotencyKey, WalletId sourceWalletId,
                     WalletId destWalletId, Money amount, TransferStatus status,
                     String remark, Instant timestamp) {
        this.id = id;
        this.idempotencyKey = idempotencyKey;
        this.sourceWalletId = sourceWalletId;
        this.destWalletId = destWalletId;
        this.amount = amount;
        this.status = status;
        this.remark = remark;
        this.timestamp = timestamp;
    }

    /**
     * Record a completed transfer and raise {@link TransferCompleted}.
     * Invariants (self-transfer, positive amount) are enforced here so an
     * invalid transfer can never exist.
     */
    public static Transfer complete(IdempotencyKey key, WalletId source, WalletId dest,
                                    Money amount, String sourceUserId, String destUserId,String remark) {
        if (source.equals(dest)) {
            throw new IllegalArgumentException("source and destination must differ");
        }
        if (!amount.isPositive()) {
            throw new IllegalArgumentException("transfer amount must be positive");
        }
        TransferId id = TransferId.newId();
        Instant now = Instant.now();
        Transfer transfer = new Transfer(id, key, source, dest, amount,
            TransferStatus.COMPLETED, remark, now);
        transfer.registerEvent(new TransferCompleted(
            UUID.randomUUID(), id, source, dest, sourceUserId, destUserId, amount, now, remark));
        return transfer;
    }

    /** Rehydrate from persisted state (used by the persistence adapter). No
     *  event is raised — this is not a new occurrence. */
    public static Transfer rehydrate(TransferId id, IdempotencyKey key, WalletId source,
                                     WalletId dest, Money amount, TransferStatus status,
                                     String remark, Instant timestamp) {
        return new Transfer(id, key, source, dest, amount, status, remark, timestamp);
    }

    /**
     * The double-entry posting for this transfer: debit the source, credit the
     * destination, same amount and currency. Equal and opposite — always balances.
     */
    public List<LedgerEntry> toLedgerEntries() {
        return List.of(
            LedgerEntry.debit(id.value(), SourceType.TRANSFER, sourceWalletId, amount),
            LedgerEntry.credit(id.value(), SourceType.TRANSFER, destWalletId, amount));
    }

    public TransferId id() {
        return id;
    }

    public IdempotencyKey idempotencyKey() {
        return idempotencyKey;
    }

    public WalletId sourceWalletId() {
        return sourceWalletId;
    }

    public WalletId destWalletId() {
        return destWalletId;
    }

    public Money amount() {
        return amount;
    }

    public TransferStatus status() {
        return status;
    }

    public String remark() {
        return remark;
    }

    public Instant timestamp() {
        return timestamp;
    }
}
