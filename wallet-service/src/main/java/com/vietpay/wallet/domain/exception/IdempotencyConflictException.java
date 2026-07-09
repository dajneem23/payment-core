package com.vietpay.wallet.domain.exception;

/**
 * The same idempotency key was reused with a different request payload. This is
 * a genuine client error (the key is meant to identify one specific request),
 * distinct from a benign retry of the identical request. Maps to HTTP 409.
 */
public class IdempotencyConflictException extends DomainException {
    public IdempotencyConflictException(String key) {
        super(ErrorCode.IDEMPOTENCY_CONFLICT,
            "idempotency key reused with a different payload: " + key);
    }
}
