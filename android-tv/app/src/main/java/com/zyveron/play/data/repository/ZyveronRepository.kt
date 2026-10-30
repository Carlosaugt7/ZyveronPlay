package com.zyveron.play.data.repository

import android.content.Context
import android.util.Log
import com.zyveron.play.data.local.CategoryEntity
import com.zyveron.play.data.local.ChannelDao
import com.zyveron.play.data.local.ChannelEntity
import com.zyveron.play.data.local.EpisodeItem
import com.zyveron.play.data.local.SeasonEpisodes
import com.zyveron.play.data.local.SeriesEntity
import com.zyveron.play.data.local.VodEntity
import com.zyveron.play.data.local.ZyveronDatabase
import com.zyveron.play.util.ContentSafetyFilter
import com.zyveron.play.util.UrlHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class ZyveronRepository(context: Context) {

    private val channelDao: ChannelDao = ZyveronDatabase.getInstance(context).channelDao()
    private val client = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(25, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    private val _liveCount = MutableStateFlow(0)
    val liveCount: StateFlow<Int> = _liveCount.asStateFlow()

    private val _vodCount = MutableStateFlow(0)
    val vodCount: StateFlow<Int> = _vodCount.asStateFlow()

    private val _seriesCount = MutableStateFlow(0)
    val seriesCount: StateFlow<Int> = _seriesCount.asStateFlow()

    private val repoScope = CoroutineScope(Dispatchers.IO)

    init {
        repoScope.launch {
            try {
                _liveCount.value = channelDao.getChannelCount()
                _vodCount.value = channelDao.getVodCount()
                _seriesCount.value = channelDao.getSeriesCount()
            } catch (_: Exception) {}
        }
    }

    // --- CANAIS AO VIVO ---
    fun getCategories(): Flow<List<CategoryEntity>> = channelDao.getCategoriesByType("live")

    fun getAllChannels(): Flow<List<ChannelEntity>> = channelDao.getAllChannels()

    fun getChannelsByCategory(categoryId: String): Flow<List<ChannelEntity>> =
        channelDao.getChannelsByCategory(categoryId)

    fun getFavorites(): Flow<List<ChannelEntity>> = channelDao.getFavoriteChannels()

    fun getSportsChannels(): Flow<List<ChannelEntity>> = channelDao.getSportsChannels()

    suspend fun getChannelCount(): Int {
        val count = channelDao.getChannelCount()
        _liveCount.value = count
        return count
    }

    suspend fun searchChannels(query: String): List<ChannelEntity> =
        channelDao.searchChannels(query)

    suspend fun toggleFavorite(channel: ChannelEntity) {
        channelDao.updateChannel(channel.copy(isFavorite = !channel.isFavorite))
    }

    // --- FILMES (VOD) ---
    fun getVodCategories(): Flow<List<CategoryEntity>> = channelDao.getCategoriesByType("vod")

    fun getAllVods(): Flow<List<VodEntity>> = channelDao.getAllVods()

    fun getVodsByCategory(categoryId: String): Flow<List<VodEntity>> =
        channelDao.getVodsByCategory(categoryId)

    fun getFeaturedVods(): Flow<List<VodEntity>> = channelDao.getFeaturedVods()

    suspend fun getVodCount(): Int {
        val count = channelDao.getVodCount()
        _vodCount.value = count
        return count
    }

    // --- SÉRIES ---
    fun getSeriesCategories(): Flow<List<CategoryEntity>> = channelDao.getCategoriesByType("series")

    fun getAllSeries(): Flow<List<SeriesEntity>> = channelDao.getAllSeries()

    fun getSeriesByCategory(categoryId: String): Flow<List<SeriesEntity>> =
        channelDao.getSeriesByCategory(categoryId)

    fun getFeaturedSeries(): Flow<List<SeriesEntity>> = channelDao.getFeaturedSeries()

    suspend fun getSeriesCount(): Int {
        val count = channelDao.getSeriesCount()
        _seriesCount.value = count
        return count
    }

    // --- GERADORES DE URL ---
    fun buildLiveStreamUrl(serverDns: String, username: String, password: String, streamId: Int): String {
        val cleanDns = UrlHelper.normalizeUrl(serverDns)
        return if (cleanDns.isNotBlank()) "$cleanDns/live/$username/$password/$streamId.ts" else ""
    }

    fun buildVodStreamUrl(serverDns: String, username: String, password: String, streamId: Int, containerExt: String = "mp4"): String {
        val cleanDns = UrlHelper.normalizeUrl(serverDns)
        val ext = containerExt.ifBlank { "mp4" }
        return if (cleanDns.isNotBlank()) "$cleanDns/movie/$username/$password/$streamId.$ext" else ""
    }

    fun buildSeriesStreamUrl(serverDns: String, username: String, password: String, episodeId: String, containerExt: String = "mp4"): String {
        val cleanDns = UrlHelper.normalizeUrl(serverDns)
        val ext = containerExt.ifBlank { "mp4" }
        return if (cleanDns.isNotBlank()) "$cleanDns/series/$username/$password/$episodeId.$ext" else ""
    }

    /**
     * Sincronização completa de Canais, Filmes e Séries (com filtro estrito contra conteúdo adulto)
     */
    suspend fun syncXtreamCatalog(
        serverDns: String,
        username: String,
        password: String
    ): Result<Int> = withContext(Dispatchers.IO) {
        try {
            val cleanDns = UrlHelper.normalizeUrl(serverDns)
            if (cleanDns.isBlank() || username.isBlank()) {
                Log.w("ZyveronRepo", "DNS ou usuário ausente para sincronização.")
                return@withContext Result.failure(IllegalArgumentException("DNS ou usuário não configurado"))
            }

            Log.d("ZyveronRepo", "Iniciando sincronização completa de catálogo em $cleanDns...")

            // 1. SINCRONIZA CANAIS AO VIVO
            syncLiveStreams(cleanDns, username, password)

            // 2. SINCRONIZA FILMES (VOD)
            try {
                syncVodStreams(cleanDns, username, password)
            } catch (e: Exception) {
                Log.w("ZyveronRepo", "Aviso: falha na sincronização de VODs: ${e.message}")
            }

            // 3. SINCRONIZA SÉRIES
            try {
                syncSeriesStreams(cleanDns, username, password)
            } catch (e: Exception) {
                Log.w("ZyveronRepo", "Aviso: falha na sincronização de Séries: ${e.message}")
            }

            val totalChannels = channelDao.getChannelCount()
            _liveCount.value = totalChannels
            _vodCount.value = channelDao.getVodCount()
            _seriesCount.value = channelDao.getSeriesCount()

            Log.d("ZyveronRepo", "Sincronização concluída: ${_liveCount.value} canais, ${_vodCount.value} filmes, ${_seriesCount.value} séries.")
            Result.success(totalChannels)
        } catch (e: Exception) {
            Log.e("ZyveronRepo", "Erro na sincronização de catálogo", e)
            Result.failure(e)
        }
    }

    private suspend fun syncLiveStreams(cleanDns: String, username: String, password: String) {
        val savedFavoriteIds = try { channelDao.getFavoriteStreamIds() } catch (_: Exception) { emptyList() }

        // Categorias Live
        val catUrl = "$cleanDns/player_api.php?username=$username&password=$password&action=get_live_categories"
        val catRequest = Request.Builder().url(catUrl).build()
        client.newCall(catRequest).execute().use { response ->
            if (response.isSuccessful) {
                val json = JSONArray(response.body?.string() ?: "[]")
                val list = mutableListOf<CategoryEntity>()
                for (i in 0 until json.length()) {
                    val item = json.getJSONObject(i)
                    val catName = item.optString("category_name", "Geral")
                    if (ContentSafetyFilter.isSafe(catName)) {
                        list.add(
                            CategoryEntity(
                                categoryId = item.optString("category_id", "$i"),
                                categoryName = catName,
                                parentId = item.optInt("parent_id", 0),
                                type = "live"
                            )
                        )
                    }
                }
                channelDao.clearCategoriesByType("live")
                channelDao.insertCategoriesBatch(list)
            }
        }

        // Streams Live
        val liveUrl = "$cleanDns/player_api.php?username=$username&password=$password&action=get_live_streams"
        val liveRequest = Request.Builder().url(liveUrl).build()
        client.newCall(liveRequest).execute().use { response ->
            if (response.isSuccessful) {
                val json = JSONArray(response.body?.string() ?: "[]")
                val list = mutableListOf<ChannelEntity>()
                for (i in 0 until json.length()) {
                    val item = json.getJSONObject(i)
                    val name = item.optString("name", "Canal $i")
                    if (ContentSafetyFilter.isSafe(name)) {
                        list.add(
                            ChannelEntity(
                                streamId = item.optInt("stream_id", i),
                                num = item.optInt("num", i + 1),
                                name = name,
                                streamIcon = item.optString("stream_icon").takeIf { it.isNotEmpty() },
                                epgChannelId = item.optString("epg_channel_id").takeIf { it.isNotEmpty() },
                                categoryId = item.optString("category_id", "0"),
                                isFavorite = false
                            )
                        )
                    }
                    if (list.size >= 1500) {
                        channelDao.insertChannelsBatch(list)
                        list.clear()
                    }
                }
                if (list.isNotEmpty()) {
                    channelDao.insertChannelsBatch(list)
                }
            }
        }

        if (savedFavoriteIds.isNotEmpty()) {
            try { channelDao.markFavorites(savedFavoriteIds) } catch (_: Exception) {}
        }
    }

    private suspend fun syncVodStreams(cleanDns: String, username: String, password: String) {
        // Categorias VOD
        val catUrl = "$cleanDns/player_api.php?username=$username&password=$password&action=get_vod_categories"
        client.newCall(Request.Builder().url(catUrl).build()).execute().use { response ->
            if (response.isSuccessful) {
                val json = JSONArray(response.body?.string() ?: "[]")
                val list = mutableListOf<CategoryEntity>()
                for (i in 0 until json.length()) {
                    val item = json.getJSONObject(i)
                    val catName = item.optString("category_name", "Filmes")
                    if (ContentSafetyFilter.isSafe(catName)) {
                        list.add(
                            CategoryEntity(
                                categoryId = item.optString("category_id", "$i"),
                                categoryName = catName,
                                parentId = item.optInt("parent_id", 0),
                                type = "vod"
                            )
                        )
                    }
                }
                channelDao.clearCategoriesByType("vod")
                channelDao.insertCategoriesBatch(list)
            }
        }

        // Filmes VOD
        val vodUrl = "$cleanDns/player_api.php?username=$username&password=$password&action=get_vod_streams"
        client.newCall(Request.Builder().url(vodUrl).build()).execute().use { response ->
            if (response.isSuccessful) {
                val json = JSONArray(response.body?.string() ?: "[]")
                val list = mutableListOf<VodEntity>()
                for (i in 0 until json.length()) {
                    val item = json.getJSONObject(i)
                    val name = item.optString("name", "Filme $i")
                    if (ContentSafetyFilter.isSafe(name)) {
                        list.add(
                            VodEntity(
                                streamId = item.optInt("stream_id", i),
                                num = item.optInt("num", i + 1),
                                name = name,
                                streamIcon = item.optString("stream_icon").takeIf { it.isNotEmpty() },
                                rating = item.optString("rating").takeIf { it.isNotEmpty() },
                                year = item.optString("year").takeIf { it.isNotEmpty() },
                                categoryId = item.optString("category_id", "0"),
                                containerExtension = item.optString("container_extension", "mp4")
                            )
                        )
                    }
                    if (list.size >= 1500) {
                        channelDao.insertVodsBatch(list)
                        list.clear()
                    }
                }
                if (list.isNotEmpty()) {
                    channelDao.insertVodsBatch(list)
                }
            }
        }
    }

    private suspend fun syncSeriesStreams(cleanDns: String, username: String, password: String) {
        // Categorias Séries
        val catUrl = "$cleanDns/player_api.php?username=$username&password=$password&action=get_series_categories"
        client.newCall(Request.Builder().url(catUrl).build()).execute().use { response ->
            if (response.isSuccessful) {
                val json = JSONArray(response.body?.string() ?: "[]")
                val list = mutableListOf<CategoryEntity>()
                for (i in 0 until json.length()) {
                    val item = json.getJSONObject(i)
                    val catName = item.optString("category_name", "Séries")
                    if (ContentSafetyFilter.isSafe(catName)) {
                        list.add(
                            CategoryEntity(
                                categoryId = item.optString("category_id", "$i"),
                                categoryName = catName,
                                parentId = item.optInt("parent_id", 0),
                                type = "series"
                            )
                        )
                    }
                }
                channelDao.clearCategoriesByType("series")
                channelDao.insertCategoriesBatch(list)
            }
        }

        // Séries
        val seriesUrl = "$cleanDns/player_api.php?username=$username&password=$password&action=get_series"
        client.newCall(Request.Builder().url(seriesUrl).build()).execute().use { response ->
            if (response.isSuccessful) {
                val json = JSONArray(response.body?.string() ?: "[]")
                val list = mutableListOf<SeriesEntity>()
                for (i in 0 until json.length()) {
                    val item = json.getJSONObject(i)
                    val name = item.optString("name", "Série $i")
                    if (ContentSafetyFilter.isSafe(name)) {
                        list.add(
                            SeriesEntity(
                                seriesId = item.optInt("series_id", i),
                                num = item.optInt("num", i + 1),
                                name = name,
                                cover = item.optString("cover").takeIf { it.isNotEmpty() },
                                plot = item.optString("plot").takeIf { it.isNotEmpty() },
                                cast = item.optString("cast").takeIf { it.isNotEmpty() },
                                rating = item.optString("rating").takeIf { it.isNotEmpty() },
                                year = item.optString("year").takeIf { it.isNotEmpty() },
                                genre = item.optString("genre").takeIf { it.isNotEmpty() },
                                categoryId = item.optString("category_id", "0")
                            )
                        )
                    }
                    if (list.size >= 1500) {
                        channelDao.insertSeriesBatch(list)
                        list.clear()
                    }
                }
                if (list.isNotEmpty()) {
                    channelDao.insertSeriesBatch(list)
                }
            }
        }
    }

    /**
     * Busca temporadas e episódios de uma série específica via Xtream API
     */
    suspend fun getSeriesSeasonsAndEpisodes(
        serverDns: String,
        username: String,
        password: String,
        seriesId: Int
    ): Result<List<SeasonEpisodes>> = withContext(Dispatchers.IO) {
        try {
            val cleanDns = UrlHelper.normalizeUrl(serverDns)
            val url = "$cleanDns/player_api.php?username=$username&password=$password&action=get_series_info&series_id=$seriesId"
            val request = Request.Builder().url(url).build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(Exception("HTTP ${response.code} ao obter episódios"))
                }

                val json = JSONObject(response.body?.string() ?: "{}")
                val episodesObj = json.optJSONObject("episodes") ?: JSONObject()
                val seasonsResult = mutableListOf<SeasonEpisodes>()

                val seasonKeys = episodesObj.keys()
                while (seasonKeys.hasNext()) {
                    val sKey = seasonKeys.next()
                    val sNum = sKey.toIntOrNull() ?: 1
                    val epArray = episodesObj.optJSONArray(sKey) ?: JSONArray()
                    val epList = mutableListOf<EpisodeItem>()

                    for (i in 0 until epArray.length()) {
                        val epObj = epArray.getJSONObject(i)
                        epList.add(
                            EpisodeItem(
                                id = epObj.optString("id", "${seriesId}_${sNum}_$i"),
                                episodeNum = epObj.optInt("episode_num", i + 1),
                                title = epObj.optString("title", "Episódio ${i + 1}"),
                                containerExtension = epObj.optString("container_extension", "mp4")
                            )
                        )
                    }

                    if (epList.isNotEmpty()) {
                        seasonsResult.add(SeasonEpisodes(seasonNumber = sNum, episodes = epList))
                    }
                }

                seasonsResult.sortBy { it.seasonNumber }
                Result.success(seasonsResult)
            }
        } catch (e: Exception) {
            Log.e("ZyveronRepo", "Erro ao carregar episódios da série $seriesId", e)
            Result.failure(e)
        }
    }
}
