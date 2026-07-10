import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';

import { ConfigService } from '../../shared/services/config.service';
import { trackKafkaMessage } from '../../shared/telemetry/metrics';
import { NotificationService } from './notification.service';

interface TransferEvent {
    transferId: string;
    sourceWalletId: string;
    targetWalletId: string;
    amount: string;
    currency: string;
    status: string;
    sourceUserId: string;
    targetUserId: string;
    timestamp: string;
}

interface UserEvent {
    type: 'user.created' | 'user.updated' | 'user.deleted';
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    timestamp: string;
}

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(KafkaConsumerService.name);
    private kafka: Kafka;
    private consumer: Consumer;

    constructor(
        private readonly configService: ConfigService,
        private readonly notificationService: NotificationService,
    ) {
        const kafkaCfg = configService.kafkaConfig;
        this.kafka = new Kafka({
            clientId: kafkaCfg.clientId,
            brokers: [kafkaCfg.broker],
        });
        this.consumer = this.kafka.consumer({
            groupId: kafkaCfg.groupId,
        });
    }

    async onModuleInit() {
        const kafkaCfg = this.configService.kafkaConfig;

        try {
            await this.consumer.connect();
            this.logger.log(`Kafka consumer connected: ${kafkaCfg.broker}`);

            await this.consumer.subscribe({
                topic: kafkaCfg.transferTopic,
                fromBeginning: false,
            });
            this.logger.log(`Subscribed: ${kafkaCfg.transferTopic}`);

            await this.consumer.subscribe({
                topic: kafkaCfg.userTopic,
                fromBeginning: false,
            });
            this.logger.log(`Subscribed: ${kafkaCfg.userTopic}`);

            await this.consumer.run({
                autoCommit: false,
                eachMessage: async ({ topic, partition, message }) => {
                    trackKafkaMessage(topic, partition);

                    const value = message.value?.toString() || '{}';

                    try {
                        if (topic === kafkaCfg.transferTopic) {
                            await this.handleTransfer(JSON.parse(value));
                        } else if (topic === kafkaCfg.userTopic) {
                            await this.handleUserEvent(JSON.parse(value));
                        }

                        // ── Commit AFTER successful processing ─────────
                        // Only commit if business logic didn't throw.
                        // commitSync blocks until the broker confirms.
                        await this.consumer.commitOffsets([
                            {
                                topic,
                                partition,
                                offset: String(Number(message.offset) + 1),
                            },
                        ]);
                    } catch (err: any) {
                        this.logger.error(
                            `Failed to handle ${topic} message (offset=${message.offset}): ${err.message}`,
                            err.stack,
                        );
                        // DO NOT commit — the message will be redelivered
                        // on the next poll. Ensure handlers are idempotent.
                    }
                },
            });
        } catch (err: any) {
            this.logger.error(
                `Kafka consumer init failed: ${err.message}`,
                err.stack,
            );
        }
    }

    // ── Handlers ──────────────────────────────────────────────────────────

    private async handleTransfer(event: TransferEvent) {
        this.logger.log(
            `Transfer event: ${event.transferId} — ${event.amount} ${event.currency} — status=${event.status}`,
        );
        // TODO: enrich with user email from user-service, then send confirmation
    }

    private async handleUserEvent(event: UserEvent) {
        switch (event.type) {
            case 'user.created': {
                const displayName =
                    [event.firstName, event.lastName].filter(Boolean).join(' ') ||
                    event.email.split('@')[0];

                this.logger.log(
                    `user.created: ${event.userId} (${event.email}) → sending welcome email`,
                );

                await this.notificationService.sendWelcomeEmail({
                    to: event.email,
                    customerName: displayName,
                });
                break;
            }
            default:
                this.logger.log(
                    `Unhandled user event type: ${event.type} for ${event.userId}`,
                );
        }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────

    async onModuleDestroy() {
        try {
            await this.consumer.disconnect();
            this.logger.log('Kafka consumer disconnected');
        } catch (err: any) {
            this.logger.error(`Kafka disconnect error: ${err.message}`);
        }
    }
}
