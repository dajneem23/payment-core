import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { ConfigService } from '../../shared/services/config.service';
import { LoggerService } from '../../shared/services/logger.service';
import { AcquirerClient } from './acquirer.client';
import { TopupDto } from './dtos/topup.dto';
import { SettlementWebhookDto } from './dtos/webhook.dto';
import { OutboxEvent } from './entities/outbox-event.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { ProcessedWebhook } from './entities/processed-webhook.entity';

@Injectable()
export class PaymentsService {
    constructor(
        @InjectRepository(Payment)
        private readonly paymentRepo: Repository<Payment>,
        @InjectRepository(ProcessedWebhook)
        private readonly webhookRepo: Repository<ProcessedWebhook>,
        @InjectRepository(OutboxEvent)
        private readonly outboxRepo: Repository<OutboxEvent>,
        private readonly dataSource: DataSource,
        private readonly acquirer: AcquirerClient,
        private readonly config: ConfigService,
        private readonly logger: LoggerService,
    ) {}

    async findById(id: string) {
        const payment = await this.paymentRepo.findOne({ where: { id } });
        if (!payment) {
            throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
        }
        return {
            paymentId: payment.id,
            walletId: payment.walletId,
            scheme: payment.scheme,
            bin: payment.bin,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            providerRef: payment.providerRef,
            createdAt: payment.createdAt,
        };
    }

    async topup(dto: TopupDto, ownerUserId: string, idempotencyKey: string) {
        const existing = await this.paymentRepo.findOne({
            where: { idempotencyKey },
        });
        if (existing) {
            this.logger.info(`Replaying idempotent topup ${idempotencyKey}`);
            return this.toResponse(existing);
        }

        // 2. Insert PENDING payment
        const payment = this.paymentRepo.create({
            type: 'TOPUP',
            walletId: dto.walletId,
            scheme: dto.scheme,
            cardToken: dto.cardToken,
            bin: dto.bin,
            amount: Number(dto.amount),
            currency: dto.currency,
            status: PaymentStatus.PENDING,
            ownerUserId,
            idempotencyKey,
        });

        try {
            await this.paymentRepo.insert(payment);
        } catch (err: any) {
            // Unique violation on idempotencyKey (concurrent duplicate)
            if (err.code === '23505') {
                const replayed = await this.paymentRepo.findOne({
                    where: { idempotencyKey },
                });
                if (replayed) {
                    return this.toResponse(replayed);
                }
            }
            throw err;
        }

        // 3. Build callback URL
        const callbackUrl = `${this.config.acquirerConfig.selfWebhookBaseUrl}/payments/webhooks/${dto.scheme.toLowerCase()}`;

        // 4. Call acquirer authorize
        const authResult = await this.acquirer.authorize(
            {
                id: payment.id,
                amount: payment.amount,
                currency: payment.currency,
                cardToken: payment.cardToken,
                bin: payment.bin,
            },
            callbackUrl,
            dto.scheme,
        );

        if (authResult.declined) {
            payment.status = PaymentStatus.FAILED;
            await this.paymentRepo.save(payment);
            throw new HttpException(
                authResult.reason || 'Payment declined by acquirer',
                HttpStatus.UNPROCESSABLE_ENTITY,
            );
        }

        // 5. Store providerRef, mark AUTHORIZED
        payment.providerRef = authResult.providerRef || null;
        payment.status = PaymentStatus.AUTHORIZED;
        await this.paymentRepo.save(payment);

        // 6. Capture (fire-and-forget)
        this.acquirer
            .capture(
                {
                    id: payment.id,
                    amount: payment.amount,
                    currency: payment.currency,
                },
                payment.providerRef!,
                callbackUrl,
                dto.scheme,
            )
            .catch((err) => {
                this.logger.error(
                    `Capture fire-and-forget failed for payment ${payment.id}: ${err.message}`,
                );
            });

        // 7. Return response
        return this.toResponse(payment);
    }

    async onSettlement(scheme: string, dto: SettlementWebhookDto) {
        this.logger.log(
            `Settlement webhook received: scheme=${scheme} paymentId=${dto?.paymentId} `
            + `status=${dto?.status} event=${dto?.providerEventId}`,
        );
        // Run in a DataSource transaction for atomicity
        const runner = this.dataSource.createQueryRunner();
        await runner.connect();
        await runner.startTransaction();

        try {
            // 1. Deduplicate webhook
            const existing = await runner.manager
                .getRepository(ProcessedWebhook)
                .findOne({ where: { providerEventId: dto.providerEventId } });
            if (existing) {
                await runner.commitTransaction();
                this.logger.log(`Duplicate webhook ${dto.providerEventId} — no-op`);
                return { duplicate: true };
            }

            await runner.manager.getRepository(ProcessedWebhook).insert({
                providerEventId: dto.providerEventId,
                paymentId: dto.paymentId,
            });

            // 2. Load payment
            const paymentRepo = runner.manager.getRepository(Payment);
            const payment = await paymentRepo.findOne({
                where: { id: dto.paymentId },
            });

            if (!payment) {
                this.logger.warn(
                    `Settlement webhook for unknown payment ${dto.paymentId}`,
                );
                await runner.commitTransaction();
                return { ignored: true, reason: 'Payment not found' };
            }

            if (payment.status === PaymentStatus.FAILED) {
                this.logger.info(
                    `Ignoring settlement webhook for already-failed payment ${dto.paymentId}`,
                );
                await runner.commitTransaction();
                return { ignored: true, reason: 'Payment already failed' };
            }

            // 3. Update payment status
            if (dto.status === 'SETTLED') {
                payment.status = PaymentStatus.CAPTURED;
                await paymentRepo.save(payment);

                // Insert outbox event
                const outboxRepo = runner.manager.getRepository(OutboxEvent);
                const outboxEvent = outboxRepo.create({
                    aggregateType: 'Payment',
                    aggregateId: payment.id,
                    eventType: 'PaymentCaptured',
                    payload: {
                        eventId: randomUUID(),
                        eventType: 'PaymentCaptured',
                        paymentId: payment.id,
                        walletId: payment.walletId,
                        amount: payment.amount,
                        currency: payment.currency,
                        scheme: payment.scheme,
                        ownerUserId: payment.ownerUserId,
                        occurredAt: new Date().toISOString(),
                    },
                });
                await outboxRepo.save(outboxEvent);
                this.logger.log(
                    `Payment ${payment.id} CAPTURED — PaymentCaptured queued in outbox`,
                );
            } else if (dto.status === 'FAILED') {
                payment.status = PaymentStatus.FAILED;
                await paymentRepo.save(payment);
                this.logger.warn(`Payment ${payment.id} marked FAILED by acquirer`);
            }

            await runner.commitTransaction();
            return { success: true };
        } catch (err: any) {
            await runner.rollbackTransaction();
            this.logger.error(
                `onSettlement failed (scheme=${scheme} paymentId=${dto?.paymentId} `
                + `event=${dto?.providerEventId}): ${err?.message}`,
                err?.stack,
            );
            throw err;
        } finally {
            await runner.release();
        }
    }

    private toResponse(payment: Payment) {
        return {
            paymentId: payment.id,
            status: payment.status,
            scheme: payment.scheme,
            amount: payment.amount,
            currency: payment.currency,
        };
    }
}
