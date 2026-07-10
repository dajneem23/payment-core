import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotificationModule } from './modules/notification/notification.module';
import { SharedModule } from './shared.module';
import { MetricsModule } from './shared/telemetry/metrics.module';

@Module({
    imports: [SharedModule, TerminusModule, MetricsModule, NotificationModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
