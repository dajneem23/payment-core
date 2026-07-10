-- V2: transactional outbox + ShedLock table.
--
-- The outbox row is written in the SAME transaction as the transfer, so the
-- event can never be lost or published without the money having moved. A
-- separate relay (guarded by a ShedLock/Redis lease so only one replica runs)
-- polls PENDING rows and publishes them to Kafka.

CREATE TABLE outbox_events (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(50)  NOT NULL,     -- e.g. 'Transfer'
    aggregate_id   UUID         NOT NULL,
    event_type     VARCHAR(80)  NOT NULL,     -- e.g. 'TransferCompleted'
    payload        JSONB        NOT NULL,
    status         VARCHAR(16)  NOT NULL DEFAULT 'PENDING',  -- PENDING | PUBLISHED
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    published_at   TIMESTAMPTZ
);

-- Partial index: the relay only ever scans PENDING rows, and this keeps that
-- scan cheap even as the published history grows.
CREATE INDEX idx_outbox_pending
    ON outbox_events(created_at)
    WHERE status = 'PENDING';

-- ShedLock: single-writer coordination for the @Scheduled outbox relay.
CREATE TABLE shedlock (
    name       VARCHAR(64)  PRIMARY KEY,
    lock_until TIMESTAMPTZ  NOT NULL,
    locked_at  TIMESTAMPTZ  NOT NULL,
    locked_by  VARCHAR(255) NOT NULL
);
