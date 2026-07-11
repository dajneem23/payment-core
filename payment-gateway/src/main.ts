// ── OpenTelemetry MUST be imported first — before any other module ──────
// The SDK monkey-patches http/express/kafkajs at require-time so spans
// cover the entire request lifecycle.
import './shared/telemetry/tracing';

import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import {
    NestExpressApplication,
    ExpressAdapter,
} from '@nestjs/platform-express';
import * as express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ConfigService } from './shared/services/config.service';
import { LoggerService } from './shared/services/logger.service';
import { setupSwagger } from './shared/swagger/setup';
import { SharedModule } from './shared.module';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(
        AppModule,
        new ExpressAdapter(),
        { cors: true, rawBody: true },
    );

    // Capture raw body for HMAC signature verification on webhooks.
    app.use(
        express.json({
            verify: (req: any, _res, buf) => {
                req.rawBody = buf.toString();
            },
        }),
    );

    const loggerService = app.select(SharedModule).get(LoggerService);
    app.useLogger(loggerService);
    app.use(
        morgan('combined', {
            stream: {
                write: (message: string) => {
                    loggerService.log(message);
                },
            },
        }),
    );

    // Trust the Traefik proxy so rate-limit + client-IP detection work correctly.
    app.set('trust proxy', 1);

    app.use(helmet());
    app.use(
        rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 100,
        }),
    );

    const reflector = app.get(Reflector);

    app.useGlobalFilters(new HttpExceptionFilter(loggerService));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            validationError: {
                target: false,
            },
        }),
    );

    const configService = app.select(SharedModule).get(ConfigService);

    if (['development', 'staging'].includes(configService.nodeEnv)) {
        setupSwagger(app, configService.swaggerConfig);
    }

    const port = configService.getNumber('PORT') || 3005;
    const host = configService.get('HOST') || '127.0.0.1';
    await app.listen(port, host);

    loggerService.warn(`payment-gateway running on ${host}:${port}`);
}
bootstrap();
