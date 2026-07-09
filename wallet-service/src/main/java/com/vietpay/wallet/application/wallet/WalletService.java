package com.vietpay.wallet.application.wallet;

import com.vietpay.wallet.domain.exception.ValidationException;
import com.vietpay.wallet.domain.exception.WalletNotFoundException;
import com.vietpay.wallet.domain.exception.WalletCurrencyNotSupportedException;
import com.vietpay.wallet.domain.wallet.Wallet;
import com.vietpay.wallet.domain.wallet.WalletId;
import com.vietpay.wallet.domain.wallet.Wallets;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Currency;
import java.util.Set;
import java.util.UUID;

/**
 * Wallet use cases. Orchestrates the {@link Wallets} port; it holds the
 * transaction boundary and knows nothing about JPA — Spring wires in the
 * infrastructure adapter that implements the port.
 */
@Service
public class WalletService {

    /** Cache name; the RedisCacheManager (infrastructure) configures its TTL. */
    public static final String WALLET_VIEW = "walletView";

    /** Currencies we offers wallets in. A valid ISO code outside this set
     *  is rejected as unsupported (422), not as malformed (400). */
    private static final Set<String> SUPPORTED = Set.of("USD", "EUR", "VND", "GBP");

    private final Wallets wallets;

    public WalletService(Wallets wallets) {
        this.wallets = wallets;
    }

    @Transactional
    public WalletView create(String currencyCode) {
        // 400 if not a real ISO code
        Currency currency = parseCurrency(currencyCode);
        if (!SUPPORTED.contains(currency.getCurrencyCode())) {
            // 422 if unsupported
            throw new WalletCurrencyNotSupportedException(currency.getCurrencyCode());
        }
        // aggregate factory owns construction
        Wallet wallet = Wallet.open(currency);
        wallets.save(wallet);
        return WalletView.of(wallet);
    }

    /**
     * Fetch a wallet's balance view (with caching).
     */
    @Cacheable(cacheNames = WALLET_VIEW, key = "#id")
    @Transactional(readOnly = true)
    public WalletView get(UUID id) {
        return wallets.findById(WalletId.of(id))
            .map(WalletView::of)
            .orElseThrow(() -> new WalletNotFoundException(id));
    }

    private static Currency parseCurrency(String code) {
        try {
            return Currency.getInstance(code);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new ValidationException("unsupported currency code: " + code);
        }
    }
}