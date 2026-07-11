import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import { ConfigService } from '../../shared/services/config.service';
import { trackEmailSent } from '../../shared/telemetry/metrics';
import { SendEmailDto, PaymentEmailDto, OtpEmailDto, WelcomeEmailDto } from './dtos/send-email.dto';
import { IEmailResult } from './interfaces/email-result.interface';
import { renderPaymentEmail } from './templates/payment';
import { renderOtpEmail } from './templates/otp';
import { renderWelcomeEmail } from './templates/welcome';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);
    private readonly transporter: Transporter;
    private readonly fromAddress: string;
    private readonly supportEmail: string;

    constructor(private readonly configService: ConfigService) {
        const smtp = configService.smtpConfig;
        this.fromAddress = smtp.from;
        this.supportEmail = smtp.supportEmail;

        this.transporter = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure,
            auth: {
                user: smtp.user,
                pass: smtp.pass,
            },
        });

        this.logger.log(
            `Nodemailer transport ready: ${smtp.host}:${smtp.port} (from=${this.fromAddress})`,
        );
    }

    // ── Generic email ────────────────────────────────────────────────────

    async sendEmail(dto: SendEmailDto): Promise<IEmailResult> {
        try {
            const info = await this.transporter.sendMail({
                from: this.fromAddress,
                to: dto.to.join(', '),
                cc: dto.cc?.join(', '),
                bcc: dto.bcc?.join(', '),
                subject: dto.subject,
                html: dto.html,
                text: dto.text,
            });
            this.logger.log(
                `Email sent: ${info.messageId} → ${dto.to.join(', ')}`,
            );
            trackEmailSent('ok');
            return { success: true, messageId: info.messageId };
        } catch (err: any) {
            this.logger.error(`Email failed: ${err.message}`, err.stack);
            trackEmailSent('error');
            return { success: false, error: err.message };
        }
    }

    // ── Transfer emails ───────────────────────────────────────────────────

    /** Debit receipt — sent to the sender: "You sent X to Y". */
    async sendDebitEmail(dto: PaymentEmailDto): Promise<IEmailResult> {
        const { html, text } = renderPaymentEmail({
            customerName: dto.customerName,
            transferId: dto.transferId,
            amount: dto.amount,
            currency: dto.currency,
            status: dto.status,
            sourceWalletId: dto.sourceWalletId,
            targetWalletId: dto.targetWalletId,
            remark: dto.remark,
            timestamp: dto.timestamp,
            supportEmail: this.supportEmail,
        });

        return this.sendEmail({
            to: [dto.to],
            subject: `You sent ${dto.amount} ${dto.currency} — ${dto.transferId}`,
            html,
            text,
        });
    }

    /** Credit notification — sent to the receiver: "You received X from Y". */
    async sendCreditEmail(dto: PaymentEmailDto): Promise<IEmailResult> {
        const { html, text } = renderPaymentEmail({
            customerName: dto.customerName,
            transferId: dto.transferId,
            amount: dto.amount,
            currency: dto.currency,
            status: dto.status,
            sourceWalletId: dto.sourceWalletId,
            targetWalletId: dto.targetWalletId,
            remark: dto.remark,
            timestamp: dto.timestamp,
            supportEmail: this.supportEmail,
        });

        return this.sendEmail({
            to: [dto.to],
            subject: `You received ${dto.amount} ${dto.currency} — ${dto.transferId}`,
            html,
            text,
        });
    }

    // ── Welcome / greeting ───────────────────────────────────────────────

    async sendWelcomeEmail(dto: WelcomeEmailDto): Promise<IEmailResult> {
        const { html, text } = renderWelcomeEmail({
            customerName: dto.customerName,
            supportEmail: this.supportEmail,
        });

        return this.sendEmail({
            to: [dto.to],
            subject: 'Welcome to VietPay!',
            html,
            text,
        });
    }

    // ── OTP ──────────────────────────────────────────────────────────────

    async sendOtpEmail(dto: OtpEmailDto): Promise<IEmailResult> {
        const { html, text } = renderOtpEmail({
            customerName: dto.customerName,
            otpCode: dto.otpCode,
            purpose: dto.purpose,
            expiresInMinutes: dto.expiresInMinutes,
            supportEmail: this.supportEmail,
        });

        return this.sendEmail({
            to: [dto.to],
            subject: `Your OTP for ${dto.purpose}`,
            html,
            text,
        });
    }
}
