import { classNames } from '@/shared/lib/classNames/classNames';
import { memo } from 'react';
import cls from './GameResultModal.module.scss';
import { useSelector } from 'react-redux';
import BackgroundTable from '@/shared/assets/images/table_cubes.png'
import { selectCurrentUser } from '@/features/Auth';

interface GameResultModalProps {
  winnerId: number;
  onClose: () => void;
}

export const GameResultModal = memo(({ winnerId, onClose }: GameResultModalProps) => {
  const user = useSelector(selectCurrentUser)

  if (!user) return <div></div>

  const isWinner = user.id == winnerId;

  return (
    <div className={cls.GameResultModal} onClick={onClose}>
      <div className={cls.modalContent} onClick={(e) => e.stopPropagation()}>
        <img src={BackgroundTable} className={cls.background} />
        <div className={cls.content}>
          <div className={cls.title}>РЕЗУЛЬТАТ</div>
          <div className={cls.resultText}>
            {isWinner ? 'ПОБЕДА!' : 'ПРОИГРЫШ'}
          </div>
          <button className={cls.closeButton} onClick={onClose}>
            ЗАКРЫТЬ
          </button>
        </div>
      </div>
    </div>
  );
});