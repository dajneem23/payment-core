package com.vietpay.wallet.domain.ledger;

/**
 * What kind of movement produced a {@link LedgerEntry}. The entry's
 * {@code sourceRef} is polymorphic — it points at a transfer or a payment — so
 * this enum tells a reader which one, and therefore which detail endpoint can
 * resolve it ({@code GET /transfers/{ref}} vs {@code GET /payments/{ref}}).
 */
public enum SourceType {
    /** Wallet-to-wallet transfer (includes admin deposits, which are transfers
     *  from a system funding wallet). Resolvable via GET /transfers/{ref}. */
    TRANSFER,
    /** External card payment (top-up / payout) posted against the system
     *  card-clearing account. Resolvable via the payments API. */
    PAYMENT
}
