package com.vietpay.wallet.api.dto;

import com.vietpay.wallet.application.transfer.TransferResult;
import com.vietpay.wallet.domain.transfer.TransferStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Detailed view of a single transfer, returned by {@code GET /transfers/{id}}.
 * Richer than {@link TransferResponse}: includes the human {@code remark} and
 * the {@code createdAt} timestamp for a full record of the movement.
 */
public record TransferDetailResponse(
    UUID transferId,
    TransferStatus status,
    UUID sourceWalletId,
    UUID destWalletId,
    BigDecimal amount,
    String currency,
    String remark,
    Instant createdAt
) {

    public static TransferDetailResponse from(TransferResult r) {
        return new TransferDetailResponse(r.transferId(), r.status(), r.sourceWalletId(),
            r.destWalletId(), r.amount(), r.currency(), r.remark(), r.createdAt());
    }
}
