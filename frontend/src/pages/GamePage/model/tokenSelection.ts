import { TokensTypes } from '@/features/Game/model/types/game';

const TOKEN_SELECTION_PREFIX = 'sabacc.tokenSelection';

const KNOWN_TOKENS = new Set<string>(Object.values(TokensTypes));

const STATUSES_WITHOUT_TOKEN_PICK = new Set([
  'WAITING_SECOND_USER',
  'FINISHED',
  'PLAYER_DISCONNECTED',
]);

// Эти статусы сервер шлёт, когда второй игрок уже в комнате.
// У создателя локальная копия комнаты часто ещё без playerSecond:
// сокет обновляет только status.
const STATUSES_WITH_BOTH_PLAYERS = new Set([
  'ALL_USERS_JOINED',
  'ALL_USERS_CONNECTED',
  'IN_PROGRESS',
  'STARTED',
  'PLAYER_RECONNECTED',
]);

export const TOKEN_SELECTION_TIMEOUT_MS = 2 * 60 * 1000;

export const TOKEN_SELECTION_TIMEOUT_SEC = TOKEN_SELECTION_TIMEOUT_MS / 1000;

// Свободная карта, возврат и растрата — в интерфейсе это
// «Бесплатный розыгрыш», «Возврат» и «Хищение».
export const DEFAULT_TOKEN_SELECTION: readonly TokensTypes[] = [
  TokensTypes.NO_TAX,
  TokensTypes.TAKE_TWO_CHIPS,
  TokensTypes.EMBEZZLEMENT,
];

type TokenStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const tokenSelectionKey = (roomId: number | string, playerId: number | string) => (
  `${TOKEN_SELECTION_PREFIX}.${roomId}.${playerId}`
);

export function readTokenSelection(
  roomId: number | string,
  playerId: number | string,
  storage: Pick<Storage, 'getItem'> = sessionStorage,
): TokensTypes[] | null {
  try {
    const raw = storage.getItem(tokenSelectionKey(roomId, playerId));
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== 3) {
      return null;
    }

    if (!parsed.every((token) => typeof token === 'string' && KNOWN_TOKENS.has(token))) {
      return null;
    }

    return parsed as TokensTypes[];
  } catch {
    return null;
  }
}

export function saveTokenSelection(
  roomId: number | string,
  playerId: number | string,
  tokens: TokensTypes[],
  storage: TokenStorage = sessionStorage,
) {
  try {
    storage.setItem(tokenSelectionKey(roomId, playerId), JSON.stringify(tokens));
  } catch {
    // sessionStorage может быть недоступен в приватном режиме
  }
}

export function shouldOpenTokenSelection(options: {
  status?: string | null;
  hasSecondPlayer: boolean;
  alreadySelected: boolean;
}): boolean {
  if (options.alreadySelected || !options.status) {
    return false;
  }

  if (STATUSES_WITH_BOTH_PLAYERS.has(options.status)) {
    return true;
  }

  if (!options.hasSecondPlayer) {
    return false;
  }

  return !STATUSES_WITHOUT_TOKEN_PICK.has(options.status);
}

export function remainingSelectionSeconds(
  elapsedMs: number,
  timeoutMs: number = TOKEN_SELECTION_TIMEOUT_MS,
): number {
  if (elapsedMs >= timeoutMs) {
    return 0;
  }

  return Math.ceil((timeoutMs - elapsedMs) / 1000);
}

export function formatSelectionCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
