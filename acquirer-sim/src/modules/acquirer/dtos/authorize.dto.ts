import { IsUUID, IsNumberString, IsString } from 'class-validator';

export class AuthorizeDto {
    @IsUUID()
    paymentId: string;

    @IsNumberString()
    amount: string;

    @IsString()
    currency: string;

    @IsString()
    cardToken: string;

    @IsString()
    bin: string;

    @IsString()
    callbackUrl: string;
}

export class CaptureDto {
    @IsUUID()
    paymentId: string;

    @IsString()
    providerRef: string;

    @IsNumberString()
    amount: string;

    @IsString()
    currency: string;

    @IsString()
    callbackUrl: string;
}
