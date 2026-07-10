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
            this.logger.log(
                `Kafka consumer connected: ${kafkaCfg.broker}`,
            );

            await this.consumer.subscribe({
                topic: kafkaCfg.transferTopic,
                fromBeginning: false,
            });
            this.logger.log(
                `Subscribed to topic: ${kafkaCfg.transferTopic}`,
            );

            await this.consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    // ── Emit metric ────────────────────────────
                    trackKafkaMessage(topic, partition);

                    const key = message.key?.toString() || 'none';
                    const value = message.value?.toString() || '{}';

                    this.logger.log(
                        `Kafka message: ${topic}[${partition}] key=${key}`,
                    );

                    try {
                        const event: TransferEvent = JSON.parse(value);

                        this.logger.log(
                            `Transfer event: ${event.transferId} — ${event.amount} ${event.currency} — status=${event.status}`,
                        );

                        // TODO: enrich with user email from user-service,
                        // then send transfer confirmation emails.
                        // await this.notificationService.sendEmail({
                        //     to: [userEmail],
                        //     subject: `Transfer ${event.transferId} — ${event.status}`,
                        //     html: `<h1>Transfer ${event.status}</h1>
                        //            <p>Amount: ${event.amount} ${event.currency}</p>`,
                        // });
                    } catch (err: any) {
                        this.logger.error(
                            `Failed to parse transfer event: ${err.message}`,
                            err.stack,
                        );
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

    async onModuleDestroy() {
        try {
            await this.consumer.disconnect();
            this.logger.log('Kafka consumer disconnected');
        } catch (err: any) {
            this.logger.error(
                `Kafka disconnect error: ${err.message}`,
            );
        }
    }
}
