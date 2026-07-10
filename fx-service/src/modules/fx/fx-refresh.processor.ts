import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { FxService } from './fx.service';
import { VcbFetchService } from './vcb-fetch.service';

export const FX_REFRESH_QUEUE = 'fx-refresh';

/**
 * BullMQ worker that refreshes FX rates: fetch the Vietcombank feed, upsert into
 * Postgres. Runs both on the repeatable (cron) schedule and on the immediate
 * warm-up job. Doing the fetch in a queue worker (not inline in a request)
 * decouples the slow external call from the API and gives retries/backoff.
 */
@Processor(FX_REFRESH_QUEUE)
export class FxRefreshProcessor extends WorkerHost {
    private readonly logger = new Logger(FxRefreshProcessor.name);

    constructor(
        private readonly vcbFetch: VcbFetchService,
        private readonly fxService: FxService,
    ) {
        super();
    }

    async process(job: Job): Promise<{ count: number }> {
        const rates = await this.vcbFetch.fetchRates();
        const count = await this.fxService.upsertMany(rates);
        this.logger.log(`refreshed ${count} FX rates (job ${job.name})`);
        return { count };
    }
}
