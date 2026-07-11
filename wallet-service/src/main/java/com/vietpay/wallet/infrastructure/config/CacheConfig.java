package com.vietpay.wallet.infrastructure.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vietpay.wallet.application.wallet.WalletService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.cache.RedisCacheManagerBuilderCustomizer;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.cache.interceptor.SimpleCacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext.SerializationPair;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;

/**
 * Turns Spring's caching aspect ON (without {@link EnableCaching} the
 * {@code @Cacheable}/{@code @CacheEvict} on {@link WalletService} are silent
 * no-ops) and configures the wallet read-model cache.
 *
 */
@Configuration
@EnableCaching
public class CacheConfig implements CachingConfigurer {

    private static final Logger log = LoggerFactory.getLogger(CacheConfig.class);

    @Bean
    public RedisCacheManagerBuilderCustomizer walletCacheCustomizer(ObjectMapper objectMapper) {
        RedisCacheConfiguration walletView = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofSeconds(60))
            .disableCachingNullValues()
            .serializeKeysWith(SerializationPair.fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(SerializationPair.fromSerializer(
                new Jackson2JsonRedisSerializer<>(objectMapper,
                    com.vietpay.wallet.application.wallet.WalletView.class)));
        return builder -> builder.withCacheConfiguration(WalletService.WALLET_VIEW, walletView);
    }

    /** Fail-open: log and continue instead of propagating cache errors, so a
     *  Redis blip degrades to a DB read rather than a 500. */
    @Override
    public CacheErrorHandler errorHandler() {
        return new SimpleCacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException ex, Cache cache, Object key) {
                log.warn("cache GET error on {}[{}] — serving from source: {}", cache.getName(), key, ex.toString());
            }
            @Override
            public void handleCachePutError(RuntimeException ex, Cache cache, Object key, Object value) {
                log.warn("cache PUT error on {}[{}]: {}", cache.getName(), key, ex.toString());
            }
            @Override
            public void handleCacheEvictError(RuntimeException ex, Cache cache, Object key) {
                log.warn("cache EVICT error on {}[{}]: {}", cache.getName(), key, ex.toString());
            }
        };
    }
}
