
import { GameCard, GameCardType } from '@/entities/GameCard';
import { GameState, Player, TurnType } from '../../model/types/game';
import { GameBank } from '../GameBank/GameBank';
import cls from './GameTable.module.scss';

interface GameTableProps {
  gameState: GameState;
  player?: Player;
  opponent?: Player;
  playerName: string;
  opponentName: string;
  canDraw: boolean;
  sendTurn: (type: TurnType) => void;
}

export const GameTable = ({
  gameState, player, opponent, playerName, opponentName, canDraw, sendTurn,
}: GameTableProps) => {
  const piles = [
    { type: GameCardType.BLOOD, label: 'Сброс · Кровь', card: gameState.bloodDiscard, action: TurnType.GET_BLOOD_DISCARD },
    { type: GameCardType.BLOOD, label: 'Колода · Кровь', card: null, action: TurnType.GET_BLOOD, deck: true },
    { type: GameCardType.SAND, label: 'Колода · Песок', card: null, action: TurnType.GET_SAND, deck: true },
    { type: GameCardType.SAND, label: 'Сброс · Песок', card: gameState.sandDiscard, action: TurnType.GET_SAND_DISCARD },
  ];

  return (
    <div className={cls.table}>
      <div className={cls.piles} aria-label="Колоды и сбросы" role="group">
        {piles.map(({ type, label, card, action, deck }) => (
          <div className={cls.pile} key={action}>
            {deck || card ? (
              <GameCard
                type={type}
                card={card ?? undefined}
                isFlipped={deck}
                variant="hud"
                label={`Взять карту: ${label}`}
                disabled={!canDraw}
                onClick={() => sendTurn(action)}
              />
            ) : <span className={cls.empty} aria-label="Пусто">—</span>}
            <span>{label}</span>
          </div>
        ))}
      </div>

      <GameBank
        playerName={playerName}
        playerChips={player?.spentChips}
        opponentName={opponentName}
        opponentChips={opponent?.spentChips}
      />
    </div>
  );
};
