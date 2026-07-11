import { IsIn, IsString, IsUUID } from 'class-validator';

export class SettlementWebhookDto {
    @IsString()
    providerEventId: string;

    @IsString()
    providerRef: string;

    @IsUUID()
    paymentId: string;

    @IsIn(['SETTLED', 'FAILED'])
    status: 'SETTLED' | 'FAILED';
}
