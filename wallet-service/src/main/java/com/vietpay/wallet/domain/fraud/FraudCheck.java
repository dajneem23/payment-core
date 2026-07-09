package com.vietpay.wallet.domain.fraud;

import com.vietpay.wallet.domain.shared.Money;
import com.vietpay.wallet.domain.wallet.WalletId;

/** A request for a fraud decision on a proposed transfer. */
public record FraudCheck(WalletId sourceWalletId, WalletId destWalletId, Money amount) {
}
