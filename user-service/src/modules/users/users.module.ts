import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigService } from '../../shared/services/config.service';
import { SharedModule } from '../../shared.module';
import { ServiceAuthGuard } from '../../guards/service-auth.guard';
import { UsersInternalController } from './controllers/users-internal.controller';
import { User } from './entities/user.entity';
import { AdminSeedService } from './services/seed.service';
import { UsersService } from './services/users.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        JwtModule.registerAsync({
            imports: [SharedModule],
            inject: [ConfigService],
            useFactory: (cfg: ConfigService) => ({
                publicKey: cfg.jwtConfig.publicKey,
                verifyOptions: {
                    algorithms: ['ES256'],
                    audience: 'vietpay-internal',
                },
            }),
        }),
    ],
    controllers: [UsersInternalController],
    providers: [UsersService, AdminSeedService, ServiceAuthGuard],
    exports: [UsersService],
})
export class UsersModule {}
