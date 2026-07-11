-- V9: card-payment ownership moves to the payment-gateway service.
--
-- The gateway now owns the payment lifecycle in its OWN database
-- (vietpay_payments): /payments API, acquirer calls, webhook dedupe, and the
-- outbox that publishes PaymentCaptured to Kafka. wallet-service keeps only the
-- MONEY effect of a settled card payment, applied by a Kafka consumer of
-- payment-events. So here we:
--   1. drop the now cross-service FK and the tables the gateway owns,
--   2. tighten the ledger's per-entry source invariant,
--   3. add a consumer-side idempotency guard.

-- ledger_entries.payment_id becomes a SOFT reference to a payment that lives in
-- the gateway's database. Keep the column, drop the (now impossible) FK.
ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_payment_id_fkey;

-- These tables' ownership moved out of this service.
DROP TABLE IF EXISTS processed_webhooks;
DROP TABLE IF EXISTS payments;

-- Every ledger entry has exactly one source: a transfer XOR a payment.
ALTER TABLE ledger_entries
    ADD CONSTRAINT ledger_entries_one_source
    CHECK ((transfer_id IS NOT NULL) <> (payment_id IS NOT NULL));

-- Consumer-side idempotency: a payment's ledger effect is applied at most once,
-- even under at-least-once Kafka redelivery of PaymentCaptured. The row is
-- inserted in the SAME transaction that posts the double-entry, so "applied"
-- and "posted" commit together.
CREATE TABLE applied_payments (
    payment_id UUID        PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
