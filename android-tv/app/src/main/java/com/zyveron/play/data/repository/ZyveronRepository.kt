package com.zyveron.play.data.repository

import android.content.Context
import android.util.Log
import android.util.LruCache
import com.zyveron.play.data.local.CategoryEntity
import com.zyveron.play.data.local.ChannelDao
import com.zyveron.play.data.local.ChannelEntity
import com.zyveron.play.data.local.EpisodeItem
import com.zyveron.play.data.local.SeasonEpisodes
import com.zyveron.play.data.local.SeriesEntity
import com.zyveron.play.data.local.VodEntity
import com.zyveron.play.data.local.ZyveronDatabase
import com.zyveron.play.data.model.EpgProgram
import com.zyveron.play.util.ContentSafetyFilter
import com.zyveron.play.util.EpgHelper
import com.zyveron.play.util.NetworkSecurityHelper
import com.zyveron.play.util.SettingsHelper
import com.zyveron.play.util.UrlHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class ZyveronRepository(private val context: Context) {

    private val channelDao: ChannelDao = ZyveronDatabase.getInstance(context).channelDao()
    private val prefs = context.getSharedPreferences("zyveron_vod_progress", Context.MODE_PRIVATE)
    private val client = NetworkSecurityHelper.createUnsafeOkHttpClient(connectTimeoutSec = 20, readTimeoutSec = 60)

    // Cache em memória de EPG com capacidade para 150 canais (evita requisições repetidas no zapping)
    private val epgCache = object : LruCache<Int, Pair<Long, List<EpgProgram>>>(150) {}

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

    suspend fun toggleFavorite(channel: ChannelEntity) = withContext(Dispatchers.IO) {
        channelDao.setChannelFavorite(channel.streamId, !channel.isFavorite)
    }

    suspend fun toggleChannelFavorite(channel: ChannelEntity) = withContext(Dispatchers.IO) {
        channelDao.setChannelFavorite(channel.streamId, !channel.isFavorite)
    }

    // --- GUIA DE PROGRAMAÇÃO (EPG) ---
    fun clearEpgCache() {
        epgCache.evictAll()
    }

    /**
     * Busca o guia de programação (EPG) do canal sob demanda via Xtream API.
     * Utiliza cache em memória de 10 minutos para garantir fluidez no controle remoto (zapping instantâneo).
     */
    suspend fun getChannelEpg(
        serverDns: String,
        username: String,
        password: String,
        streamId: Int,
        forceRefresh: Boolean = false
    ): List<EpgProgram> = withContext(Dispatchers.IO) {
        if (streamId <= 0 || serverDns.isBlank() || username.isBlank()) {
            return@withContext emptyList()
        }

        val now = System.currentTimeMillis()
        val cached = epgCache.get(streamId)
        if (!forceRefresh && cached != null && (now - cached.first) < 10 * 60 * 1000L) {
            return@withContext cached.second
        }

        val cleanDns = UrlHelper.normalizeUrl(serverDns)
        val encUser = java.net.URLEncoder.encode(username.trim(), "UTF-8")
        val encPass = java.net.URLEncoder.encode(password.trim(), "UTF-8")

        // 1. Tenta endpoint padrão leve de EPG rápido
        val shortEpgUrl = "$cleanDns/player_api.php?username=$encUser&password=$encPass&action=get_short_epg&stream_id=$streamId&limit=6"
        var programs = tryFetchEpg(shortEpgUrl)

        // 2. Fallback para tabela simples caso get_short_epg não retorne dados
        if (programs.isEmpty()) {
            val tableEpgUrl = "$cleanDns/player_api.php?username=$encUser&password=$encPass&action=get_simple_data_table&stream_id=$streamId"
            programs = tryFetchEpg(tableEpgUrl)
        }

        // Armazena no cache LRU em memória
        epgCache.put(streamId, Pair(now, programs))
        programs
    }

    private fun tryFetchEpg(url: String): List<EpgProgram> {
        return try {
            val request = Request.Builder().url(url).build()
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val bodyStr = response.body?.string().orEmpty()
                    EpgHelper.parseEpgJson(bodyStr)
                } else {
                    emptyList()
                }
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    // --- FILMES (VOD) ---
    fun getVodCategories(): Flow<List<CategoryEntity>> = channelDao.getCategoriesByType("vod")

    fun getAllVods(): Flow<List<VodEntity>> = channelDao.getAllVods()

    fun getFavoriteVods(): Flow<List<VodEntity>> = channelDao.getFavoriteVods()

    fun getVodsByCategory(categoryId: String): Flow<List<VodEntity>> =
        channelDao.getVodsByCategory(categoryId)

    fun getFeaturedVods(): Flow<List<VodEntity>> = channelDao.getFeaturedVods()

    suspend fun toggleVodFavorite(vod: VodEntity) = withContext(Dispatchers.IO) {
        channelDao.setVodFavorite(vod.streamId, !vod.isFavorite)
    }

    suspend fun getVodCount(): Int {
        val count = channelDao.getVodCount()
        _vodCount.value = count
        return count
    }

    // --- PROGRESSO DE REPRODUÇÃO (VOD / FILMES / SÉRIES) ---
    fun saveVodProgress(contentId: String, positionMs: Long) {
        if (positionMs > 5000) {
            prefs.edit().putLong("vod_$contentId", positionMs).apply()
        }
    }

    fun getVodProgress(contentId: String): Long {
        return prefs.getLong("vod_$contentId", 0L)
    }

    fun clearVodProgress(contentId: String) {
        prefs.edit().remove("vod_$contentId").apply()
    }

    fun saveVodProgress(streamId: Int, positionMs: Long) = saveVodProgress(streamId.toString(), positionMs)
    fun getVodProgress(streamId: Int): Long = getVodProgress(streamId.toString())
    fun clearVodProgress(streamId: Int) = clearVodProgress(streamId.toString())

    // --- SÉRIES ---
    fun getSeriesCategories(): Flow<List<CategoryEntity>> = channelDao.getCategoriesByType("series")

    fun getAllSeries(): Flow<List<SeriesEntity>> = channelDao.getAllSeries()

    fun getFavoriteSeries(): Flow<List<SeriesEntity>> = channelDao.getFavoriteSeries()

    fun getSeriesByCategory(categoryId: String): Flow<List<SeriesEntity>> =
        channelDao.getSeriesByCategory(categoryId)

    fun getFeaturedSeries(): Flow<List<SeriesEntity>> = channelDao.getFeaturedSeries()

    suspend fun toggleSeriesFavorite(series: SeriesEntity) = withContext(Dispatchers.IO) {
        channelDao.setSeriesFavorite(series.seriesId, !series.isFavorite)
    }

    suspend fun getSeriesCount(): Int {
        val count = channelDao.getSeriesCount()
        _seriesCount.value = count
        return count
    }

    // --- GERADORES DE URL ---
    fun buildLiveStreamUrl(
        serverDns: String,
        username: String,
        password: String,
        streamId: Int,
        protocol: String? = null
    ): String {
        val prot = protocol ?: SettingsHelper.getLiveProtocol(context)
        return UrlHelper.buildLiveStreamUrl(serverDns, username, password, streamId, prot)
    }

    fun buildVodStreamUrl(serverDns: String, username: String, password: String, streamId: Int, containerExt: String = "mp4"): String =
        UrlHelper.buildVodStreamUrl(serverDns, username, password, streamId, containerExt)

    private val syncMutex = Mutex()

    fun buildSeriesStreamUrl(serverDns: String, username: String, password: String, episodeId: String, containerExt: String = "mp4"): String =
        UrlHelper.buildSeriesStreamUrl(serverDns, username, password, episodeId, containerExt)

    /**
     * Limpa completamente o banco de dados e contagens (usado para alternar playlists).
     */
    suspend fun clearAllCatalog() = withContext(Dispatchers.IO) {
        channelDao.clearAllCatalogData()
        _liveCount.value = 0
        _vodCount.value = 0
        _seriesCount.value = 0
        clearEpgCache()
        Log.d("ZyveronRepo", "Catálogo local completamente zerado para nova playlist.")
    }

    /**
     * Sincronização completa e segura de Canais, Filmes e Séries (com preservação estrita de cache)
     */
    suspend fun syncXtreamCatalog(
        serverDns: String,
        username: String,
        password: String,
        forceClearFirst: Boolean = false
    ): Result<Int> = withContext(Dispatchers.IO) {
        if (!syncMutex.tryLock()) {
            Log.w("ZyveronRepo", "Sincronização já em execução. Aguardando liberação.")
            return@withContext Result.success(channelDao.getChannelCount())
        }
        try {
            val cleanDns = UrlHelper.normalizeUrl(serverDns)
            val cleanUser = username.trim()
            val cleanPass = password.trim()

            if (cleanDns.isBlank() || cleanUser.isBlank()) {
                Log.w("ZyveronRepo", "DNS ou usuário ausente para sincronização.")
                return@withContext Result.failure(IllegalArgumentException("DNS ou usuário não configurado"))
            }

            Log.d("ZyveronRepo", "Iniciando sincronização de catálogo em $cleanDns (forceClear=$forceClearFirst)...")
            clearEpgCache()

            if (forceClearFirst) {
                channelDao.clearAllCatalogData()
                _liveCount.value = 0
                _vodCount.value = 0
                _seriesCount.value = 0
            }

            // 1. SINCRONIZA CANAIS AO VIVO COM ATUALIZAÇÃO IMEDIATA DA UI
            var liveError: Throwable? = null
            try {
                syncLiveStreams(cleanDns, cleanUser, cleanPass)
                val currentLive = channelDao.getChannelCount()
                _liveCount.value = currentLive
                Log.d("ZyveronRepo", "Live channels sincronizados: $currentLive canais disponíveis imediatamente na UI.")
            } catch (t: Throwable) {
                liveError = t
                Log.e("ZyveronRepo", "Falha na sincronização de Canais: ${t.message}", t)
            }

            // 2. SINCRONIZA FILMES (VOD) COM ATUALIZAÇÃO IMEDIATA DA UI
            try {
                syncVodStreams(cleanDns, cleanUser, cleanPass)
                val currentVod = channelDao.getVodCount()
                _vodCount.value = currentVod
                Log.d("ZyveronRepo", "VODs sincronizados: $currentVod filmes disponíveis imediatamente na UI.")
            } catch (t: Throwable) {
                Log.e("ZyveronRepo", "Falha na sincronização de VODs: ${t.message}", t)
            }

            // 3. SINCRONIZA SÉRIES COM ATUALIZAÇÃO IMEDIATA DA UI
            try {
                syncSeriesStreams(cleanDns, cleanUser, cleanPass)
                val currentSeries = channelDao.getSeriesCount()
                _seriesCount.value = currentSeries
                Log.d("ZyveronRepo", "Séries sincronizadas: $currentSeries séries disponíveis imediatamente na UI.")
            } catch (t: Throwable) {
                Log.e("ZyveronRepo", "Falha na sincronização de Séries: ${t.message}", t)
            }

            val totalChannels = channelDao.getChannelCount()
            _liveCount.value = totalChannels
            _vodCount.value = channelDao.getVodCount()
            _seriesCount.value = channelDao.getSeriesCount()

            Log.d("ZyveronRepo", "Sincronização concluída: ${_liveCount.value} canais, ${_vodCount.value} filmes, ${_seriesCount.value} séries.")

            if (totalChannels == 0 && liveError != null) {
                Result.failure(liveError)
            } else {
                Result.success(totalChannels)
            }
        } catch (t: Throwable) {
            Log.e("ZyveronRepo", "Erro na sincronização de catálogo", t)
            Result.failure(t)
        } finally {
            syncMutex.unlock()
        }
    }

    private suspend fun syncLiveStreams(cleanDns: String, username: String, password: String) {
        val savedFavoriteIds = try { channelDao.getFavoriteStreamIds() } catch (_: Throwable) { emptyList() }
        val encUser = java.net.URLEncoder.encode(username.trim(), "UTF-8")
        val encPass = java.net.URLEncoder.encode(password.trim(), "UTF-8")

        // Categorias Live
        val parsedCategories = mutableListOf<CategoryEntity>()
        try {
            val catUrl = "$cleanDns/player_api.php?username=$encUser&password=$encPass&action=get_live_categories"
            client.newCall(Request.Builder().url(catUrl).build()).execute().use { response ->
                if (response.isSuccessful) {
                    val bodyStr = response.body?.string().orEmpty().trim()
                    if (bodyStr.startsWith("[")) {
                        val json = JSONArray(bodyStr)
                        for (i in 0 until json.length()) {
                            val item = json.getJSONObject(i)
                            val catName = item.optString("category_name", "Geral")
                            if (ContentSafetyFilter.isSafe(catName)) {
                                parsedCategories.add(
                                    CategoryEntity(
                                        categoryId = item.optString("category_id", "$i"),
                                        categoryName = catName,
                                        parentId = item.optInt("parent_id", 0),
                                        type = "live"
                                    )
                                )
                            }
                        }
                    }
                }
            }
        } catch (t: Throwable) {
            Log.w("ZyveronRepo", "Erro ao buscar categorias de canais: ${t.message}")
        }

        // Streams Live
        val parsedChannels = mutableListOf<ChannelEntity>()
        var authErrorMsg: String? = null
        try {
            val liveUrl = "$cleanDns/player_api.php?username=$encUser&password=$encPass&action=get_live_streams"
            client.newCall(Request.Builder().url(liveUrl).build()).execute().use { response ->
                if (response.isSuccessful) {
                    val bodyStr = response.body?.string().orEmpty().trim()
                    if (bodyStr.startsWith("[")) {
                        val json = JSONArray(bodyStr)
                        for (i in 0 until json.length()) {
                            val item = json.getJSONObject(i)
                            val name = item.optString("name", "Canal $i")
                            if (ContentSafetyFilter.isSafe(name)) {
                                parsedChannels.add(
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
                        }
                    } else if (bodyStr.startsWith("{")) {
                        try {
                            val jsonObj = JSONObject(bodyStr)
                            val userInfo = jsonObj.optJSONObject("user_info")
                            val auth = userInfo?.optInt("auth", 1) ?: 1
                            if (auth == 0) {
                                val status = userInfo?.optString("status") ?: "Desativado"
                                val msg = userInfo?.optString("message").takeIf { !it.isNullOrBlank() } ?: "Conta ou senha rejeitada pelo servidor ($status)"
                                authErrorMsg = msg
                            }
                        } catch (_: Throwable) {}
                    }
                } else {
                    authErrorMsg = "Servidor retornou erro HTTP ${response.code}"
                }
            }
        } catch (t: Throwable) {
            Log.w("ZyveronRepo", "Erro ao buscar canais ao vivo: ${t.message}")
            throw t
        }

        if (authErrorMsg != null) {
            throw IllegalStateException(authErrorMsg)
        }

        // ATUALIZAÇÃO ATÔMICA APENAS SE HOUVER DADOS VÁLIDOS
        if (parsedChannels.isNotEmpty()) {
            channelDao.replaceLiveCatalog(parsedCategories, parsedChannels)
            if (savedFavoriteIds.isNotEmpty()) {
                try { channelDao.markFavorites(savedFavoriteIds) } catch (_: Throwable) {}
            }
            Log.d("ZyveronRepo", "Atualizados ${parsedChannels.size} canais e ${parsedCategories.size} categorias com sucesso.")
        } else {
            Log.w("ZyveronRepo", "Nenhum canal ao vivo retornado pela API. Mantendo catálogo anterior para evitar lista zerada.")
        }
    }

    private suspend fun syncVodStreams(cleanDns: String, username: String, password: String) {
        val savedFavoriteVodIds = try { channelDao.getFavoriteVodIds() } catch (_: Throwable) { emptyList() }
        val encUser = java.net.URLEncoder.encode(username.trim(), "UTF-8")
        val encPass = java.net.URLEncoder.encode(password.trim(), "UTF-8")

        // Categorias VOD
        val parsedCategories = mutableListOf<CategoryEntity>()
        try {
            val catUrl = "$cleanDns/player_api.php?username=$encUser&password=$encPass&action=get_vod_categories"
            client.newCall(Request.Builder().url(catUrl).build()).execute().use { response ->
                if (response.isSuccessful) {
                    val bodyStr = response.body?.string().orEmpty().trim()
                    if (bodyStr.startsWith("[")) {
                        val json = JSONArray(bodyStr)
                        for (i in 0 until json.length()) {
                            val item = json.getJSONObject(i)
                            val catName = item.optString("category_name", "Filmes")
                            if (ContentSafetyFilter.isSafe(catName)) {
                                parsedCategories.add(
                                    CategoryEntity(
                                        categoryId = item.optString("category_id", "$i"),
                                        categoryName = catName,
                                        parentId = item.optInt("parent_id", 0),
                                        type = "vod"
                                    )
                                )
                            }
                        }
                    }
                }
            }
        } catch (t: Throwable) {
            Log.w("ZyveronRepo", "Erro ao buscar categorias de VOD: ${t.message}")
        }

        // Filmes VOD
        val parsedVods = mutableListOf<VodEntity>()
        try {
            val vodUrl = "$cleanDns/player_api.php?username=$encUser&password=$encPass&action=get_vod_streams"
            client.newCall(Request.Builder().url(vodUrl).build()).execute().use { response ->
                if (response.isSuccessful) {
                    val bodyStr = response.body?.string().orEmpty().trim()
                    if (bodyStr.startsWith("[")) {
                        val json = JSONArray(bodyStr)
                        for (i in 0 until json.length()) {
                            val item = json.getJSONObject(i)
                            val name = item.optString("name", "Filme $i")
                            if (ContentSafetyFilter.isSafe(name)) {
                                parsedVods.add(
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
                        }
                    }
                }
            }
        } catch (t: Throwable) {
            Log.w("ZyveronRepo", "Erro ao buscar filmes VOD: ${t.message}")
        }

        // ATUALIZAÇÃO ATÔMICA APENAS SE HOUVER DADOS VÁLIDOS
        if (parsedVods.isNotEmpty()) {
            channelDao.replaceVodCatalog(parsedCategories, parsedVods)
            if (savedFavoriteVodIds.isNotEmpty()) {
                try { channelDao.markVodFavorites(savedFavoriteVodIds) } catch (_: Throwable) {}
            }
            Log.d("ZyveronRepo", "Atualizados ${parsedVods.size} filmes e ${parsedCategories.size} categorias de VOD com sucesso.")
        } else {
            Log.w("ZyveronRepo", "Nenhum filme retornado pela API. Mantendo filmes anteriores no banco.")
        }
    }

    private suspend fun syncSeriesStreams(cleanDns: String, username: String, password: String) {
        val savedFavoriteSeriesIds = try { channelDao.getFavoriteSeriesIds() } catch (_: Throwable) { emptyList() }
        val encUser = java.net.URLEncoder.encode(username.trim(), "UTF-8")
        val encPass = java.net.URLEncoder.encode(password.trim(), "UTF-8")

        // Categorias Séries
        val parsedCategories = mutableListOf<CategoryEntity>()
        try {
            val catUrl = "$cleanDns/player_api.php?username=$encUser&password=$encPass&action=get_series_categories"
            client.newCall(Request.Builder().url(catUrl).build()).execute().use { response ->
                if (response.isSuccessful) {
                    val bodyStr = response.body?.string().orEmpty().trim()
                    if (bodyStr.startsWith("[")) {
                        val json = JSONArray(bodyStr)
                        for (i in 0 until json.length()) {
                            val item = json.getJSONObject(i)
                            val catName = item.optString("category_name", "Séries")
                            if (ContentSafetyFilter.isSafe(catName)) {
                                parsedCategories.add(
                                    CategoryEntity(
                                        categoryId = item.optString("category_id", "$i"),
                                        categoryName = catName,
                                        parentId = item.optInt("parent_id", 0),
                                        type = "series"
                                    )
                                )
                            }
                        }
                    }
                }
            }
        } catch (t: Throwable) {
            Log.w("ZyveronRepo", "Erro ao buscar categorias de séries: ${t.message}")
        }

        // Séries
        val parsedSeries = mutableListOf<SeriesEntity>()
        try {
            val seriesUrl = "$cleanDns/player_api.php?username=$encUser&password=$encPass&action=get_series"
            client.newCall(Request.Builder().url(seriesUrl).build()).execute().use { response ->
                if (response.isSuccessful) {
                    val bodyStr = response.body?.string().orEmpty().trim()
                    if (bodyStr.startsWith("[")) {
                        val json = JSONArray(bodyStr)
                        for (i in 0 until json.length()) {
                            val item = json.getJSONObject(i)
                            val name = item.optString("name", "Série $i")
                            if (ContentSafetyFilter.isSafe(name)) {
                                parsedSeries.add(
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
                        }
                    }
                }
            }
        } catch (t: Throwable) {
            Log.w("ZyveronRepo", "Erro ao buscar séries: ${t.message}")
        }

        // ATUALIZAÇÃO ATÔMICA APENAS SE HOUVER DADOS VÁLIDOS
        if (parsedSeries.isNotEmpty()) {
            channelDao.replaceSeriesCatalog(parsedCategories, parsedSeries)
            if (savedFavoriteSeriesIds.isNotEmpty()) {
                try { channelDao.markSeriesFavorites(savedFavoriteSeriesIds) } catch (_: Throwable) {}
            }
            Log.d("ZyveronRepo", "Atualizadas ${parsedSeries.size} séries e ${parsedCategories.size} categorias de séries com sucesso.")
        } else {
            Log.w("ZyveronRepo", "Nenhum série retornada pela API. Mantendo séries anteriores no banco.")
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
            val encUser = java.net.URLEncoder.encode(username.trim(), "UTF-8")
            val encPass = java.net.URLEncoder.encode(password.trim(), "UTF-8")
            val url = "$cleanDns/player_api.php?username=$encUser&password=$encPass&action=get_series_info&series_id=$seriesId"
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
