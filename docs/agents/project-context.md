# Контекст Sabacc

Срез локального кода: 2026-09-30. Обновляй этот файл при изменении путей, контрактов,
интеграций или agent pitfalls. Устройство системы и потоки данных — в
[architecture.md](../architecture.md); этот файл не заменяет исходный код и требования задачи.

## Текущие ссылки

- GitHub: https://github.com/Krek0204/Sabacc
- Базовая ветка: `main` (локальная `origin/HEAD` указывает на `origin/main`).
- Jira: https://isa-sabacc.atlassian.net/jira/software/projects/SCRUM/boards/1
- Ключ проекта: `SCRUM`; ссылка на задачу: `https://isa-sabacc.atlassian.net/browse/SCRUM-123`.
  Номер 123 во всех примерах условный, это не подтверждённый тикет.
- Remote `origin` в изученном checkout соответствует текущему GitHub.
- Доступ к Jira и удалённым настройкам GitHub при подготовке не подтверждён.
  Статусы Jira, обязательные reviewers, branch protection и серверные checks неизвестны.
- GitHub Actions: `CI` (frontend lint) и `PR gate` (формат заголовка PR,
  актуальность относительно `main`). Workflows есть в `.github/workflows/`;
  обязательные checks для merge настраиваются защитой ветки `main`.
  Frontend lint на существующем коде красный и пока не должен быть required.

Инструкции команды: [CONTRIBUTING.md](../../CONTRIBUTING.md).
Карта how-to: [docs/README.md](../README.md); [README](../../README.md);
[архитектура](../architecture.md).

## Карта кода

Kessel Sabacc — карточная игра для двух игроков. Правила и требования —
в [Project.md](../../Project.md), расхождения — в [Bugs.md](../../Bugs.md).
Не считай все описанные возможности реализованными. Compose, Nginx, БД и жизненный
цикл партии — в [architecture.md](../architecture.md).

- `frontend/`: React 18, TypeScript, Vite 5, Redux Toolkit / RTK Query, STOMP / SockJS.
  `src/app` — запуск, providers, router, store; `pages` — экраны;
  `widgets` — крупные блоки; `features` — Auth/Game; `entities` — Room/GameCard;
  `shared` — API, hooks, UI и assets. Alias `@` указывает на `src`.
- `backend/`: Spring Boot 3.3.4, Java и Kotlin 1.9.23, Gradle wrapper, JDK 21 в Docker.
  Java-пакет `ru.ngtu.sabacc`: `user`, `room`, `game/session`, `game/messaging`, `ws`, `system`.
  Kotlin `gamecore` — правила, карты, игроки, игровая сессия.
  Flyway: `backend/src/main/resources/db/migration/`.

## Контракты и места для поиска

- REST: `backend/src/main/java/ru/ngtu/sabacc/constants/RestApiEndpoint.java`,
  контроллеры `user`, `room`, `game/session`; серверный префикс `/api/v1`.
- STOMP: `constants/WebSocketApiEndpoint.java`, `system/config/websocket`, `ws`.
  Игровой SockJS endpoint `/game`, ходы `/app/input/session/{sessionId}/turn`.
- Клиент: `shared/api/rtkApi.ts`, `shared/lib/hooks/useWebSocketGame.ts`,
  `useWebSocketSubscription.ts`, `features/Game/model`.
- Форматы сообщений: Java `game/messaging/dto`, Kotlin `gamecore` и
  [backend/README.md](../../backend/README.md). Сверяй примеры с реализацией.

## Ограничения, важные для агента

- Идентификатор пользователя в браузере не равнозначен проверенной серверной авторизации.
  Не считай наличие JWT-зависимости доказательством работающей JWT-аутентификации.
- Игровые сессии хранятся в памяти JVM и теряются при рестарте backend.
- `GameSessionTest.kt` закомментирован; Spring `contextLoads` требует окружения.
  Frontend имеет Vitest-тест `classNamas.test.ts`; это не покрытие игровых сценариев.
- В Vite `/api` удаляется прокси, хотя сервер объявляет `/api/v1`;
  `/game` клиента отсутствует в dev proxy. Полный игровой сценарий — через Compose.
- Полные настройки STOMP находятся в `application-prod.yml`, а не в базовом профиле.
  Там же сохранились адреса старой команды; не используй их для нового деплоя автоматически.
  Пошаговый запуск на сервере: [server-deploy](../how-to/server-deploy.md).
- Docker-сборка backend запускает `./gradlew bootJar --no-daemon` через wrapper 8.10.1;
  эта задача не запускает тесты, её успех не подтверждает тестирование.
- Frontend lint на существующем коде красный; см. [verification.md](verification.md).

Правила поведения агента — в [AGENTS.md](../../AGENTS.md), команды —
в [verification.md](verification.md). Новые обнаруженные баги отделяй от выполненной задачи.
