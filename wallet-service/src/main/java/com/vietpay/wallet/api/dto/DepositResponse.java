package com.vietpay.wallet.api.dto;

import com.vietpay.wallet.application.transfer.TransferResult;
import com.vietpay.wallet.domain.transfer.TransferStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Result of a deposit (the underlying funding transfer, viewed as a deposit). */
public record DepositResponse(
    UUID depositId,
    UUID walletId,
    BigDecimal amount,
    String currency,
    TransferStatus status,
    Instant createdAt
) {

    public static DepositResponse from(TransferResult r) {
        // The credited wallet is the transfer's destination.
        return new DepositResponse(r.transferId(), r.destWalletId(), r.amount(),
            r.currency(), r.status(), r.createdAt());
    }
}
