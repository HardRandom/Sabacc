
import { TokensTypes } from './types/game';

export const tokenCatalog: Record<TokensTypes, { name: string; symbol: string; description: string }> = {
  [TokensTypes.EMBEZZLEMENT]: { name: 'Хищение', symbol: '◈', description: 'Перевести 1 фишку из банка соперника в свой банк.' },
  [TokensTypes.IMMUNITY]: { name: 'Иммунитет', symbol: '🛡', description: 'Защита от жетонов соперника до конца раунда.' },
  [TokensTypes.DIRECT_TRANSACTION]: { name: 'Прямая транзакция', symbol: '⇄', description: 'Обменять свои карты на карты соперника.' },
  [TokensTypes.EXHAUSTION]: { name: 'Истощение', symbol: '↓', description: 'Соперник сбрасывает карты и берёт новые из закрытой колоды.' },
  [TokensTypes.NO_TAX]: { name: 'Бесплатный розыгрыш', symbol: '⬡', description: 'Взять карту в текущем ходе без уплаты 1 фишки.' },
  [TokensTypes.GENERAL_AUDIT]: { name: 'Общий аудит', symbol: '⚖', description: 'Соперник платит 2 фишки, если спасовал в этом ходе.' },
  [TokensTypes.EMBARGO]: { name: 'Эмбарго', symbol: '⊘', description: 'Соперник пропускает следующий ход.' },
  [TokensTypes.IMPOSTERS_TO_SIX]: { name: 'Крупное мошенничество', symbol: '🎲', description: 'Значение «Самозванца» становится равным 6 до вскрытия.' },
  [TokensTypes.COOK_THE_BOOKS]: { name: 'Готовьте книги', symbol: '⇅', description: 'Перевернуть порядок старшинства сабакков до вскрытия.' },
  [TokensTypes.SYLOP_TO_ZERO]: { name: 'Уценка', symbol: '✦', description: 'Значение карты «Сайлоп» становится равным 0 до вскрытия.' },
  [TokensTypes.OTHER_PLAYERS_PAY_ONE]: { name: 'Общий тариф', symbol: '●', description: 'Соперник платит 1 фишку.' },
  [TokensTypes.TAKE_TWO_CHIPS]: { name: 'Возврат', symbol: '↺', description: 'Вернуть 2 фишки из банка в свой запас.' },
  [TokensTypes.EXTRA_REFUND]: { name: 'Дополнительный возврат', symbol: '↻', description: 'Вернуть 3 фишки из банка в свой запас.' },
};
