package com.vietpay.wallet.domain.wallet;

/**
 * Whether a wallet belongs to a user or is a SYSTEM account.
 *
 * <p>USER wallets may never go negative (the overdraw invariant). SYSTEM
 * accounts — e.g. {@code card_clearing} — are the external counter-account for
 * card money and legitimately swing negative, so they are exempt.
 */
public enum WalletKind {
    USER,
    SYSTEM
}