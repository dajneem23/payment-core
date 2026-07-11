package com.vietpay.wallet.infrastructure.persistence;

import com.vietpay.wallet.domain.ledger.Ledger;
import com.vietpay.wallet.domain.ledger.LedgerEntry;
import com.vietpay.wallet.domain.ledger.SourceType;
import com.vietpay.wallet.domain.shared.Money;
import com.vietpay.wallet.domain.wallet.WalletId;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** JPA-backed {@link Ledger} port. Runs inside the caller's transaction. */
@Component
public class LedgerJpaAdapter implements Ledger {

    private final SpringDataLedgerRepository repository;

    public LedgerJpaAdapter(SpringDataLedgerRepository repository) {
        this.repository = repository;
    }

    @Override
    public void append(List<LedgerEntry> entries) {
        List<LedgerEntryJpaEntity> rows = entries.stream()
            .map(LedgerJpaAdapter::toJpa)
            .toList();
        repository.saveAll(rows);
    }

    @Override
    public List<LedgerEntry> history(WalletId walletId, int limit, int offset) {
        int page = limit > 0 ? offset / limit : 0;
        return repository
            .findByWalletIdOrderByCreatedAtDesc(walletId.value(), PageRequest.of(page, limit))
            .stream()
            .map(LedgerJpaAdapter::toDomain)
            .toList();
    }

    @Override
    public BigDecimal reconciledBalanceAmount(WalletId walletId) {
        return repository.reconciledBalance(walletId.value());
    }

    private static LedgerEntryJpaEntity toJpa(LedgerEntry e) {
        return new LedgerEntryJpaEntity(
            e.id(), e.sourceType(), e.sourceRef(), e.walletId().value(),
            e.direction(), e.amount().amount(), e.amount().currencyCode());
    }

    private static LedgerEntry toDomain(LedgerEntryJpaEntity e) {
        boolean isPayment = e.getTransferId() == null && e.getPaymentId() != null;
        SourceType sourceType = isPayment ? SourceType.PAYMENT : SourceType.TRANSFER;
        UUID sourceRef = isPayment ? e.getPaymentId() : e.getTransferId();
        return new LedgerEntry(
            e.getId(), sourceRef, sourceType, WalletId.of(e.getWalletId()),
            e.getDirection(), Money.of(e.getAmount(), e.getCurrency()));
    }
}
