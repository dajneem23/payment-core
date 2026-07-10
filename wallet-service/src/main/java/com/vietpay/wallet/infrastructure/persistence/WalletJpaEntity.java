package com.vietpay.wallet.infrastructure.persistence;

import com.vietpay.wallet.domain.wallet.WalletKind;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * JPA persistence model for a wallet — an infrastructure concern, deliberately
 * separate from the {@code Wallet} aggregate. The mapper translates between the
 * two so the domain stays free of framework annotations.
 *
 * <p>{@code @Version} gives optimistic-lock protection; combined with the
 * pessimistic {@code SELECT ... FOR UPDATE} in the repository it is belt and
 * braces. Only {@code balance}/{@code version}/{@code updatedAt} ever change
 * after creation.
 */
@Entity
@Table(name = "wallets")
public class WalletJpaEntity {

    @Id
    private UUID id;

    @Column(nullable = false, updatable = false, length = 3)
    private String currency;

    @Column(nullable = false)
    private BigDecimal balance;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private WalletKind kind;

    @Version
    private long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected WalletJpaEntity() {
        // for JPA
    }

    public WalletJpaEntity(UUID id, String currency, BigDecimal balance, WalletKind kind) {
        this.id = id;
        this.currency = currency;
        this.balance = balance;
        this.kind = kind;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public String getCurrency() {
        return currency;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance;
    }

    public WalletKind getKind() {
        return kind;
    }
}