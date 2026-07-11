package com.vietpay.wallet.infrastructure.persistence;

import com.vietpay.wallet.domain.payment.AppliedPayments;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** JPA-backed {@link AppliedPayments}. Runs inside the caller's transaction. */
@Component
public class AppliedPaymentsJpaAdapter implements AppliedPayments {

    private final SpringDataAppliedPaymentRepository repository;

    public AppliedPaymentsJpaAdapter(SpringDataAppliedPaymentRepository repository) {
        this.repository = repository;
    }

    @Override
    public boolean isApplied(UUID paymentId) {
        return repository.existsById(paymentId);
    }

    @Override
    public void markApplied(UUID paymentId) {
        repository.save(new AppliedPaymentJpaEntity(paymentId));
    }
}
