export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
export const CACHE_TTL_CONFIG = Symbol('CACHE_TTL_CONFIG');

export interface CacheTtlConfig {
  projects: number;
  audits: number;
  profiles: number;
  plugins: number;
}
