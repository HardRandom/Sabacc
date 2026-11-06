
import { TokensTypes } from '../../model/types/game';
import { tokenCatalog } from '../../model/tokenCatalog';
import cls from './GameTokens.module.scss';

interface GameTokensProps {
  selectedTokens: TokensTypes[];
  availableTokens?: TokensTypes[];
  canPlay: boolean;
  onPlay: (token: TokensTypes) => void;
}

export const GameTokens = ({ selectedTokens, availableTokens, canPlay, onPlay }: GameTokensProps) => (
  <section className={cls.tokens}>
    <h2 className={cls.heading}>Ваши жетоны</h2>
    <div className={cls.slots}>
      {selectedTokens.map((type) => {
        const { name, symbol, description } = tokenCatalog[type];
        const used = availableTokens != null && !availableTokens.includes(type);
        return (
          <button
            key={type}
            type="button"
            className={cls.slot}
            data-used={used}
            disabled={!canPlay || used || availableTokens == null}
            onClick={() => onPlay(type)}
          >
            <span className={cls.title}><span aria-hidden="true">{symbol}</span> {name}</span>
            <span className={cls.description}>{description}</span>
            <span className={cls.used}>{used ? 'Использован' : 'Доступен'}</span>
          </button>
        );
      })}
    </div>
  </section>
);
