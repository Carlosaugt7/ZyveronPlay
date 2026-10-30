package com.zyveron.play.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey
    val categoryId: String,
    val categoryName: String,
    val parentId: Int = 0,
    val type: String = "live" // "live" ou "vod"
)

