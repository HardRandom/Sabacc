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
}


// const bloodCards: Record<number, any> = {
//   1: cardBlood1,
//   2: cardBlood2,
//   3: cardBlood3,
//   4: cardBlood4,
//   5: cardBlood5,
//   6: cardBlood6,
// };

const allCards: Record<GameCardType, Record<number, any>> = {
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
  } = props;

  const getCardImage = () => {
    if (card?.cardValueType === 'IMPOSTER') {
      return type === GameCardType.BLOOD ? cardBloodImposter : cardSandImposter;
    }

    if (card?.cardValueType === 'SYLOP') {
      return type === GameCardType.BLOOD ? cardBloodSylop : cardSandSylop;
    }

    const face = getNumericCardAsset(allCards[type], card?.value);
    if (face) {
      return face;
    }

    return type === GameCardType.BLOOD ? cardBloodBack : cardSandBack;
  };

  const cardImage = getCardImage();



  if (isFlipped) {
    return (
      <div className={cls.cardContainer} onClick={onClick}>
        <img src={cardImage} className={classNames(cls.card, {}, [cls.cardBack])} alt="Card back" />
        {isMultiple && <img src={cardImage} className={classNames(cls.card, {}, [cls.cardBack])} alt="Card back" />}
        {isMultiple && <img src={cardImage} className={classNames(cls.card, {}, [cls.cardBack])} alt="Card back" />}
      </div>
    )
  }

  return (
    <div className={classNames(cls.card)} onClick={onClick}>
      <img src={cardImage} alt={`Game card`} />
    </div>
  );
});

export default GameCard;
