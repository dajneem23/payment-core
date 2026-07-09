package com.vietpay.wallet.domain.transfer;

import com.vietpay.wallet.domain.shared.DomainEvent;
import com.vietpay.wallet.domain.shared.Money;
import com.vietpay.wallet.domain.wallet.WalletId;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Raised when a transfer completes. Published via the outbox and consumed by
 * the notification-service. {@code eventId} lets that consumer dedupe
 * at-least-once deliveries.
 */
public record TransferCompleted(
    UUID eventId,
    TransferId transferId,
    WalletId sourceWalletId,
    WalletId destWalletId,
    Money amount,
    Instant occurredAt
) implements DomainEvent {

    @Override
    public String eventType() {
        return "TransferCompleted";
    }

    @Override
    public Map<String, Object> payload() {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("eventId", eventId.toString());
        p.put("transferId", transferId.value().toString());
        p.put("sourceWalletId", sourceWalletId.value().toString());
        p.put("destWalletId", destWalletId.value().toString());
        p.put("amount", amount.amount().toPlainString());
        p.put("currency", amount.currencyCode());
        p.put("occurredAt", occurredAt.toString());
        return p;
    }
}
