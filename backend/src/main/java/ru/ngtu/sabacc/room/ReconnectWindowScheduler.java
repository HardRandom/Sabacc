package ru.ngtu.sabacc.room;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ReconnectWindowScheduler {

    private final SessionRoomService sessionRoomService;

    @Scheduled(fixedDelay = 1000)
    public void expireReconnectWindows() {
        sessionRoomService.expireReconnectWindows();
    }
}
