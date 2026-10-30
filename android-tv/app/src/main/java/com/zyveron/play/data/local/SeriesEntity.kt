package com.zyveron.play.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "series",
    indices = [
        Index(value = ["categoryId"]),
        Index(value = ["name"])
    ]
)
data class SeriesEntity(
    @PrimaryKey
    val seriesId: Int,
    val num: Int = 0,
    val name: String,
    val cover: String?,
    val plot: String? = null,
    val cast: String? = null,
    val rating: String? = null,
    val year: String? = null,
    val genre: String? = null,
    val categoryId: String,
    val isFavorite: Boolean = false
)

data class EpisodeItem(
    val id: String,
    val episodeNum: Int,
    val title: String,
    val containerExtension: String = "mp4",
    val info: Map<String, Any>? = null
)

data class SeasonEpisodes(
    val seasonNumber: Int,
    val episodes: List<EpisodeItem>
)

