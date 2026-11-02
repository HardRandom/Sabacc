// На сервере у игрока сразу все 13 жетонов. В руке он носит 3.
// Каждый сыгранный жетон сервер удаляет из общего списка.
export const SERVER_TOKEN_POOL = 13;
export const TOKEN_HAND_SIZE = 3;

export function opponentTokensLeft(serverTokenCount: number | null | undefined): number {
  if (typeof serverTokenCount !== 'number' || Number.isNaN(serverTokenCount)) {
    return TOKEN_HAND_SIZE;
  }

  const spent = SERVER_TOKEN_POOL - serverTokenCount;
  if (spent <= 0) {
    return TOKEN_HAND_SIZE;
  }

  return Math.max(0, TOKEN_HAND_SIZE - spent);
}
