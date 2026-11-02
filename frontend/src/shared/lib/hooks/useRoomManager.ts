import { useState, useCallback } from 'react';
import axios, { AxiosError } from 'axios';

export const useRoomManager = (playerId: number | null, onRoomJoin: (roomId: number) => void) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasLeftRooms, setHasLeftRooms] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  const leaveAllRooms = useCallback(async () => {
    if (!hasLeftRooms) {
      try {
        setHasLeftRooms(true);
        await axios.post(`${__API__}/api/v1/room/leave/all`, {}, {
          params: { userId: playerId }
        });
        console.log('Пользователь успешно покинул все комнаты');
      } catch (error) {
        console.error('Ошибка при выходе из комнат:', error);
      }
    }
  }, [playerId, hasLeftRooms]);

  const setupRoomAndJoin = useCallback(async () => {
    if (!playerId || retryCount > 1) return;

    try {
      let roomId: number | null = null;

      console.log('Запрашиваем доступные комнаты...');
      try {
        const availableRoomsResponse = await axios.get(`${__API__}/api/v1/room/available-for-join`, {
          params: { userId: playerId }
        });
        const availableRooms = availableRoomsResponse.data;

        if (availableRooms.length > 0) {
          roomId = availableRooms[0].id;
        }
      } catch (err) {
        const error = err as AxiosError;

        if (error.response && error.response.data && (error.response.data as any).errorCode === 'have_unfinished_session') {
          console.warn('У пользователя есть незавершенная сессия. Выполняем выход из всех комнат...');
          await leaveAllRooms();
          setRetryCount((prev) => prev + 1);
          await setupRoomAndJoin();
          return;
        } else {
          throw error;
        }
      }

      if (roomId) {
        // Отправка запроса на вступление в комнату
        await axios.post(`${__API__}/api/v1/room/${roomId}/join`, {}, {
          params: { userId: playerId }
        });
        console.log(`Пользователь ${playerId} вступил в комнату ${roomId}`);

        onRoomJoin(roomId);
        setIsLoading(false);
      } else {
        const roomResponse = await axios.post(`${__API__}/api/v1/room/create`, {}, {
          params: { userId: playerId }
        });
        roomId = roomResponse.data.id;

        // await axios.post(`${__API__}/api/v1/room/${roomId}/join`, {}, {
        //   params: { userId: playerId }
        // });

        if (!roomId) throw new Error('Отсутствует комната для входа');

        onRoomJoin(roomId);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Ошибка при создании или присоединении к комнате:', error);
    }
  }, [playerId, onRoomJoin, leaveAllRooms, retryCount]);

  return { isLoading, setupRoomAndJoin, leaveAllRooms };
};
