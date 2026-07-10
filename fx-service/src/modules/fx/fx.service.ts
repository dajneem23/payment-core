import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { FxRate } from './entities/fx-rate.entity';
import { VcbRate } from './vcb-fetch.service';

/** Read/write access to the stored rates. The cron refresh upserts; the API reads. */
@Injectable()
export class FxService {
    constructor(
        @InjectRepository(FxRate)
        private readonly repository: Repository<FxRate>,
    ) {}

    findAll(): Promise<FxRate[]> {
        return this.repository.find({ order: { currencyCode: 'ASC' } });
    }

    findOne(currencyCode: string): Promise<FxRate | null> {
        return this.repository.findOneBy({ currencyCode: currencyCode.toUpperCase() });
    }

    /** Upsert the latest rates (one row per currency, keyed by currencyCode). */
    async upsertMany(rates: VcbRate[]): Promise<number> {
        if (rates.length === 0) {
            return 0;
        }
        const rows = rates.map((r) => ({ ...r, quote: 'VND' }));
        await this.repository.upsert(rows, ['currencyCode']);
        return rows.length;
    }
}
