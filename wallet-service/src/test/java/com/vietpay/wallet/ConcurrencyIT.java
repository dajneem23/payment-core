package com.vietpay.wallet;

import com.vietpay.wallet.application.deposit.DepositCommand;
import com.vietpay.wallet.application.deposit.DepositService;
import com.vietpay.wallet.application.transfer.TransferCommand;
import com.vietpay.wallet.application.transfer.TransferService;
import com.vietpay.wallet.application.wallet.WalletService;
import com.vietpay.wallet.application.wallet.WalletView;
import com.vietpay.wallet.domain.exception.InsufficientFundsException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves the concurrency requirement: many simultaneous transfers from ONE
 * wallet can never overdraw it. The source is funded for exactly N transfers;
 * 2N threads fire at once (released together by a latch, so they genuinely
 * race). The pessimistic SELECT ... FOR UPDATE serialises them, so exactly N
 * succeed, the rest get InsufficientFundsException, and the balance lands at 0 —
 * never negative.
 */
class ConcurrencyIT extends AbstractPostgresIT {

    @Autowired TransferService transferService;
    @Autowired DepositService depositService;
    @Autowired WalletService walletService;

    @Test
    void concurrentTransfers_cannotOverdraw() throws Exception {
        WalletView source = walletService.create("USD");
        WalletView dest = walletService.create("USD");

        BigDecimal amount = new BigDecimal("10.00");
        int capacity = 10;                 // 100.00 funds exactly 10 transfers of 10.00
        int threads = 20;                  // twice as many attempts as capacity
        fund(source.id(), "100.00");

        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch startGate = new CountDownLatch(1);
        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger insufficient = new AtomicInteger();
        List<Future<?>> futures = new ArrayList<>();

        for (int i = 0; i < threads; i++) {
            futures.add(pool.submit(() -> {
                startGate.await();          // all threads block here, then fire together
                try {
                    transferService.transfer(new TransferCommand(
                        UUID.randomUUID().toString(),   // distinct key per attempt
                        source.id(), dest.id(), amount, "USD"));
                    succeeded.incrementAndGet();
                } catch (InsufficientFundsException expected) {
                    insufficient.incrementAndGet();
                }
                return null;
            }));
        }

        startGate.countDown();              // release the race
        for (Future<?> f : futures) {
            f.get();                        // rethrows any UNEXPECTED failure -> test fails
        }
        pool.shutdown();

        // Exactly the funded capacity moved; the rest were correctly rejected.
        assertThat(succeeded.get()).isEqualTo(capacity);
        assertThat(insufficient.get()).isEqualTo(threads - capacity);

        // Never overdrawn: source fully drained to 0, dest received all of it.
        assertThat(walletService.get(source.id()).balance()).isEqualByComparingTo("0.00");
        assertThat(walletService.get(dest.id()).balance()).isEqualByComparingTo("100.00");

        // The ledger still reconciles after the storm.
        assertThat(walletService.reconcile(source.id()).balanced()).isTrue();
        assertThat(walletService.reconcile(dest.id()).balanced()).isTrue();
    }

    private void fund(UUID walletId, String amount) {
        depositService.deposit(new DepositCommand(
            UUID.randomUUID().toString(), walletId, new BigDecimal(amount), "USD"));
    }
}
