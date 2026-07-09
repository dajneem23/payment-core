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

const BCRYPT_ROUNDS = 12;

/** Returned to the client after a successful login/register/refresh. */
export interface TokenPair {
    accessToken: string;
    expiresIn: number;          // seconds
    refreshToken: string;
    refreshExpiresIn: number;   // seconds
}

/**
 * Authentication orchestrator — password hashing/verification, ES256 JWT
 * signing with access + refresh tokens, and token verification for Traefik
 * ForwardAuth.
 *
 * Refresh tokens are single-use: each call to `/auth/refresh` invalidates the
 * old refresh token and issues a new pair (rotation). The current token is
 * tracked as a SHA-256 hash in `user.hashedRefreshToken`.
 */
@Injectable()
export class AuthService {
    private readonly accessExpiresIn: number;
    private readonly refreshExpiresIn: number;

    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
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
        let payload: JwtPayload & { type?: string };
        try {
            payload = await this.jwtService.verifyAsync<JwtPayload & { type?: string }>(
                refreshToken,
            );
        } catch {
            throw new UnauthorizedException('refresh token invalid or expired');
        }
        if (payload.type !== 'refresh') {
            throw new UnauthorizedException('not a refresh token');
        }
        const user = await this.usersService.findById(payload.sub);
        if (!user) {
            throw new UnauthorizedException('user not found');
        }
        // Guard against replay: the presented token must match the stored hash.
        // A stolen-and-replayed token after the legitimate owner rotated it will fail.
        const presentedHash = this.hashToken(refreshToken);
        if (!user.hashedRefreshToken
            || !crypto.timingSafeEqual(
                Buffer.from(user.hashedRefreshToken, 'hex'),
                Buffer.from(presentedHash, 'hex'),
            )) {
            // Token was already rotated — revoke all sessions (worst-case: theft).
            await this.usersService.clearRefreshToken(user.id);
            throw new UnauthorizedException('refresh token already used');
        }
        return this.rotate(user, presentedHash);
    }

    async logout(userId: string) {
        await this.usersService.clearRefreshToken(userId);
    }

    /**
     * Verify a token and return its payload. Called by the /auth/verify
     * (Traefik ForwardAuth) endpoint. Throws 401 if invalid/expired so
     * Traefik returns 401 to the client.
     */
    async verify(tokenValue: string): Promise<JwtPayload> {
        try {
            return await this.jwtService.verifyAsync<JwtPayload>(tokenValue);
        } catch {
            throw new UnauthorizedException('token invalid or expired');
        }
    }

    // ---- internal helpers --------------------------------------------------

    private async issuePair(userId: string, email: string): Promise<TokenPair> {
        const accessToken = this.jwtService.sign(
            {
                sub: userId,
                iss: email,
                type: 'access',
                jit: crypto.randomUUID(), // unique ID for this JWT (RFC 7519)
                jat: Math.floor(Date.now() / 1000), // issued at (seconds since epoch)
            },
            { expiresIn: this.accessExpiresIn },
        );
        const refreshToken = this.jwtService.sign(
            {
                sub: userId,
                iss: email,
                type: 'refresh',
                jit: crypto.randomUUID(), // unique ID for this JWT (RFC 7519)
                jat: Math.floor(Date.now() / 1000), // issued at (seconds since epoch)
            },
            { expiresIn: this.refreshExpiresIn },
        );
        await this.usersService.setRefreshToken(userId, this.hashToken(refreshToken));
        return {
            accessToken,
            expiresIn: this.accessExpiresIn,
            refreshToken,
            refreshExpiresIn: this.refreshExpiresIn,
        };
    }

    /** Rotate the refresh token: hash the new one, save it, issue new pair. */
    private async rotate(
        user: { id: string; email: string; hashedRefreshToken: string | null },
        _oldHash: string,
    ): Promise<TokenPair> {
        const accessToken = this.jwtService.sign(
            { sub: user.id, iss: user.email, type: 'access', jit: crypto.randomUUID(), jat: Math.floor(Date.now() / 1000) },
            { expiresIn: this.accessExpiresIn },
        );
        const refreshToken = this.jwtService.sign(
            { sub: user.id, iss: user.email, type: 'refresh', jit: crypto.randomUUID(), jat: Math.floor(Date.now() / 1000) },
            { expiresIn: this.refreshExpiresIn },
        );
        await this.usersService.setRefreshToken(user.id, this.hashToken(refreshToken));
        return {
            accessToken,
            expiresIn: this.accessExpiresIn,
            refreshToken,
            refreshExpiresIn: this.refreshExpiresIn,
        };
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
}
