package com.vietpay.wallet.domain.wallet;

import com.vietpay.wallet.domain.exception.InsufficientFundsException;
import com.vietpay.wallet.domain.shared.Money;

import java.util.Currency;

/**
 * Wallet aggregate root — the consistency boundary for a single balance.
 *
 * <p>All balance changes go through {@link #credit}/{@link #debit}, which
 * enforce the overdraw invariant in the domain itself. This is defence in
 * depth: the pessimistic row lock serialises concurrent debits and the DB
 * {@code CHECK (balance >= 0)} is the final backstop, but the rule is also
 * expressed here so the domain reads truthfully on its own.
 */
public class Wallet {

    private final WalletId id;
    private final Currency currency;
    private final WalletKind kind;
    private Money balance;

    private Wallet(WalletId id, Currency currency, WalletKind kind, Money balance) {
        this.id = id;
        this.currency = currency;
        this.kind = kind;
        this.balance = balance;
    }

    /** Open a brand-new, empty USER wallet in the given currency. */
    public static Wallet open(Currency currency) {
        return new Wallet(WalletId.newId(), currency, WalletKind.USER, Money.zero(currency));
    }

    /** Rehydrate an existing wallet from persisted state (used by adapters). */
    public static Wallet rehydrate(WalletId id, Currency currency, WalletKind kind,
                                   Money balance) {
        return new Wallet(id, currency, kind, balance);
    }

    /** Add funds. */
    public void credit(Money amount) {
        requireSameCurrency(amount);
        this.balance = balance.add(amount);
    }

    /** Remove funds, enforcing the overdraw invariant for USER wallets. */
    public void debit(Money amount) {
        requireSameCurrency(amount);
        Money next = balance.subtract(amount);
        if (kind == WalletKind.USER && next.isNegative()) {
            throw new InsufficientFundsException(id.value());
        }
        this.balance = next;
    }

    public boolean canAfford(Money amount) {
        return kind == WalletKind.SYSTEM || !balance.subtract(amount).isNegative();
    }

    public WalletId id() {
        return id;
    }

    public Currency currency() {
        return currency;
    }

    public WalletKind kind() {
        return kind;
    }

    public Money balance() {
        return balance;
    }

    private void requireSameCurrency(Money amount) {
        if (!amount.currency().equals(currency)) {
            throw new IllegalArgumentException(
                "wallet %s is %s, cannot apply %s".formatted(id, currency, amount.currency()));
        }
    }
}