package com.vietpay.wallet.application.deposit;

import java.math.BigDecimal;
import java.util.UUID;

/** Fund a wallet from an external source. Modelled as a transfer from the
 *  per-currency SYSTEM funding account into the target wallet. */
public record DepositCommand(
    String idempotencyKey,
    UUID walletId,
    BigDecimal amount,
    String currency,
    String remark
) {
}
