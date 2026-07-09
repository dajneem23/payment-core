package com.vietpay.wallet.domain.exception;

import java.util.UUID;

/** A wallet has insufficient funds for the requested debit. Maps to HTTP 422. */
public class InsufficientFundsException extends DomainException {
    public InsufficientFundsException(UUID walletId) {
        super(ErrorCode.INSUFFICIENT_FUNDS, "insufficient funds in wallet: " + walletId);
    }
}
