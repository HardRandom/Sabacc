import { describe, expect, test } from 'vitest';
import { reconnectDeadlineFromLeftAt, secondsUntil } from './reconnectDeadline';

describe('reconnect deadline', () => {
  test('gives two minutes after the player left', () => {
    const leftAt = '2026-11-02T21:00:00.000Z';
    const now = Date.parse(leftAt);
    const deadline = reconnectDeadlineFromLeftAt(leftAt, now);

    expect(secondsUntil(deadline, now)).toBe(120);
    expect(secondsUntil(deadline, now + 30_000)).toBe(90);
  });

  test('reads a server timestamp written as date parts', () => {
    const deadline = reconnectDeadlineFromLeftAt([2026, 11, 2, 21, 0, 0], Date.UTC(2026, 10, 2, 21, 0, 0));

    expect(secondsUntil(deadline, Date.UTC(2026, 10, 2, 21, 0, 0))).toBe(120);
  });
});