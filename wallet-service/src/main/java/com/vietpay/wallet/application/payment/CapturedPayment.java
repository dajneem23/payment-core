package com.vietpay.wallet.application.payment;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * A card payment that the gateway has captured (settled) and published on
 * {@code payment-events}. Carries just what the money core needs to post the
 * double-entry: which wallet to credit, and how much.
 */
public record CapturedPayment(
    UUID paymentId,
    UUID walletId,
    BigDecimal amount,
    String currency,
    String scheme,
    String ownerUserId
) {
}
