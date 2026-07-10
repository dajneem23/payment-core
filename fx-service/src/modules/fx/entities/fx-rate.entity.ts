import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Latest exchange rate for one currency versus VND, sourced from Vietcombank.
 * One row per currency (upserted on each refresh). Buy = bank's bid, Sell =
 * bank's ask, Transfer = wire-transfer rate; asOf is the feed's own timestamp.
 */
@Entity('fx_rates')
export class FxRate {
    @PrimaryColumn({ name: 'currency_code', length: 3 })
    currencyCode!: string;

    @Column({ name: 'currency_name', nullable: true })
    currencyName?: string;

    // Rates are strings to preserve exact decimals — never floats.
    @Column({ type: 'numeric', precision: 19, scale: 4, nullable: true })
    buy?: string | null; // bid (cash)

    @Column({ type: 'numeric', precision: 19, scale: 4, nullable: true })
    transfer?: string | null;

    @Column({ type: 'numeric', precision: 19, scale: 4, nullable: true })
    sell?: string | null; // ask

    @Column({ name: 'quote', length: 3, default: 'VND' })
    quote!: string; // all Vietcombank rates are quoted against VND

    @Column({ name: 'as_of', type: 'timestamptz', nullable: true })
    asOf?: Date | null; // the DateTime the bank published the rate

    @UpdateDateColumn({ name: 'fetched_at', type: 'timestamptz' })
    fetchedAt!: Date; // when this service last refreshed it
}
