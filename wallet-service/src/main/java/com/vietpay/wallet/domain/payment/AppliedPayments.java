package com.vietpay.wallet.domain.payment;

import java.util.UUID;

/**
 * Consumer-side idempotency guard for applying card-payment effects.
 *
 * <p>A settled payment arrives from Kafka (topic {@code payment-events}) with
 * at-least-once delivery, so the same {@code PaymentCaptured} may be redelivered.
 * This port records which payment ids have already been posted to the ledger, so
 * the double-entry runs exactly once. The record is written in the SAME
 * transaction that posts the ledger, so "claimed" and "posted" commit together.
 */
public interface AppliedPayments {

    /** Whether this payment's ledger effect has already been applied. */
    boolean isApplied(UUID paymentId);

    /** Mark this payment as applied. Must run in the posting transaction. */
    void markApplied(UUID paymentId);
}
