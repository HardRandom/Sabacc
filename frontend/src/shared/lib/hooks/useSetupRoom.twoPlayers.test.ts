import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { setupSessionRoom } from './useSetupRoom';

type Room = {
  id: number;
  status: string;
  playerFirst: { id: number };
  playerSecond: { id: number } | null;
};

type HeldAvailable = {
  resolve: (value: { data: Room[] }) => void;
  snapshot: Room[];
};

const roomApi = vi.hoisted(() => {
  const rooms: Room[] = [];
  const heldAvailable: HeldAvailable[] = [];
  let nextId = 1;
  let failJoin = false;
  let holdAvailable = false;

  const cloneRoom = (room: Room): Room => ({
    id: room.id,
    status: room.status,
    playerFirst: { ...room.playerFirst },
    playerSecond: room.playerSecond ? { ...room.playerSecond } : null,
  });

  const waitingRooms = () => rooms.filter(
    (room) => room.status === 'WAITING_SECOND_USER' && room.playerSecond == null,
  );

  return {
    rooms,
    heldAvailable,
    reset() {
      rooms.length = 0;
      heldAvailable.length = 0;
      nextId = 1;
      failJoin = false;
      holdAvailable = false;
    },
    seed(room: Room) {
      rooms.push(room);
      nextId = Math.max(nextId, room.id + 1);
    },
    setFailJoin(value: boolean) {
      failJoin = value;
    },
    setHoldAvailable(value: boolean) {
      holdAvailable = value;
    },
    get(url: string) {
      const parsed = new URL(url, 'http://localhost');
      if (parsed.pathname.endsWith('/available-for-join')) {
        const snapshot = waitingRooms().map(cloneRoom);
        if (holdAvailable) {
          return new Promise<{ data: Room[] }>((resolve) => {
            heldAvailable.push({ resolve, snapshot });
          });
        }
        return Promise.resolve({ data: snapshot });
      }

      const id = Number(parsed.pathname.split('/').pop());
      const room = rooms.find((item) => item.id === id);
      if (!room) {
        return Promise.reject(new Error(`room ${id} not found`));
      }
      return Promise.resolve({ data: cloneRoom(room) });
    },
    post(url: string) {
      const parsed = new URL(url, 'http://localhost');
      const userId = Number(parsed.searchParams.get('userId'));

      if (parsed.pathname.endsWith('/leave/all')) {
        rooms.forEach((room) => {
          if (room.status === 'FINISHED') {
            return;
          }
          if (room.playerFirst.id === userId && room.playerSecond == null) {
            room.status = 'FINISHED';
            return;
          }
          if (room.playerSecond?.id === userId) {
            room.playerSecond = null;
            room.status = 'WAITING_SECOND_USER';
            return;
          }
          if (room.playerFirst.id === userId && room.playerSecond != null) {
            room.playerFirst = room.playerSecond;
            room.playerSecond = null;
            room.status = 'WAITING_SECOND_USER';
          }
        });
        return Promise.resolve({ data: null });
      }

      if (parsed.pathname.endsWith('/create')) {
        const foreign = rooms.find((room) => (
          room.status === 'WAITING_SECOND_USER'
          && room.playerSecond == null
          && room.playerFirst.id !== userId
        ));
        if (foreign) {
          foreign.playerSecond = { id: userId };
          foreign.status = 'ALL_USERS_JOINED';
          return Promise.resolve({ data: cloneRoom(foreign) });
        }

        const room: Room = {
          id: nextId,
          status: 'WAITING_SECOND_USER',
          playerFirst: { id: userId },
          playerSecond: null,
        };
        nextId += 1;
        rooms.push(room);
        return Promise.resolve({ data: cloneRoom(room) });
      }

      if (parsed.pathname.endsWith('/return')) {
        return Promise.resolve({ data: null });
      }

      const joinMatch = parsed.pathname.match(/\/(\d+)\/join$/);
      if (joinMatch) {
        if (failJoin) {
          return Promise.reject(new Error('join failed'));
        }
        const room = rooms.find((item) => item.id === Number(joinMatch[1]));
        if (!room || room.status === 'FINISHED' || room.playerSecond || room.playerFirst.id === userId) {
          return Promise.reject(new Error('join rejected'));
        }
        room.playerSecond = { id: userId };
        room.status = 'ALL_USERS_JOINED';
        return Promise.resolve({ data: cloneRoom(room) });
      }

      return Promise.reject(new Error(`unexpected ${url}`));
    },
  };
});

vi.mock('axios', () => ({
  default: {
    get: (url: string) => roomApi.get(url),
    post: (url: string) => roomApi.post(url),
  },
}));

const memoryStorage = new Map<string, string>();
const locationState = { search: '' };

async function flushMicrotasks() {
  for (let step = 0; step < 8; step += 1) {
    await Promise.resolve();
  }
}

async function settle(playerId: number) {
  const pending = setupSessionRoom(playerId);
  await vi.advanceTimersByTimeAsync(1000);
  return pending;
}

describe('two players joining one session', () => {
  beforeEach(() => {
    roomApi.reset();
    memoryStorage.clear();
    locationState.search = '';
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memoryStorage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memoryStorage.set(key, String(value));
      },
      removeItem: (key: string) => {
        memoryStorage.delete(key);
      },
      clear: () => {
        memoryStorage.clear();
      },
    });
    vi.stubGlobal('location', locationState);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('second player joins the room created by the first', async () => {
    const hostSession = await settle(1);
    const guestSession = await settle(2);

    expect(guestSession).toBe(hostSession);
    expect(roomApi.rooms).toHaveLength(1);
    expect(roomApi.rooms[0]?.status).toBe('ALL_USERS_JOINED');
    expect(roomApi.rooms[0]?.playerFirst.id).toBe(1);
    expect(roomApi.rooms[0]?.playerSecond?.id).toBe(2);
  });

  test('simultaneous Play puts both players into one room', async () => {
    roomApi.setHoldAvailable(true);

    const hostPending = setupSessionRoom(1);
    const guestPending = setupSessionRoom(2);
    await flushMicrotasks();
    vi.advanceTimersByTime(1000);
    await flushMicrotasks();

    expect(roomApi.heldAvailable).toHaveLength(2);
    const waiting = roomApi.heldAvailable.splice(0, roomApi.heldAvailable.length);
    waiting.forEach((item) => item.resolve({ data: item.snapshot }));

    const [hostSession, guestSession] = await Promise.all([hostPending, guestPending]);

    expect(hostSession).toBe(guestSession);
    expect(roomApi.rooms.filter((room) => room.status !== 'FINISHED')).toHaveLength(1);
  });

  test('joins the room selected from the list, not the first waiting room', async () => {
    roomApi.seed({
      id: 7,
      status: 'WAITING_SECOND_USER',
      playerFirst: { id: 1 },
      playerSecond: null,
    });
    roomApi.seed({
      id: 8,
      status: 'WAITING_SECOND_USER',
      playerFirst: { id: 3 },
      playerSecond: null,
    });
    locationState.search = '?roomId=8';

    const guestSession = await settle(2);

    expect(guestSession).toBe(8);
    expect(roomApi.rooms.find((room) => room.id === 8)?.playerSecond?.id).toBe(2);
    expect(roomApi.rooms.find((room) => room.id === 7)?.playerSecond).toBeNull();
  });

  test('host reload keeps the waiting room for the opponent', async () => {
    roomApi.seed({
      id: 7,
      status: 'WAITING_SECOND_USER',
      playerFirst: { id: 1 },
      playerSecond: null,
    });
    memoryStorage.set('roomId', '7');

    const hostSession = await settle(1);

    expect(hostSession).toBe(7);
    expect(roomApi.rooms.find((room) => room.id === 7)?.status).toBe('WAITING_SECOND_USER');
  });

  test('friend enters the room the host created, not another waiting room', async () => {
    const hostRoomId = await settle(1);
    roomApi.rooms.unshift({
      id: 100,
      status: 'WAITING_SECOND_USER',
      playerFirst: { id: 9 },
      playerSecond: null,
    });
    locationState.search = `?roomId=${hostRoomId}`;

    const friendSession = await settle(2);

    expect(friendSession).toBe(hostRoomId);
    expect(roomApi.rooms.find((room) => room.id === hostRoomId)?.playerSecond?.id).toBe(2);
    expect(roomApi.rooms.find((room) => room.id === 100)?.playerSecond).toBeNull();
  });

  test('friend still reaches the host room after the host page reloads', async () => {
    const createdRoomId = await settle(1);
    memoryStorage.set('roomId', String(createdRoomId));

    const hostAfterReload = await settle(1);
    locationState.search = `?roomId=${createdRoomId}`;
    const friendSession = await settle(2);
    const createdRoom = roomApi.rooms.find((room) => room.id === createdRoomId);

    expect(hostAfterReload).toBe(createdRoomId);
    expect(friendSession).toBe(createdRoomId);
    expect(createdRoom?.status).not.toBe('FINISHED');
    expect(createdRoom?.playerFirst.id).toBe(1);
    expect(createdRoom?.playerSecond?.id).toBe(2);
  });

  test('failed join still opens a session instead of hanging', async () => {
    roomApi.seed({
      id: 7,
      status: 'WAITING_SECOND_USER',
      playerFirst: { id: 1 },
      playerSecond: null,
    });
    roomApi.setFailJoin(true);

    const guestSession = await settle(2);

    expect(guestSession).toEqual(expect.any(Number));
    const seated = roomApi.rooms.find((room) => room.id === guestSession);
    expect(seated?.playerFirst.id === 2 || seated?.playerSecond?.id === 2).toBe(true);
  });
});
