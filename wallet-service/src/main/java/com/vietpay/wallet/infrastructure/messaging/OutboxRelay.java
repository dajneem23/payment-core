package com.vietpay.wallet.infrastructure.messaging;

import com.vietpay.wallet.infrastructure.persistence.OutboxEventJpaEntity;
import com.vietpay.wallet.infrastructure.persistence.SpringDataOutboxRepository;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Limit;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Transactional-outbox relay: polls PENDING outbox rows and publishes them to
 * Kafka, then marks them PUBLISHED. Because the outbox row was written in the
 * same transaction as the money movement, the event can never be lost or emitted
 * without the money having moved (no dual-write).
 *
 * <p>Delivery is at-least-once: a row is only marked PUBLISHED after the broker
 * acks ({@code .get()}); if publish fails we stop and leave the rest PENDING for
 * the next poll (preserving per-aggregate order). The consumer dedupes by
 * eventId. {@link SchedulerLock} ensures only one replica publishes at a time.
 */
@Component
@ConditionalOnProperty(name = "app.outbox.enabled", havingValue = "true", matchIfMissing = true)
public class OutboxRelay {

    private static final Logger log = LoggerFactory.getLogger(OutboxRelay.class);
    private static final int BATCH = 100;

    private final SpringDataOutboxRepository outbox;
    private final KafkaTemplate<String, String> kafka;
    private final String topic;

    public OutboxRelay(SpringDataOutboxRepository outbox, KafkaTemplate<String, String> kafka,
                       @Value("${app.outbox.topic}") String topic) {
        this.outbox = outbox;
        this.kafka = kafka;
        this.topic = topic;
    }

    @Scheduled(fixedDelayString = "${app.outbox.poll-delay-ms:1000}")
    @SchedulerLock(name = "outboxRelay", lockAtLeastFor = "PT0.5S", lockAtMostFor = "PT30S")
    @Transactional
    public void publishPending() {
        List<OutboxEventJpaEntity> batch = outbox.findByStatusOrderByCreatedAtAsc(
            OutboxEventJpaEntity.Status.PENDING.name(), Limit.of(BATCH));
        if (batch.isEmpty()) {
            return;
        }
        int published = 0;
        for (OutboxEventJpaEntity event : batch) {
            try {
                // Key by aggregate id so all events for one transfer stay ordered.
                kafka.send(topic, event.getAggregateId().toString(), event.getPayload()).get();
                event.markPublished();
                published++;
            } catch (Exception e) {
                log.warn("outbox publish failed for {}, will retry: {}", event.getId(), e.toString());
                break;
            }
        }
        outbox.saveAll(batch);
        if (published > 0) {
            log.info("published {} outbox event(s) to topic {}", published, topic);
        }
    }
}
