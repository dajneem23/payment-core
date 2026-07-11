package com.vietpay.wallet.domain.exception;

import java.util.UUID;

/** A referenced transfer does not exist. Maps to HTTP 404. */
public class TransferNotFoundException extends DomainException {
    public TransferNotFoundException(UUID transferId) {
        super(ErrorCode.TRANSFER_NOT_FOUND, "transfer not found: " + transferId);
    }
}
