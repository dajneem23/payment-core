package com.vietpay.wallet.application.transfer;

import com.vietpay.wallet.domain.transfer.Transfer;
import com.vietpay.wallet.domain.transfer.TransferStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Result of a transfer, returned to the API. On an idempotent replay it is
 *  reconstructed from the persisted transfer aggregate, so a retry sees the
 *  identical outcome. */
public record TransferResult(
    UUID transferId,
    TransferStatus status,
    UUID sourceWalletId,
    UUID destWalletId,
    BigDecimal amount,
    String currency,
    Instant createdAt,
    String remark
) {

    public static TransferResult from(Transfer t) {
        return new TransferResult(
            t.id().value(),
            t.status(),
            t.sourceWalletId().value(),
            t.destWalletId().value(),
            t.amount().amount(),
            t.amount().currencyCode(),
            t.timestamp(),
            t.remark());
    }
}
