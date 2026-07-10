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
            title: this.get('SWAGGER_TITLE') || 'VietPay Notification Service',
            description: this.get('SWAGGER_DESCRIPTION'),
            version: this.get('SWAGGER_VERSION') || '0.0.1',
            scheme: this.get('SWAGGER_SCHEME') === 'https' ? 'https' : 'http',
        };
    }

    get smtpConfig() {
        return {
            host: this.get('SMTP_HOST') || 'smtp.example.com',
            port: this.getNumber('SMTP_PORT') || 587,
            secure: this.get('SMTP_SECURE') === 'true',
            user: this.get('SMTP_USER') || '',
            pass: this.get('SMTP_PASS') || '',
            from: this.get('SMTP_FROM') || 'VietPay <noreply@vietpay.com>',
            supportEmail:
                this.get('SUPPORT_EMAIL') || 'support@vietpay.com',
        };
    }

    get kafkaConfig() {
        return {
            broker: this.get('KAFKA_BROKER') || 'localhost:9092',
            clientId: this.get('KAFKA_CLIENT_ID') || 'notification-service',
            groupId: this.get('KAFKA_GROUP_ID') || 'notification-service',
            transferTopic:
                this.get('KAFKA_TRANSFER_TOPIC') || 'transfer-events',
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
