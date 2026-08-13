import { afterEach, describe, expect, it, vi } from 'vitest';

import { cn, formatAddress, formatRelativeTime, severityColor } from './utils';

afterEach(() => {
  vi.useRealTimers();
});

describe('cn', () => {
  it('should merge class names', () => {
    const result = cn('px-4', 'py-2', 'text-sm');
    expect(result).toContain('px-4');
    expect(result).toContain('py-2');
    expect(result).toContain('text-sm');
  });

  it('should handle conditional classes', () => {
    const result = cn('base', false && 'hidden', 'visible');
    expect(result).toContain('base');
    expect(result).toContain('visible');
    expect(result).not.toContain('hidden');
  });
});

describe('formatAddress', () => {
  it('should truncate long addresses', () => {
    const result = formatAddress('GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890');
    expect(result).toContain('...');
    expect(result.length).toBeLessThan(44);
  });
});

describe('formatRelativeTime', () => {
  it('formats recent dates relative to the current time', () => {
    vi.setSystemTime(new Date('2026-08-12T12:00:00.000Z'));

    expect(formatRelativeTime('2026-08-12T10:00:00.000Z')).toBe('2 hours ago');
    expect(formatRelativeTime('2026-08-12T12:00:00.000Z')).toBe('just now');
    expect(formatRelativeTime('2026-08-12T13:00:00.000Z', { short: true })).toBe('1h from now');
  });

  it('handles invalid dates', () => {
    expect(formatRelativeTime('not-a-date')).toBe('Unknown time');
  });
});

describe('severityColor', () => {
  it('should return color class for CRITICAL', () => {
    const result = severityColor('CRITICAL');
    expect(result).toContain('text-red-500');
  });

  it('should return color class for HIGH', () => {
    const result = severityColor('HIGH');
    expect(result).toContain('text-orange-500');
  });
});
