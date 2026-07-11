import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'outbox_events' })
export class OutboxEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'aggregate_type', type: 'varchar' })
    aggregateType: string;

    @Column({ name: 'aggregate_id', type: 'uuid' })
    aggregateId: string;

    @Column({ name: 'event_type', type: 'varchar' })
    eventType: string;

    @Column({ type: 'jsonb' })
    payload: Record<string, any>;

    @Column({ type: 'varchar', length: 20, default: 'PENDING' })
    status: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
    publishedAt: Date | null;
}