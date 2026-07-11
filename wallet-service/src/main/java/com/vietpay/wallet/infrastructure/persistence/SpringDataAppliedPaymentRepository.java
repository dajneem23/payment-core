package com.vietpay.wallet.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

interface SpringDataAppliedPaymentRepository extends JpaRepository<AppliedPaymentJpaEntity, UUID> {
}
