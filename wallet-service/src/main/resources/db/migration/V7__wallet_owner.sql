-- V7: wallet ownership — every USER wallet is owned by exactly one user.
-- SYSTEM accounts (funding, card_clearing) have no owner (null).
-- The transfer path checks the caller's X-User-Id matches the source wallet's
-- owner before moving any money.

ALTER TABLE wallets ADD COLUMN owner_user_id UUID;
