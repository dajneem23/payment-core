package com.vietpay.wallet.infrastructure.persistence;

import com.vietpay.wallet.domain.wallet.Wallet;
import com.vietpay.wallet.domain.wallet.WalletId;
import com.vietpay.wallet.domain.wallet.Wallets;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * JPA-backed implementation of the {@link Wallets} port. This is the adapter
 * that lets {@code WalletService} talk to the database without knowing it.
 *
 * <p>No {@code @Transactional} here on purpose — these methods run inside the
 * transaction opened by the calling application service, which is what makes
 * the pessimistic lock in {@link #lockForUpdate} span the whole money movement.
 */
@Component
public class WalletsJpaAdapter implements Wallets {

    private final SpringDataWalletRepository repository;

    public WalletsJpaAdapter(SpringDataWalletRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<Wallet> findById(WalletId id) {
        return repository.findById(id.value()).map(WalletMapper::toDomain);
    }

    @Override
    public List<Wallet> lockForUpdate(List<WalletId> ids) {
        // Sort here so opposing transfers always lock in the same order — the
        // deadlock-safety invariant lives in the adapter, per the port contract.
        List<UUID> ordered = ids.stream()
            .map(WalletId::value)
            .sorted()
            .toList();
        return repository.lockAllByIdInOrder(ordered).stream()
            .map(WalletMapper::toDomain)
            .toList();
    }

    @Override
    public void save(Wallet wallet) {
        // For an existing wallet, copy state onto the already-managed (and, on
        // the money path, already-locked) row so the @Version/lock is preserved;
        // Hibernate dirty-checking flushes the change. 
        // Insert a fresh row for a brand-new wallet.
        Optional<WalletJpaEntity> managed = repository.findById(wallet.id().value());
        if (managed.isPresent()) {
            WalletMapper.applyState(wallet, managed.get());
        } else {
            repository.save(WalletMapper.toNewEntity(wallet));
        }
    }
}
