-- ============================================================================
-- VietPay — one-shot database init (roles + databases + schema snapshots).
--
-- Use this ONLY if you are NOT running the stack via docker compose (which
-- auto-runs all migrations for you — Flyway for wallet-service, TypeORM for
-- fx-service and payment-gateway). This is a convenience for loading the schema
-- into a bare Postgres so an interviewer can inspect it without the apps.
--
-- Run from THIS directory (docs/schema) against a FRESH Postgres, as a superuser:
--     psql -h localhost -U postgres -f init-all.sql
--
-- The \connect + \i commands are psql meta-commands, so run it with psql (not a
-- generic SQL client).
-- ============================================================================

-- Least-privilege application role (mirrors infra/postgres/init/00-app-role.sql).
CREATE ROLE vietpay WITH LOGIN PASSWORD 'vietpay';

-- One database per bounded context (mirrors infra/postgres/init/*).
CREATE DATABASE vietpay          OWNER vietpay;   -- money ledger (wallet-service)
CREATE DATABASE vietpay_fx       OWNER vietpay;   -- FX rates (fx-service)
CREATE DATABASE vietpay_payments OWNER vietpay;   -- card payments (payment-gateway)
CREATE DATABASE vietpay_users    OWNER vietpay;   -- auth (user-service; schema created by the app)

-- Load each schema snapshot into its database.
\connect vietpay
\i vietpay.sql

\connect vietpay_fx
\i vietpay_fx.sql

\connect vietpay_payments
\i vietpay_payments.sql

\connect vietpay_users
\i vietpay_users.sql
