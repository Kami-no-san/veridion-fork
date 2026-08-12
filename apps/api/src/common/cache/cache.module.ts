import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { logger } from '@veridion/logger';
import Redis from 'ioredis';

import { CACHE_TTL_CONFIG, type CacheTtlConfig, REDIS_CLIENT } from './cache.constants';
import { CacheService } from './cache.service';

function createRedisClient(config: ConfigService): Redis {
  const redisUrl = config.get<string>('REDIS_URL');
  const options = {
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: (attempt: number) => (attempt > 1 ? null : 100),
  };
  const client = redisUrl
    ? new Redis(redisUrl, options)
    : new Redis({
        host: config.get<string>('REDIS_HOST', 'localhost'),
        port: Number(config.get<string | number>('REDIS_PORT', 6379)),
        ...options,
      });

  client.on('error', (error) => {
    logger.warn({ error }, 'Redis unavailable; cache requests will fall back to the database');
  });

  return client;
}

function createTtlConfig(config: ConfigService): CacheTtlConfig {
  const ttl = (name: string, fallback: number) => {
    const value = Number(config.get<string | number>(name, fallback));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  return {
    projects: ttl('CACHE_PROJECT_TTL', 60),
    audits: ttl('CACHE_AUDIT_TTL', 60),
    profiles: ttl('CACHE_PROFILE_TTL', 300),
    plugins: ttl('CACHE_PLUGIN_TTL', 300),
  };
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: createRedisClient,
    },
    {
      provide: CACHE_TTL_CONFIG,
      inject: [ConfigService],
      useFactory: createTtlConfig,
    },
    CacheService,
  ],
  exports: [CacheService],
})
export class CacheModule {}
