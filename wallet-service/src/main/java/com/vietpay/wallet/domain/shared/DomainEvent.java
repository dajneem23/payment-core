package com.vietpay.wallet.domain.shared;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * A domain event: a fact that happened in the domain, expressed in the
 * ubiquitous language. Carries an {@code eventId} so downstream consumers can
 * dedupe at-least-once deliveries, and an {@code occurredAt} timestamp.
 */
public interface DomainEvent {

    UUID eventId();

    Instant occurredAt();

    /** Stable event name used as the outbox {@code event_type}. */
    String eventType();

    /**
     * The event's wire payload as a flat map.
     */
    Map<String, Object> payload();
}
