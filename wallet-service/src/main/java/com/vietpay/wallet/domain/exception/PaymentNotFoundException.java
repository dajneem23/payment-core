package com.vietpay.wallet.domain.exception;

import java.util.UUID;

/** A referenced payment does not exist. Maps to HTTP 404. */
public class PaymentNotFoundException extends DomainException {
    public PaymentNotFoundException(UUID paymentId) {
        super(ErrorCode.PAYMENT_NOT_FOUND, "payment not found: " + paymentId);
    }
}
