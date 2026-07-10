import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FxRate } from './entities/fx-rate.entity';
import { FxController } from './fx.controller';
import { FxRefreshProcessor, FX_REFRESH_QUEUE } from './fx-refresh.processor';
import { FxRefreshScheduler } from './fx-refresh.scheduler';
import { FxService } from './fx.service';
import { VcbFetchService } from './vcb-fetch.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([FxRate]),
        BullModule.registerQueue({ name: FX_REFRESH_QUEUE }),
    ],
    controllers: [FxController],
    providers: [FxService, VcbFetchService, FxRefreshProcessor, FxRefreshScheduler],
})
export class FxModule {}
