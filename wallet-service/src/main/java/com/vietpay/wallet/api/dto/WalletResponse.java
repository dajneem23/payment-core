package com.vietpay.wallet.api.dto;

import com.vietpay.wallet.application.wallet.WalletView;

import java.math.BigDecimal;
import java.util.UUID;

/** Public view of a wallet and its current balance. */
public record WalletResponse(UUID id, String currency, BigDecimal balance) {

    public static WalletResponse from(WalletView view) {
        return new WalletResponse(view.id(), view.currency(), view.balance());
    }
}