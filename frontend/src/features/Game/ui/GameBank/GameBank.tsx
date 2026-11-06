
import cls from './GameBank.module.scss';

interface GameBankProps {
  playerName: string;
  playerChips?: number;
  opponentName: string;
  opponentChips?: number;
}

export const GameBank = ({ playerName, playerChips, opponentName, opponentChips }: GameBankProps) => (
  <section className={cls.bank}>
    <h2>Банк раунда</h2>
    <dl>
      <div><dt>{opponentName}</dt><dd>{opponentChips ?? '—'}</dd></div>
      <div><dt>{playerName}</dt><dd>{playerChips ?? '—'}</dd></div>
    </dl>
  </section>
);
