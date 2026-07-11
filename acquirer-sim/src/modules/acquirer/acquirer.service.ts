import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { ConfigService } from '../../shared/services/config.service';
import { LoggerService } from '../../shared/services/logger.service';
import { AuthorizeDto, CaptureDto } from './dtos/authorize.dto';
import { WebhookClient } from './webhook.client';

@Injectable()
export class AcquirerService {
    constructor(
        private readonly _configService: ConfigService,
        private readonly _logger: LoggerService,
        private readonly _webhookClient: WebhookClient,
    ) {}

    authorize(dto: AuthorizeDto): {
        declined?: boolean;
        reason?: string;
        providerRef?: string;
        status?: string;
    } {
        const config = this._configService.acquirerConfig;
        const scheme = config.scheme;

        // Check allowed BINs (filter only if allowedBins is non-empty)
        if (
            config.allowedBins.length > 0 &&
            !config.allowedBins.includes(dto.bin)
        ) {
            this._logger.warn(
                `Authorize declined: BIN ${dto.bin} not in allowed list for ${scheme}`,
            );
            return { declined: true, reason: 'BIN not allowed' };
        }

        // Random decline based on declineRate
        if (Math.random() < config.declineRate) {
            this._logger.warn(
                `Authorize declined: random decline for payment ${dto.paymentId}`,
            );
            return { declined: true, reason: 'Random decline' };
        }

        const providerRef = `${scheme}-${randomUUID().slice(0, 12)}`;

        this._logger.info(
            `Authorize success: payment ${dto.paymentId} -> providerRef ${providerRef} (${scheme})`,
        );

        return {
            declined: false,
            providerRef,
            status: 'AUTHORIZED',
        };
    }

    async capture(dto: CaptureDto): Promise<{ status: string }> {
        const config = this._configService.acquirerConfig;
        const scheme = config.scheme;

        this._logger.info(
            `Capture: payment ${dto.paymentId}, providerRef ${dto.providerRef} (${scheme})`,
        );

        // Schedule settlement webhook after configured delay
        setTimeout(() => {
            this._webhookClient
                .fireSettlement(dto.callbackUrl, scheme, {
                    providerRef: dto.providerRef,
                    paymentId: dto.paymentId,
                    status: 'SETTLED',
                })
                .catch(() => {
                    // fireSettlement already handles errors internally
                });
        }, config.settlementDelayMs);

        return { status: 'CAPTURED' };
    }
}
