import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Kafka, Producer } from 'kafkajs';
import { Repository } from 'typeorm';

import { ConfigService } from '../../shared/services/config.service';
import { LoggerService } from '../../shared/services/logger.service';
import { OutboxEvent } from './entities/outbox-event.entity';

@Injectable()
export class OutboxRelay implements OnModuleInit, OnModuleDestroy {
    private producer: Producer;
    private kafka: Kafka;
    private busy = false;
    private timer: ReturnType<typeof setTimeout> | null = null;

    constructor(
        @InjectRepository(OutboxEvent)
        private readonly outboxRepo: Repository<OutboxEvent>,
        private readonly config: ConfigService,
        private readonly logger: LoggerService,
    ) {
        this.kafka = new Kafka({
            clientId: this.config.kafkaConfig.clientId,
            brokers: [this.config.kafkaConfig.broker],
        });
        this.producer = this.kafka.producer();
    }

    async onModuleInit() {
        try {
            await this.producer.connect();
            this.logger.info('OutboxRelay: Kafka producer connected');
        } catch (err) {
            this.logger.error(
                `OutboxRelay: Failed to connect Kafka producer: ${(err as Error).message}`,
            );
        }
        this.scheduleNext();
    }

    async onModuleDestroy() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        try {
            await this.producer.disconnect();
            this.logger.info('OutboxRelay: Kafka producer disconnected');
        } catch {
            // ignore disconnect errors
        }
    }

    private scheduleNext() {
        const ms = this.config.outboxConfig.pollMs;
        this.timer = setTimeout(() => this.tick(), ms);
    }

    private async tick() {
        if (this.busy) {
            this.scheduleNext();
            return;
        }

        if (!this.config.outboxConfig.enabled) {
            this.scheduleNext();
            return;
        }

        this.busy = true;
        try {
            const events = await this.outboxRepo.find({
                where: { status: 'PENDING' },
                order: { createdAt: 'ASC' },
                take: 100,
            });

            if (events.length > 0) {
                this.logger.info(
                    `OutboxRelay: Publishing ${events.length} events`,
                );
            }

            for (const event of events) {
                try {
                    await this.producer.send({
                        topic: this.config.kafkaConfig.paymentTopic,
                        messages: [
                            {
                                key: event.aggregateId,
                                value: JSON.stringify(event.payload),
                            },
                        ],
                    });

                    event.status = 'PUBLISHED';
                    event.publishedAt = new Date();
                    await this.outboxRepo.save(event);
                } catch (err) {
                    // Stop the batch on first send error (preserve ordering)
                    this.logger.error(
                        `OutboxRelay: Failed to publish event ${event.id}: ${(err as Error).message}`,
                    );
                    break;
                }
            }
        } catch (err) {
            this.logger.error(
                `OutboxRelay: Tick error: ${(err as Error).message}`,
            );
        } finally {
            this.busy = false;
            this.scheduleNext();
        }
    }
}
