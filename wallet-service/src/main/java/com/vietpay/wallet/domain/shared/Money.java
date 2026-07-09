package com.vietpay.wallet.domain.shared;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Currency;
import java.util.Objects;

/**
 * Money value object — an immutable (amount, currency) pair.
 *
 * <p>Money is always {@link BigDecimal} at a fixed scale with banker's rounding
 * ({@link RoundingMode#HALF_EVEN}); floating point is never used for balances.
 * Arithmetic across mismatched currencies is rejected — cross-currency movement
 * must go through an explicit FX conversion, never silent addition.
 */
public final class Money {

    /** Minor-unit scale used for storage and arithmetic (matches NUMERIC(19,4)). */
    public static final int SCALE = 4;
    public static final RoundingMode ROUNDING = RoundingMode.HALF_EVEN;

    private final BigDecimal amount;
    private final Currency currency;

    private Money(BigDecimal amount, Currency currency) {
        this.amount = amount.setScale(SCALE, ROUNDING);
        this.currency = currency;
    }

    public static Money of(BigDecimal amount, Currency currency) {
        Objects.requireNonNull(amount, "amount");
        Objects.requireNonNull(currency, "currency");
        return new Money(amount, currency);
    }

    public static Money of(BigDecimal amount, String currencyCode) {
        return of(amount, Currency.getInstance(currencyCode));
    }

    public static Money zero(Currency currency) {
        return new Money(BigDecimal.ZERO, currency);
    }

    public Money add(Money other) {
        requireSameCurrency(other);
        return new Money(this.amount.add(other.amount), currency);
    }

    public Money subtract(Money other) {
        requireSameCurrency(other);
        return new Money(this.amount.subtract(other.amount), currency);
    }

    /** Convert this amount into {@code target} using {@code rate} (quote-per-base).
     *  Only used on the FX path; same-currency transfers never call this. */
    public Money convertTo(Currency target, BigDecimal rate) {
        Objects.requireNonNull(rate, "rate");
        return new Money(this.amount.multiply(rate), target);
    }

    public boolean isNegative() {
        return amount.signum() < 0;
    }

    public boolean isPositive() {
        return amount.signum() > 0;
    }

    public boolean isGreaterThan(Money other) {
        requireSameCurrency(other);
        return this.amount.compareTo(other.amount) > 0;
    }

    public boolean isLessThan(Money other) {
        requireSameCurrency(other);
        return this.amount.compareTo(other.amount) < 0;
    }

    public BigDecimal amount() {
        return amount;
    }

    public Currency currency() {
        return currency;
    }

    public String currencyCode() {
        return currency.getCurrencyCode();
    }

    private void requireSameCurrency(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new IllegalArgumentException(
                "currency mismatch: %s vs %s".formatted(currency, other.currency));
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Money money)) return false;
        return amount.compareTo(money.amount) == 0 && currency.equals(money.currency);
    }

    @Override
    public int hashCode() {
        return Objects.hash(amount.stripTrailingZeros(), currency);
    }

    @Override
    public String toString() {
        return amount.toPlainString() + " " + currency.getCurrencyCode();
    }
}