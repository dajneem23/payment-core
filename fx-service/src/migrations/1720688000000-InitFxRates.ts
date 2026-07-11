import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Initial fx_rates table — one row per currency, upserted on each VCB refresh.
 * The table is owned by the fx-service and lives in the vietpay_fx database,
 * separate from the money ledger.
 */
export class InitFxRates1720688000000 implements MigrationInterface {
    name = 'InitFxRates1720688000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'fx_rates',
                columns: [
                    {
                        name: 'currency_code',
                        type: 'varchar',
                        length: '3',
                        isPrimary: true,
                    },
                    {
                        name: 'currency_name',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'buy',
                        type: 'numeric',
                        precision: 19,
                        scale: 4,
                        isNullable: true,
                    },
                    {
                        name: 'transfer',
                        type: 'numeric',
                        precision: 19,
                        scale: 4,
                        isNullable: true,
                    },
                    {
                        name: 'sell',
                        type: 'numeric',
                        precision: 19,
                        scale: 4,
                        isNullable: true,
                    },
                    {
                        name: 'quote',
                        type: 'varchar',
                        length: '3',
                        default: "'VND'",
                    },
                    {
                        name: 'as_of',
                        type: 'timestamptz',
                        isNullable: true,
                    },
                    {
                        name: 'fetched_at',
                        type: 'timestamptz',
                        default: 'now()',
                    },
                ],
            }),
            true,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('fx_rates', true);
    }
}
