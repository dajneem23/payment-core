-- Second database for fx-service (stores the latest Vietcombank rates), owned by
-- the least-privilege app role. Distinct from the money ledger and the users DB.

CREATE DATABASE vietpay_fx OWNER vietpay;
