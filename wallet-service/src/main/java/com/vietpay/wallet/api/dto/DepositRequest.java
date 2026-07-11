package com.vietpay.wallet.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** Deposit request body. The idempotency key comes from the
 *  {@code Idempotency-Key} header. The currency must match the wallet. */
public record DepositRequest(
    @Schema(description = "Amount to credit (must be positive)", example = "100.00")
    @NotNull @DecimalMin(value = "0.0001") BigDecimal amount,

    @Schema(description = "ISO-4217 currency; must match the wallet", example = "USD")
    @NotBlank @Size(min = 3, max = 3) String currency,

    @Schema(description = "Optional note", example = "Initial funding")
    String remark
) {
}
