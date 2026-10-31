import { useState, useEffect } from 'react';
import axios from 'axios';

// было const API_BASE = 'http://localhost:8080/api/v1/room';
const API_BASE = '/api/v1/room';

const pause = (ms: number) => new Promise(res => setTimeout(res, ms));

type RoomPayload = {
  id?: string | number;
  status?: string;
  playerFirst?: { id?: string | number };
  playerSecond?: { id?: string | number } | null;
};

const samePlayer = (left?: string | number, right?: string | number) => (
  left !== undefined && right !== undefined && Number(left) === Number(right)
);

const isMember = (room: RoomPayload, playerId: number) => (
  samePlayer(room.playerFirst?.id, playerId) || samePlayer(room.playerSecond?.id, playerId)
);

const readRequestedRoomId = () => {
  const fromQuery = new URLSearchParams(globalThis.location?.search ?? '').get('roomId');
  if (fromQuery) {
    return fromQuery;
  }

  const redirect = localStorage.getItem('redirectAfterLogin');
  if (!redirect || !redirect.includes('?')) {
    return undefined;
  }

  return new URLSearchParams(redirect.slice(redirect.indexOf('?') + 1)).get('roomId') ?? undefined;
};

const loadRoom = async (roomId: string | number): Promise<RoomPayload | undefined> => {
  try {
    return (await axios.get(`${API_BASE}/${roomId}`)).data;
  } catch (error) {
    console.error('Ошибка при получении информации о комнате:', error);
    return undefined;
  }
};

const claimRoom = async (playerId: number, roomId: string | number): Promise<number | undefined> => {
  const room = await loadRoom(roomId);
  if (!room || room.status === 'FINISHED') {
    return undefined;
  }

  if (isMember(room, playerId)) {
    return Number(room.id ?? roomId);
  }

  if (room.status !== 'WAITING_SECOND_USER' || room.playerSecond) {
    return undefined;
  }

  try {
    await axios.post(`${API_BASE}/${roomId}/join?userId=${playerId}`);
    return Number(room.id ?? roomId);
  } catch (error) {
    console.error('[ERROR] Ошибка при join:', error);
    const refreshed = await loadRoom(roomId);
    if (refreshed && refreshed.status !== 'FINISHED' && isMember(refreshed, playerId)) {
      return Number(refreshed.id ?? roomId);
    }
    return undefined;
  }
};

const rememberRoom = (roomId: number) => {
  localStorage.setItem('roomId', String(roomId));
  return roomId;
};

export async function setupSessionRoom(playerId: number): Promise<number | undefined> {
  const requestedRoomId = readRequestedRoomId();
  if (requestedRoomId) {
    localStorage.removeItem('redirectAfterLogin');
    const claimed = await claimRoom(playerId, requestedRoomId);
    if (claimed !== undefined) {
      return rememberRoom(claimed);
    }
  }

  const storedRoomId = localStorage.getItem('roomId');
  if (storedRoomId) {
    const resumed = await claimRoom(playerId, storedRoomId);
    if (resumed !== undefined) {
      return rememberRoom(resumed);
    }
    localStorage.removeItem('roomId');
  }

  const leaveAllRooms = async () => {
    localStorage.removeItem('roomId');
    try {
      await axios.post(`${API_BASE}/leave/all?userId=${playerId}`);
    } catch (error) {
      console.warn('Ошибка при выходе из всех комнат', error);
    }
  };

  await leaveAllRooms();
  await pause(1000);

  try {
    const availableRoomsResponse = await axios.get(`${API_BASE}/available-for-join?userId=${playerId}`);
    const availableRooms = availableRoomsResponse.data;

    console.log('[DEBUG] Доступные комнаты:', availableRooms.map((r: any) => ({
      id: r.id,
      status: r.status,
      playerFirst: r.playerFirst?.id,
      playerSecond: r.playerSecond?.id,
    })));

    let roomId: string | number | undefined = availableRooms.length ? availableRooms[0].id : undefined;

    if (roomId) {
      const roomToJoin = availableRooms.find((r: any) => r.id === roomId);
      console.log('[DEBUG] Присоединяемся к комнате:', roomToJoin);
      try {
        await axios.post(`${API_BASE}/${roomId}/join?userId=${playerId}`);
        console.log('[INFO] Успешно присоединились к комнате', roomId);
      } catch (error: any) {
        console.error('[ERROR] Ошибка при join:', error);
        roomId = undefined;
      }
    }

    if (!roomId) {
      const roomResponse = await axios.post(`${API_BASE}/create?userId=${playerId}`);
      roomId = roomResponse.data.id;
      console.log('[INFO] Создана новая комната:', roomId, 'статус:', roomResponse.data.status);
    }

    if (roomId) {
      return rememberRoom(+roomId);
    }
  } catch (error) {
    console.error('[ERROR] Ошибка при получении доступных комнат или создании:', error);
    await leaveAllRooms();
  }

  return undefined;
}

export const useSetupRoom = (playerId: number) => {
  const [sessionId, setSessionId] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!playerId) return;

    setupSessionRoom(playerId).then((id) => {
      if (id !== undefined) {
        setSessionId(id);
      }
    });
  }, [playerId]);

  return sessionId;
};
