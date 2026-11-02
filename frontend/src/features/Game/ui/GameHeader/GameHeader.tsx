import { classNames, Mods } from '@/shared/lib/classNames/classNames';
import { memo } from 'react';
import cls from './GameHeader.module.scss';
import { User } from '@/features/Auth/model/types/auth';
import { GameState } from '../../model/types/game';
import { GameCard, GameCardType } from '@/entities/GameCard';
import CreditImg from '@/shared/assets/images/credit.png'
import ArrowTop from '@/shared/assets/icons/arrorTop.png'

const OPPONENT_TOKEN_SLOTS = 3;

interface GameHeaderProps {
  gameState: GameState;
  opponent: User | null;
  isCurentTurn: boolean;
  tokensLeft: number;
}

const opponentTokenLabel = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 === 1 && mod100 !== 11
    ? 'жетон'
    : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
      ? 'жетона'
      : 'жетонов';
  return `У соперника осталось ${count} ${word}`;
};

export const GameHeader = memo((props: GameHeaderProps) => {
  const { opponent, isCurentTurn, gameState, tokensLeft } = props;
  const hiddenTokensLeft = Math.max(0, Math.min(OPPONENT_TOKEN_SLOTS, tokensLeft));
  const i = gameState?.players[0].playerId == opponent?.id ? 0 : 1;

  const mods: Mods = {
    [cls.currentUserTurn]: isCurentTurn
  }

  return (
    <div className={classNames(cls.header, {}, [])}>
      <div className={classNames(cls.myCards)}>
        <GameCard type={GameCardType.BLOOD} isFlipped></GameCard>
        <GameCard type={GameCardType.SAND} isFlipped></GameCard>
      </div>


      <div className={cls.myBank}>
        <span>Остаток: {gameState.players[i].remainChips} </span>
        <img src={CreditImg} alt="Credit" />
      </div>

      <div className={classNames(cls.nickname, mods, [])}>
        <span>{opponent?.username || 'Opponent'}</span>
      </div>

      <div className={cls.controls}>
        <div className={cls.hiddenTokens} aria-label={opponentTokenLabel(hiddenTokensLeft)}>
          {Array.from({ length: hiddenTokensLeft }, (_, index) => (
            <span key={index} className={cls.hiddenToken} />
          ))}
        </div>
      </div>


      <div className={cls.curTurn}>
        <img src={ArrowTop} className={classNames(cls.arror, { [cls.cur]: isCurentTurn }, [])} />
      </div>

      <div className={cls.roundContainer}>
        <span>РАУНД: {gameState.round}</span>
      </div>
    </div>
  );
});
