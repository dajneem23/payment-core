package com.vietpay.wallet.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request to open a wallet with a single base currency. */
public record CreateWalletRequest(
    @NotBlank @Size(min = 3, max = 3) String currency
) {
}
