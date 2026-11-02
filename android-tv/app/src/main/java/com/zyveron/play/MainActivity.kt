package com.zyveron.play

import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Text
import com.zyveron.play.data.local.ChannelEntity
import com.zyveron.play.data.local.EpisodeItem
import com.zyveron.play.data.local.SeriesEntity
import com.zyveron.play.data.local.VodEntity
import com.zyveron.play.data.remote.DeviceAuthState
import com.zyveron.play.data.remote.FirestoreDeviceManager
import com.zyveron.play.data.repository.ZyveronRepository
import com.zyveron.play.player.ZyveronPlayerManager
import com.zyveron.play.ui.accounts.AccountsScreen
import com.zyveron.play.ui.activation.ActivationScreen
import com.zyveron.play.ui.activation.BlockedOrExpiredScreen
import com.zyveron.play.ui.components.TvNotificationOverlay
import com.zyveron.play.ui.home.HomeScreen
import com.zyveron.play.ui.live.LivePlayerScreen
import com.zyveron.play.ui.live.LiveTvGuideScreen
import com.zyveron.play.ui.movies.MovieDetailScreen
import com.zyveron.play.ui.movies.MoviesScreen
import com.zyveron.play.ui.player.VodPlayerScreen
import com.zyveron.play.ui.series.SeriesDetailScreen
import com.zyveron.play.ui.series.SeriesScreen
import com.zyveron.play.ui.settings.SettingsScreen
import com.zyveron.play.ui.theme.AccentEmerald
import com.zyveron.play.ui.theme.AccentRose
import com.zyveron.play.ui.theme.AccentSky
import com.zyveron.play.ui.theme.BgCardDark
import com.zyveron.play.ui.theme.BgDeepDark
import com.zyveron.play.ui.theme.BgSurfaceDark
import com.zyveron.play.ui.theme.BorderDark
import com.zyveron.play.ui.theme.TextPrimary
import com.zyveron.play.ui.theme.TextSecondary
import com.zyveron.play.ui.theme.ZyveronTvTheme
import com.zyveron.play.util.UrlHelper

sealed class AppScreen {
    object Home : AppScreen()
    data class LiveTvGuide(
        val initialSports: Boolean = false,
        val initialCategoryId: String? = null,
        val initialChannelId: Int? = null
    ) : AppScreen()
    data class FullScreenPlayer(
        val channel: ChannelEntity,
        val playlist: List<ChannelEntity>,
        val categoryId: String? = null
    ) : AppScreen()
    data class Movies(
        val categoryId: String = "ALL",
        val vodId: Int? = null
    ) : AppScreen()
    data class MovieDetail(
        val vod: VodEntity,
        val categoryId: String = "ALL"
    ) : AppScreen()
    data class MoviePlayer(
        val vod: VodEntity,
        val startPositionMs: Long = 0L,
        val categoryId: String = "ALL"
    ) : AppScreen()
    data class Series(
        val categoryId: String = "ALL",
        val seriesId: Int? = null
    ) : AppScreen()
    data class SeriesDetail(
        val series: SeriesEntity,
        val categoryId: String = "ALL"
    ) : AppScreen()
    data class SeriesEpisodePlayer(
        val episode: EpisodeItem,
        val series: SeriesEntity,
        val episodesList: List<EpisodeItem> = emptyList(),
        val currentEpisodeIndex: Int = 0,
        val startPositionMs: Long = 0L,
        val categoryId: String = "ALL"
    ) : AppScreen()
    object Accounts : AppScreen()
    object Settings : AppScreen()
}

class MainActivity : ComponentActivity() {

    companion object {
        var onGlobalKeyDownListener: ((KeyEvent) -> Boolean)? = null
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_DOWN) {
            if (onGlobalKeyDownListener?.invoke(event) == true) {
                return true
            }
        }
        return super.dispatchKeyEvent(event)
    }

    private lateinit var deviceManager: FirestoreDeviceManager
    private lateinit var repository: ZyveronRepository
    private lateinit var playerManager: ZyveronPlayerManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        deviceManager = FirestoreDeviceManager(this)
        repository = ZyveronRepository(this)
        playerManager = ZyveronPlayerManager(this)

        deviceManager.startListening()

        setContent {
            ZyveronTvTheme {
                MainContent(
                    deviceManager = deviceManager,
                    repository = repository,
                    playerManager = playerManager,
                    onFinish = { finish() }
                )
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        deviceManager.stopListening()
        playerManager.release()
    }
}

@Composable
fun MainContent(
    deviceManager: FirestoreDeviceManager,
    repository: ZyveronRepository,
    playerManager: ZyveronPlayerManager,
    onFinish: () -> Unit
) {
    val authState by deviceManager.authState.collectAsState()
    val activeBroadcast by deviceManager.activeBroadcast.collectAsState()

    var currentScreen by remember { mutableStateOf<AppScreen>(AppScreen.Home) }

    // Interceptador Global do Botão BACK do Controle Remoto
    BackHandler(enabled = true) {
        when (currentScreen) {
            is AppScreen.FullScreenPlayer -> {
                val p = currentScreen as AppScreen.FullScreenPlayer
                currentScreen = AppScreen.LiveTvGuide(
                    initialSports = false,
                    initialCategoryId = p.categoryId,
                    initialChannelId = p.channel.streamId
                )
            }
            is AppScreen.MoviePlayer -> {
                val mp = currentScreen as AppScreen.MoviePlayer
                currentScreen = AppScreen.MovieDetail(mp.vod, mp.categoryId)
            }
            is AppScreen.MovieDetail -> {
                val md = currentScreen as AppScreen.MovieDetail
                currentScreen = AppScreen.Movies(md.categoryId, md.vod.streamId)
            }
            is AppScreen.SeriesEpisodePlayer -> {
                val epState = currentScreen as AppScreen.SeriesEpisodePlayer
                currentScreen = AppScreen.SeriesDetail(epState.series, epState.categoryId)
            }
            is AppScreen.SeriesDetail -> {
                val sd = currentScreen as AppScreen.SeriesDetail
                currentScreen = AppScreen.Series(sd.categoryId, sd.series.seriesId)
            }
            is AppScreen.LiveTvGuide, is AppScreen.Movies, is AppScreen.Series, AppScreen.Accounts, AppScreen.Settings -> {
                currentScreen = AppScreen.Home
            }
            AppScreen.Home -> onFinish()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDeepDark)
    ) {
        when (val state = authState) {
            is DeviceAuthState.Loading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Zyveron Play",
                        color = AccentEmerald,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            is DeviceAuthState.Unregistered -> {
                ActivationScreen(
                    mac = state.mac,
                    deviceKey = state.deviceKey,
                    onRetry = { deviceManager.checkStatusNow() },
                    onExit = onFinish
                )
            }

            is DeviceAuthState.Blocked -> {
                BlockedOrExpiredScreen(
                    mac = deviceManager.virtualMac,
                    title = "Aparelho Bloqueado",
                    message = state.reason,
                    isExpired = false,
                    onRetry = { deviceManager.checkStatusNow() },
                    onExit = onFinish
                )
            }

            is DeviceAuthState.Expired -> {
                BlockedOrExpiredScreen(
                    mac = deviceManager.virtualMac,
                    title = "Mensalidade Expirada",
                    message = "Sua assinatura venceu. Para continuar assistindo, regularize seu plano junto ao seu revendedor.",
                    isExpired = true,
                    onRetry = { deviceManager.checkStatusNow() },
                    onExit = onFinish
                )
            }

            is DeviceAuthState.Active -> {
                val context = androidx.compose.ui.platform.LocalContext.current
                val coroutineScope = rememberCoroutineScope()
                val cleanDns = remember(state.serverDns) {
                    UrlHelper.normalizeUrl(state.serverDns)
                }

                var isSyncing by remember { mutableStateOf(false) }

                fun performSync(isManual: Boolean, forceClear: Boolean = false) {
                    if (isSyncing) {
                        if (isManual) {
                            android.widget.Toast.makeText(context, "⏳ Atualização já em andamento. Aguarde...", android.widget.Toast.LENGTH_SHORT).show()
                        }
                        return
                    }
                    if (cleanDns.isBlank()) {
                        if (isManual) {
                            val listNum = state.activePlaylistIndex + 1
                            android.widget.Toast.makeText(context, "⚠️ Servidor DNS da Lista $listNum não configurado. Verifique no painel web.", android.widget.Toast.LENGTH_LONG).show()
                        }
                        return
                    }
                    if (state.username.isBlank()) {
                        if (isManual) {
                            android.widget.Toast.makeText(context, "⚠️ Usuário da conta não configurado. Verifique no painel web.", android.widget.Toast.LENGTH_LONG).show()
                        }
                        return
                    }

                    coroutineScope.launch {
                        isSyncing = true
                        try {
                            if (isManual) {
                                android.widget.Toast.makeText(context, "🔄 Atualizando canais, filmes e séries...", android.widget.Toast.LENGTH_SHORT).show()
                            }
                            val countBefore = repository.getChannelCount()
                            val result = repository.syncXtreamCatalog(
                                serverDns = cleanDns,
                                username = state.username,
                                password = state.password,
                                forceClearFirst = forceClear
                            )

                            if (isManual) {
                                if (result.isSuccess) {
                                    val total = result.getOrDefault(0)
                                    if (total > 0) {
                                        android.widget.Toast.makeText(context, "✅ Catálogo atualizado com sucesso! ($total canais)", android.widget.Toast.LENGTH_SHORT).show()
                                    } else if (countBefore > 0) {
                                        android.widget.Toast.makeText(context, "⚠️ Servidor retornou vazio. Mantendo catálogo em cache ($countBefore canais).", android.widget.Toast.LENGTH_LONG).show()
                                    } else {
                                        android.widget.Toast.makeText(context, "⚠️ Nenhum canal encontrado no servidor.", android.widget.Toast.LENGTH_SHORT).show()
                                    }
                                } else {
                                    val err = result.exceptionOrNull()?.message ?: "Erro de conexão"
                                    if (countBefore > 0) {
                                        android.widget.Toast.makeText(context, "⚠️ Falha ao atualizar: $err. Mantendo canais em cache ($countBefore canais).", android.widget.Toast.LENGTH_LONG).show()
                                    } else {
                                        android.widget.Toast.makeText(context, "⚠️ Falha ao atualizar: $err", android.widget.Toast.LENGTH_LONG).show()
                                    }
                                }
                            }
                        } catch (t: Throwable) {
                            Log.e("MainActivity", "Erro crítico durante sincronização", t)
                            if (isManual) {
                                android.widget.Toast.makeText(context, "⚠️ Erro: ${t.message ?: "Falha na sincronização"}", android.widget.Toast.LENGTH_LONG).show()
                            }
                        } finally {
                            isSyncing = false
                        }
                    }
                }

                // Sincroniza automaticamente apenas quando o banco estiver vazio para a lista atual
                LaunchedEffect(cleanDns, state.username, state.activePlaylistIndex) {
                    if (cleanDns.isNotBlank() && state.username.isNotBlank()) {
                        val currentCount = repository.getChannelCount()
                        if (currentCount == 0 && !isSyncing) {
                            performSync(isManual = false, forceClear = false)
                        }
                    }
                }

                when (val screen = currentScreen) {
                    is AppScreen.Home -> {
                        HomeScreen(
                            repository = repository,
                            onNavigateLiveTv = { currentScreen = AppScreen.LiveTvGuide(false) },
                            onNavigateMovies = { currentScreen = AppScreen.Movies() },
                            onNavigateSeries = { currentScreen = AppScreen.Series() },
                            onNavigateSports = { currentScreen = AppScreen.LiveTvGuide(true) },
                            onNavigateAccounts = { currentScreen = AppScreen.Accounts },
                            onNavigateSettings = { currentScreen = AppScreen.Settings },
                            onRefreshCatalog = {
                                performSync(isManual = true, forceClear = false)
                            },
                            onPlayVod = { vod -> currentScreen = AppScreen.MovieDetail(vod) },
                            onSelectSeries = { series -> currentScreen = AppScreen.SeriesDetail(series) },
                            isSyncing = isSyncing
                        )
                    }

                    is AppScreen.LiveTvGuide -> {
                        LiveTvGuideScreen(
                            repository = repository,
                            playerManager = playerManager,
                            serverDns = cleanDns,
                            username = state.username,
                            password = state.password,
                            initialFilterSports = screen.initialSports,
                            initialCategoryId = screen.initialCategoryId,
                            initialChannelId = screen.initialChannelId,
                            onOpenFullScreenPlayer = { channel, playlist, categoryId ->
                                currentScreen = AppScreen.FullScreenPlayer(channel, playlist, categoryId)
                            },
                            onBack = { currentScreen = AppScreen.Home }
                        )
                    }

                    is AppScreen.FullScreenPlayer -> {
                        val initialIndex = screen.playlist.indexOfFirst { it.streamId == screen.channel.streamId }
                        LivePlayerScreen(
                            repository = repository,
                            playerManager = playerManager,
                            channels = if (screen.playlist.isNotEmpty()) screen.playlist else listOf(screen.channel),
                            serverDns = cleanDns,
                            username = state.username,
                            password = state.password,
                            initialChannelIndex = if (initialIndex >= 0) initialIndex else 0,
                            onBack = {
                                currentScreen = AppScreen.LiveTvGuide(
                                    initialSports = false,
                                    initialCategoryId = screen.categoryId,
                                    initialChannelId = screen.channel.streamId
                                )
                            }
                        )
                    }

                    is AppScreen.Movies -> {
                        MoviesScreen(
                            repository = repository,
                            initialCategoryId = screen.categoryId,
                            initialVodId = screen.vodId,
                            onSelectMovie = { vod, catId -> currentScreen = AppScreen.MovieDetail(vod, catId) },
                            onBack = { currentScreen = AppScreen.Home }
                        )
                    }

                    is AppScreen.MovieDetail -> {
                        MovieDetailScreen(
                            vod = screen.vod,
                            repository = repository,
                            onPlayMovie = { vod, startPos ->
                                currentScreen = AppScreen.MoviePlayer(vod, startPos, screen.categoryId)
                            },
                            onBack = { currentScreen = AppScreen.Movies(screen.categoryId, screen.vod.streamId) }
                        )
                    }

                    is AppScreen.MoviePlayer -> {
                        val streamUrl = repository.buildVodStreamUrl(
                            serverDns = cleanDns,
                            username = state.username,
                            password = state.password,
                            streamId = screen.vod.streamId,
                            containerExt = screen.vod.containerExtension
                        )
                        VodPlayerScreen(
                            title = screen.vod.name,
                            streamUrl = streamUrl,
                            playerManager = playerManager,
                            startPositionMs = screen.startPositionMs,
                            onSaveProgress = { pos, _ ->
                                repository.saveVodProgress(screen.vod.streamId, pos)
                            },
                            onBack = { currentScreen = AppScreen.MovieDetail(screen.vod, screen.categoryId) }
                        )
                    }

                    is AppScreen.Series -> {
                        SeriesScreen(
                            repository = repository,
                            initialCategoryId = screen.categoryId,
                            initialSeriesId = screen.seriesId,
                            onSelectSeries = { series, catId -> currentScreen = AppScreen.SeriesDetail(series, catId) },
                            onBack = { currentScreen = AppScreen.Home }
                        )
                    }

                    is AppScreen.SeriesDetail -> {
                        SeriesDetailScreen(
                            series = screen.series,
                            repository = repository,
                            serverDns = cleanDns,
                            username = state.username,
                            password = state.password,
                            onPlayEpisode = { ep, epList, index ->
                                currentScreen = AppScreen.SeriesEpisodePlayer(ep, screen.series, epList, index, 0L, screen.categoryId)
                            },
                            onBackToSeries = { currentScreen = AppScreen.Series(screen.categoryId, screen.series.seriesId) },
                            onBackToHome = { currentScreen = AppScreen.Home }
                        )
                    }

                    is AppScreen.SeriesEpisodePlayer -> {
                        val epList = screen.episodesList
                        val epIndex = screen.currentEpisodeIndex
                        val currentEp = screen.episode
                        val hasPrev = epIndex > 0 && epList.isNotEmpty()
                        val hasNext = epIndex < epList.size - 1 && epList.isNotEmpty()

                        val streamUrl = repository.buildSeriesStreamUrl(
                            serverDns = cleanDns,
                            username = state.username,
                            password = state.password,
                            episodeId = currentEp.id,
                            containerExt = currentEp.containerExtension
                        )
                        val savedPos = repository.getVodProgress(currentEp.id)
                        VodPlayerScreen(
                            title = "${screen.series.name} • ${currentEp.title}",
                            streamUrl = streamUrl,
                            playerManager = playerManager,
                            startPositionMs = savedPos,
                            hasPreviousEpisode = hasPrev,
                            hasNextEpisode = hasNext,
                            onPreviousEpisode = if (hasPrev) {
                                {
                                    val prevEp = epList[epIndex - 1]
                                    currentScreen = AppScreen.SeriesEpisodePlayer(prevEp, screen.series, epList, epIndex - 1, 0L, screen.categoryId)
                                }
                            } else null,
                            onNextEpisode = if (hasNext) {
                                {
                                    val nextEp = epList[epIndex + 1]
                                    currentScreen = AppScreen.SeriesEpisodePlayer(nextEp, screen.series, epList, epIndex + 1, 0L, screen.categoryId)
                                }
                            } else null,
                            onSaveProgress = { pos, _ ->
                                repository.saveVodProgress(currentEp.id, pos)
                            },
                            onBack = { currentScreen = AppScreen.SeriesDetail(screen.series, screen.categoryId) }
                        )
                    }

                    is AppScreen.Accounts -> {
                        AccountsScreen(
                            serverName = state.serverName,
                            username = state.username,
                            mac = state.mac,
                            deviceKey = deviceManager.deviceKey,
                            expirationDate = state.expirationDate,
                            playlists = state.playlists,
                            activePlaylistIndex = state.activePlaylistIndex,
                            onSelectPlaylist = { idx ->
                                if (idx != state.activePlaylistIndex) {
                                    coroutineScope.launch {
                                        android.widget.Toast.makeText(context, "🔄 Alternando para Lista ${idx + 1}...", android.widget.Toast.LENGTH_SHORT).show()
                                        repository.clearAllCatalog()
                                        deviceManager.switchPlaylist(idx)
                                    }
                                }
                            },
                            onDisconnect = {
                                deviceManager.disconnectDevice {
                                    currentScreen = AppScreen.Home
                                }
                            },
                            onBack = { currentScreen = AppScreen.Home }
                        )
                    }

                    is AppScreen.Settings -> {
                        SettingsScreen(
                            mac = state.mac,
                            deviceKey = deviceManager.deviceKey,
                            expirationDate = state.expirationDate,
                            onBack = { currentScreen = AppScreen.Home }
                        )
                    }
                }
            }
        }

        // Overlay de avisos e notificações em tempo real na TV
        activeBroadcast?.let { broadcast ->
            TvNotificationOverlay(
                broadcast = broadcast,
                onDismiss = { deviceManager.dismissBroadcast() }
            )
        }
    }
}
