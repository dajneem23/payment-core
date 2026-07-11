package com.vietpay.wallet.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** Deposit request body. The idempotency key comes from the
 *  {@code Idempotency-Key} header. The currency must match the wallet. */
public record DepositRequest(
    @NotNull @DecimalMin(value = "0.0001") BigDecimal amount,
    @NotBlank @Size(min = 3, max = 3) String currency,
    String remark
) {
}
