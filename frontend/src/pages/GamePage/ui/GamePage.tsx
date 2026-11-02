import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './GamePage.module.scss';
import { Game } from '@/features/Game';
import { useGameState } from '@/features/Game/model/hooks/useGameState';

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/features/Auth';
import { TokensTypes } from "@/features/Game/model/types/game";
import {
  DEFAULT_TOKEN_SELECTION,
  formatSelectionCountdown,
  readTokenSelection,
  remainingSelectionSeconds,
  saveTokenSelection,
  shouldOpenTokenSelection,
  TOKEN_SELECTION_TIMEOUT_SEC,
} from '../model/tokenSelection';





import imgNoTax from '@/shared/assets/images/free_raffle.png';
import imgEmbezzlement from '@/shared/assets/images/embezzlement.png';
import imgImmunity from '@/shared/assets/images/immunity.png';
import imgExhaustion from '@/shared/assets/images/exhaustion.png';
import imgExtraRefund from '@/shared/assets/images/extra_refund.png';
import imgGeneralTariff from '@/shared/assets/images/general_tariff.png';
import imgImposters from '@/shared/assets/images/major_fraud.png';
import imgGeneralAudit from '@/shared/assets/images/general_audit.png';
import imgEmbargo from '@/shared/assets/images/embargo.png';
import imgSylopZero from '@/shared/assets/images/devalue.png';
import imgDirectTransaction from '@/shared/assets/images/direct_transaction.png';
import imgTakeTwoChips from '@/shared/assets/images/refund.png';
import imgCookBooks from '@/shared/assets/images/cook_books.png';



const GamePage = () => {
  const {
    client,
    gameState,
    roomState,
    isLoading,
    isGameInProgress,
    diceDetails,
    handleDiceSelection,
    winnerId,
    roundResult,
    leaveCurrentRoom,
    fetchGameState,
  } = useGameState();
  const playerId = useSelector(selectCurrentUser)?.id;

  let loader = null;
  let roomId = null;

  useEffect(() => {
    if (roomState && roomState.id) {
      roomId = roomState.id;
    }
  }, [roomState]);

  if (!client) {
    loader = <div className={classNames(cls.loader, {}, [])}>Подключение к серверу</div>;
  } else if (!roomState) {
    loader = <div className={classNames(cls.loader, {}, [])}>Создание комнаты...</div>;
  } else if (roomState.status === 'WAITING_SECOND_USER') {
    loader = <div className={classNames(cls.loader, {}, [])}>Ожидание соперника...</div>;
  } else if (!gameState) {
    loader = <div className={classNames(cls.loader, {}, [])}>Игра ещё не создана или не стартовала</div>;
  } else if (isLoading && !isGameInProgress) {
    loader = <div className={classNames(cls.loader, {}, [])}>Ожидание соперника...</div>;
  }

const [usedTokens, setUsedTokens] = useState<TokensTypes[]>([]);

  const [myTokens, setMyTokens] = useState<TokensTypes[]>([]);
  const [hasSelectedTokens, setHasSelectedTokens] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectionSecondsLeft, setSelectionSecondsLeft] = useState(TOKEN_SELECTION_TIMEOUT_SEC);
  const [flippedTokens, setFlippedTokens] = useState<string[]>([]);
  const selectionSettledRef = useRef(false);
  const confirmTokensRef = useRef<(tokens: TokensTypes[]) => void>(() => {});


    useEffect(() => {
            if (!gameState || !client) return;
            // @ts-ignore
            const myUserId = client?.userId;
            if (typeof myUserId === 'undefined') return;

            const myPlayer = gameState.players.find(p => p.playerId === myUserId);
            if (myPlayer && Array.isArray(myPlayer.tokens) && myPlayer.tokens.length > 0) {
              // предполагается, что gameState.players[].tokens уже содержит значения типа TokensTypes (строки enum)
              setMyTokens(myPlayer.tokens as TokensTypes[]);
              setHasSelectedTokens(true);
              setIsModalOpen(false); // закрываем окно выбора если оно вдруг открылось
            }
          }, [gameState, client]);



  // Один раз на комнату: повторный заход из меню не открывает выбор заново.
  useEffect(() => {
    if (roomState?.id == null || playerId == null) {
      return;
    }

    const saved = readTokenSelection(roomState.id, playerId);
    if (saved) {
      setMyTokens((current) => (
        current.length === saved.length && current.every((token, index) => token === saved[index])
          ? current
          : saved
      ));
      setHasSelectedTokens(true);
      setIsModalOpen(false);
      return;
    }

    setIsModalOpen(shouldOpenTokenSelection({
      status: roomState.status,
      hasSecondPlayer: Boolean(roomState.playerSecond),
      alreadySelected: hasSelectedTokens,
    }));
  }, [roomState?.id, roomState?.status, roomState?.playerSecond, playerId, hasSelectedTokens]);

  const handleSelectTokens = (tokens: TokensTypes[]) => {
    if (selectionSettledRef.current || tokens.length !== 3) {
      return;
    }

    selectionSettledRef.current = true;
    if (roomState?.id != null && playerId != null) {
      saveTokenSelection(roomState.id, playerId, tokens);
    }
    setMyTokens(tokens);
    setHasSelectedTokens(true);
    setIsModalOpen(false);
  };

  confirmTokensRef.current = handleSelectTokens;

  useEffect(() => {
    if (!isModalOpen || hasSelectedTokens) {
      return undefined;
    }

    selectionSettledRef.current = false;
    const startedAt = Date.now();
    setSelectionSecondsLeft(TOKEN_SELECTION_TIMEOUT_SEC);

    const timer = window.setInterval(() => {
      const left = remainingSelectionSeconds(Date.now() - startedAt);
      setSelectionSecondsLeft((current) => (current === left ? current : left));
      if (left > 0) {
        return;
      }

      window.clearInterval(timer);
      confirmTokensRef.current([...DEFAULT_TOKEN_SELECTION]);
    }, 250);

    return () => window.clearInterval(timer);
  }, [isModalOpen, hasSelectedTokens]);



const handlePlayToken = useCallback((token: TokensTypes) => {
  if (usedTokens.includes(token)) {
    alert('Этот жетон уже был использован!');
    return; // выходим, чтобы не отправлять повторно
  }

  // оптимистично удаляем жетон из локального состояния
  setUsedTokens(prev => [...prev, token]);

  // отправляем событие на сервер
  if (client && roomState) {
    client.publish({
      destination: `/app/input/session/${roomState.id}/turn`,
      body: JSON.stringify({
        sessionId: roomState.id,
        // @ts-ignore
        playerId: client.userId, // предполагается, что userId есть
        turnType: 'PLAY_TOKEN',
        details: { token }
      }),
    });
  }
}, [client, roomState, usedTokens]);



  const handleCardClick = (tokenId: string) => {
    const enumValue = tokenNameToEnum[tokenId];

    if (!enumValue) {
      console.error("Не найден enum для токена:", tokenId);
      return;
    }

    setFlippedTokens(prev =>
      prev.includes(tokenId)
        ? prev.filter(id => id !== tokenId)
        : [...prev, tokenId]
    );
  };


  useEffect(() => {
      console.log('[GamePage] myTokens updated:', myTokens, 'hasSelectedTokens:', hasSelectedTokens);
    }, [myTokens, hasSelectedTokens]);


  const handleIconClick = (tokenId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const enumValue = tokenNameToEnum[tokenId];
    if (!enumValue) return;

    if (myTokens.includes(enumValue)) {
      setMyTokens(prev => prev.filter(t => t !== enumValue));
    } else {
      if (myTokens.length < 3) {
        setMyTokens(prev => [...prev, enumValue]);
      } else {
        alert("Можно выбрать только 3 жетона!");
      }
    }
  };




   const tokenData = [
       {
           id: 'Бесплатный розыгрыш',
           name: 'Бесплатный розыгрыш',
           description: 'Вы не уплачиваете налог в этом ходе',
           frontImage: imgNoTax,
           backImage: imgNoTax
         },
       {
           id: 'Хищение',
           name: 'Хищение',
           description: 'Заберите 1 фишку из банка соперника в свой банк',
           frontImage: imgEmbezzlement,
           backImage: imgEmbezzlement
       },

       {
           id: 'Иммунитет',
           name: 'Иммунитет',
           description: 'Предотвращает срабатывание жетонов против вас до следующего раунда',
           frontImage: imgImmunity,
           backImage: imgImmunity
       },

       {
           id: 'Истощение',
           name: 'Истощение',
           description: 'Противник должен сбросить карты и взять новую комбинацию из закрытой колоды',
           frontImage: imgExhaustion,
           backImage: imgExhaustion
        },

       {
           id: 'Доп возврат',
           name: 'Доп возврат',
           description: 'Верните 3 фишки, выплаченные в этом раунде',
           frontImage: imgExtraRefund,
           backImage: imgExtraRefund
       },

       {
           id: 'Общий тариф',
           name: 'Общий тариф',
           description: 'С противника взимается налог 1 фишка',
           frontImage: imgGeneralTariff,
           backImage: imgGeneralTariff
        },

       {
           id: 'Крупное мошенничество',
           name: 'Крупное мошенничество',
           description: 'Установить значение самозванца равным 6 до следующего вскрытия',
           frontImage: imgImposters,
           backImage: imgImposters
        },

       {
           id: 'Общий аудит',
           name: 'Общий аудит',
           description: 'Соперник облагается налогом в 2 фишки, если он спасовал в этом ходе',
           frontImage: imgGeneralAudit,
           backImage: imgGeneralAudit
       },

       {
           id: 'Эмбарго',
           name: 'Эмбарго',
           description: 'Противник в следующем ходе пасует',
           frontImage: imgEmbargo,
           backImage: imgEmbargo
       },

       {
           id: 'Уценка',
           name: 'Уценка',
           description: 'Установить значение Sylop равным 0 до следующего вскрытия',
           frontImage: imgSylopZero,
           backImage: imgSylopZero
       },

       {
           id: 'Прямая транзакция',
           name: 'Прямая транзакция',
           description: 'Противник меняется с вами картами',
           frontImage: imgDirectTransaction,
           backImage: imgDirectTransaction
       },

       {
           id: 'Возврат',
           name: 'Возврат',
           description: 'Верните 2 фишки ',
           frontImage: imgTakeTwoChips,
           backImage: imgTakeTwoChips
       },

       {
           id: 'Готовьте книги',
           name: 'Готовьте книги',
           description: 'Инвертируйте ранги Sabacc до следующего вскрытия',
           frontImage: imgCookBooks,
           backImage: imgCookBooks
       },

     ];



const tokenNameToEnum: Record<string, TokensTypes> = {
  "Бесплатный розыгрыш": TokensTypes.NO_TAX,
  "Возврат": TokensTypes.TAKE_TWO_CHIPS,
  "Общий тариф": TokensTypes.OTHER_PLAYERS_PAY_ONE,
  "Доп возврат": TokensTypes.EXTRA_REFUND,
  "Хищение": TokensTypes.EMBEZZLEMENT,
  "Общий аудит": TokensTypes.GENERAL_AUDIT,
  "Иммунитет": TokensTypes.IMMUNITY,
  "Истощение": TokensTypes.EXHAUSTION,
  "Прямая транзакция": TokensTypes.DIRECT_TRANSACTION,
  "Крупное мошенничество": TokensTypes.IMPOSTERS_TO_SIX,
  "Уценка": TokensTypes.SYLOP_TO_ZERO,
  "Готовьте книги": TokensTypes.COOK_THE_BOOKS,
  "Эмбарго": TokensTypes.EMBARGO,
};


  return (
      <div className={classNames(cls.game, {}, [])}>
        {/* Отображаем ID комнаты, если он есть */}
        {roomState?.id && (
          <div className={cls.roomId}>
            ID Комнаты: {roomState.id}
          </div>
        )}

        {loader ? (
          loader
        ) : (
          <Game
            client={client}
            gameState={gameState}
            roomState={roomState}
            diceDetails={diceDetails}
            handleDiceSelection={handleDiceSelection}
            winnerId={winnerId}
            roundResult={roundResult}
            leaveCurrentRoom={leaveCurrentRoom}
            fetchGameState={fetchGameState}

            myTokens={myTokens.filter(t => !usedTokens.includes(t))}
            // @ts-ignore
            userId={client?.userId}
            onPlayToken={handlePlayToken}
          />
        )}



        {roomState?.status === 'WAITING_SECOND_USER' && <p>Поиск противника...</p>}

        {isModalOpen && (
          <div className={cls.modalOverlay}>
            <div className={cls.tokenModal}>
              <div className={cls.modalHeader}>
                <h2>Выберите жетоны для игры</h2>
                <div className={cls.selectionTimer}>
                  <div
                    className={classNames(cls.timerRing, {
                      [cls.timerUrgent]: selectionSecondsLeft <= 30,
                    })}
                    style={{ ['--progress' as string]: `${(selectionSecondsLeft / TOKEN_SELECTION_TIMEOUT_SEC) * 100}%` }}
                  >
                    <span className={cls.timerValue}>{formatSelectionCountdown(selectionSecondsLeft)}</span>
                  </div>
                  <span className={cls.timerCaption}>на выбор</span>
                </div>
                <div className={cls.selectionCounter}>
                  Выбрано: {myTokens.length}/3
                </div>
              </div>
              <p className={cls.timerHint}>
                Если не подтвердить выбор, будут выданы: Бесплатный розыгрыш, Возврат и Хищение.
              </p>

              <div className={cls.tokensGrid}>
                {tokenData.map((token) => (
                  <div
                    key={token.id}
                    className={classNames(cls.tokenCard, { [cls.flipped]: flippedTokens.includes(token.id) })}
                    onClick={() => handleCardClick(token.id)}
                  >
                    <div className={cls.tokenCardInner}>
                      {/* Лицевая сторона */}
                      <div className={cls.tokenCardFront}>
                        <img src={token.frontImage} alt={token.name} />
                        <div className={cls.tokenName}>{token.name}</div>
                        <div
                          className={cls.tokenIcon}
                          onClick={(e) => handleIconClick(token.id, e)}
                        >
                          {myTokens.includes(tokenNameToEnum[token.id]) ? '🗑' : '➕'}
                        </div>
                      </div>

                      {/* Обратная сторона */}
                      <div className={cls.tokenCardBack}>
                        <img src={token.frontImage} alt={token.name} />
                        <div className={cls.tokenDescription}>

                          <p>{token.description}</p>
                        </div>
                        <div
                          className={cls.tokenIcon}
                          onClick={(e) => handleIconClick(token.id, e)}
                        >

                          {myTokens.includes(tokenNameToEnum[token.id]) ? '🗑' : '➕'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={cls.modalActions}>
                <button
                  className={cls.confirmButton}
                  onClick={() => handleSelectTokens(myTokens)}
                  disabled={myTokens.length !== 3}
                >
                  Подтвердить выбор ({myTokens.length}/3)
                </button>
              </div>
            </div>
          </div>
        )}


      </div>
    );
  };

export default GamePage;