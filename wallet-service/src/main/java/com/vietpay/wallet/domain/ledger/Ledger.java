package com.vietpay.wallet.domain.ledger;

import com.vietpay.wallet.domain.shared.Money;
import com.vietpay.wallet.domain.wallet.WalletId;

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

    /** Reconstruct a wallet's balance from the journal: sum(credits) - sum(debits).
     *  Used to prove the cached balance matches the ledger. */
    Money reconciledBalance(WalletId walletId);
}
