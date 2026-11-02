package ru.ngtu.sabacc.room;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import ru.ngtu.sabacc.system.event.PlayerDisconnectedSessionEvent;
import ru.ngtu.sabacc.system.event.PlayerLeftSessionEvent;
import ru.ngtu.sabacc.system.event.PlayerReconnectedSessionEvent;
import ru.ngtu.sabacc.system.event.SessionFinishedEvent;
import ru.ngtu.sabacc.system.event.SessionReadyEvent;
import ru.ngtu.sabacc.system.event.SessionStartedEvent;
import ru.ngtu.sabacc.system.exception.session.JoinFinishedSessionException;
import ru.ngtu.sabacc.system.exception.session.PlayerNotRelatedToSessionException;
import ru.ngtu.sabacc.system.exception.session.SecondPlayerIsNotJoinedException;
import ru.ngtu.sabacc.user.User;
import ru.ngtu.sabacc.user.UserService;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class SessionRoomServiceTest {

    @Mock
    private SessionRoomRepository sessionRoomRepository;

    @Mock
    private UserService userService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private PlatformTransactionManager transactionManager;

    private SessionRoomService service;

    private final Map<Long, SessionRoom> rooms = new HashMap<>();

    private final AtomicLong ids = new AtomicLong(1);

    private User host;

    private User guest;

    @BeforeEach
    void setUp() {
        service = new SessionRoomService(
                sessionRoomRepository, userService, eventPublisher, transactionManager);
        lenient().when(transactionManager.getTransaction(any(TransactionDefinition.class)))
                .thenReturn(org.mockito.Mockito.mock(TransactionStatus.class));
        host = user(1L, "host");
        guest = user(2L, "guest");
        lenient().when(userService.getUserById(1L)).thenReturn(host);
        lenient().when(userService.getUserById(2L)).thenReturn(guest);

        lenient().when(sessionRoomRepository.saveAndFlush(any(SessionRoom.class))).thenAnswer(invocation -> {
            SessionRoom room = invocation.getArgument(0);
            if (room.getId() == null) {
                room.setId(ids.getAndIncrement());
            }
            rooms.put(room.getId(), room);
            return room;
        });
        lenient().when(sessionRoomRepository.findById(anyLong())).thenAnswer(invocation ->
                Optional.ofNullable(rooms.get(invocation.getArgument(0))));
        lenient().when(sessionRoomRepository.findAllByPlayerFirstIdAndStatusNot(anyLong(), any())).thenReturn(List.of());
        lenient().when(sessionRoomRepository.findByPlayerFirstIdOrPlayerSecondIdAndStatusNot(anyLong(), anyLong(), any()))
                .thenReturn(List.of());
        lenient().when(sessionRoomRepository.findAllAvailableForJoin(any())).thenAnswer(invocation -> rooms.values().stream()
                .filter(room -> room.getStatus() == SessionRoomStatus.WAITING_SECOND_USER)
                .filter(room -> room.getPlayerSecond() == null)
                .toList());
        lenient().when(sessionRoomRepository.findAllIdsOrderById()).thenAnswer(invocation ->
                rooms.keySet().stream().sorted().toList());
        lenient().when(sessionRoomRepository.findRoomsWithAbsentPlayers()).thenAnswer(invocation ->
                rooms.values().stream()
                        .filter(room -> room.getPlayerFirstLeftAt() != null || room.getPlayerSecondLeftAt() != null)
                        .toList());
        lenient().doAnswer(invocation -> {
            SessionRoom deleted = invocation.getArgument(0);
            if (deleted.getId() != null) {
                rooms.remove(deleted.getId());
            }
            return null;
        }).when(sessionRoomRepository).delete(any(SessionRoom.class));
        lenient().doAnswer(invocation -> {
            Long id = invocation.getArgument(0);
            Long playerId = invocation.getArgument(1);
            String status = invocation.getArgument(2);
            SessionRoom room = SessionRoom.builder()
                    .playerFirst(userService.getUserById(playerId))
                    .status(SessionRoomStatus.valueOf(status))
                    .build();
            room.setId(id);
            rooms.put(id, room);
            return null;
        }).when(sessionRoomRepository).insertWithId(anyLong(), anyLong(), any());
    }

    @Test
    @DisplayName("Второй игрок входит в ожидающую комнату, оба сокета стартуют партию")
    void secondPlayerJoinsWaitingRoomAndBothSocketsStartSession() {
        SessionRoom room = service.createSessionRoom(host.getId());

        assertThat(service.getAvailableRoomsForJoin(guest.getId()))
                .extracting(SessionRoom::getId)
                .containsExactly(room.getId());

        service.joinSession(room.getId(), guest.getId());
        service.handlePlayerSocketConnection(room.getId(), host.getId());
        service.handlePlayerSocketConnection(room.getId(), guest.getId());

        assertThat(room.getStatus()).isEqualTo(SessionRoomStatus.ALL_USERS_CONNECTED);
        assertThat(room.getPlayerFirst().getId()).isEqualTo(host.getId());
        assertThat(room.getPlayerSecond().getId()).isEqualTo(guest.getId());
        verify(eventPublisher, times(1)).publishEvent(any(SessionReadyEvent.class));
    }

    @Test
    @DisplayName("Два одновременных создания сажают игроков в одну комнату")
    void concurrentCreatePutsBothPlayersInOneRoom() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Future<SessionRoom> hostRoom = pool.submit(() -> {
                start.await();
                return service.createSessionRoom(host.getId());
            });
            Future<SessionRoom> guestRoom = pool.submit(() -> {
                start.await();
                return service.createSessionRoom(guest.getId());
            });
            start.countDown();

            assertThat(hostRoom.get(5, TimeUnit.SECONDS).getId())
                    .isEqualTo(guestRoom.get(5, TimeUnit.SECONDS).getId());
            assertThat(rooms.values().stream()
                    .filter(room -> room.getStatus() != SessionRoomStatus.FINISHED))
                    .hasSize(1);
            assertThat(rooms.values())
                    .anyMatch(room -> room.getStatus() == SessionRoomStatus.ALL_USERS_JOINED
                            && room.getPlayerSecond() != null);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    @DisplayName("Порядок подключения сокетов не мешает старту общей сессии")
    void sessionBecomesReadyRegardlessOfSocketOrder() {
        SessionRoom room = service.createSessionRoom(host.getId());
        service.joinSession(room.getId(), guest.getId());

        service.handlePlayerSocketConnection(room.getId(), guest.getId());
        service.handlePlayerSocketConnection(room.getId(), host.getId());

        assertThat(room.getStatus()).isEqualTo(SessionRoomStatus.ALL_USERS_CONNECTED);
        verify(eventPublisher, times(1)).publishEvent(any(SessionReadyEvent.class));
    }

    @Test
    @DisplayName("Обрыв одного сокета в идущей партии ставит паузу, а не завершает комнату")
    void disconnectOfOnePlayerDuringGameDoesNotFinishSession() {
        SessionRoom room = seatBothAndConnect();
        service.onSessionStarted(new SessionStartedEvent(room.getId()));

        service.handlePlayerSocketDisconnect(room.getId(), guest.getId());

        assertThat(room.getStatus()).isEqualTo(SessionRoomStatus.PLAYER_DISCONNECTED);
        verify(eventPublisher).publishEvent(any(PlayerDisconnectedSessionEvent.class));
        verify(eventPublisher, never()).publishEvent(any(SessionFinishedEvent.class));

        service.handlePlayerSocketConnection(room.getId(), guest.getId());

        assertThat(room.getStatus()).isEqualTo(SessionRoomStatus.IN_PROGRESS);
        verify(eventPublisher).publishEvent(any(PlayerReconnectedSessionEvent.class));
    }

    @Test
    @DisplayName("Обрыв сокета хоста до прихода соперника оставляет комнату открытой")
    void hostDisconnectWhileWaitingStillLetsOpponentJoinAndStart() {
        SessionRoom room = service.createSessionRoom(host.getId());
        service.handlePlayerSocketConnection(room.getId(), host.getId());
        service.handlePlayerSocketDisconnect(room.getId(), host.getId());

        assertThat(room.getStatus())
                .as("пока второго игрока нет, обрыв сокета хоста не завершает комнату")
                .isEqualTo(SessionRoomStatus.WAITING_SECOND_USER);
        verify(eventPublisher, never()).publishEvent(any(SessionFinishedEvent.class));

        assertThat(service.getAvailableRoomsForJoin(guest.getId()))
                .extracting(SessionRoom::getId)
                .contains(room.getId());

        service.joinSession(room.getId(), guest.getId());
        service.handlePlayerSocketConnection(room.getId(), host.getId());
        service.handlePlayerSocketConnection(room.getId(), guest.getId());

        assertThat(room.getStatus()).isEqualTo(SessionRoomStatus.ALL_USERS_CONNECTED);
        verify(eventPublisher, times(1)).publishEvent(any(SessionReadyEvent.class));
    }

    @Test
    @DisplayName("Хост создал комнату, его сокет оборвался, друг заходит в ту же комнату и партия стартует")
    void friendJoinsHostRoomAfterSocketDropAndSessionStarts() {
        SessionRoom room = service.createSessionRoom(host.getId());
        Long roomId = room.getId();

        service.handlePlayerSocketConnection(roomId, host.getId());
        service.handlePlayerSocketDisconnect(roomId, host.getId());

        assertThat(room.getStatus())
                .as("обрыв сокета создателя, пока друга ещё нет, не завершает комнату")
                .isEqualTo(SessionRoomStatus.WAITING_SECOND_USER);
        assertThat(room.getId()).isEqualTo(roomId);

        service.handlePlayerSocketConnection(roomId, host.getId());
        assertThat(room.isPlayerFirstConnected()).isTrue();

        service.joinSession(roomId, guest.getId());
        assertThat(room.getPlayerSecond().getId()).isEqualTo(guest.getId());
        assertThat(room.getStatus()).isEqualTo(SessionRoomStatus.ALL_USERS_JOINED);

        service.handlePlayerSocketConnection(roomId, guest.getId());

        assertThat(room.getStatus()).isEqualTo(SessionRoomStatus.ALL_USERS_CONNECTED);
        assertThat(room.getPlayerFirst().getId()).isEqualTo(host.getId());
        assertThat(room.getPlayerSecond().getId()).isEqualTo(guest.getId());
        verify(eventPublisher, never()).publishEvent(any(SessionFinishedEvent.class));
        verify(eventPublisher, times(1)).publishEvent(any(SessionReadyEvent.class));
    }

    @Test
    @DisplayName("Обрыв сокета после join, но до handshake соперника, не хоронит сессию")
    void hostDisconnectBeforeOpponentHandshakeKeepsRoomOpen() {
        SessionRoom room = service.createSessionRoom(host.getId());
        service.joinSession(room.getId(), guest.getId());
        service.handlePlayerSocketConnection(room.getId(), host.getId());
        service.handlePlayerSocketDisconnect(room.getId(), host.getId());

        assertThat(room.getStatus())
                .as("партия ещё не стартовала, поэтому комната не становится FINISHED")
                .isEqualTo(SessionRoomStatus.ALL_USERS_JOINED);
        verify(eventPublisher, never()).publishEvent(any(SessionFinishedEvent.class));
        verify(eventPublisher, never()).publishEvent(any(PlayerDisconnectedSessionEvent.class));

        service.handlePlayerSocketConnection(room.getId(), guest.getId());
        service.handlePlayerSocketConnection(room.getId(), host.getId());

        assertThat(room.getStatus()).isEqualTo(SessionRoomStatus.ALL_USERS_CONNECTED);
        verify(eventPublisher, times(1)).publishEvent(any(SessionReadyEvent.class));
    }

    @Test
    @DisplayName("Выход из партии открывает окно возврата и не удаляет комнату сразу")
    void leaveOpensReturnWindowUntilTheEarlierTimerExpires() {
        SessionRoom room = seatBothAndConnect();
        room.setStatus(SessionRoomStatus.IN_PROGRESS);

        service.leaveRoom(room.getId(), guest.getId());
        service.leaveRoom(room.getId(), host.getId());

        assertThat(rooms).containsKey(room.getId());
        assertThat(room.getPlayerFirstLeftAt()).isNotNull();
        assertThat(room.getPlayerSecondLeftAt()).isNotNull();

        room.setPlayerSecondLeftAt(Instant.now().minus(3, ChronoUnit.MINUTES));
        room.setPlayerFirstLeftAt(Instant.now().minus(1, ChronoUnit.MINUTES));
        service.expireReconnectWindows();

        assertThat(rooms).doesNotContainKey(room.getId());
    }

    @Test
    @DisplayName("Если вышедший не вернулся, оставшийся побеждает")
    void absentPlayerLosesWhenReturnWindowExpires() {
        SessionRoom room = seatBothAndConnect();
        room.setStatus(SessionRoomStatus.IN_PROGRESS);

        service.leaveRoom(room.getId(), guest.getId());
        room.setPlayerSecondLeftAt(Instant.now().minus(3, ChronoUnit.MINUTES));
        service.expireReconnectWindows();

        assertThat(room.getStatus()).isEqualTo(SessionRoomStatus.FINISHED);
        assertThat(room.getPlayerFirst().getId()).isEqualTo(host.getId());
        assertThat(room.getPlayerSecond()).isNull();
        verify(eventPublisher).publishEvent(any(PlayerLeftSessionEvent.class));
    }

    @Test
    @DisplayName("Когда из завершённой партии вышли оба, комната удаляется")
    void bothPlayersLeavingFinishedRoomDeletesIt() {
        SessionRoom room = seatBothAndConnect();
        room.setStatus(SessionRoomStatus.FINISHED);

        service.leaveRoom(room.getId(), guest.getId());

        assertThat(rooms).containsKey(room.getId());
        assertThat(room.getPlayerSecond()).isNull();

        service.leaveRoom(room.getId(), host.getId());

        assertThat(rooms).doesNotContainKey(room.getId());
        verify(sessionRoomRepository).delete(room);
    }

    @Test
    @DisplayName("Новая комната получает наименьший свободный номер, начиная с 1")
    void newRoomTakesSmallestFreeId() {
        assertThat(SessionRoomService.smallestFreeId(List.of())).isEqualTo(1L);
        assertThat(SessionRoomService.smallestFreeId(List.of(1L, 2L, 3L))).isEqualTo(4L);
        assertThat(SessionRoomService.smallestFreeId(List.of(1L, 3L))).isEqualTo(2L);
        assertThat(SessionRoomService.smallestFreeId(List.of(2L, 3L))).isEqualTo(1L);

        SessionRoom first = service.createSessionRoom(host.getId());
        assertThat(first.getId()).isEqualTo(1L);

        rooms.remove(first.getId());
        SessionRoom reused = service.createSessionRoom(guest.getId());
        assertThat(reused.getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("В уже завершённую комнату войти нельзя")
    void finishedRoomRejectsSecondPlayer() {
        SessionRoom room = service.createSessionRoom(host.getId());
        room.setStatus(SessionRoomStatus.FINISHED);

        assertThatThrownBy(() -> service.joinSession(room.getId(), guest.getId()))
                .isInstanceOf(JoinFinishedSessionException.class);
    }

    @Test
    @DisplayName("Чужой игрок не подключает сокет к чужой сессии")
    void handshakeOfUnrelatedPlayerIsRejected() {
        User stranger = user(3L, "stranger");
        SessionRoom room = service.createSessionRoom(host.getId());
        service.joinSession(room.getId(), guest.getId());

        assertThatThrownBy(() -> service.handlePlayerSocketConnection(room.getId(), stranger.getId()))
                .isInstanceOf(PlayerNotRelatedToSessionException.class);
    }

    @Test
    @DisplayName("Сокет второго игрока до join отклоняется")
    void secondPlayerHandshakeBeforeJoinIsRejected() {
        SessionRoom room = service.createSessionRoom(host.getId());

        assertThatThrownBy(() -> service.handlePlayerSocketConnection(room.getId(), guest.getId()))
                .isInstanceOf(SecondPlayerIsNotJoinedException.class);
    }

    private SessionRoom seatBothAndConnect() {
        SessionRoom room = service.createSessionRoom(host.getId());
        service.joinSession(room.getId(), guest.getId());
        service.handlePlayerSocketConnection(room.getId(), host.getId());
        service.handlePlayerSocketConnection(room.getId(), guest.getId());
        return room;
    }

    private static User user(Long id, String username) {
        User user = User.builder().username(username).build();
        user.setId(id);
        return user;
    }
}
