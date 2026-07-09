import { plainToClass } from 'class-transformer';
import { Entity, Column } from 'typeorm';

import { AbstractEntity } from '../../../common/abstract.entity';
import { UserDto } from '../dtos/user.dto';

@Entity({ name: 'users' })
export class User extends AbstractEntity {
    @Column({ unique: true })
    email!: string;

    @Column({ name: 'password_hash' })
    passwordHash!: string;

    @Column({ nullable: true })
    firstName?: string;

    @Column({ nullable: true })
    lastName?: string;

    @Column({ nullable: true })
    isSSO?: boolean;

    @Column({ nullable: true })
    isActive?: boolean;


    @Column({ nullable: true })
    phoneNumber?: string;

    // SHA-256 hash of the user's CURRENT refresh token (rotation + revocation).
    // Null means no active session. Never the raw token.
    @Column({ name: 'hashed_refresh_token', type: 'varchar', nullable: true })
    hashedRefreshToken!: string | null;

    toDto() {
        return plainToClass(UserDto, this);
    }
}
