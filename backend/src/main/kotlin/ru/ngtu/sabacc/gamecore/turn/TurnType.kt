package ru.ngtu.sabacc.gamecore.turn

enum class TurnType {
    PASS,
    GET_SAND,
    GET_BLOOD,
    GET_SAND_DISCARD,
    GET_BLOOD_DISCARD,
    DISCARD_SAND,
    DISCARD_BLOOD,
    PLAY_TOKEN,
    SELECT_DICE,
    AWAITING_DICE,
    SELECT_TOKEN,
    TIMEOUT_WIN
}
