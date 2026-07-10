-- V4: change all CHAR(3) currency columns to VARCHAR(3).
-- PostgreSQL CHAR(n) / bpchar is a legacy padded type that causes Hibernate
-- schema-validation mismatches (String → varchar, not char). VARCHAR(3) is
-- semantically identical for currency codes and avoids the type mismatch.

ALTER TABLE wallets        ALTER COLUMN currency      TYPE VARCHAR(3);
ALTER TABLE transfers      ALTER COLUMN currency      TYPE VARCHAR(3);
ALTER TABLE transfers      ALTER COLUMN dest_currency TYPE VARCHAR(3);
ALTER TABLE ledger_entries ALTER COLUMN currency      TYPE VARCHAR(3);
ALTER TABLE payments       ALTER COLUMN currency      TYPE VARCHAR(3);
