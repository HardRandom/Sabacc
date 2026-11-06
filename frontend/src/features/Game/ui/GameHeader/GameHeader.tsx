
import { GameCard, GameCardType } from '@/entities/GameCard';
import { User } from '@/features/Auth/model/types/auth';
import { formatSelectionCountdown } from '@/shared/lib/countdown/countdown';
import hud from '@/shared/ui/Hud/Hud.module.scss';
import { TOKEN_HAND_SIZE } from '../../model/opponentTokensLeft';
import { Player } from '../../model/types/game';
import cls from './GameHeader.module.scss';

interface GameHeaderProps {
  opponent: User | null;
  player?: Player;
  isCurrentTurn: boolean;
  tokensLeft: number;
  roomId: number;
  round: number;
  turnSecondsLeft?: number;
}

export const GameHeader = ({
  opponent, player, isCurrentTurn, tokensLeft, roomId, round, turnSecondsLeft,
}: GameHeaderProps) => (
  <header className={cls.header}>
    <div className={cls.opponent}>
      <div className={cls.badge} data-active={isCurrentTurn}>
        <div>
          <div className={cls.label}>{isCurrentTurn ? 'Ход соперника' : 'Соперник'}</div>
          <strong>{opponent?.username || 'Соперник'}</strong>
        </div>
        <span className={cls.value}>Фишки {player?.remainChips ?? '—'}</span>
      </div>

      <div className={cls.tokens}>
        <span className={cls.label}>Жетоны соперника ({tokensLeft}/{TOKEN_HAND_SIZE})</span>
        {Array.from({ length: TOKEN_HAND_SIZE }, (_, index) => (
          <span className={cls.token} data-used={index >= tokensLeft} key={index} aria-hidden="true">
            {index < tokensLeft ? '◈' : '×'}
          </span>
        ))}
      </div>
    </div>

    <div className={cls.cards} aria-label="Скрытые карты соперника" role="group">
      <GameCard type={GameCardType.BLOOD} variant="hud" isFlipped />
      <GameCard type={GameCardType.SAND} variant="hud" isFlipped />
    </div>

    <div className={cls.status}>
      {turnSecondsLeft != null && (
        <span className={hud.pill}>⏱ Ваш ход {formatSelectionCountdown(turnSecondsLeft)}</span>
      )}
      <div className={cls.badge}>
        <span className={cls.label}>Комната {roomId}</span>
        <strong className={cls.value}>Раунд {round}</strong>
      </div>
    </div>
  </header>
);
