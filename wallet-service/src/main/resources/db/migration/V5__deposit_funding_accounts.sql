-- V5: per-currency SYSTEM "external-funding" accounts.
--
-- A deposit is modelled as a transfer FROM one of these funding accounts TO the
-- user's wallet (DEBIT funding, CREDIT wallet) — so it reuses the whole transfer
-- path (idempotency, row locking, double-entry ledger, outbox) with no new
-- money-movement code. Being SYSTEM-kind, a funding account is exempt from the
-- balance >= 0 rule and legitimately goes negative: its balance is the running
-- total of money that has entered the system from outside (a nostro/clearing
-- position). One account per supported currency, since a transfer is
-- same-currency.

INSERT INTO wallets (id, currency, balance, kind) VALUES
    ('00000000-0000-0000-0000-000000000010', 'USD', 0, 'SYSTEM'),
    ('00000000-0000-0000-0000-000000000011', 'EUR', 0, 'SYSTEM'),
    ('00000000-0000-0000-0000-000000000012', 'VND', 0, 'SYSTEM'),
    ('00000000-0000-0000-0000-000000000013', 'GBP', 0, 'SYSTEM');
