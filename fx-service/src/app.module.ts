import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FxModule } from './modules/fx/fx.module';
import { ConfigService } from './shared/services/config.service';
import { SharedModule } from './shared.module';
import { MetricsModule } from './shared/telemetry/metrics.module';

@Module({
    imports: [
        SharedModule,
        TerminusModule,
        MetricsModule,
        TypeOrmModule.forRootAsync({
            imports: [SharedModule],
            useFactory: (config: ConfigService) => config.typeOrmConfig,
            inject: [ConfigService],
        }),
        BullModule.forRootAsync({
            imports: [SharedModule],
            useFactory: (config: ConfigService) => ({
                connection: config.redisConfig,
            }),
            inject: [ConfigService],
        }),
        FxModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
