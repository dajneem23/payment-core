package com.vietpay.wallet.domain.shared;

import java.util.List;
import java.util.UUID;

/**
 * Outbox port (driven). Domain events are appended here inside the SAME
 * transaction as the state change that produced them, so an event can never be
 * lost or published without the money having moved. A separate relay later
 * publishes the stored rows to Kafka.
 */
public interface EventOutbox {

    /** Persist events for an aggregate as PENDING outbox rows (in the caller's tx). */
    void append(String aggregateType, UUID aggregateId, List<DomainEvent> events);
}
