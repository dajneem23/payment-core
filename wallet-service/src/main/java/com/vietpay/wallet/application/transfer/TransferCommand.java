package com.vietpay.wallet.application.transfer;

import java.math.BigDecimal;
import java.util.UUID;

/** Input to the transfer use case. {@code currency} is the amount's currency
 *  and must match both wallets (same-currency scope). */
public record TransferCommand(
    String idempotencyKey,
    UUID sourceWalletId,
    UUID destWalletId,
    BigDecimal amount,
    String currency,
    String remark
) {
}
