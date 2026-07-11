package com.vietpay.wallet.infrastructure.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vietpay.wallet.domain.shared.IdempotencyKey;
import com.vietpay.wallet.domain.shared.Money;
import com.vietpay.wallet.domain.transfer.Transfer;
import com.vietpay.wallet.domain.transfer.TransferId;
import com.vietpay.wallet.domain.transfer.Transfers;
import com.vietpay.wallet.domain.wallet.WalletId;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;

/**
 * JPA-backed {@link Transfers} port.
 *
 * <p>{@code save} uses {@code saveAndFlush} so a duplicate idempotency key trips
 * the UNIQUE constraint immediately (as a {@code DataIntegrityViolationException}),
 * letting the application detect the race and replay — the persistence half of
 * the DB-level idempotency guarantee.
 */
@Component
public class TransfersJpaAdapter implements Transfers {

    private final SpringDataTransferRepository repository;
    private final ObjectMapper objectMapper;

    public TransfersJpaAdapter(SpringDataTransferRepository repository,
                               ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<Transfer> findByIdempotencyKey(IdempotencyKey key) {
        return repository.findByIdempotencyKey(key.value()).map(TransfersJpaAdapter::toDomain);
    }

    @Override
    public void save(Transfer transfer) {
        repository.saveAndFlush(new TransferJpaEntity(
            transfer.id().value(),
            transfer.idempotencyKey().value(),
            transfer.sourceWalletId().value(),
            transfer.destWalletId().value(),
            transfer.amount().amount(),
            transfer.amount().currencyCode(),
            transfer.status(),
            snapshot(transfer),
            transfer.remark(),
            transfer.timestamp()));
    }

    /** Audit copy of the result stored alongside the transfer row. */
    private String snapshot(Transfer t) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                "transferId", t.id().value().toString(),
                "status", t.status().name(),
                "sourceWalletId", t.sourceWalletId().value().toString(),
                "destWalletId", t.destWalletId().value().toString(),
                "amount", t.amount().amount().toPlainString(),
                "currency", t.amount().currencyCode()));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("failed to serialize transfer snapshot", e);
        }
    }

    private static Transfer toDomain(TransferJpaEntity e) {
        return Transfer.rehydrate(
            TransferId.of(e.getId()),
            IdempotencyKey.of(e.getIdempotencyKey()),
            WalletId.of(e.getSourceWalletId()),
            WalletId.of(e.getDestWalletId()),
            Money.of(e.getAmount(), e.getCurrency()),
            e.getStatus(),
            e.getRemark(),
            e.getCreatedAt());
    }
}
