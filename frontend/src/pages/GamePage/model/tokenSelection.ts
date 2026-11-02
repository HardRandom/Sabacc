import { TokensTypes } from '@/features/Game/model/types/game';

const TOKEN_SELECTION_PREFIX = 'sabacc.tokenSelection';

const KNOWN_TOKENS = new Set<string>(Object.values(TokensTypes));

const STATUSES_WITHOUT_TOKEN_PICK = new Set([
  'WAITING_SECOND_USER',
  'FINISHED',
  'PLAYER_DISCONNECTED',
]);

const STATUSES_WITHOUT_OPPONENT_TOKEN_WAIT = STATUSES_WITHOUT_TOKEN_PICK;

export const OPPONENT_SELECTING_TOKENS_CAPTION = 'Соперник выбирает жетоны';

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

export {
  formatSelectionCountdown,
  remainingSelectionSeconds,
  TOKEN_SELECTION_TIMEOUT_MS,
  TOKEN_SELECTION_TIMEOUT_SEC,
} from '@/shared/lib/countdown/countdown';

// Свободная карта, возврат и растрата — в интерфейсе это
// «Бесплатный розыгрыш», «Возврат» и «Хищение».
export const DEFAULT_TOKEN_SELECTION: readonly TokensTypes[] = [
  TokensTypes.NO_TAX,
  TokensTypes.TAKE_TWO_CHIPS,
  TokensTypes.EMBEZZLEMENT,
];

type TokenStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

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

export function clearTokenSelection(
  roomId: number | string,
  playerId: number | string,
  storage: Pick<Storage, 'removeItem'> = sessionStorage,
) {
  try {
    storage.removeItem(tokenSelectionKey(roomId, playerId));
  } catch {
    // sessionStorage может быть недоступен в приватном режиме
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

export function shouldShowOpponentSelectingTokens(options: {
  status?: string | null;
  hasSelectedTokens: boolean;
  opponentReady: boolean;
}): boolean {
  if (!options.hasSelectedTokens || options.opponentReady) {
    return false;
  }

  if (!options.status || STATUSES_WITHOUT_OPPONENT_TOKEN_WAIT.has(options.status)) {
    return false;
  }

  return true;
}

