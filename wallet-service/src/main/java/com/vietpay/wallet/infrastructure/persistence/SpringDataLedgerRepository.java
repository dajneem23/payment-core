package com.vietpay.wallet.infrastructure.persistence;

import org.springframework.data.domain.Limit;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

interface SpringDataLedgerRepository extends JpaRepository<LedgerEntryJpaEntity, UUID> {

    List<LedgerEntryJpaEntity> findByWalletIdOrderByCreatedAtDesc(UUID walletId, Pageable pageable);

    /** Reconcile a wallet's balance from the journal: sum(credits) - sum(debits). */
    @Query("""
        select coalesce(sum(case when e.direction = com.vietpay.wallet.domain.ledger.Direction.CREDIT
                                 then e.amount else -e.amount end), 0)
        from LedgerEntryJpaEntity e
        where e.walletId = :walletId
        """)
    BigDecimal reconciledBalance(@Param("walletId") UUID walletId);
}
