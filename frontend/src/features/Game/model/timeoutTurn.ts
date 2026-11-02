import { TurnType } from './types/game';

export function timeoutTurn(options: {
  hasDice: boolean;
  sandCount: number;
  bloodCount: number;
}): { turnType: string; details?: { index: number } } {
  if (options.hasDice) {
    return { turnType: TurnType.SELECT_DICE, details: { index: 0 } };
  }

  if (options.sandCount > 1) {
    return { turnType: TurnType.DISCARD_SAND, details: { index: options.sandCount - 1 } };
  }

  if (options.bloodCount > 1) {
    return { turnType: TurnType.DISCARD_BLOOD, details: { index: options.bloodCount - 1 } };
  }

  return { turnType: 'PASS' };
}
