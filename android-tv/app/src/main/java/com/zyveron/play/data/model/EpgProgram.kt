package com.zyveron.play.data.model

data class EpgProgram(
    val id: String,
    val title: String,
    val description: String,
    val startFormatted: String,
    val endFormatted: String,
    val startTimestamp: Long,
    val stopTimestamp: Long,
    val isNowPlaying: Boolean = false,
    val progress: Float = 0f
)

