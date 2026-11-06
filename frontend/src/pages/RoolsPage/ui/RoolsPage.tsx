
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameRules } from '@/features/Game';
import { getRouteMain } from '@/shared/const/router';
import hud from '@/shared/ui/Hud/Hud.module.scss';

export const RoolsPage = memo(() => {
  const navigate = useNavigate();

  return (
    <main className={hud.screen}>
      <GameRules onClose={() => navigate(getRouteMain())} />
    </main>
  );
});

export default RoolsPage;
