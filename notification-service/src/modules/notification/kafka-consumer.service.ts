import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { readFileSync } from 'fs';
import { sign } from 'jsonwebtoken';
import { Kafka, Consumer } from 'kafkajs';
import { randomUUID } from 'crypto';

import { ConfigService } from '../../shared/services/config.service';
import { trackKafkaMessage } from '../../shared/telemetry/metrics';
import { PaymentEmailDto } from './dtos/send-email.dto';
import { NotificationService } from './notification.service';

interface TransferEvent {
    transferId: string;
    sourceWalletId: string;
    destWalletId: string;       // domain term — consistent with the Transfer aggregate
    sourceUserId: string;
    destUserId: string;
    remark?: string;
    amount: string;
    currency: string;
    status: string;
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

export interface TopicOffsets {
    topic: string;
    partitions: {
        partition: number;
        low: string;      // earliest offset
        high: string;     // latest offset
        committed: string; // consumer-group committed (or '-1' if none)
        lag: number;
    }[];
}

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(KafkaConsumerService.name);
    private kafka: Kafka;
    private consumer: Consumer;
    private groupId: string;
    private subscribedTopics: string[] = [];
    private userServiceUrl: string;
    private servicePrivateKey: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly notificationService: NotificationService,
    ) {
        const kafkaCfg = configService.kafkaConfig;
        this.groupId = kafkaCfg.groupId;
        this.kafka = new Kafka({
            clientId: kafkaCfg.clientId,
            brokers: [ kafkaCfg.broker ],
        });
        this.consumer = this.kafka.consumer({
            groupId: this.groupId,
            allowAutoTopicCreation: true,
        });
        this.userServiceUrl = configService.get('USER_SERVICE_URL') || 'http://user-service:3004';
        try {
            this.servicePrivateKey = readFileSync(
                configService.get('SERVICE_JWT_PRIVATE_KEY') || '/app/keys/service-auth-private.pem',
                'utf8',
            );
        } catch {
            this.servicePrivateKey = '';   // missing key → user lookup fails gracefully
        }
    }

    // ── Lifecycle ───────────────────────────────────────────────────────

    async onModuleInit() {
        const kafkaCfg = this.configService.kafkaConfig;
        const maxRetries = 10;
        try {
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    await this.consumer.connect();
                    this.logger.log(`Kafka consumer connected: ${kafkaCfg.broker}`);

                    await this.consumer.subscribe({
                        topic: kafkaCfg.transferTopic,
                        fromBeginning: false,
                    });
                    this.subscribedTopics.push(kafkaCfg.transferTopic);
                    this.logger.log(`Subscribed: ${kafkaCfg.transferTopic}`);

                    await this.consumer.subscribe({
                        topic: kafkaCfg.userTopic,
                        fromBeginning: false,
                    });
                    this.subscribedTopics.push(kafkaCfg.userTopic);
                    this.logger.log(`Subscribed: ${kafkaCfg.userTopic}`);

                    break; // success — exit retry loop
                } catch (err: any) {
                    this.logger.error(
                        `Kafka consumer init attempt ${attempt + 1}/${maxRetries} failed: ${err.message}`,
                    );
                    try {
                        await this.consumer.disconnect();
                    } catch {
                        // connection may never have been established; ignore.
                    }
                    if (attempt === maxRetries - 1) {
                        this.logger.error(
                            'Kafka consumer init exhausted retries — consumer disabled',
                        );
                        return;
                    }
                    // Exponential backoff:
                    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }


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
                    }
                },
            });
        } catch (err: any) {
            this.logger.error(
                `Kafka consumer init failed: ${err.message}`,
                err.stack,
            );
            //we probaly should kill the process here, because if we can't connect to kafka, we can't do anything useful. But for now, just log the error and continue.
        }
    }

    async onModuleDestroy() {
        try {
            await this.consumer.disconnect();
            this.logger.log('Kafka consumer disconnected');
        } catch (err: any) {
            this.logger.error(`Kafka disconnect error: ${err.message}`);
        }
    }

    // ── Handlers ────────────────────────────────────────────────────────

    private async handleTransfer(event: TransferEvent) {
        try {
            this.logger.log(
                `Transfer event: ${event.transferId} — ${event.amount} ${event.currency}`,
            );

            const [ sourceUser, destUser ] = await Promise.allSettled([
                ...(event.sourceUserId && [ this.lookupEmail(event.sourceUserId) ] || []),
                ...(event.destUserId && [ this.lookupEmail(event.destUserId) ] || []),
            ]);


            const base: Omit<PaymentEmailDto, 'to' | 'customerName'> = {
                transferId: event.transferId,
                amount: event.amount,
                currency: event.currency,
                status: event.status,
                sourceWalletId: event.sourceWalletId,
                targetWalletId: event.destWalletId,
                remark: event.remark,
                timestamp: event.timestamp,
            };
            if (sourceUser?.status === 'fulfilled' && sourceUser.value) {
                // Debit receipt — to the sender.
                await this.notificationService.sendDebitEmail({
                    ...base,
                    to: sourceUser.value.email,
                    customerName: [ sourceUser.value.firstName, sourceUser.value.lastName ].filter(Boolean).join(' ') || sourceUser.value.email.split('@')[ 0 ],
                });
            } else {
                this.logger.warn(`Source user not found for transfer ${event.transferId} (userId=${event.sourceUserId})`);
            }

            if (destUser?.status === 'fulfilled' && destUser.value) {
                // Credit notification — to the receiver.
                await this.notificationService.sendCreditEmail({
                    ...base,
                    to: destUser.value.email,
                    customerName: [ destUser.value.firstName, destUser.value.lastName ].filter(Boolean).join(' ') || destUser.value.email.split('@')[ 0 ],
                });
            } else {
                this.logger.warn(`Destination user not found for transfer ${event.transferId} (userId=${event.destUserId})`);
            }

        } catch (error: any) {
            this.logger.error(
                `Failed to handle transfer event ${event.transferId}: ${error.message}`,
                error.stack,
            );
            throw error; // rethrow so the message is not committed and can be retried
        }
    }

    /** Sign a short-lived EC service JWT and call GET /internal/users/:id. */
    private async lookupEmail(userId: string): Promise<{ email: string; firstName?: string; lastName?: string } | null> {
        if (!this.servicePrivateKey) {
            this.logger.warn('service private key not loaded — user lookup disabled');
            return null;
        }
        try {
            //cache jwt for next time
            const assertion = sign(
                { aud: 'vietpay-internal' },
                this.servicePrivateKey,
                {
                    algorithm: 'ES256',
                    issuer: 'notification-service',
                    subject: 'notification-service',
                    jwtid: randomUUID(),
                    expiresIn: 60,
                },
            );
            const res = await fetch(`${this.userServiceUrl}/internal/users/${userId}`, {
                headers: { Authorization: `Bearer ${assertion}` },
            });
            if (!res.ok) {
                this.logger.warn(`user lookup returned ${res.status} for ${userId}`);
                throw new Error(`user lookup failed: ${res.status} ${res.statusText}`);
            }
            const user = await res.json() as any;
            return { email: user.email, firstName: user.firstName, lastName: user.lastName };
        } catch (e: any) {
            this.logger.error(`user lookup failed for ${userId}: ${e.message}`);
            throw e;
        }
    }

    private async handleUserEvent(event: UserEvent) {
        switch (event.type) {
            case 'user.created': {
                const displayName =
                    [ event.firstName, event.lastName ].filter(Boolean).join(' ') ||
                    event.email.split('@')[ 0 ];

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

    // ── Admin / control-plane ───────────────────────────────────────────

    /** List all topics on the broker. */
    async listTopics(): Promise<string[]> {
        const admin = this.kafka.admin();
        await admin.connect();
        try {
            const topics = await admin.listTopics();
            // Filter internal topics
            return topics.filter((t) => !t.startsWith('__'));
        } finally {
            await admin.disconnect();
        }
    }

    /** Get per-partition watermark + consumer-group offset for a topic. */
    async getTopicOffsets(topic: string): Promise<TopicOffsets> {
        const admin = this.kafka.admin();
        await admin.connect();
        try {
            // Earliest + latest offsets for the topic
            const topicOffsets = await admin.fetchTopicOffsets(topic);

            // Consumer-group committed offsets
            const groupOffsets = await admin.fetchOffsets({
                groupId: this.groupId,
                topics: [ topic ],
            });

            const partitions = topicOffsets.map((to) => {
                const groupResult = groupOffsets.find(
                    (go) => go.topic === topic,
                );
                const committedPartition = groupResult?.partitions.find(
                    (p) => p.partition === to.partition,
                );
                const committedOffset = committedPartition?.offset ?? '-1';
                const high = Number(to.high);
                const low = Number(to.low);
                const committedNum = committedOffset !== '-1' ? Number(committedOffset) : -1;
                const lag =
                    committedNum >= 0 ? Math.max(0, high - committedNum) : high - low;

                return {
                    partition: to.partition,
                    low: to.low,
                    high: to.high,
                    committed: committedOffset,
                    lag,
                };
            });

            return { topic, partitions };
        } finally {
            await admin.disconnect();
        }
    }

    /**
     * Rewind the consumer group to a specific offset for one or more
     * partitions. The consumer is paused, seeked, and resumed.
     *
     * @param offsets  [{ topic, partition, offset }] — use `'earliest'` to
     *                 replay from the beginning, or a numeric string.
     */
    async seek(
        offsets: { topic: string; partition: number; offset: string }[],
    ) {
        const assignedTopics = new Set(this.subscribedTopics);
        for (const o of offsets) {
            if (!assignedTopics.has(o.topic)) {
                throw new Error(
                    `Topic "${o.topic}" is not subscribed by this consumer`,
                );
            }
        }

        this.consumer.pause(offsets.map((o) => ({ topic: o.topic, partitions: [ o.partition ] })));

        for (const o of offsets) {
            const targetOffset =
                o.offset === 'earliest' ? '0' : o.offset;

            this.consumer.seek({
                topic: o.topic,
                partition: o.partition,
                offset: targetOffset,
            });

            this.logger.warn(
                `Seek ${o.topic}[${o.partition}] → offset ${targetOffset}`,
            );
        }

        // Resume after a short delay so in-flight pauses settle
        await new Promise((r) => setTimeout(r, 500));
        this.consumer.resume(offsets.map((o) => ({ topic: o.topic, partitions: [ o.partition ] })));

        return { seeked: offsets };
    }
}
