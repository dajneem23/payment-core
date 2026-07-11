-- Database for payment-gateway: the card-payment lifecycle (payments, webhook
-- dedupe, transactional outbox), owned by the least-privilege app role. Distinct
-- from the money ledger (vietpay), users (vietpay_users), and fx (vietpay_fx).
CREATE DATABASE vietpay_payments OWNER vietpay;
