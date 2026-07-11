import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * Standalone DataSource for the TypeORM CLI (migration:generate/run/revert).
 * The running app configures TypeORM through ConfigService + Nest DI; the CLI
 * can't use Nest DI, so it reads connection settings straight from the env.
 * In dev we use DataSource options; in production this is the schema-evolution path.
 */
export default new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'vietpay_payments',
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/migrations/*.ts'],
});
