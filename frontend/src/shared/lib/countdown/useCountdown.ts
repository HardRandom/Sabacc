import { useEffect, useRef, useState } from 'react';
import { remainingSelectionSeconds, secondsUntil, TOKEN_SELECTION_TIMEOUT_SEC } from './countdown';

export function useCountdown(
  active: boolean,
  resetKey: string | number,
  onExpire: () => void,
  options?: { paused?: boolean; durationSec?: number },
) {
  const durationSec = options?.durationSec ?? TOKEN_SELECTION_TIMEOUT_SEC;
  const paused = options?.paused ?? false;
  const [secondsLeft, setSecondsLeft] = useState(durationSec);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const carryRef = useRef(durationSec);

  useEffect(() => {
    carryRef.current = durationSec;
    setSecondsLeft(durationSec);
  }, [resetKey, durationSec]);

  useEffect(() => {
    if (!active || paused) {
      return undefined;
    }

    const startedAt = Date.now();
    const budgetMs = carryRef.current * 1000;
    let expired = false;
    const timer = window.setInterval(() => {
      const left = remainingSelectionSeconds(Date.now() - startedAt, budgetMs);
      carryRef.current = left;
      setSecondsLeft((current) => (current === left ? current : left));
      if (left > 0 || expired) {
        return;
      }
      expired = true;
      window.clearInterval(timer);
      onExpireRef.current();
    }, 250);

    return () => window.clearInterval(timer);
  }, [active, paused, resetKey]);

  return secondsLeft;
}

export function useDeadlineCountdown(deadline: string | null): number {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(deadline));

  useEffect(() => {
    if (!deadline) {
      setSecondsLeft(0);
      return undefined;
    }

    const tick = () => setSecondsLeft(secondsUntil(deadline));
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [deadline]);

  return secondsLeft;
}
