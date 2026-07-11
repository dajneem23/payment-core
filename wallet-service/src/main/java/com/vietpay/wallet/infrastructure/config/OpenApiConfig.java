package com.vietpay.wallet.infrastructure.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Top-level OpenAPI info shown at the top of Swagger UI (/swagger-ui.html).
 * Per-endpoint docs live as {@code @Operation}/{@code @Tag} annotations on the
 * controllers.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI vietpayOpenAPI() {
        return new OpenAPI().info(new Info()
            .title("VietPay Wallet API")
            .version("v1")
            .description("""
                Safe money movement — wallets, transfers, admin deposits and card top-ups \
                backed by an immutable double-entry ledger.

                **Idempotency:** money-moving requests take an `Idempotency-Key` header; \
                the same key moves money at most once and replays the original result.

                **Identity:** the caller's user id and role arrive as the `X-User-Id` / \
                `X-User-Role` headers, set by the API gateway (Traefik ForwardAuth) from \
                your JWT. When calling this service directly (bypassing the gateway), \
                supply them yourself.""")
            .contact(new Contact().name("VietPay"))
            .license(new License().name("MIT")));
    }
}
