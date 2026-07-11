package com.vietpay.wallet.infrastructure.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.KafkaException;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

/**
 * Dead-letter handling for the payment-events consumer.
 *
 * <p>Without this, a message that always fails ({@code applyCapturedTopup}
 * throwing) is redelivered forever and blocks its partition — no later message
 * is ever processed. This installs a {@link DefaultErrorHandler} that:
 * <ul>
 *   <li>retries a few times with a fixed backoff (for TRANSIENT faults — a lock
 *       timeout, a brief DB outage), then</li>
 *   <li>publishes the record to {@code payment-events.DLT} via
 *       {@link DeadLetterPublishingRecoverer} and commits the offset, so the
 *       partition keeps flowing.</li>
 * </ul>
 *
 * <p>{@link PoisonPaymentEventException} (malformed/unparseable events) is marked
 * NON-retryable, so poison messages skip the retries and dead-letter immediately.
 *
 * <p>Spring Boot auto-applies the single {@code CommonErrorHandler} bean to the
 * auto-configured {@code @KafkaListener} container factory — no factory wiring
 * needed here. Gated on the same flag as the consumer so tests without a broker
 * don't construct it.
 */
@Configuration
@ConditionalOnProperty(name = "app.payments.consumer.enabled", havingValue = "true", matchIfMissing = true)
public class KafkaConsumerConfig {

    private static final Logger log = LoggerFactory.getLogger(KafkaConsumerConfig.class);

    @Bean
    public DefaultErrorHandler kafkaErrorHandler(
            KafkaTemplate<String, String> template,
            @Value("${app.payments.consumer.max-attempts:3}") long maxAttempts) {

        // Publishes the failed record to <topic>.DLT (same key/partition), then
        // the handler commits the offset so processing continues.
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(template);

        // maxAttempts total = 1 initial delivery + (maxAttempts-1) retries.
        long retries = Math.max(0, maxAttempts - 1);
        DefaultErrorHandler handler = new DefaultErrorHandler(recoverer, new FixedBackOff(1000L, retries));

        // Poison (unparseable) events can't succeed on retry — dead-letter at once.
        handler.addNotRetryableExceptions(PoisonPaymentEventException.class);
        handler.setCommitRecovered(true);
        handler.setLogLevel(KafkaException.Level.WARN);
        handler.setRetryListeners((record, ex, attempt) ->
            log.warn("payment-events delivery attempt {} failed (offset={}): {}",
                attempt, record.offset(), ex.toString()));
        return handler;
    }
}
