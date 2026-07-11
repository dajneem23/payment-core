package com.vietpay.wallet.api.dto;

import com.vietpay.wallet.domain.ledger.Direction;
import com.vietpay.wallet.domain.ledger.LedgerEntry;
import com.vietpay.wallet.domain.ledger.SourceType;

import java.math.BigDecimal;
import java.util.UUID;

/** One ledger entry in a wallet's transaction history. {@code sourceType} tells
 *  the client which detail endpoint resolves {@code sourceRef} (TRANSFER ->
 *  GET /transfers/{ref}). */
public record TransactionResponse(
    UUID id,
    UUID sourceRef,
    SourceType sourceType,
    Direction direction,
    BigDecimal amount,
    String currency
) {

    public static TransactionResponse from(LedgerEntry e) {
        return new TransactionResponse(e.id(), e.sourceRef(), e.sourceType(), e.direction(),
            e.amount().amount(), e.amount().currencyCode());
    }
}
