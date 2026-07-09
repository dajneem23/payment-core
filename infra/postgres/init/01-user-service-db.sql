-- Second Postgres instance for user-service: one DB for user authentication, a
-- distinct database from the money ledger. In production these would live on
-- separate clusters; running them as one compose service with two databases
-- keeps the dev environment light while still isolating the schemas.

CREATE DATABASE vietpay_users OWNER vietpay;
