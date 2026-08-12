import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { logger } from '@veridion/logger';

import { CACHE_TTL_CONFIG, type CacheTtlConfig, REDIS_CLIENT } from './cache.constants';

export interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'EX', ttl: number): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  scan(cursor: string, ...args: string[]): Promise<[string, string[]]>;
  quit(): Promise<unknown>;
  disconnect(): void;
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT) private readonly client: CacheClient,
    @Inject(CACHE_TTL_CONFIG) private readonly ttlConfig: CacheTtlConfig,
  ) {}

  getTtl(entity: keyof CacheTtlConfig): number {
    return this.ttlConfig[entity];
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (value === null) {
        logger.debug({ key }, 'Cache miss');
        return null;
      }

      logger.debug({ key }, 'Cache hit');
      return JSON.parse(value) as T;
    } catch (error) {
      logger.warn({ key, error }, 'Cache read failed; using database result');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl = this.ttlConfig.projects): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (error) {
      logger.warn({ key, error }, 'Cache write failed; continuing without cache');
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl = this.ttlConfig.projects,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  async invalidate(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.warn({ key, error }, 'Cache invalidation failed');
    }
  }

  async invalidateByPrefix(prefix: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          `${prefix}*`,
          'COUNT',
          '100',
        );
        if (keys.length > 0) await this.client.del(...keys);
        cursor = nextCursor;
      } while (cursor !== '0');
    } catch (error) {
      logger.warn({ prefix, error }, 'Cache prefix invalidation failed');
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
