package com.vietpay.wallet.domain.exception;

/** The fraud check rejected the transfer. Maps to HTTP 422. */
public class FraudRejectedException extends DomainException {
    public FraudRejectedException(String reason) {
        super(ErrorCode.FRAUD_REJECTED, "transfer rejected by fraud check: " + reason);
    }
}
