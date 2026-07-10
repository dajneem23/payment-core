import { Module } from '@nestjs/common';

import { KafkaConsumerService } from './kafka-consumer.service';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
    controllers: [NotificationController],
    providers: [NotificationService, KafkaConsumerService],
    exports: [NotificationService],
})
export class NotificationModule {}
