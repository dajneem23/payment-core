package com.vietpay.wallet.domain.fraud;

/**
 * Fraud policy port (driven). The domain expresses only the intent — "is this
 * transfer allowed?" — and stays ignorant of how the answer is obtained (a
 * remote fraud-service, protected by timeout/retry/circuit breaker, lives in
 * infrastructure). Resolved BEFORE the money transaction opens, so no wallet
 * lock is ever held across this call.
 */
public interface FraudPolicy {

    FraudDecision check(FraudCheck request);
}
