package com.vietpay.wallet.api.dto;

import com.vietpay.wallet.domain.ledger.Direction;
import com.vietpay.wallet.domain.ledger.LedgerEntry;

import java.math.BigDecimal;
import java.util.UUID;

/** One ledger entry in a wallet's transaction history. */
public record TransactionResponse(
    UUID id,
    UUID sourceRef,
    Direction direction,
    BigDecimal amount,
    String currency
) {

    public static TransactionResponse from(LedgerEntry e) {
        return new TransactionResponse(e.id(), e.sourceRef(), e.direction(),
            e.amount().amount(), e.amount().currencyCode());
    }
}
