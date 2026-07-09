package com.vietpay.wallet.domain.wallet;

import java.util.List;
import java.util.Optional;

/**
 * Wallet repository port (driven). The one method that carries the overdraw
 * guarantee is {@link #lockForUpdate}: it is the seam where the pessimistic DB
 * lock enters the domain.
 *
 * <p>No {@code create} method: a new wallet is constructed by the aggregate
 * factory {@link Wallet#open} and then persisted with {@link #save}, so the
 * "what a new wallet is" rule stays in one place (the domain), not split into
 * the repository.
 */
public interface Wallets {

    /** Unlocked read — used for existence/currency checks before the money
     *  transaction opens. */
    Optional<Wallet> findById(WalletId id);

    /**
     * Load wallets with a pessimistic write lock ({@code SELECT ... FOR UPDATE}).
     * Concurrent transfers touching the same wallet serialise here, so the
     * balance check and debit are race-free.
     *
     * @return the found wallets (missing ids are simply absent — the caller
     *         decides how to surface a not-found, keeping 404 semantics in the
     *         application layer)
     */
    List<Wallet> lockForUpdate(List<WalletId> ids);

    /** Persist a wallet — insert if new, update if it already exists. */
    void save(Wallet wallet);
}