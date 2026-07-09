package com.vietpay.wallet.domain.exception;

/** Base type for expected, client-facing domain failures. Carries a stable
 *  {@link ErrorCode} that the API layer maps to an HTTP status. */
public abstract class DomainException extends RuntimeException {

    private final ErrorCode code;

    protected DomainException(ErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public ErrorCode code() {
        return code;
    }
}
