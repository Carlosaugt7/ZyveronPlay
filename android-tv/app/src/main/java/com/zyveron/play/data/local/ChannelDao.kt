package com.zyveron.play.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface ChannelDao {

    @Query("SELECT * FROM categories ORDER BY categoryName ASC")
    fun getAllCategories(): Flow<List<CategoryEntity>>

    @Query("SELECT * FROM channels WHERE categoryId = :catId ORDER BY num ASC")
    fun getChannelsByCategory(catId: String): Flow<List<ChannelEntity>>

    @Query("SELECT * FROM channels WHERE isFavorite = 1 ORDER BY num ASC")
    fun getFavoriteChannels(): Flow<List<ChannelEntity>>

    @Query("SELECT * FROM channels WHERE name LIKE '%' || :query || '%' LIMIT 100")
    suspend fun searchChannels(query: String): List<ChannelEntity>

    @Query("SELECT * FROM channels WHERE streamId = :streamId LIMIT 1")
    suspend fun getChannelById(streamId: Int): ChannelEntity?

    @Query("SELECT COUNT(*) FROM channels")
    suspend fun getChannelCount(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertChannelsBatch(channels: List<ChannelEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategoriesBatch(categories: List<CategoryEntity>)

    @Update
    suspend fun updateChannel(channel: ChannelEntity)

    @Query("DELETE FROM channels")
    suspend fun clearChannels()

    @Query("DELETE FROM categories")
    suspend fun clearCategories()
}

