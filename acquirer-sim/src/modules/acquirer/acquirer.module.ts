import { Module } from '@nestjs/common';

import { AcquirerController } from './acquirer.controller';
import { AcquirerService } from './acquirer.service';
import { WebhookClient } from './webhook.client';

@Module({
    controllers: [AcquirerController],
    providers: [AcquirerService, WebhookClient],
})
export class AcquirerModule {}
