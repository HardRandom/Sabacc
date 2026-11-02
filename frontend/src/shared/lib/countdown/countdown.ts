export const TOKEN_SELECTION_TIMEOUT_MS = 2 * 60 * 1000;

export const TOKEN_SELECTION_TIMEOUT_SEC = TOKEN_SELECTION_TIMEOUT_MS / 1000;

export function remainingSelectionSeconds(
  elapsedMs: number,
  timeoutMs: number = TOKEN_SELECTION_TIMEOUT_MS,
): number {
  if (elapsedMs >= timeoutMs) {
    return 0;
  }

  return Math.ceil((timeoutMs - elapsedMs) / 1000);
}

export function secondsUntil(deadline: string | null, now = Date.now()): number {
  if (!deadline) {
    return 0;
  }
  const ends = Date.parse(deadline);
  if (Number.isNaN(ends)) {
    return 0;
  }
  return Math.max(0, Math.ceil((ends - now) / 1000));
}

export function formatSelectionCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
