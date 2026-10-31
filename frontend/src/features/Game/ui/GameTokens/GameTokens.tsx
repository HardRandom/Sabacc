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
  { type: "Бесплатный розыгрыш", image: noTax },
  { type: "Возврат", image: takeTwoChips },
  { type: "Общий тариф", image: generalTariff },
  { type: "Доп возврат", image: extraRefund },
  { type: "Хищение", image: eblazement },
  { type: "Общий аудит", image: generalAudit },
  { type: "Иммунитет", image: immunity },
  { type: "Истощение", image: exinasion },
  { type: "Прямая транзакция", image: directTransaction },
  { type: "Крупное мошенничество", image: imposter },
  { type: "Уценка", image: ucenka },
  { type: "Готовьте книги", image: books },
  { type: "Эмбарго", image: embargo },
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
  type: tokenNameToEnum[t.type], // ← теперь это TokensTypes
}));



export const GameTokens = memo((props: GameTokensProps) => {
  const { userId, selectedTokens, sendTurn, onPlayToken, isClickable = false } = props;

  if (!userId) return <div />;

  const tokensToRender: TokensTypes[] = Array.isArray(selectedTokens) ? selectedTokens.slice(0, 3) : [];

 const handleTurnToken = (ruName: string) => {
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

  const getImageByType = (type: TokensTypes) => {
    const found = tokenData.find(t => t.type === type);
    return found ? found.image : null;
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
            onClick={() => handleTurnToken(token.name)} // ← теперь строка для tokenNameToEnum
            type="button"
            aria-label={`token-${token.name}`}
            title={token.name}
          >
            <img src={token.image} alt={token.name} />
          </button>
        );
      })}

    </div>
  );
});

export default GameTokens;