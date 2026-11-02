package com.zyveron.play.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface ChannelDao {

    // --- CATEGORIAS ---
    @Query("SELECT * FROM categories WHERE type = :type ORDER BY categoryName ASC")
    fun getCategoriesByType(type: String): Flow<List<CategoryEntity>>

    @Query("SELECT * FROM categories ORDER BY categoryName ASC")
    fun getAllCategories(): Flow<List<CategoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategoriesBatch(categories: List<CategoryEntity>)

    @Query("DELETE FROM categories WHERE type = :type")
    suspend fun clearCategoriesByType(type: String)

    // --- CANAIS AO VIVO ---
    @Query("SELECT * FROM channels ORDER BY num ASC")
    fun getAllChannels(): Flow<List<ChannelEntity>>

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

    @Query("SELECT COUNT(*) FROM channels WHERE categoryId = :catId")
    suspend fun getChannelCountByCategory(catId: String): Int

    @Query("SELECT streamId FROM channels WHERE isFavorite = 1")
    suspend fun getFavoriteStreamIds(): List<Int>

    @Query("UPDATE channels SET isFavorite = 1 WHERE streamId IN (:ids)")
    suspend fun markFavorites(ids: List<Int>)

    @Query("SELECT * FROM channels WHERE LOWER(name) LIKE '%sport%' OR LOWER(name) LIKE '%espn%' OR LOWER(name) LIKE '%premiere%' OR LOWER(name) LIKE '%combate%' OR LOWER(name) LIKE '%ufc%' OR LOWER(name) LIKE '%dazn%' OR LOWER(name) LIKE '%cazé%' OR LOWER(name) LIKE '%futebol%' ORDER BY num ASC")
    fun getSportsChannels(): Flow<List<ChannelEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertChannelsBatch(channels: List<ChannelEntity>)

    @Update
    suspend fun updateChannel(channel: ChannelEntity)

    @Query("UPDATE channels SET isFavorite = :isFav WHERE streamId = :streamId")
    suspend fun setChannelFavorite(streamId: Int, isFav: Boolean)

    @Query("DELETE FROM channels")
    suspend fun clearChannels()

    // --- FILMES (VOD) ---
    @Query("SELECT * FROM vod_movies ORDER BY streamId DESC")
    fun getAllVods(): Flow<List<VodEntity>>

    @Query("SELECT * FROM vod_movies WHERE categoryId = :catId ORDER BY streamId DESC")
    fun getVodsByCategory(catId: String): Flow<List<VodEntity>>

    @Query("SELECT * FROM vod_movies WHERE isFavorite = 1 ORDER BY streamId DESC")
    fun getFavoriteVods(): Flow<List<VodEntity>>

    @Query("SELECT streamId FROM vod_movies WHERE isFavorite = 1")
    suspend fun getFavoriteVodIds(): List<Int>

    @Query("UPDATE vod_movies SET isFavorite = 1 WHERE streamId IN (:ids)")
    suspend fun markVodFavorites(ids: List<Int>)

    @Query("UPDATE vod_movies SET isFavorite = :isFav WHERE streamId = :streamId")
    suspend fun setVodFavorite(streamId: Int, isFav: Boolean)

    @Query("SELECT COUNT(*) FROM vod_movies")
    suspend fun getVodCount(): Int

    @Query("SELECT COUNT(*) FROM vod_movies WHERE categoryId = :catId")
    suspend fun getVodCountByCategory(catId: String): Int

    @Query("SELECT * FROM vod_movies ORDER BY streamId DESC LIMIT 15")
    fun getFeaturedVods(): Flow<List<VodEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertVodsBatch(vods: List<VodEntity>)

    @Query("DELETE FROM vod_movies")
    suspend fun clearVods()

    // --- SÉRIES ---
    @Query("SELECT * FROM series ORDER BY seriesId DESC")
    fun getAllSeries(): Flow<List<SeriesEntity>>

    @Query("SELECT * FROM series WHERE categoryId = :catId ORDER BY seriesId DESC")
    fun getSeriesByCategory(catId: String): Flow<List<SeriesEntity>>

    @Query("SELECT * FROM series WHERE isFavorite = 1 ORDER BY seriesId DESC")
    fun getFavoriteSeries(): Flow<List<SeriesEntity>>

    @Query("SELECT seriesId FROM series WHERE isFavorite = 1")
    suspend fun getFavoriteSeriesIds(): List<Int>

    @Query("UPDATE series SET isFavorite = 1 WHERE seriesId IN (:ids)")
    suspend fun markSeriesFavorites(ids: List<Int>)

    @Query("UPDATE series SET isFavorite = :isFav WHERE seriesId = :seriesId")
    suspend fun setSeriesFavorite(seriesId: Int, isFav: Boolean)

    @Query("SELECT COUNT(*) FROM series")
    suspend fun getSeriesCount(): Int

    @Query("SELECT COUNT(*) FROM series WHERE categoryId = :catId")
    suspend fun getSeriesCountByCategory(catId: String): Int

    @Query("SELECT * FROM series ORDER BY seriesId DESC LIMIT 15")
    fun getFeaturedSeries(): Flow<List<SeriesEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSeriesBatch(series: List<SeriesEntity>)

    @Query("DELETE FROM series")
    suspend fun clearSeries()

    // --- ATOMIC REPLACEMENT OPERATIONS (TRANSACTIONS) ---

    @Transaction
    suspend fun replaceLiveCatalog(categories: List<CategoryEntity>, channels: List<ChannelEntity>) {
        if (categories.isNotEmpty()) {
            clearCategoriesByType("live")
            categories.chunked(1000).forEach { insertCategoriesBatch(it) }
        }
        if (channels.isNotEmpty()) {
            clearChannels()
            channels.chunked(1000).forEach { insertChannelsBatch(it) }
        }
    }

    @Transaction
    suspend fun replaceVodCatalog(categories: List<CategoryEntity>, vods: List<VodEntity>) {
        if (categories.isNotEmpty()) {
            clearCategoriesByType("vod")
            categories.chunked(1000).forEach { insertCategoriesBatch(it) }
        }
        if (vods.isNotEmpty()) {
            clearVods()
            vods.chunked(1000).forEach { insertVodsBatch(it) }
        }
    }

    @Transaction
    suspend fun replaceSeriesCatalog(categories: List<CategoryEntity>, series: List<SeriesEntity>) {
        if (categories.isNotEmpty()) {
            clearCategoriesByType("series")
            categories.chunked(1000).forEach { insertCategoriesBatch(it) }
        }
        if (series.isNotEmpty()) {
            clearSeries()
            series.chunked(1000).forEach { insertSeriesBatch(it) }
        }
    }

    @Transaction
    suspend fun clearAllCatalogData() {
        clearCategoriesByType("live")
        clearCategoriesByType("vod")
        clearCategoriesByType("series")
        clearChannels()
        clearVods()
        clearSeries()
    }
}
