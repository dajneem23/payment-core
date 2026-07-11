package com.vietpay.wallet;

import com.vietpay.wallet.application.payment.ApplyPaymentService;
import com.vietpay.wallet.application.payment.CapturedPayment;
import com.vietpay.wallet.application.wallet.WalletService;
import com.vietpay.wallet.application.wallet.WalletView;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves the card top-up money path: a settled {@code PaymentCaptured} credits
 * the wallet exactly once (idempotent under Kafka redelivery), DEBIT
 * card_clearing / CREDIT wallet, and the ledger reconciles. card_clearing is a
 * SYSTEM account so it is allowed to swing negative as external money enters.
 */
class PaymentConsumerIT extends AbstractPostgresIT {

    private static final String USER_ID = "00000000-0000-0000-0000-000000000099";
    private static final UUID CARD_CLEARING = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Autowired ApplyPaymentService applyPaymentService;
    @Autowired WalletService walletService;
    @Autowired JdbcTemplate jdbc;

    @Test
    void capturedTopup_appliedOnce_evenIfRedelivered() {
        WalletView wallet = walletService.create("USD", USER_ID);
        BigDecimal clearingBefore = walletService.get(CARD_CLEARING).balance();

        UUID paymentId = UUID.randomUUID();
        CapturedPayment evt = new CapturedPayment(
            paymentId, wallet.id(), new BigDecimal("25.00"), "USD", "VISA", USER_ID);

        applyPaymentService.applyCapturedTopup(evt);
        applyPaymentService.applyCapturedTopup(evt);   // at-least-once redelivery

        // Wallet credited exactly once.
        assertThat(walletService.get(wallet.id()).balance()).isEqualByComparingTo("25.00");

        // card_clearing debited by the same amount (swings negative — SYSTEM).
        assertThat(walletService.get(CARD_CLEARING).balance())
            .isEqualByComparingTo(clearingBefore.subtract(new BigDecimal("25.00")));

        // Exactly one debit + one credit posted for this payment (not doubled).
        Integer entries = jdbc.queryForObject(
            "select count(*) from ledger_entries where payment_id = ?", Integer.class, paymentId);
        assertThat(entries).isEqualTo(2);

        // Idempotency guard recorded once.
        Integer applied = jdbc.queryForObject(
            "select count(*) from applied_payments where payment_id = ?", Integer.class, paymentId);
        assertThat(applied).isEqualTo(1);

        // Ledger backs the wallet's cached balance.
        assertThat(walletService.reconcile(wallet.id()).balanced()).isTrue();
    }
}
