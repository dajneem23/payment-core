package com.vietpay.wallet.infrastructure.persistence;

import com.vietpay.wallet.domain.transfer.TransferStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * JPA persistence model for a transfer. The UNIQUE {@code idempotency_key} is
 * the authoritative idempotency guard — a duplicate insert fails at flush, which
 * the adapter surfaces so the application can replay the original result.
 */
@Entity
@Table(name = "transfers")
public class TransferJpaEntity {

    @Id
    private UUID id;

    @Column(name = "idempotency_key", nullable = false, unique = true, updatable = false)
    private String idempotencyKey;

    @Column(name = "source_wallet_id", nullable = false, updatable = false)
    private UUID sourceWalletId;

    @Column(name = "dest_wallet_id", nullable = false, updatable = false)
    private UUID destWalletId;

    @Column(nullable = false, updatable = false)
    private BigDecimal amount;

    @Column(nullable = false, updatable = false)
    private String currency;

    @Column(name = "dest_amount", nullable = false, updatable = false)
    private BigDecimal destAmount;

    @Column(name = "dest_currency", nullable = false, updatable = false)
    private String destCurrency;

    @Column(name = "fx_rate", nullable = false, updatable = false)
    private BigDecimal fxRate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransferStatus status;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response_snapshot")
    private String responseSnapshot;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected TransferJpaEntity() {
    }

    public TransferJpaEntity(UUID id, String idempotencyKey, UUID sourceWalletId,
                             UUID destWalletId, BigDecimal amount, String currency,
                             TransferStatus status, String responseSnapshot, Instant createdAt) {
        this.id = id;
        this.idempotencyKey = idempotencyKey;
        this.sourceWalletId = sourceWalletId;
        this.destWalletId = destWalletId;
        this.amount = amount;
        this.currency = currency;
        // Same-currency scope: destination mirrors source, rate is 1.
        this.destAmount = amount;
        this.destCurrency = currency;
        this.fxRate = BigDecimal.ONE;
        this.status = status;
        this.responseSnapshot = responseSnapshot;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public UUID getSourceWalletId() {
        return sourceWalletId;
    }

    public UUID getDestWalletId() {
        return destWalletId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getCurrency() {
        return currency;
    }

    public TransferStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
