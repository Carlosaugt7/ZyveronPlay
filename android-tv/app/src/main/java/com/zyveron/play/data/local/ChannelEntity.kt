package com.zyveron.play.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "channels",
    indices = [
        Index(value = ["categoryId"]),
        Index(value = ["categoryId", "num"]),
        Index(value = ["name"]),
        Index(value = ["isFavorite"])
    ]
)
data class ChannelEntity(
    @PrimaryKey
    val streamId: Int,
    val num: Int,
    val name: String,
    val streamIcon: String?,
    val epgChannelId: String?,
    val categoryId: String,
    val isFavorite: Boolean = false,
    val directSourceUrl: String? = null
)

