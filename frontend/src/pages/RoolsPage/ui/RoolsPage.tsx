import { memo, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/effect-cards';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import './RoolsPage.scss'
import { EffectCards, Pagination, Navigation } from 'swiper/modules';
import cls from './RoolsPage.module.scss'
import { Button } from '@/shared/ui';
import Arrow from '@/shared/assets/icons/rools-arrow.png';

export const RoolsPage = memo(() => {
  const swiperRef = useRef<any>(null);

  const handleBack = () => {
    window.history.back();
  }

  const handleNextSlide = () => {
    if (swiperRef.current) {
      swiperRef.current.slideNext();
    }
  };

  const handlePrevSlide = () => {
    if (swiperRef.current) {
      swiperRef.current.slidePrev();
    }
  };

  return (
    <>
      <Swiper
        effect={'cards'}
        grabCursor={true}
        modules={[EffectCards, Pagination]}
        pagination={{
          type: 'fraction',
        }}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
      >
        <Button className={cls.btnBack} onClick={handleBack}>Вернуться</Button>
        <Button className={cls.slideNext} variant='clear' onClick={handleNextSlide}><img src={Arrow} /></Button>
        <Button className={cls.slideBack} variant='clear' onClick={handlePrevSlide}><img src={Arrow} /></Button>
        
        <SwiperSlide>
          <ol className={cls.list}>
            <li>Есть 2 колоды: жёлтые карты и красные карты.</li>
            <li>В каждой колоде по 3 карты номиналом от 1 до 6, а также 3 "самозванца" и 1 "сайлоп", итого 22 карты в одной колоде и всего 44 карты в игре.</li>
            <li>Помимо карт в игре есть фишки и жетоны, каждый игрок может иметь 4 фишки и 3 жетона, цель игры — собирать саббак или такие комбинации карт, чтобы победить, имея хотя бы одну фишку; игрок, у которого нет фишек — выбывает из игры. Фишки нужны, чтобы платить налог при взятии карты из колоды. Жетоны нужны, чтобы менять ход игры.</li>
            <li>В начале игры обе колоды перемешиваются, выкладываются на стол, каждому выдается по 2 карты (одна жёлтая, одна красная) и еще 2 карты (одна жёлтая, одна красная) снимаются с каждой колоды и переворачиваются так, чтобы их могли видеть все игроки (две колоды сброса).</li>
          </ol>
        </SwiperSlide>
        <SwiperSlide>
          <h4 className={cls.slideTitle}>Жетоны смены:</h4>
          <ol className={cls.list}>
            <li>Жетоны смены – важные игровые модификаторы , каждый из которых имеет различные эффекты в зависимости от конкретного жетона смены</li>
            <li>Каждый игрок выбирает по 3 жетона смены перед началом игры.</li>
            <li>Жетон смены можно разыграть лишь один раз за ход и лишь в начале своего хода, перед пропуском хода или перед взятием карты.</li>
          </ol>
        </SwiperSlide>
        <SwiperSlide>
          <h4 className={cls.slideTitle}>Итого на столе лежит 4 колоды:</h4>
          <ol className={cls.list}>
            <li>Перевёрнутая жёлтая карта.</li>
            <li>Жёлтая колода.</li>
            <li>Красная колода.</li>
            <li>Перевёрнутая красная карта.</li>
          </ol>
        </SwiperSlide>
        <SwiperSlide>
          <p className={cls.slideText}>Если игрок берет карту из колоды, то он сбрасывает карту в одну из колод сброса так, чтобы все видели, что он сбросил.</p>
          <p className={cls.slideText}>* Всего 3 раунда до вскрытия карт.</p>
        </SwiperSlide>
      </Swiper>
    </>
  );
});

export default RoolsPage;
