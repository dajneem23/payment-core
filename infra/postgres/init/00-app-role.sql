-- Runs first (before bi-readonly / user-service DB), as the postgres superuser.
--
-- Create a dedicated, least-privilege application role. The services connect as
-- `vietpay`, never as the postgres superuser — so a compromised app credential
-- can't touch roles, other databases, or server config.

CREATE ROLE vietpay WITH LOGIN PASSWORD 'vietpay';

-- vietpay owns the money database + its schema so Flyway can create/alter tables.
ALTER DATABASE vietpay OWNER TO vietpay;
GRANT ALL ON SCHEMA public TO vietpay;
ALTER SCHEMA public OWNER TO vietpay;
