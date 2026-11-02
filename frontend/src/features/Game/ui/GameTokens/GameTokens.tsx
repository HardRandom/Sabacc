import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';

// изображения
import noTax from '@/shared/assets/images/free_raffle.png';
import generalTariff from '@/shared/assets/images/general_tariff.png';
import takeTwoChips from '@/shared/assets/images/refund.png';
import extraRefund from '@/shared/assets/images/extra_refund.png';
import eblazement from '@/shared/assets/images/embezzlement.png';
import generalAudit from '@/shared/assets/images/general_audit.png';
import immunity from '@/shared/assets/images/immunity.png';
import exinasion from '@/shared/assets/images/exhaustion.png';
import directTransaction from '@/shared/assets/images/direct_transaction.png';
import imposter from '@/shared/assets/images/major_fraud.png';
import ucenka from '@/shared/assets/images/devalue.png';
import books from '@/shared/assets/images/cook_books.png';
import embargo from '@/shared/assets/images/embargo.png';

import cls from './GameTokens.module.scss';
import { TokensTypes } from '../../model/types/game';

interface GameTokensProps {
  userId: number | undefined;
  selectedTokens: TokensTypes[];
  isClickable?: boolean;
  sendTurn?: (action: string, payload: { token: TokensTypes }) => void;
  onPlayToken?: (token: TokensTypes) => void;
}

const tokenData = [
  { type: "Бесплатный розыгрыш", image: noTax, description: "Вы не уплачиваете налог в этом ходе" },
  { type: "Возврат", image: takeTwoChips, description: "Верните 2 фишки" },
  { type: "Общий тариф", image: generalTariff, description: "С противника взимается налог 1 фишка" },
  { type: "Доп возврат", image: extraRefund, description: "Верните 3 фишки, выплаченные в этом раунде" },
  { type: "Хищение", image: eblazement, description: "Заберите 1 фишку из банка соперника в свой банк" },
  { type: "Общий аудит", image: generalAudit, description: "Соперник облагается налогом в 2 фишки, если он спасовал в этом ходе" },
  { type: "Иммунитет", image: immunity, description: "Предотвращает срабатывание жетонов против вас до следующего раунда" },
  { type: "Истощение", image: exinasion, description: "Противник должен сбросить карты и взять новую комбинацию из закрытой колоды" },
  { type: "Прямая транзакция", image: directTransaction, description: "Противник меняется с вами картами" },
  { type: "Крупное мошенничество", image: imposter, description: "Установить значение самозванца равным 6 до следующего вскрытия" },
  { type: "Уценка", image: ucenka, description: "Установить значение Sylop равным 0 до следующего вскрытия" },
  { type: "Готовьте книги", image: books, description: "Инвертируйте ранги Sabacc до следующего вскрытия" },
  { type: "Эмбарго", image: embargo, description: "Противник в следующем ходе пасует" },
];


const tokenNameToEnum: Record<string, TokensTypes> = {
  "Бесплатный розыгрыш": TokensTypes.NO_TAX,
  "Возврат": TokensTypes.TAKE_TWO_CHIPS,
  "Общий тариф": TokensTypes.OTHER_PLAYERS_PAY_ONE,
  "Доп возврат": TokensTypes.EXTRA_REFUND,
  "Хищение": TokensTypes.EMBEZZLEMENT,
  "Общий аудит": TokensTypes.GENERAL_AUDIT,
  "Иммунитет": TokensTypes.IMMUNITY,
  "Истощение": TokensTypes.EXHAUSTION,
  "Прямая транзакция": TokensTypes.DIRECT_TRANSACTION,
  "Крупное мошенничество": TokensTypes.IMPOSTERS_TO_SIX,
  "Уценка": TokensTypes.SYLOP_TO_ZERO,
  "Готовьте книги": TokensTypes.COOK_THE_BOOKS,
  "Эмбарго": TokensTypes.EMBARGO,
};

// формируем массив токенов, привязанный к enum
const tokens = tokenData.map(t => ({
  name: t.type,
  image: t.image,
  description: t.description,
  type: tokenNameToEnum[t.type],
}));



export const GameTokens = memo((props: GameTokensProps) => {
  const { userId, selectedTokens, sendTurn, onPlayToken, isClickable = false } = props;

  if (!userId) return <div />;

  const tokensToRender: TokensTypes[] = Array.isArray(selectedTokens) ? selectedTokens.slice(0, 3) : [];

 const handleTurnToken = (ruName: string) => {
    if (!isClickable) {
      return;
    }

    const enumValue = tokenNameToEnum[ruName];
    if (!enumValue) {
      console.error("Нет соответствующего enum для токена:", ruName);
      return;
    }

    // локальное обновление
    onPlayToken?.(enumValue);

    // отправка хода
    sendTurn?.("PLAY_TOKEN", { token: enumValue });
  };

  return (
    <div className={classNames(cls.controlsContainer, {}, [])}>
      {tokensToRender.map((enumType) => {
        const token = tokens.find(t => t.type === enumType);
        if (!token) return null;

        return (
          <button
            key={String(enumType)}
            className={classNames(cls.cardButton, { [cls.clickable]: isClickable }, [])}
            onClick={() => handleTurnToken(token.name)}
            type="button"
            disabled={!isClickable}
            aria-label={`${token.name}. ${token.description}`}
          >
            <span className={cls.tokenFace}>
              <img src={token.image} alt="" />
            </span>
            <span className={cls.tokenHint} role="tooltip">
              <span className={cls.tokenHintName}>{token.name}</span>
              <span className={cls.tokenHintText}>{token.description}</span>
            </span>
          </button>
        );
      })}

    </div>
  );
});

export default GameTokens;