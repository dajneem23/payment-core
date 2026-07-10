-- V3: card payments (Visa / Mastercard) — external money in/out of wallets.
--
-- Card money is still recorded double-entry against a SYSTEM "card_clearing"
-- account so the ledger stays balanced and reconcilable:
--   top-up : DEBIT card_clearing, CREDIT user wallet
--   payout : DEBIT user wallet,   CREDIT card_clearing
-- The card_clearing account is SYSTEM-kind, so it is exempt from the balance
-- >= 0 constraint (it is the external counter-account and swings both ways).

-- Fixed, well-known id so services can reference the clearing account.
INSERT INTO wallets (id, currency, balance, kind)
VALUES ('00000000-0000-0000-0000-000000000001', 'USD', 0, 'SYSTEM');

CREATE TABLE payments (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    type            VARCHAR(10)    NOT NULL CHECK (type IN ('TOPUP', 'PAYOUT')),
    wallet_id       UUID           NOT NULL REFERENCES wallets(id),
    scheme          VARCHAR(12)    NOT NULL CHECK (scheme IN ('VISA', 'MASTERCARD')),
    card_token      VARCHAR(64)    NOT NULL,      -- tokenized; never a raw PAN
    amount          NUMERIC(19, 4) NOT NULL CHECK (amount > 0),
    currency        CHAR(3)        NOT NULL,
    -- PENDING -> AUTHORIZED -> CAPTURED/SETTLED, or FAILED / REVERSED
    status          VARCHAR(16)    NOT NULL,
    provider_ref    VARCHAR(80),                  -- acquirer reference
    idempotency_key VARCHAR(200)   NOT NULL UNIQUE,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_wallet ON payments(wallet_id);

-- Idempotent webhook handling: dedupe by the provider's event id. A duplicate
-- delivery hits this UNIQUE constraint and becomes a no-op.
CREATE TABLE processed_webhooks (
    provider_event_id VARCHAR(120) PRIMARY KEY,
    payment_id        UUID         REFERENCES payments(id),
    received_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
