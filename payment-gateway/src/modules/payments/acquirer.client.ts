import { Injectable } from '@nestjs/common';

import { ConfigService } from '../../shared/services/config.service';
import { LoggerService } from '../../shared/services/logger.service';

interface AuthorizeResponse {
    declined: boolean;
    reason?: string;
    providerRef?: string;
    status?: string;
}

interface CaptureResponse {
    status: string;
}

@Injectable()
export class AcquirerClient {
    private readonly timeoutMs = 2500;
    private readonly maxRetries = 2;

    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggerService,
    ) {}

    private getConfig(scheme: string): { baseUrl: string; secret: string } {
        const acq = this.config.acquirerConfig;
        if (scheme.toUpperCase() === 'VISA') {
            return { baseUrl: acq.visaUrl, secret: acq.visaHmacSecret };
        }
        return { baseUrl: acq.mastercardUrl, secret: acq.mastercardHmacSecret };
    }

    async authorize(
        payment: {
            id: string;
            amount: number;
            currency: string;
            cardToken: string;
            bin: string;
        },
        callbackUrl: string,
        scheme: string,
    ): Promise<AuthorizeResponse> {
        const { baseUrl } = this.getConfig(scheme);
        const apiKey = this.config.acquirerConfig.apiKey;
        const url = `${baseUrl}/acquirer/authorize`;
        const body = {
            paymentId: payment.id,
            amount: payment.amount,
            currency: payment.currency,
            cardToken: payment.cardToken,
            bin: payment.bin,
            callbackUrl,
        };

        return this.requestWithRetry<AuthorizeResponse>(url, apiKey, body);
    }

    async capture(
        payment: { id: string; amount: number; currency: string },
        providerRef: string,
        callbackUrl: string,
        scheme: string,
    ): Promise<CaptureResponse> {
        const { baseUrl } = this.getConfig(scheme);
        const apiKey = this.config.acquirerConfig.apiKey;
        const url = `${baseUrl}/acquirer/capture`;
        const body = {
            paymentId: payment.id,
            providerRef,
            amount: payment.amount,
            currency: payment.currency,
            callbackUrl,
        };

        return this.requestWithRetry<CaptureResponse>(url, apiKey, body);
    }

    private async requestWithRetry<T>(
        url: string,
        apiKey: string,
        body: Record<string, any>,
        attempt = 0,
    ): Promise<T> {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), this.timeoutMs);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            clearTimeout(timer);

            const data = (await response.json()) as any;

            if (response.status === 402) {
                return { declined: true, reason: data.reason || 'declined' } as T;
            }

            if (!response.ok && attempt < this.maxRetries) {
                this.logger.warn(
                    `Acquirer request failed (${response.status}), retrying (${attempt + 1}/${this.maxRetries})`,
                );
                return this.requestWithRetry<T>(url, apiKey, body, attempt + 1);
            }

            return data as T;
        } catch (err: any) {
            if (attempt < this.maxRetries) {
                this.logger.warn(
                    `Acquirer request error: ${err.message}, retrying (${attempt + 1}/${this.maxRetries})`,
                );
                return this.requestWithRetry<T>(url, apiKey, body, attempt + 1);
            }
            throw err;
        }
    }

    /** Get per-scheme HMAC secret for webhook verification. */
    getHmacSecret(scheme: string): string {
        return this.getConfig(scheme).secret;
    }
}
