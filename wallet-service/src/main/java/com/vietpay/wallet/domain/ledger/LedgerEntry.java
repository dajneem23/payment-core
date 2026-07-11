package com.vietpay.wallet.domain.ledger;

import com.vietpay.wallet.domain.shared.Money;
import com.vietpay.wallet.domain.wallet.WalletId;

import java.util.Objects;
import java.util.UUID;

/**
 * Immutable ledger entry — one side of a double-entry posting.
 *
 * <p>An entry is always tied to the movement that produced it (a transfer or a
 * payment) via {@code sourceRef}, so history is fully traceable. Entries are
 * created by the domain (see {@link com.vietpay.wallet.domain.transfer.Transfer})
 * and appended through the {@link Ledger} port — they are never mutated.
 */
public record LedgerEntry(
    UUID id,
    UUID sourceRef,          // transfer id or payment id that caused this entry
    SourceType sourceType,   // which kind of source the ref points at
    WalletId walletId,
    Direction direction,
    Money amount
) {

    public LedgerEntry {
        Objects.requireNonNull(sourceRef, "sourceRef");
        Objects.requireNonNull(sourceType, "sourceType");
        Objects.requireNonNull(walletId, "walletId");
        Objects.requireNonNull(direction, "direction");
        Objects.requireNonNull(amount, "amount");
        if (!amount.isPositive()) {
            throw new IllegalArgumentException("ledger amount must be positive; "
                + "direction, not sign, carries debit/credit");
        }
    }

    public static LedgerEntry debit(UUID sourceRef, SourceType sourceType, WalletId walletId, Money amount) {
        return new LedgerEntry(UUID.randomUUID(), sourceRef, sourceType, walletId, Direction.DEBIT, amount);
    }

    public static LedgerEntry credit(UUID sourceRef, SourceType sourceType, WalletId walletId, Money amount) {
        return new LedgerEntry(UUID.randomUUID(), sourceRef, sourceType, walletId, Direction.CREDIT, amount);
    }
}
