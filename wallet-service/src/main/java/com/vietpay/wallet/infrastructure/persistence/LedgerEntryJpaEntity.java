package com.vietpay.wallet.infrastructure.persistence;

import com.vietpay.wallet.domain.ledger.Direction;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** JPA persistence model for an immutable ledger entry. Append-only — no setters
 *  beyond construction, mirroring the domain's no-update/no-delete rule. */
@Entity
@Table(name = "ledger_entries")
public class LedgerEntryJpaEntity {

    @Id
    private UUID id;

    @Column(name = "transfer_id")
    private UUID transferId;

    @Column(name = "payment_id")
    private UUID paymentId;

    @Column(name = "wallet_id", nullable = false, updatable = false)
    private UUID walletId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private Direction direction;

    @Column(nullable = false, updatable = false)
    private BigDecimal amount;

    @Column(nullable = false, updatable = false)
    private String currency;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected LedgerEntryJpaEntity() {
    }

    public LedgerEntryJpaEntity(UUID id, UUID transferId, UUID walletId, Direction direction,
                                BigDecimal amount, String currency) {
        this.id = id;
        this.transferId = transferId;
        this.walletId = walletId;
        this.direction = direction;
        this.amount = amount;
        this.currency = currency;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getTransferId() {
        return transferId;
    }

    public UUID getPaymentId() {
        return paymentId;
    }

    public UUID getWalletId() {
        return walletId;
    }

    public Direction getDirection() {
        return direction;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getCurrency() {
        return currency;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
