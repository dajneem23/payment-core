package com.vietpay.wallet.infrastructure.persistence;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SpringDataOutboxRepository extends JpaRepository<OutboxEventJpaEntity, UUID> {

    /** Oldest-first batch of unpublished events for the relay to drain. */
    List<OutboxEventJpaEntity> findByStatusOrderByCreatedAtAsc(String status, Limit limit);
}
