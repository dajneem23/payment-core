import { IsIn, IsNumberString, IsString, IsUUID, Length } from 'class-validator';

export class TopupDto {
    @IsUUID()
    walletId: string;

    @IsNumberString()
    amount: string;

    @IsString()
    @Length(3, 3)
    currency: string;

    @IsIn(['VISA', 'MASTERCARD'])
    scheme: string;

    @IsString()
    cardToken: string;

    @IsString()
    bin: string;
}
