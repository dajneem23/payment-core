-- V10: per-currency card_clearing accounts for multi-currency top-ups.
--
-- V3 seeded only USD (…0001). To support EUR, VND, and GBP card top-ups we
-- need a clearing account per currency — exactly the same pattern as the
-- per-currency funding accounts in V5. The clearing account is SYSTEM-kind,
-- so it is exempt from the balance >= 0 constraint (the external card counter-account).

INSERT INTO wallets (id, currency, balance, kind)
VALUES ('00000000-0000-0000-0000-000000000002', 'EUR', 0, 'SYSTEM'),
       ('00000000-0000-0000-0000-000000000003', 'VND', 0, 'SYSTEM'),
       ('00000000-0000-0000-0000-000000000004', 'GBP', 0, 'SYSTEM');
