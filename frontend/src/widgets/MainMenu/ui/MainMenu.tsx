import { memo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { selectCurrentUser, Auth } from '@/features/Auth';
import { getRouteGame, getRouteRools } from '@/shared/const/router';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Button, Modal, AppLink } from '@/shared/ui';
import cls from './MainMenu.module.scss'; // Убедитесь, что ваш CSS-файл называется MainMenu.module.scss

interface MainMenuProps {
  className?: string;
}

const getInitialAvatar = () => {
  return localStorage.getItem('selectedAvatar') || '';
};

export const MainMenu = memo((props: MainMenuProps) => {
  const { className } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(getInitialAvatar);
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

  const handleOpen = () => {
    if (user) {
      navigate(getRouteGame());
    } else {
      setIsOpen(true);
    }
  };

  const handleReturn = () => {
    if (!returnRoomId) {
      return;
    }
    localStorage.setItem('roomId', String(returnRoomId));
    navigate(getRouteGame());
  };

  const handleClose = () => setIsOpen(false);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "";
  };

  const handleAvatarSelect = (avatar: string) => {
    setSelectedAvatar(avatar);
    localStorage.setItem('selectedAvatar', avatar);
  };

  return (
    <div className={classNames(cls.Menu, {}, [className])}>
      {user && (
        <div className={cls.userInfo}>
          <div className={cls.avatarSection}>
            <div className={cls.avatar}>{selectedAvatar || '👤'}</div>
            <div className={cls.avatarSelector}>
              {['👑', '⚔️', '👾', '🚀', '⭐️'].map((avatar) => (
                <button
                  key={avatar}
                  className={classNames(cls.avatarOption, {
                    [cls.selected]: selectedAvatar === avatar
                  })}
                  onClick={() => handleAvatarSelect(avatar)}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>
          {/* НОВЫЙ БЛОК: здесь имя пользователя и кнопка "Выйти" */}
          <div className={cls.userInfoDetails}>
            <div className={cls.username}>{user.username}</div>
            <Button
              variant="btn" // Убедитесь, что 'btn' - это правильный variant для вашего компонента Button
              className={cls.logoutBtn}
              onClick={handleLogout}
            >
              Выйти
            </Button>
          </div>
        </div>
      )}

      {/* Кнопки "Играть" и "Правила" */}
      <Button variant="btn" onClick={returnRoomId ? handleReturn : handleOpen}>
        {returnRoomId ? 'Вернуться' : 'Играть'}
      </Button>

      <div className={cls.btns}>
        <AppLink variant="btn" to={getRouteRools()}>
          Правила
        </AppLink>
      </div>

      <Modal isOpen={isOpen} onClose={handleClose}>
        <Auth />
      </Modal>
    </div>
  );
});

export default MainMenu;
