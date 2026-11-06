
import { useState } from 'react';
import { formatSelectionCountdown } from '@/shared/lib/countdown/countdown';
import hud from '@/shared/ui/Hud/Hud.module.scss';
import cls from './GameRules.module.scss';

const pages = [
  {
    title: 'Колоды, фишки и цель игры',
    items: [
      'Есть 2 колоды: жёлтые карты и красные карты.',
      'В каждой колоде по 3 карты номиналом от 1 до 6, а также 3 «самозванца» и 1 «сайлоп», итого 22 карты в одной колоде и всего 44 карты в игре.',
      'Помимо карт в игре есть фишки и жетоны. Каждый игрок может иметь 4 фишки и 3 жетона. Цель игры — собирать сабакк или такие комбинации карт, чтобы победить, имея хотя бы одну фишку. Игрок, у которого нет фишек, выбывает из игры. Фишки нужны, чтобы платить налог при взятии карты из колоды. Жетоны нужны, чтобы менять ход игры.',
      'В начале игры обе колоды перемешиваются, выкладываются на стол, каждому выдаётся по 2 карты (одна жёлтая, одна красная). Ещё по одной карте из каждой колоды выкладывают лицом вверх, чтобы их видели все игроки. Так образуются две колоды сброса.',
    ],
  },
  {
    title: 'Жетоны смены',
    items: [
      'Жетоны смены меняют ход игры. У каждого жетона свой эффект.',
      'Каждый игрок выбирает по 3 жетона смены перед началом игры.',
      'Жетон смены можно разыграть лишь один раз за ход и лишь в начале своего хода, перед пропуском хода или перед взятием карты.',
    ],
  },
  {
    title: 'Четыре колоды на столе',
    items: [
      'Перевёрнутая жёлтая карта.',
      'Жёлтая колода.',
      'Красная колода.',
      'Перевёрнутая красная карта.',
    ],
  },
  {
    title: 'Сброс и вскрытие карт',
    items: [
      'Если игрок берёт карту из колоды, то он сбрасывает карту в одну из колод сброса так, чтобы все видели, что он сбросил.',
      'Всего 3 раунда до вскрытия карт.',
    ],
  },
];

interface GameRulesProps {
  onClose: () => void;
  inGame?: boolean;
  turnSecondsLeft?: number;
}

export const GameRules = ({ onClose, inGame, turnSecondsLeft }: GameRulesProps) => {
  const [page, setPage] = useState(0);
  const { title, items } = pages[page];

  return (
    <section className={`${hud.panel} ${cls.panel}`}>
      <header className={cls.header}>
        <h1 id="game-rules-title">Правила игры (Кессельский сабакк)</h1>
        {inGame && (
          <span className={hud.pill}>
            Партия идёт{turnSecondsLeft != null ? ` · ход: ${formatSelectionCountdown(turnSecondsLeft)}` : ''}
          </span>
        )}
      </header>

      <div className={cls.content} aria-live="polite">
        <h2>{title}</h2>
        <ol>
          {items.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </div>

      <footer className={cls.footer}>
        <nav className={cls.pagination} aria-label="Страницы правил">
          <button
            type="button"
            className={hud.button}
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
            aria-label="Предыдущая страница"
          >
            ←
          </button>
          <span>Страница {page + 1} из {pages.length}</span>
          <button
            type="button"
            className={hud.button}
            onClick={() => setPage(page + 1)}
            disabled={page === pages.length - 1}
            aria-label="Следующая страница"
          >
            →
          </button>
        </nav>
        <button type="button" className={`${hud.button} ${hud.gold}`} onClick={onClose}>
          {inGame ? 'Вернуться в текущую партию' : 'Вернуться в меню'}
        </button>
      </footer>
    </section>
  );
};
