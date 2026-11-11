import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cardBloodBack from '@/shared/assets/images/card_blood_back.png';
import cardSandBack from '@/shared/assets/images/card_sand_back.png';
import cardSandImposter from '@/shared/assets/images/card_sand_imposter.png';
import cardSandSylop from '@/shared/assets/images/card_sand_sylop.png';
import cardBloodImposter from '@/shared/assets/images/card_blood_imposter.png';
import cardBloodSylop from '@/shared/assets/images/card_blood_sylop.png';

import cardBlood1 from '@/shared/assets/images/card_blood_1.png';
import cardBlood2 from '@/shared/assets/images/card_blood_2.png';
import cardBlood3 from '@/shared/assets/images/card_blood_3.png';
import cardBlood4 from '@/shared/assets/images/card_blood_4.png';
import cardBlood5 from '@/shared/assets/images/card_blood_5.png';
import cardBlood6 from '@/shared/assets/images/card_blood_6.png';
import cardSand1 from '@/shared/assets/images/card_sand_1.png';
import cardSand2 from '@/shared/assets/images/card_sand_2.png';
import cardSand3 from '@/shared/assets/images/card_sand_3.png';
import cardSand4 from '@/shared/assets/images/card_sand_4.png';
import cardSand5 from '@/shared/assets/images/card_sand_5.png';
import cardSand6 from '@/shared/assets/images/card_sand_6.png';

import { GameCardType } from '../types/GameCardType';
import cls from './GameCard.module.scss'
import { Card } from '@/features/Game/model/types/game';
import { getNumericCardAsset } from './getNumericCardAsset';

export interface GameCardProps {
  type: GameCardType;
  card?: Card;
  onClick?: () => void;
  isFlipped?: boolean;
  isMultiple?: boolean;
  label?: string;
  disabled?: boolean;
}


const allCards: Record<GameCardType, Record<number, string>> = {
  SAND: {
    1: cardSand1,
    2: cardSand2,
    3: cardSand3,
    4: cardSand4,
    5: cardSand5,
    6: cardSand6,
  },
  BLOOD: {
    1: cardBlood1,
    2: cardBlood2,
    3: cardBlood3,
    4: cardBlood4,
    5: cardBlood5,
    6: cardBlood6,
  }
};

export const GameCard = memo((props: GameCardProps) => {
  const {
    type,
    card,
    onClick,
    isFlipped = false,
    isMultiple = false,
    label,
    disabled,
  } = props;


  const backImage = type === GameCardType.BLOOD ? cardBloodBack : cardSandBack;
  const getCardImage = () => {
    if (isFlipped) {
      return backImage;
    }

    if (card?.cardValueType === 'IMPOSTER') {
      return type === GameCardType.BLOOD ? cardBloodImposter : cardSandImposter;
    }

    if (card?.cardValueType === 'SYLOP') {
      return type === GameCardType.BLOOD ? cardBloodSylop : cardSandSylop;
    }

    return getNumericCardAsset(allCards[type], card?.value) ?? backImage;
  };

  const cardImage = getCardImage();
  const suit = type === GameCardType.BLOOD ? 'Кровь' : 'Песок';
  const name = cardImage === backImage ? 'Рубашка'
    : card?.cardValueType === 'SYLOP' ? 'Сайлоп'
    : card?.cardValueType === 'IMPOSTER' ? 'Самозванец'
    : card?.value;
  const isStack = isFlipped && isMultiple;
  const cardClass = classNames(cls.card, { [cls.stack]: isStack });
  const artwork = (
    <>
      {isStack && (
        <>
          <img className={cls.image} src={cardImage} alt="" />
          <img className={cls.image} src={cardImage} alt="" />
        </>
      )}
      <img className={cls.image} src={cardImage} alt={`${suit}: ${name}`} />
    </>
  );

  return onClick ? (
    <button type="button" className={cardClass} aria-label={label} disabled={disabled} onClick={onClick}>
      {artwork}
    </button>
  ) : (
    <div className={cardClass}>{artwork}</div>
  );
});

export default GameCard;
