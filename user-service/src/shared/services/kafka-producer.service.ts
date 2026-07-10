import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

import { ConfigService } from './config.service';

@Injectable()
export class KafkaProducerService implements OnModuleDestroy {
    private readonly logger = new Logger(KafkaProducerService.name);
    private readonly kafka: Kafka;
    private readonly producer: Producer;
    private connected = false;

    constructor(configService: ConfigService) {
        const cfg = configService.kafkaConfig;
        this.kafka = new Kafka({
            clientId: cfg.clientId,
            brokers: [cfg.broker],
            // ── Reliability ────────────────────────────────────────────
            retry: {
                initialRetryTime: 300,
                retries: 5, // transient network errors retried 5×
            },
        });
        this.producer = this.kafka.producer({
            // maxInFlightRequests ≤ 1 ensures strict ordering and, when
            // combined with retries, avoids duplicate batches on the wire.
            maxInFlightRequests: 1,
        });
    }

    private async ensureConnected() {
        if (!this.connected) {
            await this.producer.connect();
            this.connected = true;
            this.logger.log(
                'Kafka producer connected (retries=5, maxInFlightRequests=1)',
            );
        }
    }

    async publish(topic: string, key: string, value: Record<string, unknown>) {
        try {
            await this.ensureConnected();
            await this.producer.send({
                topic,
                acks: -1, // wait for all replicas to ack
                messages: [{ key, value: JSON.stringify(value) }],
            });
            this.logger.log(`Published to ${topic}: key=${key}`);
        } catch (err: any) {
            this.logger.error(
                `Kafka publish failed (${topic}): ${err.message}`,
                err.stack,
            );
        }
    }

    async onModuleDestroy() {
        if (this.connected) {
            await this.producer.disconnect();
            this.logger.log('Kafka producer disconnected');
        }
    }
}
