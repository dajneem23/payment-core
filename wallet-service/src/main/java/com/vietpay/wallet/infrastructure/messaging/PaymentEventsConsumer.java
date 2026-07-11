package com.vietpay.wallet.infrastructure.messaging;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vietpay.wallet.application.payment.ApplyPaymentService;
import com.vietpay.wallet.application.payment.CapturedPayment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Consumes settled card payments from the gateway (topic {@code payment-events})
 * and posts their double-entry via {@link ApplyPaymentService}. Idempotency lives
 * in the application service (the {@code applied_payments} guard), so at-least-once
 * redelivery is safe.
 *
 * <p>Only {@code PaymentCaptured} carries a money effect; other event types are
 * ignored. A handler that throws does NOT commit the offset, so the message is
 * redelivered — the idempotency guard makes that safe.
 */
@Component
@ConditionalOnProperty(name = "app.payments.consumer.enabled", havingValue = "true", matchIfMissing = true)
public class PaymentEventsConsumer {

    private static final Logger log = LoggerFactory.getLogger(PaymentEventsConsumer.class);

    private final ApplyPaymentService applyPaymentService;
    private final ObjectMapper objectMapper;

    public PaymentEventsConsumer(ApplyPaymentService applyPaymentService, ObjectMapper objectMapper) {
        this.applyPaymentService = applyPaymentService;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(
        topics = "${app.payments.topic:payment-events}",
        groupId = "${app.payments.consumer.group:wallet-service}")
    public void onMessage(String payload) {
        try {
            JsonNode e = objectMapper.readTree(payload);
            String type = e.path("eventType").asText();
            if (!"PaymentCaptured".equals(type)) {
                log.debug("ignoring payment event type {}", type);
                return;
            }
            CapturedPayment cmd = new CapturedPayment(
                UUID.fromString(e.get("paymentId").asText()),
                UUID.fromString(e.get("walletId").asText()),
                new BigDecimal(e.get("amount").asText()),
                e.get("currency").asText(),
                e.path("scheme").asText(null),
                e.path("ownerUserId").asText(null));
            applyPaymentService.applyCapturedTopup(cmd);
        } catch (RuntimeException e) {
            log.error("failed to apply payment event; will be redelivered: {}", payload, e);
            throw e;   // don't commit offset — retry
        } catch (Exception e) {
            log.error("malformed payment event; will be redelivered: {}", payload, e);
            throw new RuntimeException(e);
        }
    }
}
