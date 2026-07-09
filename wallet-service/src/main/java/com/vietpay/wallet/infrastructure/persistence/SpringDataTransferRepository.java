package com.vietpay.wallet.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

interface SpringDataTransferRepository extends JpaRepository<TransferJpaEntity, UUID> {
    Optional<TransferJpaEntity> findByIdempotencyKey(String idempotencyKey);
}
