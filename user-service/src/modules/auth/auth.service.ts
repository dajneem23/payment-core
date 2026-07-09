import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

import { ConfigService } from '../../shared/services/config.service';
import { UsersService } from '../users/services/users.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { TokenBlacklistService } from './token-blacklist.service';
import { timingEquals } from 'src/utils/crypto';

const BCRYPT_ROUNDS = 12;

/** Returned to the client after a successful login/register/refresh. */
export interface TokenPair {
    accessToken: string;
    expiresIn: number; // seconds
    refreshToken: string;
    refreshExpiresIn: number; // seconds
}

/**
 * Authentication orchestrator — password hashing, ES256 JWT signing (access +
 * refresh), rotation, and revocation.
 *
 * Two revocation mechanisms, because access and refresh tokens fail differently:
 *  - Refresh tokens are single-use: each /auth/refresh rotates them; the current
 *    one is tracked as a SHA-256 hash in user.hashedRefreshToken. Replay of an
 *    old refresh token revokes the whole session.
 *  - Access tokens are stateless and short-lived, so to revoke one before it
 *    expires (logout) we blacklist its `jti` in Redis until its own expiry.
 */
@Injectable()
export class AuthService {
    private readonly accessExpiresIn: number;
    private readonly refreshExpiresIn: number;

    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly blacklist: TokenBlacklistService,
        configService: ConfigService,
    ) {
        this.accessExpiresIn = configService.jwtConfig.accessExpiresIn;
        this.refreshExpiresIn = configService.jwtConfig.refreshExpiresIn;
    }

    async register(params: {
        email: string;
        password: string;
        firstName?: string;
        lastName?: string;
    }): Promise<TokenPair> {
        if (await this.usersService.findByEmail(params.email)) {
            throw new ConflictException('email already registered');
        }
        const passwordHash = await bcrypt.hash(params.password, BCRYPT_ROUNDS);
        const user = await this.usersService.create({ ...params, passwordHash });
        return this.issuePair(user.id, user.email);
    }

    async login(email: string, password: string): Promise<TokenPair> {
        const user = await this.usersService.findByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            throw new UnauthorizedException('invalid credentials');
        }
        return this.issuePair(user.id, user.email);
    }

    async refresh(refreshToken: string): Promise<TokenPair> {
        const payload = await this.verifyToken(refreshToken);
        if (payload.type !== 'refresh') {
            throw new UnauthorizedException('not a refresh token');
        }
        const user = await this.usersService.findById(payload.sub);
        if (!user) {
            throw new UnauthorizedException('user not found');
        }
        // doesn't, it was already rotated (possible theft) — revoke the session.
        const presentedHash = this.hashToken(refreshToken);
        if (
            !user.hashedRefreshToken ||
            !timingEquals(user.hashedRefreshToken, presentedHash)
        ) {
            await this.usersService.clearRefreshToken(user.id);
            throw new UnauthorizedException('refresh token already used');
        }
        return this.issuePair(user.id, user.email);
    }

    /** Logout: revoke the refresh token (DB) and blacklist the access token's
     *  jti in Redis until it would have expired. */
    async logout(accessToken: string): Promise<void> {
        const payload = await this.verifyToken(accessToken).catch(() => null);
        if (!payload) {
            return;
        }
        await this.usersService.clearRefreshToken(payload.sub);
        if (payload.jti && payload.exp) {
            const ttl = payload.exp - Math.floor(Date.now() / 1000);
            await this.blacklist.revoke(payload.jti, ttl);
        }
    }

    /**
     * Verify a token for the ForwardAuth path: valid signature AND not
     * blacklisted. Throws 401 otherwise.
     */
    async verify(tokenValue: string): Promise<JwtPayload> {
        const payload = await this.verifyToken(tokenValue);
        if (await this.blacklist.isRevoked(payload.jti!)) {
            throw new UnauthorizedException('token revoked');
        }
        return payload;
    }

    // ---- helpers -----------------------------------------------------------

    private async verifyToken(token: string): Promise<JwtPayload> {
        try {
            return await this.jwtService.verifyAsync<JwtPayload>(token);
        } catch {
            throw new UnauthorizedException('token invalid or expired');
        }
    }

    private async issuePair(userId: string, email: string): Promise<TokenPair> {
        const accessToken = this.sign(userId, email, 'access', this.accessExpiresIn);
        const refreshToken = this.sign(userId, email, 'refresh', this.refreshExpiresIn);
        await this.usersService.setRefreshToken(userId, this.hashToken(refreshToken));
        return {
            accessToken,
            expiresIn: this.accessExpiresIn,
            refreshToken,
            refreshExpiresIn: this.refreshExpiresIn,
        };
    }

    private sign(
        userId: string,
        email: string,
        type: 'access' | 'refresh',
        expiresIn: number,
    ): string {
        return this.jwtService.sign(
            { sub: userId, email, type },
            { expiresIn, jwtid: crypto.randomUUID() },
        );
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
}
