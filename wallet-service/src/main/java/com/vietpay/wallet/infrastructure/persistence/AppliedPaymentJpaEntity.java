package com.vietpay.wallet.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Idempotency marker: one row per card payment whose ledger effect has been
 * applied. The {@code payment_id} PK makes a duplicate application impossible.
 */
@Entity
@Table(name = "applied_payments")
public class AppliedPaymentJpaEntity {

    @Id
    @Column(name = "payment_id")
    private UUID paymentId;

    @Column(name = "applied_at", nullable = false, updatable = false)
    private Instant appliedAt;

    protected AppliedPaymentJpaEntity() {
    }

    public AppliedPaymentJpaEntity(UUID paymentId) {
        this.paymentId = paymentId;
    }

    @PrePersist
    void onCreate() {
        this.appliedAt = Instant.now();
    }

    public UUID getPaymentId() {
        return paymentId;
    }

    public Instant getAppliedAt() {
        return appliedAt;
    }
}
