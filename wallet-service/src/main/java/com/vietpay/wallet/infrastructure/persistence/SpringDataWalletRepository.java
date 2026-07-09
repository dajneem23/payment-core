package com.vietpay.wallet.infrastructure.persistence;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

/** Spring Data repository for wallet rows. Infrastructure detail behind the
 *  {@code Wallets} port. */
interface SpringDataWalletRepository extends JpaRepository<WalletJpaEntity, UUID> {

    /**
     * Pessimistic write lock ({@code SELECT ... FOR UPDATE})
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from WalletJpaEntity w where w.id in :ids order by w.id")
    List<WalletJpaEntity> lockAllByIdInOrder(@Param("ids") List<UUID> ids);
}
