import { IsIn, IsNumberString, IsString, IsUUID, Length } from 'class-validator';

export class TopupDto {
    @IsUUID()
    walletId: string;

    @IsNumberString()
    amount: string;

    @IsString()
    @IsIn(['USD', 'EUR', 'VND', 'GBP'])
    currency: string;

    @IsIn(['VISA', 'MASTERCARD'])
    scheme: string;

    @IsString()
    cardToken: string;

    @IsString()
    bin: string;
}
