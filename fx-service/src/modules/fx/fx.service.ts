import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { FxRate } from './entities/fx-rate.entity';
import { FxRateSnapshot } from './entities/fx-rate-snapshot.entity';
import { VcbRate } from './vcb-fetch.service';

/** Read/write access to the stored rates. The cron refresh upserts; the API reads. */
@Injectable()
export class FxService {
    constructor(
        @InjectRepository(FxRate)
        private readonly repository: Repository<FxRate>,
        @InjectRepository(FxRateSnapshot)
        private readonly snapshotRepo: Repository<FxRateSnapshot>,
    ) {}

    findAll(): Promise<FxRate[]> {
        return this.repository.find({ order: { currencyCode: 'ASC' } });
    }

    findOne(currencyCode: string): Promise<FxRate | null> {
        return this.repository.findOneBy({ currencyCode: currencyCode.toUpperCase() });
    }

    /**
     * Return historical snapshots for a currency within a date window.
     * Defaults to the last 7 days if `from` / `to` are not provided.
     */
    async findHistory(
        currencyCode: string,
        from?: string,
        to?: string,
        limit = 200,
    ): Promise<FxRateSnapshot[]> {
        const qb = this.snapshotRepo
            .createQueryBuilder('s')
            .where('s.currencyCode = :code', { code: currencyCode.toUpperCase() })
            .orderBy('s.fetchedAt', 'ASC')
            .take(limit);

        if (from) {
            qb.andWhere('s.fetchedAt >= :from', { from });
        }
        if (to) {
            qb.andWhere('s.fetchedAt <= :to', { to });
        }

        return qb.getMany();
    }

    /** Upsert the latest rates (one row per currency, keyed by currencyCode). */
    async upsertMany(rates: VcbRate[]): Promise<number> {
        if (rates.length === 0) {
            return 0;
        }

        const rows: FxRate[] = rates.map((r) => {
            const entity = new FxRate();
            entity.currencyCode = r.currencyCode;
            entity.currencyName = r.currencyName;
            entity.buy = r.buy;
            entity.transfer = r.transfer;
            entity.sell = r.sell;
            entity.asOf = r.asOf;
            entity.quote = 'VND';
            return entity;
        });
        await this.repository.upsert(rows, ['currencyCode']);

        // Also append snapshots for time-series history
        await this.saveSnapshots(rates);

        return rows.length;
    }

    /** Append a snapshot row per currency for time-series charting. */
    private async saveSnapshots(rates: VcbRate[]): Promise<void> {
        const snapshots = rates.map((r) => {
            const s = new FxRateSnapshot();
            s.currencyCode = r.currencyCode;
            s.currencyName = r.currencyName ?? undefined;
            s.buy = r.buy ?? undefined;
            s.transfer = r.transfer ?? undefined;
            s.sell = r.sell ?? undefined;
            s.asOf = r.asOf ?? undefined;
            s.quote = 'VND';
            return s;
        });
        await this.snapshotRepo.save(snapshots);
    }
}
