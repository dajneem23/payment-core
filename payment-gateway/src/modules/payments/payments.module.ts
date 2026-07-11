import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AcquirerClient } from './acquirer.client';
import { OutboxEvent } from './entities/outbox-event.entity';
import { Payment } from './entities/payment.entity';
import { ProcessedWebhook } from './entities/processed-webhook.entity';
import { OutboxRelay } from './outbox.relay';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Payment, ProcessedWebhook, OutboxEvent]),
    ],
    controllers: [PaymentsController],
    providers: [PaymentsService, AcquirerClient, OutboxRelay],
    exports: [PaymentsService],
})
export class PaymentsModule {}
