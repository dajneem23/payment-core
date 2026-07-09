package com.vietpay.wallet.domain.exception;

/** A validation rule was violated (bad currency, non-positive amount, etc.).
 *  Maps to HTTP 400. */
public class ValidationException extends DomainException {
    public ValidationException(String message) {
        super(ErrorCode.VALIDATION_ERROR, message);
    }
}
