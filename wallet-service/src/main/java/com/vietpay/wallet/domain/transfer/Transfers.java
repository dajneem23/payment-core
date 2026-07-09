package com.vietpay.wallet.domain.transfer;

import com.vietpay.wallet.domain.shared.IdempotencyKey;

import java.util.Optional;

/**
 * Transfer repository port (driven). Deliberately tiny: the money path only
 * needs to look a transfer up by its idempotency key (to replay) and persist a
 * new one. Persisting relies on the UNIQUE(idempotency_key) constraint to make
 * the insert the authoritative idempotency guard — a concurrent duplicate loses
 * the insert, and the caller replays the winner.
 */
public interface Transfers {

    /** Find a previously-recorded transfer by its idempotency key. */
    Optional<Transfer> findByIdempotencyKey(IdempotencyKey key);

    /**
     * Persist a new transfer. Implementations must surface a unique-constraint
     * violation (not swallow it) so the application layer can detect the
     * idempotency race and replay.
     */
    void save(Transfer transfer);
}
