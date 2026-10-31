import { classNames } from '@/shared/lib/classNames/classNames';
import { memo, ReactNode } from 'react';
import cls from './GameCardModal.module.scss';
import { Card, TurnType } from '../../model/types/game';
import { GameCard, GameCardType } from '@/entities/GameCard';

interface GameCardModalProps {
  cards: Card[];
  type: GameCardType;
  sendTurn: any;
}

export const GameCardModal = memo((props: GameCardModalProps) => {
  const { cards, type, sendTurn, ...otherProps } = props;
  if (!cards || cards.length !== 2) return null;

  const handleDropCard = (index: number) => {
    const turnType = type == GameCardType.SAND ? TurnType.DISCARD_SAND : TurnType.DISCARD_BLOOD
    index = index == 0 ? 1 : 0;
    sendTurn(turnType, { index: index })
  }

  return (
    <>
      <div className={cls.overlay}></div>
      <div className={classNames(cls.GameCardModal, {}, [])} {...otherProps}>
        <h5 className={cls.title}>Выберите карту</h5>

        <div className={cls.container}>
          {cards.map((card, i) =>
            <GameCard key={i} type={type} card={card} onClick={() => handleDropCard(i)}></GameCard>
          )}
        </div>
      </div>
    </>
  );
});
