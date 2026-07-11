package com.vietpay.wallet.domain.exception;

/**
 * Stable, machine-readable error codes returned in the structured error body.
 * Each maps to a specific HTTP status in the API layer's exception handler, so
 * the error model is consistent and predictable for clients.
 */
public enum ErrorCode {
    VALIDATION_ERROR,
    WALLET_NOT_FOUND,
    TRANSFER_NOT_FOUND,
    INSUFFICIENT_FUNDS,
    IDEMPOTENCY_CONFLICT,
    CURRENCY_UNSUPPORTED,
    FRAUD_REJECTED,
    PAYMENT_NOT_FOUND,
    FORBIDDEN,
    INTERNAL_ERROR
}
