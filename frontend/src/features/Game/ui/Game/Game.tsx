import { memo, useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Client } from '@stomp/stompjs';
import { classNames } from '@/shared/lib/classNames/classNames';
import { selectCurrentUser } from '@/features/Auth';
import { GameHeader } from '../GameHeader/GameHeader';
import { GameFooter } from '../GameFooter/GameFooter';
import { Card, GameState, TurnType } from '../../model/types/game';
import cls from './Game.module.scss';
import { useOpponent } from '@/shared/lib/hooks/useOpponent';
import { RoomState } from '@/entities/Room/types/room';
import { GameCardType } from '@/entities/GameCard';
import { GameCardModal } from '../GameCardModal/GameCardModal';
import { GameDiceModal } from '../GameDiceModal/GameDiceModal';
import { GameRoundResultModal } from '../GameRoundResultModal/GameRoundResultModal';
import { GameResultModal } from '../GameResultModal/GameResultModal';
import { useNavigate } from 'react-router-dom';
import { getRouteMain } from '@/shared/const/router';
import { GameTable } from '../GameTable/GameTable';
import { TokensTypes } from '../../model/types/game';



interface GameProps {
  client: Client;
  gameState: GameState;
  roomState: RoomState;
  diceDetails: { first: number; second: number } | null;
  handleDiceSelection: (index: number) => void;
  winnerId: number | null;
  roundResult: any | null;
  leaveCurrentRoom: any;
  fetchGameState: any;

  myTokens: TokensTypes[];
  userId?: number;
  onPlayToken?: (token: TokensTypes) => void;
}

export const Game = memo(({
  client,
  gameState,
  roomState,
  diceDetails,
  handleDiceSelection,
  winnerId,
  roundResult,
  leaveCurrentRoom,
  fetchGameState,
  myTokens,
  userId,
  onPlayToken
}: GameProps) => {
  const user = useSelector(selectCurrentUser);
  const opponent = useOpponent(user?.id, roomState);
  const navigate = useNavigate();

  // Локальное состояние для жетонов
  const [playerTokens, setPlayerTokens] = useState<string[]>();


const playerIndex = gameState.players[0].playerId === user?.id ? 0 : 1;

  console.log('[Game] myTokens prop:', myTokens);

  const [modalCards, setModalCards] = useState<{ cards: Card[], type: GameCardType } | null>(null);

  // Управление модалками через одно состояние
  const [currentModal, setCurrentModal] = useState<'ROUND' | 'GAME' | null>(null);

  // Отправка хода
  const sendTurn = useCallback((turnType: string, details: object = {}) => {
      console.log('[SEND TURN] turnType:', turnType, 'details:', details);
    if (client && user) {
      client.publish({
        destination: `/app/input/session/${roomState.id}/turn`,
        body: JSON.stringify({
          sessionId: roomState.id,
          playerId: user.id,
          turnType,
          details
        }),
      });
    }
  }, [client, user, roomState]);




 const handlePlayToken = useCallback((token: TokensTypes) => {
   console.log('[Game] play token:', token);

   // Передаем на верхний уровень для обновления состояния
   onPlayToken?.(token);

   // Отправка хода на сервер
   if (client && user) {
     client.publish({
       destination: `/app/input/session/${roomState.id}/turn`,
       body: JSON.stringify({
         sessionId: roomState.id,
         playerId: user.id,
         turnType: 'PLAY_TOKEN',
         details: { token },
       }),
     });
   }
 }, [client, roomState, user?.id, onPlayToken]);





useEffect(() => {
  console.log('[Game] myTokens updated:', myTokens);
}, [myTokens]);



  // Определяем, какие карты показать в модалке
  useEffect(() => {
    const playerIndex = gameState.players[0].playerId === user?.id ? 0 : 1;
    if (gameState.players[playerIndex].bloodCards.length > 1) {
      setModalCards({ cards: gameState.players[playerIndex].bloodCards, type: GameCardType.BLOOD });
    } else if (gameState.players[playerIndex].sandCards.length > 1) {
      setModalCards({ cards: gameState.players[playerIndex].sandCards, type: GameCardType.SAND });
    } else {
      setModalCards(null);
    }
  }, [gameState, user?.id]);

  // Показ модалки раунда
  useEffect(() => {
    if (roundResult) {
      setCurrentModal('ROUND');
    }
  }, [roundResult]);

  // Показ модалки игры, если победитель есть и нет открытой модалки раунда
  useEffect(() => {
    if (winnerId && !roundResult) {
      setCurrentModal('GAME');
    }
  }, [winnerId, roundResult]);

  useEffect(() => {
    if (gameState) {
      console.log('[DEBUG] Текущее состояние игры:', gameState);
    }
  }, [gameState]);






  // Закрытие модалки раунда
  const handleCloseRoundModal = () => {
    fetchGameState();
    if (winnerId) {
      setCurrentModal('GAME'); // после раунда показываем модалку игры
    } else {
      setCurrentModal(null);
    }
  };

  return (
    <>
      {/* Модалка раунда */}
      {currentModal === 'ROUND' && (
        <GameRoundResultModal
          roundResult={roundResult}
          roomState={roomState}
          onClose={handleCloseRoundModal}
        />
      )}

      {/* Модалка результатов игры */}
      {currentModal === 'GAME' && (
        <GameResultModal
          winnerId={winnerId!}
          onClose={() => navigate(getRouteMain())}
        />
      )}

      {/* Модалка карт */}
      {modalCards && (
        <GameCardModal
          cards={modalCards.cards}
          sendTurn={sendTurn}
          type={modalCards.type}
        />
      )}

      {/* Модалка кубиков */}
      {diceDetails && (
        <GameDiceModal
          first={diceDetails.first}
          second={diceDetails.second}
          onSelect={handleDiceSelection}
        />
      )}

      {/* Основной интерфейс игры */}
      <div className={classNames(cls.container, {}, [])}>
        <GameHeader
          opponent={opponent}
          isCurentTurn={opponent?.id === gameState.currentPlayerId}
          gameState={gameState}
          selectedTokens={(opponent?.id === user?.id ? myTokens : (gameState.players[playerIndex] as any).selectedTokens) || []}
        />

        <GameTable
          gameState={gameState}
          sendTurn={sendTurn}
          userId={user?.id!}
        />

        <GameFooter
          user={user!}
          isCurentTurn={user?.id === gameState.currentPlayerId}
          gameState={gameState}
          sendTurn={sendTurn}
          leaveCurrentRoom={leaveCurrentRoom}
          selectedTokens={myTokens as any}
          onPlayToken={handlePlayToken}
        />
      </div>
    </>
  );
});

export default Game;