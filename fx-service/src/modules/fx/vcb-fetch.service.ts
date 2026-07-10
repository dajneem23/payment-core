import { Injectable, Logger } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';

import { ConfigService } from '../../shared/services/config.service';

/** One parsed rate row from the Vietcombank feed. */
export interface VcbRate {
    currencyCode: string;
    currencyName?: string;
    buy: string | null;
    transfer: string | null;
    sell: string | null;
    asOf: Date | null;
}

/**
 * Fetches and parses the Vietcombank exchange-rate XML feed. Pure I/O + parsing;
 * persistence and scheduling live elsewhere (single responsibility).
 *
 * Feed shape:
 *   <ExrateList>
 *     <DateTime>8:30 AM 7/10/2026</DateTime>
 *     <Exrate CurrencyCode="USD" CurrencyName="..." Buy="25,100.00"
 *             Transfer="25,130.00" Sell="25,400.00"/>
 *     ...
 *   </ExrateList>
 */
@Injectable()
export class VcbFetchService {
    private readonly logger = new Logger(VcbFetchService.name);
    private readonly parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

    constructor(private readonly configService: ConfigService) {}

    async fetchRates(): Promise<VcbRate[]> {
        const { sourceUrl, timeoutMs } = this.configService.fxConfig;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(sourceUrl, { signal: controller.signal });
            if (!res.ok) {
                throw new Error(`VCB feed returned HTTP ${res.status}`);
            }
            return this.parse(await res.text());
        } catch(e){
            this.logger.error(`VCB fetch failed: ${e instanceof Error ? e.message : String(e)}`);
            throw e;
        } finally {
            this.logger.log(`VCB fetch completed (timeout=${timeoutMs}ms)`);
            clearTimeout(timer);
        }
    }

    private parse(xml: string): VcbRate[] {
        const doc = this.parser.parse(xml);
        const list = doc?.ExrateList ?? {};
        const asOf = this.parseDateTime(list.DateTime);
        const raw = list.Exrate;
        const rows: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
        return rows.map((r) => ({
            currencyCode: String(r['@_CurrencyCode']).trim(),
            currencyName: r['@_CurrencyName']?.trim(),
            buy: this.num(r['@_Buy']),
            transfer: this.num(r['@_Transfer']),
            sell: this.num(r['@_Sell']),
            asOf,
        }));
    }

    private num(v: unknown): string | null {
        if (v === undefined || v === null) return null;
        const s = String(v).replace(/,/g, '').trim();
        return s === '' || s === '-' ? null : s;
    }

    private parseDateTime(dt: unknown): Date | null {
        if (!dt) return null;
        const parsed = new Date(String(dt));
        return isNaN(parsed.getTime()) ? null : parsed;
    }
}
