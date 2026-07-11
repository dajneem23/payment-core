import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import { ISwaggerConfigInterface } from '../../interfaces/swagger-config.interface';

export class ConfigService {
    constructor() {
        dotenv.config({
            path: `.env`,
        });

        // Replace \\n with \n to support multiline strings in AWS
        for (const envName of Object.keys(process.env)) {
            process.env[envName] = process.env[envName]?.replace(/\\n/g, '\n');
        }
        if (this.nodeEnv === 'development') {
            console.info(process.env);
        }
    }

    public get(key: string): string | undefined {
        return process.env[key];
    }

    public getNumber(key: string): number {
        return Number(this.get(key));
    }

    get nodeEnv(): string {
        return this.get('NODE_ENV') || 'development';
    }

    get swaggerConfig(): ISwaggerConfigInterface {
        return {
            path: this.get('SWAGGER_PATH') || '/api/docs',
            title: this.get('SWAGGER_TITLE') || 'VietPay FX Service',
            description: this.get('SWAGGER_DESCRIPTION'),
            version: this.get('SWAGGER_VERSION') || '0.0.1',
            scheme: this.get('SWAGGER_SCHEME') === 'https' ? 'https' : 'http',
        };
    }

    get typeOrmConfig(): TypeOrmModuleOptions {
        const entities = [__dirname + '/../../modules/**/*.entity{.ts,.js}'];
        const migrations = [__dirname + '/../../migrations/*{.ts,.js}'];
        return {
            entities,
            migrations,
            type: 'postgres',
            host: this.get('DB_HOST'),
            port: this.getNumber('DB_PORT'),
            username: this.get('DB_USERNAME'),
            password: this.get('DB_PASSWORD'),
            database: this.get('DB_DATABASE'),
            synchronize: false,
            migrationsRun: true,
            logging: this.nodeEnv === 'development',
        };
    }

    /** Redis connection for the BullMQ queue that drives the cron refresh. */
    get redisConfig() {
        return {
            host: this.get('REDIS_HOST') || '127.0.0.1',
            port: this.getNumber('REDIS_PORT') || 6379,
            db: this.getNumber('REDIS_DB') || 0,
        };
    }

    get fxConfig() {
        return {
            // Vietcombank public exchange-rate XML feed (Buy=bid, Sell=ask, +DateTime).
            sourceUrl:
                this.get('FX_SOURCE_URL') ||
                'https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx',
            // How often the BullMQ repeatable job re-fetches (cron expression).
            refreshCron: this.get('FX_REFRESH_CRON') || '*/15 * * * *',
            timeoutMs: this.getNumber('FX_TIMEOUT_MS') || 5000,
        };
    }

    get winstonConfig(): winston.LoggerOptions {
        return {
            transports: [
                new DailyRotateFile({
                    level: 'debug',
                    filename: `./logs/${this.nodeEnv}/debug-%DATE%.log`,
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    maxSize: '20m',
                    maxFiles: '14d',
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json(),
                    ),
                }),
                new DailyRotateFile({
                    level: 'error',
                    filename: `./logs/${this.nodeEnv}/error-%DATE%.log`,
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: false,
                    maxSize: '20m',
                    maxFiles: '30d',
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json(),
                    ),
                }),
                new winston.transports.Console({
                    level: 'debug',
                    handleExceptions: true,
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.timestamp({
                            format: 'DD-MM-YYYY HH:mm:ss',
                        }),
                        winston.format.simple(),
                    ),
                }),
            ],
            exitOnError: false,
        };
    }
}
