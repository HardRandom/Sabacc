import { describe, expect, test } from 'vitest';
import { TokensTypes } from '@/features/Game/model/types/game';
import {
  DEFAULT_TOKEN_SELECTION,
  formatSelectionCountdown,
  readTokenSelection,
  remainingSelectionSeconds,
  saveTokenSelection,
  shouldOpenTokenSelection,
  TOKEN_SELECTION_TIMEOUT_SEC,
} from './tokenSelection';

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

describe('shouldOpenTokenSelection', () => {
  test('opens once both players are in and tokens are not chosen yet', () => {
    expect(shouldOpenTokenSelection({
      status: 'ALL_USERS_JOINED',
      hasSecondPlayer: true,
      alreadySelected: false,
    })).toBe(true);
    expect(shouldOpenTokenSelection({
      status: 'IN_PROGRESS',
      hasSecondPlayer: true,
      alreadySelected: false,
    })).toBe(true);
    expect(shouldOpenTokenSelection({
      status: 'STARTED',
      hasSecondPlayer: true,
      alreadySelected: false,
    })).toBe(true);
  });

  test('stays closed after the choice was confirmed, including an in-progress match', () => {
    expect(shouldOpenTokenSelection({
      status: 'IN_PROGRESS',
      hasSecondPlayer: true,
      alreadySelected: true,
    })).toBe(false);
    expect(shouldOpenTokenSelection({
      status: 'STARTED',
      hasSecondPlayer: true,
      alreadySelected: true,
    })).toBe(false);
  });

  test('opens for the room host when the match started before the second player arrived in local state', () => {
    expect(shouldOpenTokenSelection({
      status: 'STARTED',
      hasSecondPlayer: false,
      alreadySelected: false,
    })).toBe(true);
    expect(shouldOpenTokenSelection({
      status: 'ALL_USERS_JOINED',
      hasSecondPlayer: false,
      alreadySelected: false,
    })).toBe(true);
    expect(shouldOpenTokenSelection({
      status: 'IN_PROGRESS',
      hasSecondPlayer: false,
      alreadySelected: false,
    })).toBe(true);
    expect(shouldOpenTokenSelection({
      status: 'STARTED',
      hasSecondPlayer: false,
      alreadySelected: true,
    })).toBe(false);
  });

  test('stays closed while the second player is absent or the room is finished', () => {
    expect(shouldOpenTokenSelection({
      status: 'WAITING_SECOND_USER',
      hasSecondPlayer: false,
      alreadySelected: false,
    })).toBe(false);
    expect(shouldOpenTokenSelection({
      status: 'FINISHED',
      hasSecondPlayer: true,
      alreadySelected: false,
    })).toBe(false);
    expect(shouldOpenTokenSelection({
      status: 'PLAYER_DISCONNECTED',
      hasSecondPlayer: true,
      alreadySelected: false,
    })).toBe(false);
  });
});

describe('token selection countdown', () => {
  test('starts at two minutes and reaches zero at the deadline', () => {
    expect(TOKEN_SELECTION_TIMEOUT_SEC).toBe(120);
    expect(remainingSelectionSeconds(0)).toBe(120);
    expect(remainingSelectionSeconds(1000)).toBe(119);
    expect(remainingSelectionSeconds(119001)).toBe(1);
    expect(remainingSelectionSeconds(120000)).toBe(0);
    expect(remainingSelectionSeconds(130000)).toBe(0);
  });

  test('formats the remaining time as m:ss', () => {
    expect(formatSelectionCountdown(120)).toBe('2:00');
    expect(formatSelectionCountdown(90)).toBe('1:30');
    expect(formatSelectionCountdown(5)).toBe('0:05');
    expect(formatSelectionCountdown(0)).toBe('0:00');
    expect(formatSelectionCountdown(-4)).toBe('0:00');
  });

  test('falls back to free draw, refund and embezzlement', () => {
    expect(DEFAULT_TOKEN_SELECTION).toEqual([
      TokensTypes.NO_TAX,
      TokensTypes.TAKE_TWO_CHIPS,
      TokensTypes.EMBEZZLEMENT,
    ]);
  });
});

describe('token selection storage', () => {
  test('remembers three tokens for the same room and player', () => {
    const storage = memoryStorage();
    const tokens = [TokensTypes.IMMUNITY, TokensTypes.EMBARGO, TokensTypes.NO_TAX];

    saveTokenSelection(12, 7, tokens, storage);

    expect(readTokenSelection(12, 7, storage)).toEqual(tokens);
    expect(readTokenSelection(12, 8, storage)).toBeNull();
    expect(readTokenSelection(13, 7, storage)).toBeNull();
  });

  test('ignores a stored value that is not three known tokens', () => {
    const storage = memoryStorage();
    storage.setItem('sabacc.tokenSelection.4.1', JSON.stringify(['NO_TAX', 'NOT_A_TOKEN', 'EMBARGO']));

    expect(readTokenSelection(4, 1, storage)).toBeNull();
  });
});
