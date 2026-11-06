
import { memo } from 'react';
import { MainMenu } from '@/widgets/MainMenu';
import hud from '@/shared/ui/Hud/Hud.module.scss';
import cls from './MainPage.module.scss';

export const MainPage = memo(() => (
  <main className={hud.screen}>
    <div className={cls.menu}>
      <h1 className={cls.title}>САБАКК</h1>
      <MainMenu />
    </div>
  </main>
));

export default MainPage;
