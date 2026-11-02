package ru.ngtu.sabacc.gamecore.game

import lombok.Data

@Data
data class GameFinishDto @JvmOverloads constructor(
    val sessionId: Long,
    val winnerId: Long? = null,
    val draw: Boolean = false,
)
