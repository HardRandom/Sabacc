import { classNames, Mods } from '@/shared/lib/classNames/classNames';
import { memo } from 'react';
import cls from './GameHeader.module.scss';
import { User } from '@/features/Auth/model/types/auth';
import { GameState } from '../../model/types/game';
import { GameTokens } from '../GameTokens/GameTokens';
import { GameCard, GameCardType } from '@/entities/GameCard';
import CreditImg from '@/shared/assets/images/credit.png'
import ArrowTop from '@/shared/assets/icons/arrorTop.png'
import { TokensTypes } from '../../model/types/game';

interface GameHeaderProps {
  gameState: GameState;
  opponent: User | null;
  isCurentTurn: boolean;
  selectedTokens: TokensTypes[];
}

export const GameHeader = memo((props: GameHeaderProps) => {
  const { opponent, isCurentTurn, gameState, ...otherProps } = props;
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
        <GameTokens
        userId={opponent?.id}
        selectedTokens={[]}
        />
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
