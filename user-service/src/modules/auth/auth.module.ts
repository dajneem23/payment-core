import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { ConfigService } from '../../shared/services/config.service';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
    imports: [
        UsersModule,
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (cfg: ConfigService) => {
                const j = cfg.jwtConfig;
                return {
                    privateKey: j.privateKey,
                    publicKey: j.publicKey,
                    signOptions: {
                        algorithm: 'ES256',
                        issuer: j.issuer,
                        audience: j.audience,
                    },
                    verifyOptions: {
                        algorithms: ['ES256'],
                        issuer: j.issuer,
                        audience: j.audience,
                    },
                };
            },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService],
})
export class AuthModule {}
