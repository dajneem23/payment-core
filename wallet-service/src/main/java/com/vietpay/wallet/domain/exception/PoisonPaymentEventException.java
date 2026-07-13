package com.vietpay.wallet.domain.exception;

/**
 * A payment event that can never succeed on retry — malformed JSON, missing
 * fields, or an unparseable id. Marked NON-retryable so the Kafka error handler
 * routes it straight to the dead-letter topic instead of redelivering a poison
 * message forever (which would block the partition). Contrast with transient
 * failures (lock timeout, DB blip), which are retried before dead-lettering.
 */
public class PoisonPaymentEventException extends RuntimeException {
    public PoisonPaymentEventException(String message, Throwable cause) {
        super(message, cause);
    }
}
