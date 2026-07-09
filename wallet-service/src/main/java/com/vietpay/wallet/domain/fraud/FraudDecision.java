package com.vietpay.wallet.domain.fraud;

/** Outcome of a fraud check. {@code allow=false} must block the transfer. */
public record FraudDecision(boolean allow, String reason) {

    public static FraudDecision allowed() {
        return new FraudDecision(true, "ok");
    }

    public static FraudDecision denied(String reason) {
        return new FraudDecision(false, reason);
    }
}
