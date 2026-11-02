import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/features/Auth/model/selectors/authSelector';
import { useWebSocketGame } from '@/shared/lib/hooks/useWebSocketGame';
import { useSetupRoom } from '@/shared/lib/hooks/useSetupRoom';
import axios from 'axios';
import { GameState, GameStatus, TurnType } from '../types/game';

export const useGameState = () => {
  const playerId = useSelector(selectCurrentUser)?.id;
  const sessionId = playerId !== undefined ? useSetupRoom(playerId) : undefined;
  const client = useWebSocketGame(playerId, sessionId || undefined);

  const [roomState, setRoomState] = useState<any>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [diceDetails, setDiceDetails] = useState(null);
  const [winnerId, setWinnerId] = useState();
  const [roundResult, setRoundResult] = useState();
  const [playerTurnTimeout, setPlayerTurnTimeout] = useState<NodeJS.Timeout | null>(null);

  // Получаем состояние комнаты
  const fetchRoomState = async (id?: string | number) => {
    if (!id) return;
    try {
      const data = (await axios.get(`${__API__}/v1/room/${id}`)).data;
      setRoomState(data);
    } catch (err) {
      console.error('Ошибка при получении состояния комнаты:', err);
    }
  };

  // Получаем состояние игры (только если статус комнаты подходящий)
  const fetchGameState = async (id?: string | number) => {
    if (!id) return;
    console.log("получаем состояние игры В fetchGameState() useGameState")
    if (!roomState || roomState.status === GameStatus.WAITING_SECOND_USER) {
      //setGameState(null);
      return;
    }
    try {
      const data = (await axios.get(`${__API__}/v1/room/game/current-state?sessionId=${id}`)).data;
      console.log('[DEBUG] fetchGameState', data);
      setGameState(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        // Игра ещё не начата, gameState недоступен
        setGameState(null);
        return;
      }
      console.error('Ошибка при получении состояния игры:', err);
    }
  };

  const leaveCurrentRoom = async () => {
    if (!sessionId) return;
    try {
      await axios.post(`${__API__}/v1/room/leave/${sessionId}?userId=${playerId}`);
      localStorage.removeItem('roomId');
      console.log("ПОКИДАЕМ ИГРУ В LEAVECURRENTROOM() useGameState")

      setGameState(null);
      setRoomState(null);
    } catch (err) {
      console.error('Ошибка при выходе из комнаты:', err);
    }
  };

  const showDiceModal = (details: any) => setDiceDetails(details);

  const handleDiceSelection = (index: number) => {
    if (client && playerId && roomState?.id) {
      client.publish({
        destination: `/app/input/session/${roomState.id}/turn`,
        body: JSON.stringify({
          sessionId: roomState.id,
          playerId: playerId,
          turnType: TurnType.SELECT_DICE,
          details: { index },
        }),
      });
    }
  };

  // Получаем roomState при подключении (и при смене sessionId)
  useEffect(() => {
    if (sessionId) {
      fetchRoomState(sessionId);
    }
  }, [sessionId]);

  // Получаем gameState когда статус комнаты позволяет
  useEffect(() => {
    if (sessionId && roomState && roomState.status !== GameStatus.WAITING_SECOND_USER) {
      fetchGameState(sessionId);
    }
  }, [sessionId, roomState]);

  // Подписки на сокет при подключении клиента
  useEffect(() => {
    if (client && sessionId) {
      const handleConnect = () => {
        // --- ГАРАНТИРОВАННО ЗАПРОСИТЬ АКТУАЛЬНЫЕ ДАННЫЕ ---
        fetchRoomState(sessionId);
        fetchGameState(sessionId);

        // Подписка на обновление прогресса игры
        client.subscribe(`/queue/session/${sessionId}/game-progress`, (message) => {
          const data = JSON.parse(message.body);
          console.log('[WS] Получен статус игры:', data.status);
          setRoomState((prev: any) => ({ ...prev, status: data.status }));
          //fetchRoomState(sessionId);
          fetchGameState(sessionId);
        });

        // Подписка на подтвержденные ходы
        client.subscribe(`/queue/session/${sessionId}/accepted-turns`, (message) => {
          const data = JSON.parse(message.body);
          if (data.turnType === "AWAITING_DICE" && data.playerId === playerId) {
            showDiceModal(data.details);
          } else {
            showDiceModal(null);
          }
          
          // Сброс таймера при получении хода
          if (playerTurnTimeout) {
            clearTimeout(playerTurnTimeout);
            setPlayerTurnTimeout(null);
          }
          fetchGameState(sessionId);
          fetchRoomState(sessionId);
        });

        // Результаты игры
        client.subscribe(`/queue/session/${sessionId}/game-results`, (message) => {
          const data = JSON.parse(message.body);
          setWinnerId(data.winnerId);
          localStorage.removeItem('roomId');
          console.log('[INFO] Игра завершена — roomId удалён из localStorage по событию game-results');
        });

        // Результаты раунда
        client.subscribe(`/queue/session/${sessionId}/round-results`, (message) => {
          const data = JSON.parse(message.body);
          setRoundResult(data);
          fetchGameState(sessionId);
          fetchRoomState(sessionId);
        });

        // Ошибки
        client.subscribe(`/queue/session/${sessionId}/errors`, (message) => {
          console.error('WebSocket error:', JSON.stringify(message.body));
        });
      };

      client.onConnect = handleConnect;
      setIsLoading(false);
    }
  }, [client, sessionId, playerId]);

  useEffect(() => {
    if (roomState?.status === GameStatus.FINISHED) {
      console.log('[INFO] Комната завершена, сбрасываем состояние игрока');
      setGameState(null);
      setRoomState(null);
      setDiceDetails(null);
      localStorage.removeItem('roomId');
      
      // Очистка таймера при завершении игры
      if (playerTurnTimeout) {
        clearTimeout(playerTurnTimeout);
        setPlayerTurnTimeout(null);
      }
    }
  }, [roomState?.status]);



  const isGameInProgress = () => {
    const status = roomState?.status;
    return (
      status !== GameStatus.WAITING_SECOND_USER &&
      status !== GameStatus.PLAYER_DISCONNECTED &&
      status !== GameStatus.FINISHED
    );
  };

  // Запуск таймера при изменении gameState и наличии активной игры
  useEffect(() => {
    if (gameState && playerId) {
      const currentPlayerId = gameState.currentPlayerId;
      
      // Если текущий игрок - это наш пользователь, запустить таймер
      if (currentPlayerId === playerId) {
        console.log('[TIMER] Таймер запущен для игрока ID:', playerId);
        
        // Сброс существующего таймера если есть
        if (playerTurnTimeout) {
          clearTimeout(playerTurnTimeout);
          setPlayerTurnTimeout(null);
        }
        
        // Запуск нового таймера на 2 минуты
        const timeout = setTimeout(() => {
          console.log('[TIMER] Время вышло для игрока ID:', playerId);
          
          // Отправляем автоматическую победу второму игроку
          if (client && sessionId) {
            console.log('[TIMER] Отправка сообщения TIMEOUT_WIN');
            client.publish({
              destination: `/app/input/session/${sessionId}/turn`,
              body: JSON.stringify({
                sessionId: sessionId,
                playerId: playerId,
                turnType: 'TIMEOUT_WIN',
                details: {}
              }),
            });
          }
        }, 2 * 60 * 1000); // 2 минуты в миллисекундах
        
        setPlayerTurnTimeout(timeout);
      } else {
        console.log('[TIMER] Таймер не запущен, текущий игрок:', currentPlayerId, 'наш ID:', playerId);
        
        // Очистка таймера если он был активен
        if (playerTurnTimeout) {
          clearTimeout(playerTurnTimeout);
          setPlayerTurnTimeout(null);
        }
      }
    }
  }, [gameState, playerId]);

  return {
    client,
    gameState,
    roomState,
    isLoading,
    isGameInProgress: isGameInProgress(),
    fetchGameState,
    diceDetails,
    handleDiceSelection,
    winnerId,
    roundResult,
    leaveCurrentRoom
  };
};