package ru.ngtu.sabacc.room;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.ngtu.sabacc.user.User;

import java.util.List;

import static ru.ngtu.sabacc.constants.RestApiEndpoint.API_SESSION_ROOM;

/**
 * @author Egor Bokov
 */
@RestController
@RequestMapping(API_SESSION_ROOM)
@RequiredArgsConstructor
public class SessionRoomController {

    private final SessionRoomService roomService;

    @GetMapping("/all")
    public List<SessionRoom> getAllRooms() {
        return roomService.getAllRooms();
    }

    @GetMapping("/{roomId}")
    public SessionRoom getRoomById(@PathVariable Long roomId) {
        return roomService.getRoomById(roomId);
    }

    @GetMapping("/{roomId}/members")
    public List<User> getRoomMembers(@PathVariable Long roomId) {
        return roomService.getSessionMembers(roomId);
    }

    @GetMapping("/active")
    public ResponseEntity<SessionRoom> activeRoom(@RequestParam Long userId) {
        return roomService.findReturnableRoom(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping("/{roomId}/return")
    public SessionRoom returnToSession(@PathVariable Long roomId, @RequestParam Long userId) {
        return roomService.returnToSession(roomId, userId);
    }

    @GetMapping("/available-for-join")
    public List<SessionRoom> getAvailableRoomsForJoin(@RequestParam Long userId) {
        System.out.println("вызов aviliable-for-join з sessionroomcontorller для userId=" + userId);
        System.out.println("новый лог в котроллере");
        return roomService.getAvailableRoomsForJoin(userId);
    }

    @PostMapping("/{roomId}/join")
    public void joinSession(@PathVariable Long roomId, @RequestParam Long userId) {
        roomService.joinSession(roomId, userId);
    }

    @PostMapping("/create")
    public SessionRoom createRoom(@RequestParam Long userId) {
        return roomService.createSessionRoom(userId);
    }

    @PostMapping("/leave/{roomId}")
    public void leaveRooms(@PathVariable Long roomId, @RequestParam Long userId) {
        roomService.leaveRoom(roomId, userId);
    }

    @PostMapping("/leave/all")
    public void leaveAllRooms(@RequestParam Long userId) {
        roomService.leaveAllRooms(userId);
    }

    @DeleteMapping("/{roomId}")
    public void deleteRoom(@PathVariable Long roomId) {
        roomService.deleteSessionRoomById(roomId);
    }
}
