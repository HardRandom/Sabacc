import { classNames } from '@/shared/lib/classNames/classNames';
import {
  formatSelectionCountdown,
  TOKEN_SELECTION_TIMEOUT_SEC,
} from '@/shared/lib/countdown/countdown';
import cls from './CountdownTimer.module.scss';

interface CountdownTimerProps {
  secondsLeft: number;
  caption?: string;
}

export const CountdownTimer = ({ secondsLeft, caption }: CountdownTimerProps) => {
  const progress = Math.max(0, Math.min(100, (secondsLeft / TOKEN_SELECTION_TIMEOUT_SEC) * 100));

  return (
    <div className={cls.selectionTimer}>
      <div
        className={classNames(cls.timerRing, { [cls.timerUrgent]: secondsLeft <= 30 })}
        style={{ ['--progress' as string]: `${progress}%` }}
      >
        <span className={cls.timerValue}>{formatSelectionCountdown(secondsLeft)}</span>
      </div>
      {caption ? <span className={cls.timerCaption}>{caption}</span> : null}
    </div>
  );
};
