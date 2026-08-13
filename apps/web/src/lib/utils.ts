import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatRelativeTime(date: string | Date, options: { short?: boolean } = {}): string {
  const timestamp = new Date(date).getTime();
  if (Number.isNaN(timestamp)) return 'Unknown time';

  const elapsedSeconds = Math.round((timestamp - Date.now()) / 1000);
  const units = [
    { name: 'year', seconds: 31_536_000 },
    { name: 'month', seconds: 2_592_000 },
    { name: 'week', seconds: 604_800 },
    { name: 'day', seconds: 86_400 },
    { name: 'hour', seconds: 3_600 },
    { name: 'minute', seconds: 60 },
    { name: 'second', seconds: 1 },
  ];
  const unit = units.find(({ seconds }) => Math.abs(elapsedSeconds) >= seconds);

  if (!unit) return options.short ? 'now' : 'just now';

  const value = Math.round(elapsedSeconds / unit.seconds);
  if (options.short) {
    const suffix = value > 0 ? 'from now' : 'ago';
    return `${Math.abs(value)}${unit.name[0]} ${suffix}`;
  }

  return new Intl.RelativeTimeFormat('en', { numeric: 'always' }).format(
    value,
    unit.name as Intl.RelativeTimeFormatUnit,
  );
}

export function severityColor(severity: string): string {
  const colors: Record<string, string> = {
    CRITICAL: 'text-red-500 bg-red-500/10',
    HIGH: 'text-orange-500 bg-orange-500/10',
    MEDIUM: 'text-yellow-500 bg-yellow-500/10',
    LOW: 'text-green-500 bg-green-500/10',
    GAS: 'text-blue-500 bg-blue-500/10',
    INFORMATIONAL: 'text-gray-500 bg-gray-500/10',
  };
  return colors[severity] ?? colors.INFORMATIONAL ?? '';
}
