package com.vietpay.wallet;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Base for integration tests that need a REAL PostgreSQL — because the money
 * path's guarantees (SELECT ... FOR UPDATE, the CHECK constraint, unique
 * idempotency key) are database behaviour that an in-memory DB or mocks can't
 * reproduce.
 *
 * <p>Uses the singleton-container pattern: one Postgres is started once per JVM
 * and shared across test classes (Ryuk tears it down at the end). Flyway runs
 * the real migrations against it, so the schema + seeded SYSTEM accounts match
 * production exactly. Redis/Kafka autoconfig is excluded — the transfer path
 * doesn't need them (caching is inert without @EnableCaching, and the outbox
 * only writes rows; nothing publishes to Kafka yet).
 */
@SpringBootTest
public abstract class AbstractPostgresIT {

    static final PostgreSQLContainer<?> POSTGRES =
        new PostgreSQLContainer<>("postgres:16-alpine");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.autoconfigure.exclude", () -> String.join(",",
            "org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration",
            "org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration",
            "org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration"));
        // Fraud check is disabled by default; keep it so, so no fraud-service is needed.
        registry.add("app.fraud.enabled", () -> "false");
        // Outbox relay publishes to Kafka + uses a Redis ShedLock — both excluded
        // here, so disable the relay; the transfer path still writes outbox rows.
        registry.add("app.outbox.enabled", () -> "false");
        // Payment consumer needs a Kafka broker (excluded here) — disable it; the
        // PaymentConsumerIT drives ApplyPaymentService directly instead.
        registry.add("app.payments.consumer.enabled", () -> "false");
    }
}
