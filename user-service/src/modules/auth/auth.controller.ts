import { Controller, Post, Body, Get, UseGuards, Res, Headers } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';

import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserId } from './user-id.decorator';
import { RefreshDto } from './dtos/refresh.dto';

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
     * Called by Traefik ForwardAuth on every API request. Returns 200 +
     * X-User-Id if the token is valid, 401 otherwise. The guard extracts the
     * Bearer token from the Authorization header; the service validates it.
     *
     * Traefik is configured to pass `authResponseHeaders: X-User-Id` so the
     * upstream services receive that header, and to strip any client-supplied
     * X-User-Id to prevent impersonation.
     */
    @Get('verify')
    @UseGuards(JwtAuthGuard)
    async verify(@UserId() userId: string, @Res({ passthrough: true }) res: Response) {
        // Traefik ForwardAuth copies this response header onto the upstream
        // request (authResponseHeaders: X-User-Id). Downstream services trust it.
        res.setHeader('X-User-Id', userId);
        return { sub: userId };
    }
}
