package com.vietpay.wallet.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

/** Transfer request body. The idempotency key comes from the
 *  {@code Idempotency-Key} header, not the body. */
public record TransferRequest(
    @NotNull UUID sourceWalletId,
    @NotNull UUID destWalletId,
    @NotNull @DecimalMin(value = "0.0001") BigDecimal amount,
    @NotBlank @Size(min = 3, max = 3) String currency
) {
}
