import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum PaymentStatus {
    PENDING = 'PENDING',
    AUTHORIZED = 'AUTHORIZED',
    CAPTURED = 'CAPTURED',
    FAILED = 'FAILED',
}

export enum PaymentScheme {
    VISA = 'VISA',
    MASTERCARD = 'MASTERCARD',
}

@Entity({ name: 'payments' })
export class Payment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 20, default: 'TOPUP' })
    type: string;

    @Column({ name: 'wallet_id', type: 'uuid' })
    walletId: string;

    @Column({ type: 'varchar', length: 20 })
    scheme: string;

    @Column({ name: 'card_token', type: 'varchar' })
    cardToken: string;

    @Column({ type: 'varchar', length: 20 })
    bin: string;

    @Column({ type: 'numeric', precision: 19, scale: 4 })
    amount: number;

    @Column({ type: 'char', length: 3 })
    currency: string;

    @Column({ type: 'varchar', length: 20, default: 'PENDING' })
    status: string;

    @Column({ name: 'provider_ref', type: 'varchar', nullable: true })
    providerRef: string | null;

    @Column({ name: 'owner_user_id', type: 'uuid' })
    ownerUserId: string;

    @Column({ name: 'idempotency_key', type: 'varchar', unique: true })
    idempotencyKey: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
