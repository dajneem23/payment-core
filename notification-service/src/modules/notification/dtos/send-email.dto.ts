import {
    IsEmail,
    IsOptional,
    IsString,
    IsArray,
    ArrayMinSize,
    IsNumber,
    MaxLength,
    Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Generic email ─────────────────────────────────────────────────────────

export class SendEmailDto {
    @ApiProperty({
        description: 'Recipient email addresses',
        example: ['user@example.com'],
        type: [String],
    })
    @IsArray()
    @ArrayMinSize(1)
    @IsEmail({}, { each: true })
    to!: string[];

    @ApiPropertyOptional({
        description: 'CC recipients',
        example: ['cc@example.com'],
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsEmail({}, { each: true })
    cc?: string[];

    @ApiPropertyOptional({
        description: 'BCC recipients',
        example: ['bcc@example.com'],
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsEmail({}, { each: true })
    bcc?: string[];

    @ApiProperty({
        description: 'Email subject',
        example: 'Welcome to VietPay',
    })
    @IsString()
    subject!: string;

    @ApiPropertyOptional({
        description: 'HTML body of the email',
        example: '<h1>Welcome!</h1><p>Your account has been created.</p>',
    })
    @IsOptional()
    @IsString()
    html?: string;

    @ApiPropertyOptional({
        description: 'Plain text body of the email',
        example: 'Welcome! Your account has been created.',
    })
    @IsOptional()
    @IsString()
    text?: string;
}

// ── Payment confirmation ──────────────────────────────────────────────────

export class PaymentEmailDto {
    @ApiProperty({
        description: 'Recipient email address',
        example: 'user@example.com',
    })
    @IsEmail()
    to!: string;

    @ApiProperty({ description: "Recipient's display name", example: 'Alice' })
    @IsString()
    customerName!: string;

    @ApiProperty({
        description: 'Transfer / transaction ID',
        example: 'txn_01J3K...',
    })
    @IsString()
    transferId!: string;

    @ApiProperty({ description: 'Transfer amount', example: '150.00' })
    @IsString()
    amount!: string;

    @ApiProperty({ description: 'Currency code', example: 'USD' })
    @IsString()
    currency!: string;

    @ApiProperty({ description: 'Transfer status', example: 'completed' })
    @IsString()
    status!: string;

    @ApiProperty({
        description: 'Source wallet ID',
        example: 'wal_a1b2c3d4',
    })
    @IsString()
    sourceWalletId!: string;

    @ApiProperty({
        description: 'Target wallet ID',
        example: 'wal_e5f6g7h8',
    })
    @IsString()
    targetWalletId!: string;

    @ApiProperty({
        description: 'ISO timestamp of the transfer',
        example: '2026-07-10T08:30:00Z',
    })
    @IsString()
    timestamp!: string;

    @ApiProperty({
        description: 'Optional free-text note from the sender (e.g. "Rent for July")',
        example: 'Rent for July',
        required: false,
    })
    @IsOptional()
    @MaxLength(500)
    remark?: string;
}

// ── OTP ───────────────────────────────────────────────────────────────────

export class OtpEmailDto {
    @ApiProperty({
        description: 'Recipient email address',
        example: 'user@example.com',
    })
    @IsEmail()
    to!: string;

    @ApiProperty({ description: "Recipient's display name", example: 'Alice' })
    @IsString()
    customerName!: string;

    @ApiProperty({ description: 'The OTP code', example: '482931' })
    @IsString()
    otpCode!: string;

    @ApiProperty({
        description: 'What the OTP is for',
        example: 'login',
    })
    @IsString()
    purpose!: string;

    @ApiProperty({
        description: 'Minutes until the code expires',
        example: 5,
    })
    @IsNumber()
    @Min(1)
    expiresInMinutes!: number;
}

// ── Welcome / greeting ────────────────────────────────────────────────────

export class WelcomeEmailDto {
    @ApiProperty({
        description: 'Recipient email address',
        example: 'user@example.com',
    })
    @IsEmail()
    to!: string;

    @ApiProperty({ description: "Recipient's display name", example: 'Alice' })
    @IsString()
    customerName!: string;
}

// ── Response ──────────────────────────────────────────────────────────────

export class SendEmailResponseDto {
    @ApiProperty({ description: 'Whether the email was sent successfully' })
    success!: boolean;

    @ApiPropertyOptional({ description: 'Provider-specific message ID' })
    messageId?: string;

    @ApiPropertyOptional({ description: 'Error message if sending failed' })
    error?: string;
}
