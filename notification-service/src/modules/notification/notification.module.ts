import { Module } from '@nestjs/common';

import { KafkaAdminController } from './kafka-admin.controller';
import { KafkaConsumerService } from './kafka-consumer.service';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
    controllers: [NotificationController, KafkaAdminController],
    providers: [NotificationService, KafkaConsumerService],
    exports: [NotificationService],
})
export class NotificationModule {}
