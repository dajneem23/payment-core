package com.vietpay.wallet.infrastructure.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vietpay.wallet.domain.shared.DomainEvent;
import com.vietpay.wallet.domain.shared.EventOutbox;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * JPA-backed {@link EventOutbox}. Writes each domain event as a PENDING outbox
 * row in the caller's transaction, so the event commits atomically with the
 * money movement (transactional outbox pattern).
 */
@Component
public class EventOutboxJpaAdapter implements EventOutbox {

    private final SpringDataOutboxRepository repository;
    private final ObjectMapper objectMapper;

    public EventOutboxJpaAdapter(SpringDataOutboxRepository repository,
                                 ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Override
    public void append(String aggregateType, UUID aggregateId, List<DomainEvent> events) {
        List<OutboxEventJpaEntity> rows = events.stream()
            .map(e -> new OutboxEventJpaEntity(
                UUID.randomUUID(), aggregateType, aggregateId, e.eventType(), toJson(e.payload())))
            .toList();
        repository.saveAll(rows);
    }

    private String toJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            // Abort the enclosing transaction — committing money without its
            // event would break the outbox guarantee.
            throw new IllegalStateException("failed to serialize outbox payload", e);
        }
    }
}
