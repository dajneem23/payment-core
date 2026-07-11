import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { FxRate } from './entities/fx-rate.entity';
import { FxRateSnapshot } from './entities/fx-rate-snapshot.entity';
import { FxService } from './fx.service';

/** Read-only FX rates (vs VND), refreshed from Vietcombank by the cron job. */
@ApiTags('FX')
@Controller('fx')
export class FxController {
    constructor(private readonly fxService: FxService) {}

    @Get('rates')
    @ApiOperation({ summary: 'All latest rates (bid/ask/transfer vs VND)' })
    all(): Promise<FxRate[]> {
        return this.fxService.findAll();
    }

    /** Must be defined before `rates/:code` so NestJS matches this first. */
    @Get('rates/:code/history')
    @ApiOperation({ summary: 'Historical snapshots for one currency (time-series)' })
    @ApiResponse({ status: 200, description: 'Array of snapshots, newest first' })
    async history(
        @Param('code') code: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('limit') limit?: string,
    ): Promise<FxRateSnapshot[]> {
        return this.fxService.findHistory(
            code,
            from,
            to,
            limit ? parseInt(limit, 10) : 200,
        );
    }

    @Get('rates/:code')
    @ApiOperation({ summary: 'Latest rate for one currency, e.g. USD' })
    @ApiResponse({ status: 404, description: 'No rate for that currency' })
    async one(@Param('code') code: string): Promise<FxRate> {
        const rate = await this.fxService.findOne(code);
        if (!rate) {
            throw new NotFoundException(`no rate for currency ${code}`);
        }
        return rate;
    }
}
