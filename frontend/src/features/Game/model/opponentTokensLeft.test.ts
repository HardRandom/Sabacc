import { describe, expect, test } from 'vitest';
import { opponentTokensLeft } from './opponentTokensLeft';

describe('opponentTokensLeft', () => {
  test('shows three chips before any token is spent', () => {
    expect(opponentTokensLeft(13)).toBe(3);
    expect(opponentTokensLeft(undefined)).toBe(3);
  });

  test('drops one chip for each token the server removed', () => {
    expect(opponentTokensLeft(12)).toBe(2);
    expect(opponentTokensLeft(11)).toBe(1);
    expect(opponentTokensLeft(10)).toBe(0);
  });

  test('does not show more than the hand or a negative count', () => {
    expect(opponentTokensLeft(20)).toBe(3);
    expect(opponentTokensLeft(0)).toBe(0);
  });
});