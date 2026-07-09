package com.vietpay.wallet.infrastructure.persistence;

import com.vietpay.wallet.domain.shared.Money;
import com.vietpay.wallet.domain.wallet.Wallet;
import com.vietpay.wallet.domain.wallet.WalletId;

import java.util.Currency;

/**
 * Translates between the {@code Wallet} aggregate and its JPA persistence model.
 */
final class WalletMapper {

    private WalletMapper() {
    }

    static Wallet toDomain(WalletJpaEntity e) {
        Currency currency = Currency.getInstance(e.getCurrency());
        return Wallet.rehydrate(
            WalletId.of(e.getId()),
            currency,
            e.getKind(),
            Money.of(e.getBalance(), currency));
    }

    static WalletJpaEntity toNewEntity(Wallet w) {
        return new WalletJpaEntity(
            w.id().value(),
            w.currency().getCurrencyCode(),
            w.balance().amount(),
            w.kind());
    }

    /** Copy mutable state from the aggregate onto an already-managed row.
     *  Only the balance changes after creation. */
    static void applyState(Wallet w, WalletJpaEntity managed) {
        managed.setBalance(w.balance().amount());
    }
}
