import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';

import { getMetrics } from './metrics';

@Controller()
@ApiTags('observability')
export class MetricsController {
    @Get('metrics')
    @ApiOperation({ summary: 'Prometheus metrics endpoint' })
    async metrics(@Res() res: Response) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(HttpStatus.OK).send(await getMetrics());
    }
}
