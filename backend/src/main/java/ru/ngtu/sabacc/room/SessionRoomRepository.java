package ru.ngtu.sabacc.room;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

import java.util.List;
import java.util.Optional;

@RepositoryRestResource(exported = false)
public interface SessionRoomRepository extends JpaRepository<SessionRoom, Long> {
    List<SessionRoom> findAllByPlayerFirstIdOrPlayerSecondId(Long playerFirst_id, Long playerSecond_id);
    //Optional<SessionRoom> findByPlayerFirstIdAndStatusNot(Long playerId, SessionRoomStatus status);
    List<SessionRoom> findAllByPlayerFirstIdAndStatusNot(Long playerId, SessionRoomStatus status);

//    Optional<SessionRoom> findByPlayerFirstIdOrPlayerSecondIdAndStatusNot(Long playerFirstId,Long playerSecondId, SessionRoomStatus status);

    @Query("""
    select r
    from SessionRoom r
    where
        r.status=:availableStatus
    and
        r.playerSecond is null
    and
        r.status <> 'FINISHED'
""")
    List<SessionRoom> findAllAvailableForJoin(SessionRoomStatus availableStatus);


    @Query("select r.id from SessionRoom r order by r.id")
    List<Long> findAllIdsOrderById();

    @Query("""
            select r from SessionRoom r
            where r.playerFirstLeftAt is not null or r.playerSecondLeftAt is not null
            """)
    List<SessionRoom> findRoomsWithAbsentPlayers();

    @Modifying
    @Query(value = """
            INSERT INTO session_rooms (
                id, player_first_id, player_second_id,
                is_player_first_connected, is_player_second_connected, status
            ) VALUES (
                :id, :playerFirstId, NULL, false, false, :status
            )
            """, nativeQuery = true)
    void insertWithId(@Param("id") Long id, @Param("playerFirstId") Long playerFirstId, @Param("status") String status);

    List<SessionRoom> findByPlayerFirstIdOrPlayerSecondIdAndStatusNot(
            Long playerFirstId,
            Long playerSecondId,
            SessionRoomStatus status
    );
}