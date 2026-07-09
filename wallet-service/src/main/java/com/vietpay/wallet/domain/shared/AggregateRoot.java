package com.vietpay.wallet.domain.shared;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Base class for aggregate roots. An aggregate is the consistency boundary: all
 * invariants are enforced through its methods. Aggregates record
 * {@link DomainEvent}s as they change state; the application layer pulls those
 * events after the aggregate is persisted and hands them to the outbox.
 */
public abstract class AggregateRoot {

    private final transient List<DomainEvent> domainEvents = new ArrayList<>();

    protected void registerEvent(DomainEvent event) {
        domainEvents.add(event);
    }

    /** Return and clear the pending events (call after persisting the aggregate). */
    public List<DomainEvent> pullDomainEvents() {
        List<DomainEvent> pending = List.copyOf(domainEvents);
        domainEvents.clear();
        return pending;
    }

    public List<DomainEvent> domainEvents() {
        return Collections.unmodifiableList(domainEvents);
    }
}
