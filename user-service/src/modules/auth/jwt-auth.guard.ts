import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { AuthService } from './auth.service';

/**
 * Extracts the Bearer token from the Authorization header and validates it
 * via AuthService.verify(). On success it attaches `req.user` so the
 * {@link UserId} param-decorator can read it.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly authService: AuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<Request>();
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            throw new UnauthorizedException('missing bearer token');
        }
        const token = header.slice(7);
        const payload = await this.authService.verify(token);
        //TODO: verify jti is not reused (refresh token rotation). This is a no-op for access tokens.

        

        (req as any).user = payload; // set for @UserId() decorator



        return true;
    }
}
