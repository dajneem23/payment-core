package com.vietpay.wallet;

import com.vietpay.wallet.application.deposit.DepositCommand;
import com.vietpay.wallet.application.deposit.DepositService;
import com.vietpay.wallet.application.transfer.TransferCommand;
import com.vietpay.wallet.application.transfer.TransferResult;
import com.vietpay.wallet.application.transfer.TransferService;
import com.vietpay.wallet.application.wallet.WalletService;
import com.vietpay.wallet.application.wallet.WalletView;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves the idempotency requirement: the SAME transfer request sent twice
 * (same Idempotency-Key) moves money exactly ONCE and returns the original
 * result — never a double charge, never an error.
 */
class IdempotencyIT extends AbstractPostgresIT {

    @Autowired TransferService transferService;
    @Autowired DepositService depositService;
    @Autowired WalletService walletService;
    @Autowired JdbcTemplate jdbc;

    @Test
    void sameKeyTwice_movesMoneyOnce() {
        WalletView source = walletService.create("USD");
        WalletView dest = walletService.create("USD");
        fund(source.id(), "100.00");

        String key = UUID.randomUUID().toString();
        TransferCommand cmd = new TransferCommand(
            key, source.id(), dest.id(), new BigDecimal("30.00"), "USD");

        TransferResult first = transferService.transfer(cmd);
        TransferResult replay = transferService.transfer(cmd);   // identical retry

        // Same outcome returned, not a new transfer.
        assertThat(replay.transferId()).isEqualTo(first.transferId());

        // Exactly one transfer row persisted for the key.
        Integer rows = jdbc.queryForObject(
            "select count(*) from transfers where idempotency_key = ?", Integer.class, key);
        assertThat(rows).isEqualTo(1);

        // Money moved once: source 100 - 30 = 70, dest = 30.
        assertThat(walletService.get(source.id()).balance()).isEqualByComparingTo("70.00");
        assertThat(walletService.get(dest.id()).balance()).isEqualByComparingTo("30.00");

        // Exactly one debit + one credit ledger entry for the transfer.
        Integer entries = jdbc.queryForObject(
            "select count(*) from ledger_entries where transfer_id = ?",
            Integer.class, first.transferId());
        assertThat(entries).isEqualTo(2);

        // The ledger backs the cached balance.
        assertThat(walletService.reconcile(source.id()).balanced()).isTrue();
    }

    private void fund(UUID walletId, String amount) {
        depositService.deposit(new DepositCommand(
            UUID.randomUUID().toString(), walletId, new BigDecimal(amount), "USD"));
    }
}
