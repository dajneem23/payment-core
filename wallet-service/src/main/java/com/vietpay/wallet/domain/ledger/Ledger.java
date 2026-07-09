package com.vietpay.wallet.domain.ledger;

import com.vietpay.wallet.domain.wallet.WalletId;

import java.math.BigDecimal;
import java.util.List;

/**
 * Ledger port (driven). The ledger is append-only and is the source of truth
 * for balances; there is deliberately no update or delete.
 *
 * <p>Kept separate from the wallet repository because the ledger is a distinct
 * concept — the immutable journal — even though a wallet's cached balance is
 * derived from it.
 */
public interface Ledger {

    /** Append entries for one movement. Callers pass a balanced set (per
     *  currency, debits == credits). */
    void append(List<LedgerEntry> entries);

    /** Most-recent-first slice of a wallet's entries, for transaction history.
     *  Simple limit/offset rather than a Spring Page type keeps the port pure. */
    List<LedgerEntry> history(WalletId walletId, int limit, int offset);

    /**
     * Net balance reconstructed from the journal: sum(credits) - sum(debits).
     * Returns the raw amount; the caller pairs it with the wallet's currency
     * (the ledger doesn't own currency for an empty wallet). Used to prove the
     * cached balance matches the ledger.
     */
    BigDecimal reconciledBalanceAmount(WalletId walletId);
}
