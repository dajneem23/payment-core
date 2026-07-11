import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/**
 * Verifies a service-account JWT (EC-signed) on internal endpoints. Each calling
 * service holds its own EC private key and signs a short-lived assertion:
 *
 *   { sub: "<service-name>", iss: "<service-name>", aud: "vietpay-internal",
 *     jti: "<uuid>", exp: <now+60s>, iat: <now> }
 *
 * The receiver verifies with that service's public key (configurable per issuer).
 * No shared secret — each service's key is rotatable independently.
 *
 * TODO: currently trusts any service whose EC key is configured. A proper
 * implementation would map { iss -> publicKey } and verify per-issuer. The
 * single-trust-anchor model is a reasonable first step for a compose-scale
 * internal mesh.
 */
@Injectable()
export class ServiceAuthGuard implements CanActivate {
    private readonly logger = new Logger(ServiceAuthGuard.name);
    private readonly audience = 'vietpay-internal';

    constructor(private readonly jwtService: JwtService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<Request>();
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            throw new UnauthorizedException('missing service bearer token');
        }
        try {
            const payload = await this.jwtService.verifyAsync(header.slice(7));
            // Minimal audience pinning — reject tokens issued for any other audience.
            if (payload.aud !== this.audience) {
                throw new UnauthorizedException('wrong audience');
            }
            (req as any).serviceCaller = payload.sub;
            return true;
        } catch (e: any) {
            this.logger.warn(`service auth rejected: ${e.message}`);
            throw new UnauthorizedException('invalid service token');
        }
    }
}
