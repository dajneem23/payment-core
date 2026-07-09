import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { JwtPayload } from './interfaces/jwt-payload.interface';

/** Injects the authenticated user's id (JWT `sub`) into a handler param. */
export const UserId = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): string => {
        const req = ctx.switchToHttp().getRequest();
        return (req.user as JwtPayload).sub;
    },
);
