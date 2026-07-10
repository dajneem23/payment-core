-- V1: core money model — wallets, transfers, double-entry ledger.
-- The ledger is the source of truth; wallet.balance is a locked cache for fast
-- reads and overdraw checks, reconcilable by summing ledger entries.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- wallets
-- ---------------------------------------------------------------------------
CREATE TABLE wallets (
    id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    currency    CHAR(3)        NOT NULL,
    -- balance is the cached, locked figure. The CHECK is the last-line DB
    -- guarantee against overdraw, independent of any application logic.
    balance     NUMERIC(19, 4) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    -- SYSTEM accounts (e.g. card_clearing) may legitimately go negative as the
    -- external-money counter-account, so they are exempt from the >= 0 rule.
    kind        VARCHAR(16)    NOT NULL DEFAULT 'USER',   -- USER | SYSTEM
    version     BIGINT         NOT NULL DEFAULT 0,        -- optimistic backstop
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT wallets_balance_nonneg_for_user
        CHECK (kind = 'SYSTEM' OR balance >= 0)
);

-- ---------------------------------------------------------------------------
-- transfers — one row per transfer request; idempotency key is UNIQUE.
-- response_snapshot stores the original result returned on idempotent replay.
-- ---------------------------------------------------------------------------
CREATE TABLE transfers (
    id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key   VARCHAR(200)   NOT NULL UNIQUE,
    source_wallet_id  UUID           NOT NULL REFERENCES wallets(id),
    dest_wallet_id    UUID           NOT NULL REFERENCES wallets(id),
    amount            NUMERIC(19, 4) NOT NULL CHECK (amount > 0),
    currency          CHAR(3)        NOT NULL,
    dest_amount       NUMERIC(19, 4) NOT NULL,
    dest_currency     CHAR(3)        NOT NULL,
    fx_rate           NUMERIC(19, 8) NOT NULL DEFAULT 1,
    status            VARCHAR(20)    NOT NULL,            -- COMPLETED | FAILED
    response_snapshot JSONB,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT transfers_distinct_wallets CHECK (source_wallet_id <> dest_wallet_id)
);

CREATE INDEX idx_transfers_source ON transfers(source_wallet_id);
CREATE INDEX idx_transfers_dest   ON transfers(dest_wallet_id);

-- ---------------------------------------------------------------------------
-- ledger_entries — immutable, append-only. Per transfer, sum(debits) must
-- equal sum(credits). A wallet's balance is reconcilable from these rows.
-- ---------------------------------------------------------------------------
CREATE TABLE ledger_entries (
    id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id  UUID           REFERENCES transfers(id),
    payment_id   UUID,                                    -- set for card flows (V3)
    wallet_id    UUID           NOT NULL REFERENCES wallets(id),
    direction    VARCHAR(6)     NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
    amount       NUMERIC(19, 4) NOT NULL CHECK (amount > 0),
    currency     CHAR(3)        NOT NULL,
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_wallet   ON ledger_entries(wallet_id, created_at);
CREATE INDEX idx_ledger_transfer ON ledger_entries(transfer_id);

-- ---------------------------------------------------------------------------
-- fx_rates — seeded reference rates (fx-service is authoritative at runtime;
-- this seed keeps same-DB reconciliation and tests deterministic).
-- ---------------------------------------------------------------------------
CREATE TABLE fx_rates (
    base   CHAR(3)        NOT NULL,
    quote  CHAR(3)        NOT NULL,
    rate   NUMERIC(19, 8) NOT NULL CHECK (rate > 0),
    PRIMARY KEY (base, quote)
);

INSERT INTO fx_rates (base, quote, rate) VALUES
    ('USD', 'EUR', 0.92000000),
    ('EUR', 'USD', 1.08695652),
    ('USD', 'VND', 25400.00000000),
    ('VND', 'USD', 0.00003937),
    ('USD', 'GBP', 0.79000000),
    ('GBP', 'USD', 1.26582278);
