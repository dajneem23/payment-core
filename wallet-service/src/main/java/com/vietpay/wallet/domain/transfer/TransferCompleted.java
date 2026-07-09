package com.vietpay.wallet.domain.transfer;

import com.vietpay.wallet.domain.shared.DomainEvent;
import com.vietpay.wallet.domain.shared.Money;
import com.vietpay.wallet.domain.wallet.WalletId;

import java.time.Instant;
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
}
