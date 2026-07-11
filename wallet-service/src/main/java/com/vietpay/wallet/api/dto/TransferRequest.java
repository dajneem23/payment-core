package com.vietpay.wallet.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

/** Transfer request body. The idempotency key comes from the
 *  {@code Idempotency-Key} header, not the body. */
public record TransferRequest(
    @Schema(description = "Wallet the money leaves (you must own it)",
        example = "3f1c9b2e-0000-0000-0000-000000000001")
    @NotNull UUID sourceWalletId,

    @Schema(description = "Wallet the money arrives in",
        example = "3f1c9b2e-0000-0000-0000-000000000002")
    @NotNull UUID destWalletId,

    @Schema(description = "Amount to move (must be positive)", example = "10.00")
    @NotNull @DecimalMin(value = "0.0001") BigDecimal amount,

    @Schema(description = "ISO-4217 currency; must match both wallets", example = "USD")
    @NotBlank @Size(min = 3, max = 3) String currency,

    @Schema(description = "Optional note shown on the receipt", example = "Rent for July")
    String remark
) {
}
