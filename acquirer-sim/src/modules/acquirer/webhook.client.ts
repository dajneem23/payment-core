import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createHmac } from 'crypto';

import { ConfigService } from '../../shared/services/config.service';
import { LoggerService } from '../../shared/services/logger.service';

@Injectable()
export class WebhookClient {
    constructor(
        private readonly _configService: ConfigService,
        private readonly _logger: LoggerService,
    ) {}

    async fireSettlement(
        callbackUrl: string,
        scheme: string,
        body: { providerRef: string; paymentId: string; status: string },
    ): Promise<void> {
        const payload = {
            providerEventId: randomUUID(),
            providerRef: body.providerRef,
            paymentId: body.paymentId,
            status: body.status,
        };

        const raw = JSON.stringify(payload);
        const hmacSecret = this._configService.acquirerConfig.hmacSecret;
        const signature = createHmac('sha256', hmacSecret)
            .update(raw)
            .digest('hex');

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Signature': signature,
        };

        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(callbackUrl, {
                    method: 'POST',
                    headers,
                    body: raw,
                });

                if (!response.ok) {
                    this._logger.warn(
                        `Webhook attempt ${attempt}/${maxRetries}: callback ${callbackUrl} returned ${response.status}`,
                    );
                    if (attempt < maxRetries) {
                        await this._sleep(200 * attempt);
                        continue;
                    }
                    this._logger.error(
                        `Webhook failed after ${maxRetries} attempts: callback ${callbackUrl}`,
                        undefined,
                        'WebhookClient',
                    );
                    return;
                }

                this._logger.info(
                    `Webhook sent successfully to ${callbackUrl} for payment ${body.paymentId}`,
                );
                return;
            } catch (err) {
                this._logger.warn(
                    `Webhook attempt ${attempt}/${maxRetries}: network error for ${callbackUrl} — ${err instanceof Error ? err.message : String(err)}`,
                );
                if (attempt < maxRetries) {
                    await this._sleep(200 * attempt);
                } else {
                    this._logger.error(
                        `Webhook failed after ${maxRetries} attempts: ${callbackUrl}`,
                        err instanceof Error ? err.stack : String(err),
                        'WebhookClient',
                    );
                }
            }
        }
    }

    private _sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
