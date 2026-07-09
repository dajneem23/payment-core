import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import { REDIS_CLIENT } from '../../shared/redis/redis.module';

/**
 * Access-token blacklist (jti revocation).
 *
 * <p>JWTs are stateless, so a valid unexpired access token normally can't be
 * revoked. To support logout / "kill this session now", we store the token's
 * `jti` in Redis with a TTL equal to the token's remaining lifetime. The
 * ForwardAuth verify path checks this list and rejects blacklisted tokens.
 * The TTL means Redis self-cleans — a blacklisted entry disappears exactly when
 * the token would have expired anyway.
 */
@Injectable()
export class TokenBlacklistService {
    private static readonly PREFIX = 'auth:bl:';

    constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

    async revoke(jti: string, ttlSeconds: number): Promise<void> {
        if (!jti || ttlSeconds <= 0) {
            return;
        }
        await this.redis.set(TokenBlacklistService.PREFIX + jti, '1', 'EX', ttlSeconds);
    }

    async isRevoked(jti: string): Promise<boolean> {
        if (!jti) {
            return false;
        }
        const hit = await this.redis.exists(TokenBlacklistService.PREFIX + jti);
        return hit === 1;
    }
}
