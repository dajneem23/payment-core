import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { ConfigService } from '../../../shared/services/config.service';
import { UsersService } from './users.service';

/**
 * Seeds an ADMIN account on startup when SEED_ADMIN=true (dev/compose only).
 * Admins are the only role allowed to call ops endpoints like wallet deposits.
 * Idempotent — skips if the account already exists; never runs in prod config.
 */
@Injectable()
export class AdminSeedService implements OnApplicationBootstrap {
    private readonly logger = new Logger(AdminSeedService.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly configService: ConfigService,
    ) {}

    async onApplicationBootstrap(): Promise<void> {
        if (this.configService.get('SEED_ADMIN') !== 'true') {
            return;
        }
        const email = this.configService.get('ADMIN_EMAIL') || 'admin@vietpay.com';
        const password = this.configService.get('ADMIN_PASSWORD') || 'Admin123!';

        if (await this.usersService.findByEmail(email)) {
            this.logger.log(`seed: admin ${email} already exists, skipping`);
            return;
        }
        const passwordHash = await bcrypt.hash(password, 12);
        await this.usersService.create({
            email,
            passwordHash,
            firstName: 'VietPay',
            lastName: 'Admin',
            role: 'ADMIN',
        });
        this.logger.warn(`seed: created ADMIN user -> ${email} / ${password}`);
    }
}
