package com.vietpay.wallet.domain.exception;

import java.util.UUID;

/** A referenced wallet does not exist. Maps to HTTP 404. */
public class WalletNotFoundException extends DomainException {
    public WalletNotFoundException(UUID walletId) {
        super(ErrorCode.WALLET_NOT_FOUND, "wallet not found: " + walletId);
    }
}
