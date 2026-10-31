import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import './AvailableRoomsPage.css';
import { selectCurrentUser } from '@/features/Auth/model/selectors/authSelector';
import Auth from '@/features/Auth/ui/Auth';

type RoomInfo = {
  id: number | string;
  status: string;
  playerFirstId: number | null;
  playerSecondId?: number | null;
};

const AvailableRoomsPage: React.FC = () => {
  console.log('AvailableRoomsPage рендерится');
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const [showAuth, setShowAuth] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); //  Поиска
  const [statusFilter, setStatusFilter] = useState('');//  Фильтра

  enum RoomStatus {
    WAITING_SECOND_USER = 'WAITING_SECOND_USER',
  }

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${__API__}/v1/room/all`)
      .then((res) => {
        const formattedRooms: RoomInfo[] = res.data.map((room: any) => ({
          id: room.id,
          status: room.status,
          playerFirstId: room.playerFirst?.id ?? null,
          playerSecondId: room.playerSecond?.id ?? null,
        }));

        setRooms(formattedRooms);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Ошибка загрузки комнат');
        setLoading(false);
      });
  }, []);

  const handleJoinRoom = (roomId: number | string) => {
    if (!currentUser) {
      setShowAuth(true);
      localStorage.setItem('redirectAfterLogin', `/in-game?roomId=${roomId}`);
      return;
    }
    navigate(`/in-game?roomId=${roomId}`);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleStatusFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(event.target.value);
  };


   const filteredRooms = rooms.filter(room =>
    room.id.toString().includes(searchQuery) && // Поиск по ID комнаты
    (statusFilter === '' || room.status === statusFilter) // Фильтр по статусу
  );

  return (
    <div className="background-container">
      <div className="rooms-container">
        {showAuth && <Auth />}

        <div className="rooms-header">
        <div className="status-filter">
              <label htmlFor="statusFilter">Статус комнаты:</label>
              <select id="statusFilter" value={statusFilter} onChange={handleStatusFilterChange}>
                <option value="">Все</option>
                <option value="WAITING_SECOND_USER">Ожидание соперника</option>
                <option value="PLAYER_DISCONNECTED">Игрок отключился</option>
                <option value="FINISHED">Игра завершена</option>
                <option value="ALL_USERS_JOINED">Все пользователи подключены</option>
                {/* Добавьте другие статусы по необходимости */}
              </select>
            </div>

          <div className="search-bar">
            <input
              type="text"
              placeholder="Поиск"
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <button>
               {/* Тут надо добавить иконку поиска */}
            </button>
          </div>
        </div>


        {loading && <div className="loading">Загрузка...</div>}
        {error && <div className="error">{error}</div>}
        {!loading && rooms.length === 0 && (
          <div className="no-rooms">Нет комнат</div>
        )}

        {!loading && filteredRooms.length > 0 && (
          <table className="rooms-table">
            <thead>
              <tr>
                <th>ID комнаты</th>
                <th>ID соперника</th>
                <th>Статус</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room) => (
                <tr key={room.id}>
                  <td>{room.id}</td>
                  <td>{room.playerSecondId ?? '—'}</td>
                  <td>
                  {/* Логика статуса комнаты */}
                  {(() => {
                    switch (room.status) {
                      case 'WAITING_SECOND_USER':
                        return 'ОЖИДАНИЕ СОПЕРНИКА';
                      case 'PLAYER_DISCONNECTED':
                        return 'ИГРОК ОТКЛЮЧИЛСЯ';
                      case 'FINISHED':
                        return 'ИГРА ЗАВЕРШЕНА';
                      case 'ALL_USERS_JOINED':
                        return 'ИДЕТ ИГРА';
                      default:
                        return room.status;
                    }
                  })()}
                </td>
                  <td>
                    {room.status === RoomStatus.WAITING_SECOND_USER ? (
                      <button
                        className="join-button"
                        onClick={() => handleJoinRoom(room.id)}
                      >
                        Зайти
                      </button>
                    ) : (
                      <span>Не доступно</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button className="back-button" onClick={handleBack}>
          Вернуться
        </button>
      </div>
    </div>
  );
};

export default AvailableRoomsPage;
