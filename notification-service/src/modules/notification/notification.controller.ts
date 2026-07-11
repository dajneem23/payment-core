import {
    Controller,
    Post,
    Body,
    HttpStatus,
    HttpCode,
} from '@nestjs/common';
import { ApiResponse, ApiTags, ApiOperation } from '@nestjs/swagger';

import { NotificationService } from './notification.service';
import {
    SendEmailDto,
    SendEmailResponseDto,
    PaymentEmailDto,
    OtpEmailDto,
    WelcomeEmailDto,
} from './dtos/send-email.dto';

@Controller('notifications')
@ApiTags('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @Post('email')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Send a generic email' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Email sent successfully',
        type: SendEmailResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Validation failed',
    })
    async sendEmail(
        @Body() dto: SendEmailDto,
    ): Promise<SendEmailResponseDto> {
        return this.notificationService.sendEmail(dto);
    }

    @Post('payment')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Send a payment confirmation email' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Payment email sent',
        type: SendEmailResponseDto,
    })
    async sendPaymentEmail(
        @Body() dto: PaymentEmailDto,
    ): Promise<SendEmailResponseDto> {
        return this.notificationService.sendDebitEmail(dto);
    }

    @Post('transfer/credit')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Send a credit (received-money) email — test aid' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Credit email sent',
        type: SendEmailResponseDto,
    })
    async sendCreditEmail(
        @Body() dto: PaymentEmailDto,
    ): Promise<SendEmailResponseDto> {
        return this.notificationService.sendCreditEmail(dto);
    }

    @Post('welcome')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Send a welcome / greeting email to a new user' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Welcome email sent',
        type: SendEmailResponseDto,
    })
    async sendWelcomeEmail(
        @Body() dto: WelcomeEmailDto,
    ): Promise<SendEmailResponseDto> {
        return this.notificationService.sendWelcomeEmail(dto);
    }

    @Post('otp')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Send an OTP email' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'OTP email sent',
        type: SendEmailResponseDto,
    })
    async sendOtpEmail(
        @Body() dto: OtpEmailDto,
    ): Promise<SendEmailResponseDto> {
        return this.notificationService.sendOtpEmail(dto);
    }
}
