import {
    Controller,
    Post,
    Body,
    UseGuards,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { AcquirerService } from './acquirer.service';
import { AcquirerApiKeyGuard } from './acquirer.guard';
import { AuthorizeDto, CaptureDto } from './dtos/authorize.dto';

@Controller('acquirer')
@UseGuards(AcquirerApiKeyGuard)
@ApiTags('acquirer')
export class AcquirerController {
    constructor(private readonly _acquirerService: AcquirerService) {}

    @Post('authorize')
    @ApiOperation({ summary: 'Authorize a card transaction' })
    authorize(@Body() dto: AuthorizeDto) {
        const result = this._acquirerService.authorize(dto);
        if (result.declined) {
            throw new HttpException(
                { declined: true, reason: result.reason },
                HttpStatus.PAYMENT_REQUIRED,
            );
        }
        return result;
    }

    @Post('capture')
    @ApiOperation({ summary: 'Capture an authorized transaction' })
    async capture(@Body() dto: CaptureDto) {
        return this._acquirerService.capture(dto);
    }
}
