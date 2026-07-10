import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Queue } from 'bullmq';

import { ConfigService } from '../../shared/services/config.service';
import { FX_REFRESH_QUEUE } from './fx-refresh.processor';

/**
 * Registers the repeatable FX-refresh job on startup and fires one immediate
 * refresh so the API has data right away. The repeatable job uses a fixed jobId
 * so restarts don't pile up duplicate schedules.
 */
@Injectable()
export class FxRefreshScheduler implements OnApplicationBootstrap {
    private readonly logger = new Logger(FxRefreshScheduler.name);

    constructor(
        @InjectQueue(FX_REFRESH_QUEUE) private readonly queue: Queue,
        private readonly configService: ConfigService,
    ) {}

    async onApplicationBootstrap(): Promise<void> {
        const cron = this.configService.fxConfig.refreshCron;
        await this.queue.add('scheduled-refresh', {}, {
            repeat: { pattern: cron },
            jobId: 'fx-refresh-cron',
            removeOnComplete: true,
            removeOnFail: 50,
        });
        // Warm-up: don't wait up to a full cron interval for the first rates.
        await this.queue.add('warmup-refresh', {}, { removeOnComplete: true, removeOnFail: 50 });
        this.logger.log(`FX refresh scheduled (cron="${cron}") + warm-up queued`);
    }
}
