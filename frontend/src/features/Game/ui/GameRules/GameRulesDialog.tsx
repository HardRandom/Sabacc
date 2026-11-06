
import { useEffect, useRef } from 'react';
import { GameRules } from './GameRules';
import cls from './GameRulesDialog.module.scss';

interface GameRulesDialogProps {
  onClose: () => void;
  turnSecondsLeft?: number;
}

export const GameRulesDialog = ({ onClose, turnSecondsLeft }: GameRulesDialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={cls.dialog}
      aria-labelledby="game-rules-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <GameRules inGame onClose={onClose} turnSecondsLeft={turnSecondsLeft} />
    </dialog>
  );
};
