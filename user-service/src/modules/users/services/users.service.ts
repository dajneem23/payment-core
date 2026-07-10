import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../entities/user.entity';

/**
 * User persistence and lookups. Authentication logic (hashing, tokens) lives in
 * AuthService; this service just owns the User table.
 */
@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    findByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { email } });
    }

    findById(id: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { id } });
    }

    async create(params: {
        email: string;
        passwordHash: string;
        firstName?: string;
        lastName?: string;
        role?: string;
    }): Promise<User> {
        const user = this.userRepository.create(params);
        return this.userRepository.save(user);
    }

    /** Store the hash of the user's current refresh token (rotation). */
    async setRefreshToken(userId: string, hashedRefreshToken: string): Promise<void> {
        await this.userRepository.update({ id: userId }, { hashedRefreshToken });
    }

    /** Revoke the user's refresh token (logout / reuse detected). */
    async clearRefreshToken(userId: string): Promise<void> {
        await this.userRepository.update({ id: userId }, { hashedRefreshToken: null });
    }
}
