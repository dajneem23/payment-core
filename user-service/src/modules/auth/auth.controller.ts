import { Controller, Post, Body, Get, UseGuards, Res, Req, Headers } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RefreshDto } from './dtos/refresh.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User created, JWT returned' })
    @ApiResponse({ status: 409, description: 'Email already registered' })
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    @ApiOperation({ summary: 'Login with email + password' })
    @ApiResponse({ status: 200, description: 'Access + refresh tokens returned' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto.email, dto.password);
    }

    @Post('refresh')
    @ApiOperation({ summary: 'Exchange a refresh token for a new token pair (rotation)' })
    @ApiResponse({ status: 201, description: 'New access + refresh tokens' })
    @ApiResponse({ status: 401, description: 'Refresh token invalid, expired, or already used' })
    async refresh(@Body() dto: RefreshDto) {
        return this.authService.refresh(dto.refreshToken);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Revoke the refresh token + blacklist the access token' })
    async logout(@Headers('authorization') authHeader: string) {
        const accessToken = authHeader.slice('Bearer '.length);
        await this.authService.logout(accessToken);
        return { revoked: true };
    }

    /**
     * Called by Traefik ForwardAuth on every protected request. Returns 200 with
     * X-User-Id + X-User-Role if the token is valid, 401 otherwise. The guard
     * validates the token and puts the payload on the request.
     *
     * Traefik copies these headers onto the upstream request
     * (authResponseHeaders) and strips any client-supplied copies to prevent
     * impersonation, so downstream services can trust them.
     */
    @Get('verify')
    @UseGuards(JwtAuthGuard)
    async verify(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const user = (req as any).user as JwtPayload;
        res.setHeader('X-User-Id', user.sub);
        res.setHeader('X-User-Role', user.role);
        return { sub: user.sub, role: user.role };
    }
}
