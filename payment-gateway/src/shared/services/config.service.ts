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
            title: this.get('SWAGGER_TITLE') || 'VietPay Payment Gateway',
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
            database: this.get('DB_DATABASE') || 'vietpay_payments',
            synchronize: false,
            migrationsRun: true,
            logging: this.nodeEnv === 'development',
        };
    }

    get kafkaConfig() {
        return {
            broker: this.get('KAFKA_BROKER') || 'localhost:9092',
            clientId: this.get('KAFKA_CLIENT_ID') || 'payment-gateway',
            paymentTopic: this.get('KAFKA_PAYMENT_TOPIC') || 'payment-events',
        };
    }

    get acquirerConfig() {
        return {
            visaUrl: this.get('VISA_URL') || 'http://visa-service:3006',
            mastercardUrl:
                this.get('MASTERCARD_URL') || 'http://mastercard-service:3007',
            apiKey: this.get('ACQUIRER_API_KEY') || 'dev-acquirer-key',
            visaHmacSecret:
                this.get('VISA_HMAC_SECRET') || 'visa-dev-secret',
            mastercardHmacSecret:
                this.get('MASTERCARD_HMAC_SECRET') || 'mc-dev-secret',
            selfWebhookBaseUrl:
                this.get('SELF_WEBHOOK_BASE_URL') ||
                'http://payment-gateway:3005',
        };
    }

    get outboxConfig() {
        return {
            pollMs: this.getNumber('OUTBOX_POLL_MS') || 1000,
            enabled:
                (this.get('OUTBOX_ENABLED') || 'true') === 'true',
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
