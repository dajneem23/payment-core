import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';

import { ConfigService } from '../services/config.service';

const REDIS_CLIENT = 'REDIS_CLIENT';

const redisProvider = {
    provide: REDIS_CLIENT,
    useFactory: (cfg: ConfigService) => {
        return new Redis({ ...cfg.redisConfig, lazyConnect: false });
    },
    inject: [ConfigService],
};

@Global()
@Module({
    providers: [redisProvider],
    exports: [redisProvider],
})
export class RedisModule {}

export { REDIS_CLIENT };
