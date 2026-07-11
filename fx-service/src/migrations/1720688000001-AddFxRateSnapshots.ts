import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Adds fx_rate_snapshots — append-only time-series of every VCB refresh.
 * The existing fx_rates table continues as the "latest" cache (upserted).
 */
export class AddFxRateSnapshots1720688000001 implements MigrationInterface {
  name = 'AddFxRateSnapshots1720688000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'fx_rate_snapshots',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'currency_code',
            type: 'varchar',
            length: '3',
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

    await queryRunner.createIndex(
      'fx_rate_snapshots',
      new TableIndex({
        name: 'IDX_fx_rate_snapshots_currency_fetched',
        columnNames: ['currency_code', 'fetched_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('fx_rate_snapshots', true);
  }
}
