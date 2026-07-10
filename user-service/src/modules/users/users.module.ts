import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { AdminSeedService } from './services/seed.service';
import { UsersService } from './services/users.service';

@Module({
    imports: [TypeOrmModule.forFeature([User])],
    providers: [UsersService, AdminSeedService],
    exports: [UsersService],
})
export class UsersModule {}
