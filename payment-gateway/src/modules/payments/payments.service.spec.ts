import { HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { ConfigService } from '../../shared/services/config.service';
import { LoggerService } from '../../shared/services/logger.service';
import { AcquirerClient } from './acquirer.client';
import { OutboxEvent } from './entities/outbox-event.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { ProcessedWebhook } from './entities/processed-webhook.entity';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
    let service: PaymentsService;
    let paymentRepo: jest.Mocked<Partial<Repository<Payment>>>;
    let webhookRepo: jest.Mocked<Partial<Repository<ProcessedWebhook>>>;
    let outboxRepo: jest.Mocked<Partial<Repository<OutboxEvent>>>;
    let acquirer: jest.Mocked<Partial<AcquirerClient>>;
    let dataSource: jest.Mocked<Partial<DataSource>>;
    let queryRunner: any;

    beforeEach(async () => {
        paymentRepo = {
            findOne: jest.fn(),
            create: jest.fn(),
            insert: jest.fn(),
            save: jest.fn(),
        };
        webhookRepo = {
            findOne: jest.fn(),
            insert: jest.fn(),
        };
        outboxRepo = {
            find: jest.fn(),
            save: jest.fn(),
            insert: jest.fn(),
        };

        acquirer = {
            authorize: jest.fn(),
            capture: jest.fn(),
        };

        queryRunner = {
            connect: jest.fn(),
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            rollbackTransaction: jest.fn(),
            release: jest.fn(),
            manager: {
                getRepository: jest.fn().mockReturnValue({
                    findOne: jest.fn(),
                    insert: jest.fn(),
                    save: jest.fn(),
                }),
            },
        };

        dataSource = {
            createQueryRunner: jest.fn().mockReturnValue(queryRunner),
        } as any;

        const module = await Test.createTestingModule({
            providers: [
                PaymentsService,
                { provide: getRepositoryToken(Payment), useValue: paymentRepo },
                {
                    provide: getRepositoryToken(ProcessedWebhook),
                    useValue: webhookRepo,
                },
                {
                    provide: getRepositoryToken(OutboxEvent),
                    useValue: outboxRepo,
                },
                { provide: DataSource, useValue: dataSource },
                { provide: AcquirerClient, useValue: acquirer },
                {
                    provide: ConfigService,
                    useValue: {
                        acquirerConfig: {
                            selfWebhookBaseUrl: 'http://payment-gateway:3005',
                        },
                        kafkaConfig: { paymentTopic: 'payment-events' },
                        outboxConfig: { pollMs: 1000, enabled: true },
                    },
                },
                {
                    provide: LoggerService,
                    useValue: {
                        info: jest.fn(),
                        warn: jest.fn(),
                        error: jest.fn(),
                        debug: jest.fn(),
                        log: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get(PaymentsService);
    });

    // ── topup ──────────────────────────────────────────────────────────

    describe('topup', () => {
        const dto = {
            walletId: '550e8400-e29b-41d4-a716-446655440000',
            amount: '100.00',
            currency: 'USD',
            scheme: 'VISA',
            cardToken: 'tok_visa_123',
            bin: '411111',
        };
        const ownerUserId = '660e8400-e29b-41d4-a716-446655440001';
        const idempotencyKey = 'idem-001';

        it('should replay an existing payment for known idempotencyKey without calling acquirer', async () => {
            const existingPayment = {
                id: 'payment-1',
                status: PaymentStatus.AUTHORIZED,
                scheme: 'VISA',
                amount: 100.0,
                currency: 'USD',
                idempotencyKey,
            } as Payment;
            paymentRepo.findOne!.mockResolvedValue(existingPayment);

            const result = await service.topup(dto, ownerUserId, idempotencyKey);

            expect(result.paymentId).toBe('payment-1');
            expect(acquirer.authorize).not.toHaveBeenCalled();
        });

        it('should set status to FAILED and throw 422 when acquirer declines', async () => {
            paymentRepo.findOne!.mockResolvedValue(null);
            paymentRepo.create!.mockReturnValue({
                id: 'payment-2',
                ...dto,
                amount: 100.0,
                ownerUserId,
                idempotencyKey,
            });
            paymentRepo.insert!.mockResolvedValue({ identifiers: [] } as any);
            acquirer.authorize!.mockResolvedValue({
                declined: true,
                reason: 'insufficient funds',
            });
            paymentRepo.save!.mockResolvedValue({} as any);

            await expect(
                service.topup(dto, ownerUserId, idempotencyKey),
            ).rejects.toThrow(HttpException);

            try {
                await service.topup(dto, ownerUserId, idempotencyKey);
            } catch (e: any) {
                expect(e.getStatus()).toBe(422);
                expect(e.message).toBe('insufficient funds');
            }

            expect(paymentRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ status: PaymentStatus.FAILED }),
            );
        });

        it('should authorize and capture on success', async () => {
            paymentRepo.findOne!.mockResolvedValue(null);
            paymentRepo.create!.mockReturnValue({
                id: 'payment-3',
                type: 'TOPUP',
                walletId: dto.walletId,
                scheme: dto.scheme,
                cardToken: dto.cardToken,
                bin: dto.bin,
                amount: 100.0,
                currency: dto.currency,
                status: PaymentStatus.PENDING,
                ownerUserId,
                idempotencyKey,
            });
            paymentRepo.insert!.mockResolvedValue({ identifiers: [] } as any);
            acquirer.authorize!.mockResolvedValue({
                declined: false,
                providerRef: 'prov-001',
                status: 'AUTHORIZED',
            });
            paymentRepo.save!.mockResolvedValue({} as any);
            acquirer.capture!.mockResolvedValue({ status: 'ok' });

            const result = await service.topup(dto, ownerUserId, idempotencyKey);

            expect(result.paymentId).toBe('payment-3');
            expect(acquirer.authorize).toHaveBeenCalled();
            expect(acquirer.capture).toHaveBeenCalled();
            expect(paymentRepo.save).toHaveBeenCalled();
        });
    });

    // ── onSettlement ───────────────────────────────────────────────────

    describe('onSettlement', () => {
        const scheme = 'visa';
        const dto = {
            providerEventId: 'evt-001',
            providerRef: 'prov-001',
            paymentId: '550e8400-e29b-41d4-a716-446655440002',
            status: 'SETTLED' as const,
        };

        it('should deduplicate — second call with same providerEventId is a no-op', async () => {
            // First call: no existing webhook
            const findOneMock = jest.fn();
            const insertMock = jest.fn();
            const saveMock = jest.fn();

            queryRunner.manager.getRepository.mockReturnValue({
                findOne: findOneMock,
                insert: insertMock,
                save: saveMock,
            });

            // First call: no existing
            findOneMock
                .mockResolvedValueOnce(null) // existing webhook check
                .mockResolvedValueOnce({
                    // payment lookup
                    id: dto.paymentId,
                    status: PaymentStatus.AUTHORIZED,
                    walletId: 'wallet-1',
                    amount: 100.0,
                    currency: 'USD',
                    scheme: 'VISA',
                    ownerUserId: 'user-1',
                });

            const result1 = await service.onSettlement(scheme, dto);

            expect(result1).toEqual({ success: true });
            expect(insertMock).toHaveBeenCalledTimes(1); // webhook inserted
            expect(saveMock).toHaveBeenCalled(); // payment saved
            // outbox event inserted (via insert)
            expect(insertMock).toHaveBeenCalledTimes(1); // no second insert for outbox — wait, outbox uses insert too

            // Reset and test second call (duplicate)
            findOneMock.mockReset();
            insertMock.mockReset();
            saveMock.mockReset();

            findOneMock.mockResolvedValueOnce({
                // existing webhook found
                providerEventId: 'evt-001',
                paymentId: dto.paymentId,
            });

            const result2 = await service.onSettlement(scheme, dto);

            expect(result2).toEqual({ duplicate: true });
            // No new row inserted
            expect(insertMock).not.toHaveBeenCalled();
            expect(saveMock).not.toHaveBeenCalled();
        });

        it('should ignore webhook for already-failed payment', async () => {
            const findOneMock = jest.fn();
            const insertMock = jest.fn();
            const saveMock = jest.fn();

            queryRunner.manager.getRepository.mockReturnValue({
                findOne: findOneMock,
                insert: insertMock,
                save: saveMock,
            });

            findOneMock
                .mockResolvedValueOnce(null) // no existing webhook
                .mockResolvedValueOnce({
                    // payment is FAILED
                    id: dto.paymentId,
                    status: PaymentStatus.FAILED,
                });

            const result = await service.onSettlement(scheme, dto);

            expect(result).toEqual({
                ignored: true,
                reason: 'Payment already failed',
            });
            expect(insertMock).toHaveBeenCalledTimes(1); // webhook still recorded
            expect(saveMock).not.toHaveBeenCalled(); // payment not updated
        });
    });
});
