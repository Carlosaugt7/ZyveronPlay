package com.zyveron.play.data.repository

import android.content.Context
import android.util.Log
import com.zyveron.play.data.local.CategoryEntity
import com.zyveron.play.data.local.ChannelDao
import com.zyveron.play.data.local.ChannelEntity
import com.zyveron.play.data.local.ZyveronDatabase
import com.zyveron.play.util.UrlHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import java.util.concurrent.TimeUnit

class ZyveronRepository(context: Context) {

    private val channelDao: ChannelDao = ZyveronDatabase.getInstance(context).channelDao()
    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()

    // 1. Decisão 2.A: Exposição Cache-First imediata
    fun getCategories(): Flow<List<CategoryEntity>> = channelDao.getAllCategories()

    fun getAllChannels(): Flow<List<ChannelEntity>> = channelDao.getAllChannels()

    fun getChannelsByCategory(categoryId: String): Flow<List<ChannelEntity>> =
        channelDao.getChannelsByCategory(categoryId)

    fun getFavorites(): Flow<List<ChannelEntity>> = channelDao.getFavoriteChannels()

    suspend fun getChannelCount(): Int = channelDao.getChannelCount()

    suspend fun searchChannels(query: String): List<ChannelEntity> =
        channelDao.searchChannels(query)

    suspend fun toggleFavorite(channel: ChannelEntity) {
        channelDao.updateChannel(channel.copy(isFavorite = !channel.isFavorite))
    }

    /**
     * Gera URL de reprodução com base no DNS ativo e credenciais Xtream
     */
    fun buildLiveStreamUrl(
        serverDns: String,
        username: String,
        password: String,
        streamId: Int
    ): String {
        val cleanDns = UrlHelper.normalizeUrl(serverDns)
        return if (cleanDns.isNotBlank()) "$cleanDns/live/$username/$password/$streamId.ts" else ""
    }

    /**
     * Sincronização em background sem congelar o D-Pad
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

            Log.d("ZyveronRepo", "Iniciando sincronização diferencial do catálogo em $cleanDns...")

            // Salva IDs favoritos existentes antes da atualização
            val savedFavoriteIds = try {
                channelDao.getFavoriteStreamIds()
            } catch (e: Exception) {
                emptyList()
            }

            // 1. Busca Categorias
            val catUrl = "$cleanDns/player_api.php?username=$username&password=$password&action=get_live_categories"
            val catRequest = Request.Builder().url(catUrl).build()
            client.newCall(catRequest).execute().use { catResponse ->
                if (!catResponse.isSuccessful) {
                    return@withContext Result.failure(Exception("Falha na API Xtream (Categorias): HTTP ${catResponse.code}"))
                }

                val catJson = JSONArray(catResponse.body?.string() ?: "[]")
                val categoriesList = mutableListOf<CategoryEntity>()
                for (i in 0 until catJson.length()) {
                    val item = catJson.getJSONObject(i)
                    categoriesList.add(
                        CategoryEntity(
                            categoryId = item.optString("category_id", "$i"),
                            categoryName = item.optString("category_name", "Geral"),
                            parentId = item.optInt("parent_id", 0)
                        )
                    )
                }
                channelDao.insertCategoriesBatch(categoriesList)
            }

            // 2. Busca Canais Ao Vivo
            val liveUrl = "$cleanDns/player_api.php?username=$username&password=$password&action=get_live_streams"
            val liveRequest = Request.Builder().url(liveUrl).build()
            client.newCall(liveRequest).execute().use { liveResponse ->
                if (!liveResponse.isSuccessful) {
                    return@withContext Result.failure(Exception("Falha ao obter canais: HTTP ${liveResponse.code}"))
                }

                val liveJson = JSONArray(liveResponse.body?.string() ?: "[]")
                val channelsList = mutableListOf<ChannelEntity>()

                for (i in 0 until liveJson.length()) {
                    val item = liveJson.getJSONObject(i)
                    channelsList.add(
                        ChannelEntity(
                            streamId = item.optInt("stream_id", i),
                            num = item.optInt("num", i + 1),
                            name = item.optString("name", "Canal $i"),
                            streamIcon = item.optString("stream_icon").takeIf { it.isNotEmpty() },
                            epgChannelId = item.optString("epg_channel_id").takeIf { it.isNotEmpty() },
                            categoryId = item.optString("category_id", "0"),
                            isFavorite = false
                        )
                    )

                    // Inserção em lotes de 2.000 para manter o consumo de RAM ultra baixo
                    if (channelsList.size >= 2000) {
                        channelDao.insertChannelsBatch(channelsList)
                        channelsList.clear()
                    }
                }

                if (channelsList.isNotEmpty()) {
                    channelDao.insertChannelsBatch(channelsList)
                }
            }

            // Restaura favoritos salvos
            if (savedFavoriteIds.isNotEmpty()) {
                try {
                    channelDao.markFavorites(savedFavoriteIds)
                } catch (e: Exception) {
                    Log.w("ZyveronRepo", "Erro ao restaurar canais favoritos", e)
                }
            }

            val total = channelDao.getChannelCount()
            Log.d("ZyveronRepo", "Sincronização concluída com sucesso: $total canais gravados.")
            Result.success(total)
        } catch (e: Exception) {
            Log.e("ZyveronRepo", "Erro na sincronização de catálogo", e)
            Result.failure(e)
        }
    }
}

