package com.vietpay.wallet.domain.exception;

/**
 * A well-formed, valid ISO currency that VietPay does not offer wallets in
 * (e.g. it's a real currency, just not on our supported list). Distinct from
 * {@link ValidationException} (400, malformed input): this is a business rule,
 * so it maps to HTTP 422 Unprocessable Entity.
 */
public class WalletCurrencyNotSupportedException extends DomainException {
    public WalletCurrencyNotSupportedException(String currencyCode) {
        super(ErrorCode.CURRENCY_UNSUPPORTED, "wallet currency not supported: " + currencyCode);
    }
}
