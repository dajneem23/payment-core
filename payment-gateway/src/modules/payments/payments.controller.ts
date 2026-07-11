import {
    Body,
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Req,
    UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { AcquirerClient } from './acquirer.client';
import { SettlementWebhookDto } from './dtos/webhook.dto';
import { TopupDto } from './dtos/topup.dto';
import { verifySignature } from './hmac.util';
import { PaymentsService } from './payments.service';

@Controller('payments')
@ApiTags('payments')
export class PaymentsController {
    constructor(
        private readonly paymentsService: PaymentsService,
        private readonly acquirer: AcquirerClient,
    ) {}

    @Post('topups')
    async topup(
        @Headers('idempotency-key') idempotencyKey: string,
        @Headers('x-user-id') userId: string,
        @Body() dto: TopupDto,
    ) {
        if (!idempotencyKey || !userId) {
            throw new UnauthorizedException(
                'Missing idempotency-key or x-user-id header',
            );
        }
        const result = await this.paymentsService.topup(dto, userId, idempotencyKey);
        return result;
    }

    @Post('webhooks/:scheme')
    @HttpCode(HttpStatus.OK)
    async webhook(
        @Param('scheme') scheme: string,
        @Req() req: Request,
        @Body() dto: SettlementWebhookDto,
    ) {
        // Verify HMAC signature over the raw request body (Buffer from
        // NestFactory `rawBody: true`).
        const rawBody = (req as any).rawBody?.toString('utf8');
        if (!rawBody) {
            throw new UnauthorizedException('Missing raw body');
        }

        const signature = req.headers['x-signature'] as string;
        if (!signature) {
            throw new UnauthorizedException('Missing X-Signature header');
        }

        const secret = this.acquirer.getHmacSecret(scheme);
        if (!verifySignature(rawBody, signature, secret)) {
            throw new UnauthorizedException('Invalid HMAC signature');
        }

        return this.paymentsService.onSettlement(scheme, dto);
    }
}
