import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PaymentsModule } from './modules/payments/payments.module';
import { ConfigService } from './shared/services/config.service';
import { SharedModule } from './shared.module';
import { MetricsModule } from './shared/telemetry/metrics.module';

@Module({
    imports: [
        SharedModule,
        TerminusModule,
        MetricsModule,
        ScheduleModule.forRoot(),
        TypeOrmModule.forRootAsync({
            imports: [SharedModule],
            useFactory: (config: ConfigService) => config.typeOrmConfig,
            inject: [ConfigService],
        }),
        PaymentsModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
