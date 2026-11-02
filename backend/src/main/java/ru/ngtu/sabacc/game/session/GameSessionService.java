package ru.ngtu.sabacc.game.session;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import ru.ngtu.sabacc.game.messaging.IGameMessageExchanger;
import ru.ngtu.sabacc.game.messaging.IGameSession;
import ru.ngtu.sabacc.game.messaging.dto.GameProgressDto;
import ru.ngtu.sabacc.game.messaging.dto.GameProgressStatus;
import ru.ngtu.sabacc.game.session.factory.IGameSessionFactory;
import ru.ngtu.sabacc.gamecore.game.GameStateDto;
import ru.ngtu.sabacc.gamecore.turn.TurnDto;
import ru.ngtu.sabacc.room.SessionRoom;
import ru.ngtu.sabacc.system.event.*;
import ru.ngtu.sabacc.system.exception.session.GameSessionAlreadyExistsException;
import ru.ngtu.sabacc.system.exception.session.GameSessionNotFoundException;
import ru.ngtu.sabacc.user.UserService;
import ru.ngtu.sabacc.ws.WebSocketMessageSender;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static ru.ngtu.sabacc.constants.WebSocketApiEndpoint.WS_GAME_PROGRESS_QUEUE;

@Slf4j
@Service
@RequiredArgsConstructor
public class GameSessionService {

    private final IGameSessionFactory sessionFactory;
    private final IGameMessageExchanger gameMessageExchanger;
    private final WebSocketMessageSender socketMessageSender;
    private final Map<Long, IGameSession> activeSessions = new ConcurrentHashMap<>();
    private final UserService userService;

    private final ApplicationEventPublisher eventPublisher;

    public GameStateDto getCurrentGameState(Long sessionId) {
        checkIfSessionExists(sessionId);
        return activeSessions.get(sessionId).getCurrentState();
    }

    public void makeTurn(TurnDto turnDTO) {
        log.info("tryMakeTurn called! PlayerId: {}, TurnType: {}, Details: {}",
                turnDTO.getPlayerId(),
                turnDTO.getTurnType(),
                turnDTO.getDetails());

        Long sessionId = turnDTO.getSessionId();
        checkIfSessionExists(sessionId);
        activeSessions.get(sessionId).tryMakeTurn(turnDTO);
    }

    @EventListener(SessionRoomDeletedEvent.class)
    void onSessionDeleted(SessionRoomDeletedEvent event) {
        Long sessionId = event.sessionRoom().getId();
        log.info("Session [{}] was deleted. Deleting game session...", sessionId);

        try {
            deleteSession(sessionId);
        } catch (Exception ignored) {
        }
    }

    @EventListener(SessionReadyEvent.class)
    void onSessionReady(SessionReadyEvent event) {
        Long sessionId = event.sessionId();
        SessionRoom sessionRoom = event.sessionRoom();
        log.info("Session [{}] is ready. Initializing game session...", sessionId);
        createSession(sessionId, sessionRoom.getPlayerFirst().getId(), sessionRoom.getPlayerSecond().getId());
        startSession(sessionId);
        socketMessageSender.sendMessageSessionBroadcast(
                sessionId,
                WS_GAME_PROGRESS_QUEUE,
                GameProgressDto
                        .builder()
                        .status(GameProgressStatus.STARTED)
                        .details(Map.of("sessionRoom", sessionRoom))
                        .build()
        );

        eventPublisher.publishEvent(new SessionStartedEvent(sessionId));
    }

    @EventListener(PlayerDisconnectedSessionEvent.class)
    void onPlayerDisconnected(PlayerDisconnectedSessionEvent event) {
        Long sessionId = event.sessionId();
        Long playerId = event.playerId();
        log.info("Pausing session [{}] due to player [{}] disconnect", sessionId, playerId);
        try {
            pauseSession(sessionId);
        } catch (GameSessionNotFoundException ex) {
            log.info("Session [{}] is not in memory, skip pause", sessionId);
        }
        socketMessageSender.sendMessageSessionBroadcast(
                sessionId,
                WS_GAME_PROGRESS_QUEUE,
                GameProgressDto
                        .builder()
                        .status(GameProgressStatus.PLAYER_DISCONNECTED)
                        .details(Map.of("opponent", userService.getUserById(playerId)))
                        .build()
        );
    }

    @EventListener(PlayerReconnectedSessionEvent.class)
    void onPlayerReconnected(PlayerReconnectedSessionEvent event) {
        Long sessionId = event.sessionId();
        Long playerId = event.playerId();
        log.info("Continuing session [{}] due to player [{}] reconnect", sessionId, playerId);
        try {
            unpauseSession(sessionId);
        } catch (GameSessionNotFoundException ex) {
            log.info("Session [{}] is not in memory, skip unpause", sessionId);
        }
        socketMessageSender.sendMessageSessionBroadcast(
                sessionId,
                WS_GAME_PROGRESS_QUEUE,
                GameProgressDto
                        .builder()
                        .status(GameProgressStatus.PLAYER_RECONNECTED)
                        .details(Map.of("opponent", userService.getUserById(playerId)))
                        .build()
        );
    }

    @EventListener(SessionFinishedEvent.class)
    void onSessionFinished(SessionFinishedEvent event) {
        try {
            Long sessionId = event.sessionId();
            finishSession(sessionId);
        } catch (Exception e) {
            log.error("Exception raised when finishing session: {}", e.getMessage());
        }
    }

    private void pauseSession(Long sessionId) {
        checkIfSessionExists(sessionId);
        activeSessions.get(sessionId).pause();
        log.info("Game session [{}] paused.", sessionId);
    }

    private void unpauseSession(Long sessionId) {
        checkIfSessionExists(sessionId);
        activeSessions.get(sessionId).unpause();
        log.info("Game session [{}] continued.", sessionId);
    }

    private void startSession(Long sessionId) {
        checkIfSessionExists(sessionId);
        activeSessions.get(sessionId).start();
        log.info("Game session [{}] started.", sessionId);
    }

    private void createSession(Long sessionId, Long playerFirstId, Long playerSecondId) {
        if(activeSessions.containsKey(sessionId)) {
            throw new GameSessionAlreadyExistsException(sessionId);
        }
        IGameSession session = sessionFactory.createSession(gameMessageExchanger, sessionId, playerFirstId, playerSecondId);
        activeSessions.put(sessionId, session);
        log.info("Game session [{}] created.", sessionId);
    }

    private void finishSession(Long sessionId) {
        checkIfSessionExists(sessionId);
        activeSessions.remove(sessionId);
        log.info("Game session [{}] finished.", sessionId);
    }

    private void deleteSession(Long sessionId) {
        checkIfSessionExists(sessionId);
        activeSessions.remove(sessionId);
        log.info("Game session [{}] deleted.", sessionId);
    }

    private void checkIfSessionExists(Long sessionId) {
        if(!activeSessions.containsKey(sessionId)) {
            throw new GameSessionNotFoundException(sessionId);
        }
    }
}
