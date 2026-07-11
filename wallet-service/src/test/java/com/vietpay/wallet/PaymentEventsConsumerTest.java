package com.vietpay.wallet;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vietpay.wallet.application.payment.ApplyPaymentService;
import com.vietpay.wallet.application.payment.CapturedPayment;
import com.vietpay.wallet.infrastructure.messaging.PaymentEventsConsumer;
import com.vietpay.wallet.infrastructure.messaging.PoisonPaymentEventException;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit test for the payment-events consumer's parse/classification — the logic
 * that decides whether a record is applied, ignored, or dead-lettered. No broker
 * and no Spring context: it proves that malformed events throw the NON-retryable
 * {@link PoisonPaymentEventException} (so the DLQ error handler dead-letters them
 * immediately), while a well-formed {@code PaymentCaptured} reaches the service.
 *
 * <p>Uses a hand-rolled stub rather than Mockito so it doesn't depend on runtime
 * bytecode mocking.
 */
class PaymentEventsConsumerTest {

    /** Records what the consumer would apply, without running the money tx. */
    private final List<CapturedPayment> applied = new ArrayList<>();

    private final ApplyPaymentService stubService =
        new ApplyPaymentService(null, null, null, null, null) {
            @Override
            public void applyCapturedTopup(CapturedPayment cmd) {
                applied.add(cmd);
            }
        };

    private final PaymentEventsConsumer consumer =
        new PaymentEventsConsumer(stubService, new ObjectMapper());

    @Test
    void validPaymentCaptured_isApplied() {
        UUID paymentId = UUID.randomUUID();
        UUID walletId = UUID.randomUUID();
        String payload = """
            {"eventType":"PaymentCaptured","paymentId":"%s","walletId":"%s",
             "amount":"25.00","currency":"USD","scheme":"VISA","ownerUserId":"u-1"}
            """.formatted(paymentId, walletId);

        consumer.onMessage(payload);

        assertThat(applied).hasSize(1);
        CapturedPayment cmd = applied.get(0);
        assertThat(cmd.paymentId()).isEqualTo(paymentId);
        assertThat(cmd.walletId()).isEqualTo(walletId);
        assertThat(cmd.amount()).isEqualByComparingTo("25.00");
        assertThat(cmd.currency()).isEqualTo("USD");
    }

    @Test
    void otherEventType_isIgnored() {
        consumer.onMessage("{\"eventType\":\"PayoutSettled\",\"paymentId\":\"x\"}");
        assertThat(applied).isEmpty();
    }

    @Test
    void malformedJson_isPoison_andNeverApplied() {
        assertThatThrownBy(() -> consumer.onMessage("not-json"))
            .isInstanceOf(PoisonPaymentEventException.class);
        assertThat(applied).isEmpty();
    }

    @Test
    void missingRequiredField_isPoison() {
        // PaymentCaptured with no paymentId → unparseable → poison (dead-letter now).
        assertThatThrownBy(() -> consumer.onMessage(
            "{\"eventType\":\"PaymentCaptured\",\"walletId\":\"" + UUID.randomUUID() + "\"}"))
            .isInstanceOf(PoisonPaymentEventException.class);
        assertThat(applied).isEmpty();
    }
}
