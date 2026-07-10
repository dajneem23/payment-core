package com.vietpay.wallet.infrastructure.fraud;

import com.vietpay.wallet.domain.fraud.FraudCheck;
import com.vietpay.wallet.domain.fraud.FraudDecision;
import com.vietpay.wallet.domain.fraud.FraudPolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.ClientHttpRequestFactories;
import org.springframework.boot.web.client.ClientHttpRequestFactorySettings;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.UUID;

/**
 * FraudPolicy adapter calling the (NestJS) fraud-service.
 *
 * <p>Disabled by default ({@code app.fraud.enabled=false}) so the money path
 * runs without the fraud-service deployed; enable it to exercise the real
 * check. When enabled and the service is unreachable/slow (a per-request
 * timeout bounds the call), the fallback honours {@code app.fraud.fail-open}
 * — default fail-CLOSED (deny), the safer choice for money.
 */
@Component
public class FraudCheckHttpAdapter implements FraudPolicy {

    private static final Logger log = LoggerFactory.getLogger(FraudCheckHttpAdapter.class);

    private final boolean enabled;
    private final boolean failOpen;
    private final RestClient restClient;

    public FraudCheckHttpAdapter(@Value("${app.fraud.enabled:false}") boolean enabled,
                                 @Value("${app.fraud.fail-open:false}") boolean failOpen,
                                 @Value("${app.fraud.base-url:http://localhost:3001}") String baseUrl) {
        this.enabled = enabled;
        this.failOpen = failOpen;
        var settings = ClientHttpRequestFactorySettings.DEFAULTS
            .withConnectTimeout(Duration.ofSeconds(1))
            .withReadTimeout(Duration.ofSeconds(2));
        this.restClient = RestClient.builder()
            .baseUrl(baseUrl)
            .requestFactory(ClientHttpRequestFactories.get(settings))
            .build();
    }

    private record Request(UUID sourceWalletId, UUID destWalletId, BigDecimal amount,
                           String currency) {
    }

    @Override
    public FraudDecision check(FraudCheck request) {
        if (!enabled) {
            return FraudDecision.allowed();
        }
        try {
            FraudDecision decision = restClient.post()
                .uri("/fraud-check")
                .body(new Request(request.sourceWalletId().value(),
                    request.destWalletId().value(),
                    request.amount().amount(),
                    request.amount().currencyCode()))
                .retrieve()
                .body(FraudDecision.class);
            return decision != null ? decision : FraudDecision.allowed();
        } catch (Exception e) {
            if (failOpen) {
                log.warn("fraud-service unavailable, failing OPEN: {}", e.toString());
                return FraudDecision.allowed();
            }
            log.warn("fraud-service unavailable, failing CLOSED: {}", e.toString());
            return FraudDecision.denied("fraud check unavailable");
        }
    }
}
