package com.vietpay.wallet.application.wallet;

import com.vietpay.wallet.domain.exception.ValidationException;
import com.vietpay.wallet.domain.exception.WalletNotFoundException;
import com.vietpay.wallet.domain.exception.WalletCurrencyNotSupportedException;
import com.vietpay.wallet.domain.ledger.Ledger;
import com.vietpay.wallet.domain.ledger.LedgerEntry;
import com.vietpay.wallet.domain.wallet.Wallet;
import com.vietpay.wallet.domain.wallet.WalletId;
import com.vietpay.wallet.domain.wallet.Wallets;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Currency;
import java.util.List;
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
    private final Ledger ledger;

    public WalletService(Wallets wallets, Ledger ledger) {
        this.wallets = wallets;
        this.ledger = ledger;
    }

    @Transactional
    public WalletView create(String currencyCode, String ownerUserId) {
        // 400 if not a real ISO code
        Currency currency = parseCurrency(currencyCode);
        if (!SUPPORTED.contains(currency.getCurrencyCode())) {
            // 422 if unsupported
            throw new WalletCurrencyNotSupportedException(currency.getCurrencyCode());
        }
        // aggregate factory owns construction
        Wallet wallet = Wallet.open(currency, ownerUserId);
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

    /** Evict a wallet's cached balance view after its balance changes. Called by
     *  the transfer/payment services once money has moved. */
    @CacheEvict(cacheNames = WALLET_VIEW, key = "#id")
    public void evictView(UUID id) {
        // annotation-driven; body intentionally empty
    }

    /** Most-recent-first transaction history from the ledger. */
    @Transactional(readOnly = true)
    public List<LedgerEntry> transactions(UUID id, int limit, int offset) {
        WalletId walletId = WalletId.of(id);
        if (wallets.findById(walletId).isEmpty()) {
            throw new WalletNotFoundException(id);
        }
        return ledger.history(walletId, limit, offset);
    }

    /**
     * Reconcile the cached balance against the ledger (the source of truth).
     * {@code balanced == true} proves the ledger backs the balance.
     */
    @Transactional(readOnly = true)
    public Reconciliation reconcile(UUID id) {
        Wallet wallet = wallets.findById(WalletId.of(id))
            .orElseThrow(() -> new WalletNotFoundException(id));
        BigDecimal cached = wallet.balance().amount();
        BigDecimal fromLedger = ledger.reconciledBalanceAmount(wallet.id());
        return new Reconciliation(id, cached, fromLedger, cached.compareTo(fromLedger) == 0);
    }

    public record Reconciliation(UUID walletId, BigDecimal cachedBalance,
                                 BigDecimal ledgerBalance, boolean balanced) {
    }

    private static Currency parseCurrency(String code) {
        try {
            return Currency.getInstance(code);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new ValidationException("unsupported currency code: " + code);
        }
    }
}