import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Historical FX rate snapshot — appended on every Vietcombank refresh.
 * Unlike {@link FxRate} (which stores only the latest per currency), this
 * table keeps a full time-series so the frontend can render rate charts.
 */
@Entity('fx_rate_snapshots')
export class FxRateSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'currency_code', length: 3 })
  currencyCode!: string;

  @Column({ name: 'currency_name', type: 'varchar', nullable: true })
  currencyName?: string;

  @Column({ type: 'numeric', precision: 19, scale: 4, nullable: true })
  buy?: string;

  @Column({ type: 'numeric', precision: 19, scale: 4, nullable: true })
  transfer?: string;

  @Column({ type: 'numeric', precision: 19, scale: 4, nullable: true })
  sell?: string;

  @Column({ name: 'quote', length: 3, default: 'VND' })
  quote!: string;

  @Column({ name: 'as_of', type: 'timestamptz', nullable: true })
  asOf?: Date;

  @CreateDateColumn({ name: 'fetched_at', type: 'timestamptz' })
  fetchedAt!: Date;
}
