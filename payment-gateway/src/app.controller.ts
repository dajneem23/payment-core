import { Controller, Get, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
    HealthCheck,
    HealthCheckService,
} from '@nestjs/terminus';

import { AppService } from './app.service';
import { LoggerService } from './shared/services/logger.service';

@Controller('/')
@ApiTags('health')
export class AppController {
    constructor(
        private readonly _appService: AppService,
        private readonly _logger: LoggerService,
        private health: HealthCheckService,
    ) {}

    @Get('/')
    @HttpCode(HttpStatus.OK)
    @ApiResponse({ status: HttpStatus.OK, description: 'Hello world' })
    getHello(): string {
        this._logger.info('Payment gateway health check');
        return this._appService.getHello();
    }

    @Get('healthcheck')
    @HealthCheck()
    healthCheck() {
        return this.health.check([]);
    }
}
