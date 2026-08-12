/* eslint-disable @typescript-eslint/unbound-method */

import type { CacheClient } from './cache.service';
import { CacheService } from './cache.service';

function createClient(): jest.Mocked<CacheClient> {
  return {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    scan: jest.fn(),
    quit: jest.fn(),
    disconnect: jest.fn(),
  };
}

describe('CacheService', () => {
  let client: jest.Mocked<CacheClient>;
  let service: CacheService;

  beforeEach(() => {
    client = createClient();
    service = new CacheService(client, {
      projects: 60,
      audits: 120,
      profiles: 300,
      plugins: 600,
    });
  });

  it('returns parsed values on cache hits', async () => {
    client.get.mockResolvedValue(JSON.stringify({ total: 2 }));

    await expect(service.get<{ total: number }>('projects:user:1')).resolves.toEqual({ total: 2 });
  });

  it('returns null when the cache misses', async () => {
    client.get.mockResolvedValue(null);

    await expect(service.get('missing')).resolves.toBeNull();
  });

  it('falls back when Redis is unavailable', async () => {
    client.get.mockRejectedValue(new Error('connection refused'));

    await expect(service.get('unavailable')).resolves.toBeNull();
    await expect(
      service.getOrSet('unavailable', async () => ({ value: 'database' })),
    ).resolves.toEqual({
      value: 'database',
    });
  });

  it('serializes values and applies the configured TTL', async () => {
    client.set.mockResolvedValue('OK');

    await service.set('projects:user:1', { total: 2 }, service.getTtl('projects'));

    expect(client.set).toHaveBeenCalledWith(
      'projects:user:1',
      JSON.stringify({ total: 2 }),
      'EX',
      60,
    );
  });

  it('invalidates every key matching a prefix with SCAN', async () => {
    client.scan
      .mockResolvedValueOnce(['1', ['projects:user:1:1', 'projects:user:1:2']])
      .mockResolvedValueOnce(['0', ['projects:user:1:3']]);
    client.del.mockResolvedValue(1);

    await service.invalidateByPrefix('projects:user:1:');

    expect(client.scan).toHaveBeenNthCalledWith(
      1,
      '0',
      'MATCH',
      'projects:user:1:*',
      'COUNT',
      '100',
    );
    expect(client.del).toHaveBeenCalledWith('projects:user:1:1', 'projects:user:1:2');
    expect(client.del).toHaveBeenCalledWith('projects:user:1:3');
  });
});
