import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { ConfigService } from '../../shared/services/config.service';

@Injectable()
export class AcquirerApiKeyGuard implements CanActivate {
    constructor(private readonly _configService: ConfigService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        const apiKey = request.headers['x-api-key'] as string | undefined;

        if (!apiKey || apiKey !== this._configService.acquirerConfig.apiKey) {
            throw new UnauthorizedException('Invalid or missing API key');
        }

        return true;
    }
}
