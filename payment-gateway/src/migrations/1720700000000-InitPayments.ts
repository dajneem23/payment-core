import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Initial schema for the payment-gateway service:
 * - payments: topup/transfer payment records
 * - processed_webhooks: deduplication of settlement webhooks
 * - outbox_events: transactional outbox for Kafka event publishing
 */
export class InitPayments1720700000000 implements MigrationInterface {
    name = 'InitPayments1720700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ── payments ──────────────────────────────────────────────────────
        await queryRunner.createTable(
            new Table({
                name: 'payments',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'gen_random_uuid()',
                    },
                    {
                        name: 'type',
                        type: 'varchar',
                        length: '20',
                        default: "'TOPUP'",
                    },
                    {
                        name: 'wallet_id',
                        type: 'uuid',
                    },
                    {
                        name: 'scheme',
                        type: 'varchar',
                        length: '20',
                    },
                    {
                        name: 'card_token',
                        type: 'varchar',
                    },
                    {
                        name: 'bin',
                        type: 'varchar',
                        length: '20',
                    },
                    {
                        name: 'amount',
                        type: 'numeric',
                        precision: 19,
                        scale: 4,
                    },
                    {
                        name: 'currency',
                        type: 'char',
                        length: '3',
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '20',
                        default: "'PENDING'",
                    },
                    {
                        name: 'provider_ref',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'owner_user_id',
                        type: 'uuid',
                    },
                    {
                        name: 'idempotency_key',
                        type: 'varchar',
                        isUnique: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamptz',
                        default: 'now()',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamptz',
                        default: 'now()',
                    },
                ],
            }),
            true,
        );

        await queryRunner.createIndex(
            'payments',
            new TableIndex({
                name: 'idx_payments_idempotency_key',
                columnNames: ['idempotency_key'],
                isUnique: true,
            }),
        );

        // ── processed_webhooks ────────────────────────────────────────────
        await queryRunner.createTable(
            new Table({
                name: 'processed_webhooks',
                columns: [
                    {
                        name: 'provider_event_id',
                        type: 'varchar',
                        isPrimary: true,
                    },
                    {
                        name: 'payment_id',
                        type: 'uuid',
                    },
                    {
                        name: 'received_at',
                        type: 'timestamptz',
                        default: 'now()',
                    },
                ],
            }),
            true,
        );

        // ── outbox_events ─────────────────────────────────────────────────
        await queryRunner.createTable(
            new Table({
                name: 'outbox_events',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'gen_random_uuid()',
                    },
                    {
                        name: 'aggregate_type',
                        type: 'varchar',
                    },
                    {
                        name: 'aggregate_id',
                        type: 'uuid',
                    },
                    {
                        name: 'event_type',
                        type: 'varchar',
                    },
                    {
                        name: 'payload',
                        type: 'jsonb',
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '20',
                        default: "'PENDING'",
                    },
                    {
                        name: 'created_at',
                        type: 'timestamptz',
                        default: 'now()',
                    },
                    {
                        name: 'published_at',
                        type: 'timestamptz',
                        isNullable: true,
                    },
                ],
            }),
            true,
        );

        await queryRunner.createIndex(
            'outbox_events',
            new TableIndex({
                name: 'idx_outbox_events_status',
                columnNames: ['status'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('outbox_events', true);
        await queryRunner.dropTable('processed_webhooks', true);
        await queryRunner.dropTable('payments', true);
    }
}
