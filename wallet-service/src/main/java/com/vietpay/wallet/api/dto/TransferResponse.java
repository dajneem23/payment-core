package com.vietpay.wallet.api.dto;

import com.vietpay.wallet.application.transfer.TransferResult;
import com.vietpay.wallet.domain.transfer.TransferStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Public view of a transfer (create response + detail endpoint). */
public record TransferResponse(
    UUID transferId,
    TransferStatus status,
    UUID sourceWalletId,
    UUID destWalletId,
    BigDecimal amount,
    String currency,
    Instant createdAt,
    String remark
) {

    public static TransferResponse from(TransferResult r) {
        return new TransferResponse(r.transferId(), r.status(), r.sourceWalletId(),
            r.destWalletId(), r.amount(), r.currency(), r.createdAt(), r.remark());
    }
}
