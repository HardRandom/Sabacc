import { secondsUntil } from '@/shared/lib/countdown/countdown';

export const RECONNECT_WINDOW_MS = 2 * 60 * 1000;

export { secondsUntil };

function parseServerTime(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return value < 1e12 ? value * 1000 : value;
  }

  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value;
    if (typeof year !== 'number' || typeof month !== 'number' || typeof day !== 'number') {
      return null;
    }
    return Date.UTC(year, month - 1, day, hour, minute, second);
  }

  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? null : parsed;
}

export function reconnectDeadlineFromLeftAt(leftAt: unknown, now = Date.now()): string | null {
  const started = parseServerTime(leftAt);
  if (started == null) {
    return null;
  }

  return new Date(started + RECONNECT_WINDOW_MS).toISOString();
}
