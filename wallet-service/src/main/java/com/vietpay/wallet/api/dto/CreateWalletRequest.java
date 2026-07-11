package com.vietpay.wallet.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request to open a wallet with a single base currency. */
public record CreateWalletRequest(
    @Schema(description = "ISO-4217 currency code (USD, EUR, VND, GBP)", example = "USD")
    @NotBlank @Size(min = 3, max = 3) String currency
) {
}
