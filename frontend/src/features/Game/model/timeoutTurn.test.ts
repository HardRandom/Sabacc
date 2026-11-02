import { describe, expect, test } from 'vitest';
import { TurnType } from './types/game';
import { timeoutTurn } from './timeoutTurn';

describe('timeoutTurn', () => {
  test('passes the turn when nothing else is waiting', () => {
    expect(timeoutTurn({ hasDice: false, sandCount: 1, bloodCount: 1 })).toEqual({ turnType: 'PASS' });
  });

  test('drops the newest card when a discard is open', () => {
    expect(timeoutTurn({ hasDice: false, sandCount: 2, bloodCount: 1 })).toEqual({
      turnType: TurnType.DISCARD_SAND,
      details: { index: 1 },
    });
    expect(timeoutTurn({ hasDice: false, sandCount: 1, bloodCount: 2 })).toEqual({
      turnType: TurnType.DISCARD_BLOOD,
      details: { index: 1 },
    });
  });

  test('picks the first die when the dice modal is open', () => {
    expect(timeoutTurn({ hasDice: true, sandCount: 2, bloodCount: 2 })).toEqual({
      turnType: TurnType.SELECT_DICE,
      details: { index: 0 },
    });
  });
});
