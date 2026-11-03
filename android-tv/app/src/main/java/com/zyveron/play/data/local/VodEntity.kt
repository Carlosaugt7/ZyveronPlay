package com.zyveron.play.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "vod_movies",
    indices = [
        Index(value = ["categoryId"]),
        Index(value = ["categoryId", "num"]),
        Index(value = ["name"]),
        Index(value = ["isFavorite"])
    ]
)
data class VodEntity(
    @PrimaryKey
    val streamId: Int,
    val num: Int = 0,
    val name: String,
    val streamIcon: String?,
    val rating: String? = null,
    val year: String? = null,
    val categoryId: String,
    val containerExtension: String = "mp4",
    val isFavorite: Boolean = false
)

