package ru.ngtu.sabacc.room;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import ru.ngtu.sabacc.system.event.*;
import ru.ngtu.sabacc.system.exception.notfound.EntityNotFoundException;
import ru.ngtu.sabacc.system.exception.session.*;
import ru.ngtu.sabacc.user.User;
import ru.ngtu.sabacc.user.UserService;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class SessionRoomService {

    private final SessionRoomRepository sessionRoomRepository;
    private final UserService userService;
    private final ApplicationEventPublisher eventPublisher;
    private final PlatformTransactionManager transactionManager;
    private final Object matchmakingLock = new Object();

    public static final Duration RECONNECT_WINDOW = Duration.ofMinutes(2);

    @Transactional(readOnly = true)
    public List<SessionRoom> getAllRooms() {
        return sessionRoomRepository.findAll();
    }

    @Transactional
    public List<User> getSessionMembers(Long sessionId) {
        SessionRoom sessionRoom = sessionRoomRepository
                .findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException(SessionRoom.class, sessionId));

        return new ArrayList<>(List.of(sessionRoom.getPlayerFirst(), sessionRoom.getPlayerSecond()));
    }

    public SessionRoom getRoomById(Long id) {
        return sessionRoomRepository
                .findById(id)
                .orElseThrow(() -> new EntityNotFoundException(SessionRoom.class, id));
    }

    public List<SessionRoom> getAllUserSessionRooms(Long userId) {
        return sessionRoomRepository.findAllByPlayerFirstIdOrPlayerSecondId(userId, userId);
    }



    // Возвращает только реально активные сессии пользователя
    public List<SessionRoom> getUserActiveSessions(Long userId) {
        List<SessionRoom> sessions = sessionRoomRepository.findByPlayerFirstIdOrPlayerSecondIdAndStatusNot(
                userId, userId, SessionRoomStatus.FINISHED
        );

        List<SessionRoom> activeSessions = sessions.stream()
                .filter(s -> (s.getPlayerFirst().getId().equals(userId) && s.isPlayerFirstConnected())
                        || (s.getPlayerSecond() != null && s.getPlayerSecond().getId().equals(userId) && s.isPlayerSecondConnected()))
                .toList();

        log.info("User [{}] active sessions (connected): {}", userId, activeSessions.stream().map(s -> s.getId()).toList());

        return activeSessions;
    }


    // getAvailableRoomsForJoin с логированием активных сессий
    public List<SessionRoom> getAvailableRoomsForJoin(Long userId) {
        log.warn("WARN ВЫЗВАН МЕТОД В SessionRoomService");
        System.out.println("CALL getAvailableRoomsForJoin");

        if (userService.getUserById(userId) == null) {
            throw new EntityNotFoundException(User.class, userId);
        }

        // Проверка активных сессий
        List<SessionRoom> activeSessions = getUserActiveSessions(userId);
        if (!activeSessions.isEmpty()) {
            System.out.println("Есть незавершенные сессии: " + activeSessions.stream().map(SessionRoom::getId).toList());
            throw new UserHaveUnfinishedSessionException(userId);
        }

        // Получаем все доступные комнаты
        List<SessionRoom> availableRooms = sessionRoomRepository.findAllAvailableForJoin(SessionRoomStatus.WAITING_SECOND_USER);
        log.info("Available rooms for user {}: {}", userId, availableRooms.stream().map(s -> s.getId()).toList());

        return availableRooms;
    }

    public SessionRoom createSessionRoom(Long userId) {
        synchronized (matchmakingLock) {
            return new TransactionTemplate(transactionManager)
                    .execute(status -> openSessionRoom(userId));
        }
    }

    private SessionRoom openSessionRoom(Long userId) {
        User user = userService.getUserById(userId);

        log.info("User [{}] creating session room", userId);

        List<SessionRoom> unfinished = sessionRoomRepository.findAllByPlayerFirstIdAndStatusNot(userId, SessionRoomStatus.FINISHED);
        if (!unfinished.isEmpty()) {
            throw new UnfinishedSessionException(userId);
        }

        for (SessionRoom candidate : sessionRoomRepository.findAllAvailableForJoin(SessionRoomStatus.WAITING_SECOND_USER)) {
            if (candidate.getPlayerFirst() == null || candidate.getPlayerFirst().getId().equals(userId)) {
                continue;
            }
            try {
                joinSession(candidate.getId(), userId);
                SessionRoom joined = getRoomById(candidate.getId());
                log.info("User [{}] joined existing waiting room {}", userId, joined.getId());
                return joined;
            } catch (SessionIsFullException | JoinFinishedSessionException | UserAlreadyJoinedSessionException ex) {
                log.info("Waiting room {} is no longer joinable for user [{}]", candidate.getId(), userId);
            }
        }

        Long roomId = smallestFreeId(sessionRoomRepository.findAllIdsOrderById());
        sessionRoomRepository.insertWithId(
                roomId,
                user.getId(),
                SessionRoomStatus.WAITING_SECOND_USER.name()
        );
        SessionRoom createdSessionRoom = getRoomById(roomId);
        log.info("Session room: id={} was created", createdSessionRoom.getId());

        eventPublisher.publishEvent(new SessionRoomCreatedEvent(createdSessionRoom));

        return createdSessionRoom;
    }


    @Transactional
    public void joinSession(Long sessionId, Long userId) {
        log.info("User [{}] joining session [{}]", userId, sessionId);

        SessionRoom sessionRoom = getRoomById(sessionId);
        User user = userService.getUserById(userId);

        throwIfUserHaveUnfinishedSessions(userId);

        if(sessionRoom.getStatus().equals(SessionRoomStatus.FINISHED))
            throw new JoinFinishedSessionException(userId, sessionId);

        if(sessionRoom.getPlayerSecond() != null) {
            if(sessionRoom.getPlayerSecond().equals(user))
                throw new UserAlreadyJoinedSessionException(sessionId, userId);
            throw new SessionIsFullException(sessionRoom.getId(), user.getId());
        }

        if(sessionRoom.getPlayerFirst().getId().equals(userId))
            throw new JoinSelfHostedSessionException(userId);

        sessionRoom.setPlayerSecond(user);
        sessionRoom.setStatus(SessionRoomStatus.ALL_USERS_JOINED);
        sessionRoomRepository.saveAndFlush(sessionRoom);
    }

    @Transactional
    public void leaveAllRooms(Long userId) {
        log.info("User [{}] leaving all sessions", userId);
        List<SessionRoom> userSessionRooms = getAllUserSessionRooms(userId);
        userSessionRooms.forEach(r -> leaveRoom(r.getId(), userId));
    }

    @Transactional
    public void leaveRoom(Long roomId, Long userId) {
        log.info("User [{}] leaving session [{}]", userId, roomId);
        log.info("User leave");

        SessionRoom sessionRoom = getRoomById(roomId);

        if (!roomContainsUser(sessionRoom, userId)) {
            throw new PlayerNotRelatedToSessionException(roomId, userId);
        }

        if (sessionRoom.getStatus().equals(SessionRoomStatus.FINISHED)) {
            removePlayerFromFinishedRoom(sessionRoom, userId);
            return;
        }

        if (allowsReturn(sessionRoom)) {
            markPlayerAway(sessionRoom, userId);
            return;
        }


        // Если выходит первый игрок
        if (sessionRoom.getPlayerFirst().getId().equals(userId)) {
            if (sessionRoom.getPlayerSecond() != null) {
                // переносим второго в "первого"
                User newFirst = sessionRoom.getPlayerSecond();
                sessionRoom.setPlayerFirst(newFirst);
                sessionRoom.setPlayerSecond(null);
                updateSessionStatus(sessionRoom, SessionRoomStatus.WAITING_SECOND_USER);
                sessionRoomRepository.saveAndFlush(sessionRoom);

                Long winnerId = newFirst.getId(); // считаем вторым победителем
                eventPublisher.publishEvent(new PlayerLeftSessionEvent(roomId, userId, winnerId));
            } else {
                // если никого не осталось → удаляем комнату
                sessionRoom.setStatus(SessionRoomStatus.FINISHED);
                deleteSessionRoom(sessionRoom);
                log.info("Никого не осталось в комнате [{}], событие PlayerLeftSessionEvent не публикуется", roomId);
            }
            return;
        }

        // Если выходит второй игрок
        if (sessionRoom.getPlayerSecond() != null && sessionRoom.getPlayerSecond().getId().equals(userId)) {
            Long winnerId = sessionRoom.getPlayerFirst() != null ? sessionRoom.getPlayerFirst().getId() : null;

            sessionRoom.setPlayerSecond(null);
            updateSessionStatus(sessionRoom, SessionRoomStatus.WAITING_SECOND_USER);
            sessionRoomRepository.saveAndFlush(sessionRoom);

            if (winnerId != null) {
                eventPublisher.publishEvent(new PlayerLeftSessionEvent(roomId, userId, winnerId));
            } else {
                log.info("Победителя нет для комнаты [{}], событие PlayerLeftSessionEvent не публикуется", roomId);
            }
            return;
        }

        // На всякий случай — если пользователь не первый и не второй
        log.warn("User [{}] не найден в комнате [{}] при выходе", userId, roomId);
    }

    private void removePlayerFromFinishedRoom(SessionRoom sessionRoom, Long userId) {
        if (sessionRoom.getPlayerFirst() != null && sessionRoom.getPlayerFirst().getId().equals(userId)) {
            sessionRoom.setPlayerFirst(sessionRoom.getPlayerSecond());
            sessionRoom.setPlayerFirstConnected(sessionRoom.isPlayerSecondConnected());
            sessionRoom.setPlayerSecond(null);
            sessionRoom.setPlayerSecondConnected(false);
        } else if (sessionRoom.getPlayerSecond() != null && sessionRoom.getPlayerSecond().getId().equals(userId)) {
            sessionRoom.setPlayerSecond(null);
            sessionRoom.setPlayerSecondConnected(false);
        } else {
            return;
        }

        if (sessionRoom.getPlayerFirst() == null) {
            deleteSessionRoom(sessionRoom);
            return;
        }
        sessionRoomRepository.saveAndFlush(sessionRoom);
    }





    @Transactional
    public void deleteSessionRoomById(Long roomId) {
        SessionRoom sessionRoom = sessionRoomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException(SessionRoom.class, roomId));
        deleteSessionRoom(sessionRoom);
    }

    @Transactional
    public void deleteSessionRoom(SessionRoom sessionRoom) {
        log.info("Deleting session room: id={}", sessionRoom.getId());

        eventPublisher.publishEvent(new SessionRoomDeletedEvent(sessionRoom));
        sessionRoomRepository.delete(sessionRoom);
    }

    @EventListener(UserDeletedEvent.class)
    @Transactional
    void onUserDeleted(UserDeletedEvent event) {
        List<SessionRoom> allUserSessionRooms = getAllUserSessionRooms(event.user().getId());
        for (SessionRoom sessionRoom : allUserSessionRooms) {
            deleteSessionRoom(sessionRoom);
        }
        sessionRoomRepository.deleteAll(allUserSessionRooms);
    }

    @Transactional
    public void handlePlayerSocketConnection(Long sessionId, Long playerId) {
        SessionRoom sessionRoom = switchPlayerSocketConnected(sessionId, playerId, true);

        if(sessionRoom.getStatus().equals(SessionRoomStatus.FINISHED))
            throw new JoinFinishedSessionException(playerId, sessionId);

        if(sessionRoom.isPlayerFirstConnected() && sessionRoom.isPlayerSecondConnected()) {
            if (sessionRoom.getStatus().equals(SessionRoomStatus.ALL_USERS_JOINED)) {
                updateSessionStatus(sessionRoom, SessionRoomStatus.ALL_USERS_CONNECTED);
                sessionRoomRepository.saveAndFlush(sessionRoom);
                eventPublisher.publishEvent(new SessionReadyEvent(sessionId, sessionRoom));
            }
            else {
                updateSessionStatus(sessionRoom, SessionRoomStatus.IN_PROGRESS);
                sessionRoomRepository.saveAndFlush(sessionRoom);
                eventPublisher.publishEvent(new PlayerReconnectedSessionEvent(sessionId, playerId, sessionRoom));
            }
        }
    }

    @Transactional
    public void handlePlayerSocketDisconnect(Long sessionId, Long playerId) {
        SessionRoom sessionRoom = switchPlayerSocketConnected(sessionId, playerId, false);
        log.info("Session [{}]: playerFirstConnected={}, playerSecondConnected={}, currentStatus={}",
                sessionId, sessionRoom.isPlayerFirstConnected(), sessionRoom.isPlayerSecondConnected(), sessionRoom.getStatus());

        if (sessionRoom.getStatus() == SessionRoomStatus.WAITING_SECOND_USER
                || sessionRoom.getStatus() == SessionRoomStatus.ALL_USERS_JOINED) {
            return;
        }

        if (sessionRoom.getStatus() == SessionRoomStatus.FINISHED) {
            if (!sessionRoom.isPlayerFirstConnected() && !sessionRoom.isPlayerSecondConnected()) {
                deleteSessionRoom(sessionRoom);
            }
            return;
        }

        markPlayerAway(sessionRoom, playerId);
    }


    @EventListener(SessionStartedEvent.class)
    void onSessionStarted(SessionStartedEvent event) {
        SessionRoom sessionRoom = getRoomById(event.sessionId());
        updateSessionStatus(sessionRoom, SessionRoomStatus.IN_PROGRESS);
        sessionRoomRepository.saveAndFlush(sessionRoom);
    }

    @EventListener(SessionFinishedEvent.class)
    void onSessionFinished(SessionFinishedEvent event) {
        SessionRoom sessionRoom = getRoomById(event.sessionId());
        if (sessionRoom.getStatus() != SessionRoomStatus.FINISHED) {
            updateSessionStatus(sessionRoom, SessionRoomStatus.FINISHED);
            sessionRoomRepository.saveAndFlush(sessionRoom);
        }
    }


    private SessionRoom switchPlayerSocketConnected(Long sessionId, Long playerId, boolean value) {
        SessionRoom sessionRoom = sessionRoomRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException(SessionRoom.class, sessionId));

        User playerFirst = sessionRoom.getPlayerFirst();
        if(playerFirst.getId().equals(playerId)) {
            sessionRoom.setPlayerFirstConnected(value);
            sessionRoomRepository.saveAndFlush(sessionRoom);
            return sessionRoom;
        }

        User playerSecond = sessionRoom.getPlayerSecond();
        if(playerSecond == null) {
            throw new SecondPlayerIsNotJoinedException(sessionId);
        }

        if(playerSecond.getId().equals(playerId)) {
            sessionRoom.setPlayerSecondConnected(value);
            sessionRoomRepository.saveAndFlush(sessionRoom);
            return sessionRoom;
        }

        throw new PlayerNotRelatedToSessionException(sessionId, playerId);
    }

    // Обновлённая проверка незавершённых сессий перед join
    private void throwIfUserHaveUnfinishedSessions(Long userId) {
        List<SessionRoom> activeSessions = getUserActiveSessions(userId);
        if (!activeSessions.isEmpty()) {
            log.warn("User [{}] has unfinished sessions: {}", userId, activeSessions.stream().map(s -> s.getId()).toList());
            throw new UserHaveUnfinishedSessionException(userId);
        }
    }


    private boolean roomContainsUser(SessionRoom sessionRoom, Long userId) {
        if (sessionRoom.getPlayerFirst().getId().equals(userId))
            return true;
        User secondPlayer = sessionRoom.getPlayerSecond();
        if (secondPlayer == null)
            return false;

        return secondPlayer.getId().equals(userId);
    }

    public Optional<SessionRoom> findReturnableRoom(Long userId) {
        Instant now = Instant.now();
        return sessionRoomRepository
                .findByPlayerFirstIdOrPlayerSecondIdAndStatusNot(userId, userId, SessionRoomStatus.FINISHED)
                .stream()
                .filter(room -> canStillReturn(room, userId, now))
                .findFirst();
    }

    public SessionRoom returnToSession(Long roomId, Long userId) {
        SessionRoom room = getRoomById(roomId);
        if (!roomContainsUser(room, userId)) {
            throw new PlayerNotRelatedToSessionException(roomId, userId);
        }
        if (room.getStatus() == SessionRoomStatus.FINISHED || !canStillReturn(room, userId, Instant.now())) {
            throw new JoinFinishedSessionException(userId, roomId);
        }

        if (isFirst(room, userId)) {
            room.setPlayerFirstLeftAt(null);
            room.setPlayerFirstConnected(true);
        } else {
            room.setPlayerSecondLeftAt(null);
            room.setPlayerSecondConnected(true);
        }

        boolean otherAway = otherLeftAt(room, userId) != null;
        if (otherAway) {
            updateSessionStatus(room, SessionRoomStatus.PLAYER_DISCONNECTED);
            sessionRoomRepository.saveAndFlush(room);
            return room;
        }

        updateSessionStatus(room, SessionRoomStatus.IN_PROGRESS);
        sessionRoomRepository.saveAndFlush(room);
        eventPublisher.publishEvent(new PlayerReconnectedSessionEvent(roomId, userId, room));
        return room;
    }

    public void expireReconnectWindows() {
        Instant now = Instant.now();
        for (SessionRoom room : sessionRoomRepository.findRoomsWithAbsentPlayers()) {
            expireRoom(room, now);
        }
    }

    private void expireRoom(SessionRoom room, Instant now) {
        if (room.getStatus() == SessionRoomStatus.FINISHED) {
            return;
        }
        Instant firstLeftAt = room.getPlayerFirstLeftAt();
        Instant secondLeftAt = room.getPlayerSecondLeftAt();
        boolean firstExpired = expired(firstLeftAt, now);
        boolean secondExpired = expired(secondLeftAt, now);
        if (!firstExpired && !secondExpired) {
            return;
        }

        if (firstLeftAt != null && secondLeftAt != null) {
            Instant earlier = firstLeftAt.isBefore(secondLeftAt) ? firstLeftAt : secondLeftAt;
            if (now.isBefore(earlier.plus(RECONNECT_WINDOW))) {
                return;
            }
            eventPublisher.publishEvent(new SessionFinishedEvent(room.getId()));
            deleteSessionRoom(room);
            return;
        }

        if (room.getPlayerFirst() == null || room.getPlayerSecond() == null) {
            eventPublisher.publishEvent(new SessionFinishedEvent(room.getId()));
            deleteSessionRoom(room);
            return;
        }

        Long loserId = firstExpired ? room.getPlayerFirst().getId() : room.getPlayerSecond().getId();
        Long winnerId = firstExpired ? room.getPlayerSecond().getId() : room.getPlayerFirst().getId();
        User winner = firstExpired ? room.getPlayerSecond() : room.getPlayerFirst();
        room.setPlayerFirst(winner);
        room.setPlayerFirstConnected(true);
        room.setPlayerFirstLeftAt(null);
        room.setPlayerSecond(null);
        room.setPlayerSecondConnected(false);
        room.setPlayerSecondLeftAt(null);
        updateSessionStatus(room, SessionRoomStatus.FINISHED);
        sessionRoomRepository.saveAndFlush(room);
        eventPublisher.publishEvent(new SessionFinishedEvent(room.getId()));
        eventPublisher.publishEvent(new PlayerLeftSessionEvent(room.getId(), loserId, winnerId));
    }

    private void markPlayerAway(SessionRoom room, Long userId) {
        if (isFirst(room, userId)) {
            if (room.getPlayerFirstLeftAt() == null) {
                room.setPlayerFirstLeftAt(Instant.now());
            }
            room.setPlayerFirstConnected(false);
        } else if (room.getPlayerSecond() != null && room.getPlayerSecond().getId().equals(userId)) {
            if (room.getPlayerSecondLeftAt() == null) {
                room.setPlayerSecondLeftAt(Instant.now());
            }
            room.setPlayerSecondConnected(false);
        } else {
            return;
        }
        updateSessionStatus(room, SessionRoomStatus.PLAYER_DISCONNECTED);
        sessionRoomRepository.saveAndFlush(room);
        eventPublisher.publishEvent(new PlayerDisconnectedSessionEvent(room.getId(), userId, room));
    }

    private boolean allowsReturn(SessionRoom room) {
        return room.getPlayerSecond() != null
                && room.getStatus() != SessionRoomStatus.WAITING_SECOND_USER
                && room.getStatus() != SessionRoomStatus.FINISHED;
    }

    private boolean canStillReturn(SessionRoom room, Long userId, Instant now) {
        Instant leftAt = isFirst(room, userId) ? room.getPlayerFirstLeftAt() : room.getPlayerSecondLeftAt();
        if (leftAt == null) {
            return true;
        }
        return now.isBefore(leftAt.plus(RECONNECT_WINDOW));
    }

    private Instant otherLeftAt(SessionRoom room, Long userId) {
        return isFirst(room, userId) ? room.getPlayerSecondLeftAt() : room.getPlayerFirstLeftAt();
    }

    private boolean isFirst(SessionRoom room, Long userId) {
        return room.getPlayerFirst() != null && room.getPlayerFirst().getId().equals(userId);
    }

    private boolean expired(Instant leftAt, Instant now) {
        return leftAt != null && !now.isBefore(leftAt.plus(RECONNECT_WINDOW));
    }

    static long smallestFreeId(List<Long> usedIds) {
        long candidate = 1L;
        if (usedIds == null) {
            return candidate;
        }
        List<Long> sorted = usedIds.stream().filter(id -> id != null && id > 0).sorted().toList();
        for (Long id : sorted) {
            if (id > candidate) {
                return candidate;
            }
            if (id == candidate) {
                candidate++;
            }
        }
        return candidate;
    }

    private void updateSessionStatus(SessionRoom sessionRoom, SessionRoomStatus newStatus) {
        if (sessionRoom.getStatus() == SessionRoomStatus.FINISHED && newStatus != SessionRoomStatus.FINISHED) {
            log.warn("Попытка сменить статус завершённой комнаты [{}] на {}", sessionRoom.getId(), newStatus);
            return;
        }

        SessionRoomStatus oldStatus = sessionRoom.getStatus();
        sessionRoom.setStatus(newStatus);
        log.info("Session [{}]: статус изменён с {} на {}", sessionRoom.getId(), oldStatus, newStatus);
    }
}