package com.vietpay.wallet.application.wallet;

import com.vietpay.wallet.domain.wallet.Wallet;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Read model of a wallet returned by the application service. A flat record of
 * primitives objects Ready for Redis balance cache.
 */
public record WalletView(UUID id, String currency, BigDecimal balance, String kind) {

    public static WalletView of(Wallet wallet) {
        return new WalletView(
            wallet.id().value(),
            wallet.currency().getCurrencyCode(),
            wallet.balance().amount(),
            wallet.kind().name());
    }
}