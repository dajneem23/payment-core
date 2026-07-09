-- Runs once on first Postgres init (before Flyway).
-- Creates a read-only role for Superset/BI so analytics never touches the OLTP
-- write path. In production this role would live on a read replica.

CREATE ROLE bi_readonly WITH LOGIN PASSWORD 'bi_readonly';

GRANT CONNECT ON DATABASE vietpay TO bi_readonly;
GRANT USAGE ON SCHEMA public TO bi_readonly;

-- Existing and future tables created by the app owner (vietpay) are read-only
-- to this role.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO bi_readonly;
ALTER DEFAULT PRIVILEGES FOR ROLE vietpay IN SCHEMA public
    GRANT SELECT ON TABLES TO bi_readonly;