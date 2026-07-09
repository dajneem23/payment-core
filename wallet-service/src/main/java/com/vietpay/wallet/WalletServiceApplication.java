package com.vietpay.wallet;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * VietPay Wallet &amp; Transfer service — the graded core of the assessment.
 *
 * <p>Owns safe money movement: double-entry ledger, DB-level idempotency and
 * overdraw prevention, plus the transactional outbox that feeds downstream
 * (NestJS) services over Kafka.
 */
@SpringBootApplication
@EnableScheduling
public class WalletServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(WalletServiceApplication.class, args);
    }
}
