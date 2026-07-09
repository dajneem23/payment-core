package com.vietpay.wallet.domain.exception;

/** No FX rate is available for the requested currency pair. Maps to HTTP 422. */
public class CurrencyUnsupportedException extends DomainException {
    public CurrencyUnsupportedException(String base, String quote) {
        super(ErrorCode.CURRENCY_UNSUPPORTED,
            "no FX rate for %s->%s".formatted(base, quote));
    }
}
