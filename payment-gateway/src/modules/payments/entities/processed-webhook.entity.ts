import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'processed_webhooks' })
export class ProcessedWebhook {
    @PrimaryColumn({ name: 'provider_event_id', type: 'varchar' })
    providerEventId: string;

    @Column({ name: 'payment_id', type: 'uuid' })
    paymentId: string;

    @Column({ name: 'received_at', type: 'timestamptz', default: () => 'now()' })
    receivedAt: Date;
}