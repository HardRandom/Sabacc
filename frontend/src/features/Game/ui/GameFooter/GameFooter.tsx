
import { User } from '@/features/Auth/model/types/auth';
import { GameCard, GameCardType } from '@/entities/GameCard';
import hud from '@/shared/ui/Hud/Hud.module.scss';
import { GameTokens } from '../GameTokens/GameTokens';
import { Player, TokensTypes } from '../../model/types/game';
import cls from './GameFooter.module.scss';

interface GameFooterProps {
  user: User | null;
  player?: Player;
  canAct: boolean;
  selectedTokens: TokensTypes[];
  onPass: () => void;
  onLeave: () => void;
  onShowRules: () => void;
  onPlayToken: (token: TokensTypes) => void;
}

export const GameFooter = ({
  user, player, canAct, selectedTokens, onPass, onLeave, onShowRules, onPlayToken,
}: GameFooterProps) => (
  <footer className={cls.footer}>
    <div className={cls.controls}>
      <div className={cls.badge} data-active={canAct}>
        <div>
          <div className={cls.label}>{canAct ? 'Ваш ход' : 'Вы'}</div>
          <strong>{user?.username}</strong>
        </div>
        <span className={cls.chips}>Остаток {player?.remainChips ?? '—'}</span>
      </div>
      <div className={cls.actions}>
        <button type="button" className={hud.button} onClick={onLeave}>Сдаться</button>
        <button type="button" className={hud.button} onClick={onShowRules}>Правила</button>
        <button
          type="button"
          className={`${hud.button} ${hud.gold}`}
          onClick={onPass}
          disabled={!canAct}
        >
          Пас
        </button>
      </div>
    </div>

    <div className={cls.cards} role="group" aria-label="Ваши карты">
      <GameCard type={GameCardType.BLOOD} card={player?.bloodCards[0]} variant="hud" />
      <GameCard type={GameCardType.SAND} card={player?.sandCards[0]} variant="hud" />
    </div>

    <GameTokens
      selectedTokens={selectedTokens}
      availableTokens={player?.tokens}
      canPlay={canAct}
      onPlay={onPlayToken}
    />
  </footer>
);
