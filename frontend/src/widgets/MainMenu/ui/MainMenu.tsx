
import { memo, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { selectCurrentUser, Auth } from '@/features/Auth';
import { getRouteGame, getRouteRooms, getRouteRools } from '@/shared/const/router';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Modal } from '@/shared/ui';
import hud from '@/shared/ui/Hud/Hud.module.scss';
import cls from './MainMenu.module.scss';

interface MainMenuProps {
  className?: string;
}

const avatars = ['👑', '⚔️', '👾', '🚀', '⭐️'];

export const MainMenu = memo(({ className }: MainMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(() => localStorage.getItem('selectedAvatar') || '');
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const [returnRoomId, setReturnRoomId] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setReturnRoomId(null);
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const response = await axios.get(`/api/v1/room/active?userId=${user.id}`);
        if (!cancelled) {
          setReturnRoomId(response.status === 204 ? null : response.data?.id ?? null);
        }
      } catch {
        if (!cancelled) {
          setReturnRoomId(null);
        }
      }
    };

    load();
    const timer = window.setInterval(load, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user?.id]);

  const handlePlay = () => {
    if (!user) {
      setIsOpen(true);
      return;
    }
    if (returnRoomId) {
      localStorage.setItem('roomId', String(returnRoomId));
    }
    navigate(getRouteGame());
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '';
  };

  const handleAvatarSelect = (avatar: string) => {
    setSelectedAvatar(avatar);
    localStorage.setItem('selectedAvatar', avatar);
  };

  return (
    <div className={classNames(cls.menu, {}, [hud.panel, className])}>
      {user && (
        <div className={cls.profile}>
          <div>
            <div className={cls.label}>ИГРОК В СЕТИ</div>
            <div className={cls.username}>{selectedAvatar || '👤'} {user.username}</div>
          </div>
          <button type="button" className={`${hud.button} ${cls.logout}`} onClick={handleLogout}>
            Выйти
          </button>
          <div className={cls.avatars} role="group" aria-label="Аватар">
            {avatars.map((avatar) => (
              <button
                key={avatar}
                type="button"
                className={`${hud.button} ${cls.avatarOption}`}
                aria-pressed={selectedAvatar === avatar}
                onClick={() => handleAvatarSelect(avatar)}
              >
                {avatar}
              </button>
            ))}
          </div>
        </div>
      )}

      <button type="button" className={`${hud.button} ${hud.gold}`} onClick={handlePlay}>
        {returnRoomId ? 'Вернуться' : 'Играть'}
      </button>
      <Link className={hud.button} to={getRouteRooms()}>Комнаты</Link>
      <Link className={`${hud.button} ${cls.rules}`} to={getRouteRools()}>Правила</Link>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} lazy>
        <Auth />
      </Modal>
    </div>
  );
});

export default MainMenu;
