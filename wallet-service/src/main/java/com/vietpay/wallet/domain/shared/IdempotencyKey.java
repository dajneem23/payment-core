package com.vietpay.wallet.domain.shared;

import java.util.Objects;

/**
 * Idempotency key value object — a client-generated token (typically a UUID)
 * sent in the {@code Idempotency-Key} header. It identifies one specific
 * request so that retries are safe: the same key must move money only once.
 *
 * <p>Retention policy: the key is persisted permanently as a UNIQUE column
 * (audit-grade — a key can never be silently reused to slip a duplicate
 * through), while a Redis fast-path holds it for a bounded TTL representing the
 * practical client-retry window.
 */
public record IdempotencyKey(String value) {

    private static final int MAX_LENGTH = 200;

    public IdempotencyKey {
        Objects.requireNonNull(value, "idempotency key");
        if (value.isBlank()) {
            throw new IllegalArgumentException("idempotency key must not be blank");
        }
        if (value.length() > MAX_LENGTH) {
            throw new IllegalArgumentException("idempotency key too long");
        }
    }

    public static IdempotencyKey of(String value) {
        return new IdempotencyKey(value);
    }

    @Override
    public String toString() {
        return value;
    }
}
