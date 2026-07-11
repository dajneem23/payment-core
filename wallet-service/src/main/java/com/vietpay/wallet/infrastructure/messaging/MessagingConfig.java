package com.vietpay.wallet.infrastructure.messaging;

import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.provider.redis.spring.RedisLockProvider;
import net.javacrumbs.shedlock.spring.annotation.EnableSchedulerLock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;

/**
 * Enables ShedLock over Redis so the outbox relay runs on only ONE
 * wallet-service replica at a time. This is a deliberate distributed lock for an
 * at-most-once job: a lost/expired lease at worst double-publishes an event,
 * which the consumer dedupes by eventId — never a double money movement. The
 * money path itself never uses this lock (it uses a pessimistic DB row lock).
 *
 * <p>Gated on app.outbox.enabled so tests (which exclude Redis/Kafka) don't need
 * a Redis connection.
 */
@Configuration
@ConditionalOnProperty(name = "app.outbox.enabled", havingValue = "true", matchIfMissing = true)
@EnableSchedulerLock(defaultLockAtMostFor = "PT30S")
public class MessagingConfig {

    @Bean
    public LockProvider lockProvider(RedisConnectionFactory connectionFactory) {
        return new RedisLockProvider(connectionFactory, "vietpay");
    }
}
