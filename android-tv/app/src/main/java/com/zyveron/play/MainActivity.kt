package com.zyveron.play

import android.os.Bundle
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
import androidx.compose.runtime.setValue
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
    object Movies : AppScreen()
    data class MovieDetail(val vod: VodEntity) : AppScreen()
    data class MoviePlayer(val vod: VodEntity, val startPositionMs: Long = 0L) : AppScreen()
    object Series : AppScreen()
    data class SeriesDetail(val series: SeriesEntity) : AppScreen()
    data class SeriesEpisodePlayer(
        val episode: EpisodeItem,
        val series: SeriesEntity,
        val episodesList: List<EpisodeItem> = emptyList(),
        val currentEpisodeIndex: Int = 0,
        val startPositionMs: Long = 0L
    ) : AppScreen()
    object Accounts : AppScreen()
    object Settings : AppScreen()
}

class MainActivity : ComponentActivity() {

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
                currentScreen = AppScreen.MovieDetail(mp.vod)
            }
            is AppScreen.MovieDetail -> currentScreen = AppScreen.Movies
            is AppScreen.SeriesEpisodePlayer -> {
                val epState = currentScreen as AppScreen.SeriesEpisodePlayer
                currentScreen = AppScreen.SeriesDetail(epState.series)
            }
            is AppScreen.SeriesDetail -> currentScreen = AppScreen.Series
            is AppScreen.LiveTvGuide, AppScreen.Movies, AppScreen.Series, AppScreen.Accounts, AppScreen.Settings -> {
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
                val cleanDns = remember(state.serverDns) {
                    UrlHelper.normalizeUrl(state.serverDns)
                }

                var syncRetryTrigger by remember { mutableIntStateOf(0) }
                var isSyncing by remember { mutableStateOf(false) }

                // Sincroniza apenas no primeiro acesso (banco vazio) ou quando o usuário clica em "Recarregar"
                // Evita sobrecarregar a CPU e memória do Mi Stick na inicialização
                LaunchedEffect(cleanDns, state.username, syncRetryTrigger) {
                    if (cleanDns.isNotBlank() && state.username.isNotBlank()) {
                        val currentCount = repository.getChannelCount()
                        val shouldSync = currentCount == 0 || syncRetryTrigger > 0

                        if (shouldSync) {
                            isSyncing = true
                            val result = repository.syncXtreamCatalog(
                                serverDns = cleanDns,
                                username = state.username,
                                password = state.password
                            )
                            isSyncing = false
                            if (syncRetryTrigger > 0) {
                                if (result.isSuccess) {
                                    val total = result.getOrDefault(0)
                                    android.widget.Toast.makeText(context, "✅ Catálogo atualizado com sucesso! ($total canais)", android.widget.Toast.LENGTH_SHORT).show()
                                } else {
                                    android.widget.Toast.makeText(context, "⚠️ Falha ao atualizar: ${result.exceptionOrNull()?.message}", android.widget.Toast.LENGTH_LONG).show()
                                }
                            }
                        }
                    }
                }

                when (val screen = currentScreen) {
                    is AppScreen.Home -> {
                        HomeScreen(
                            repository = repository,
                            onNavigateLiveTv = { currentScreen = AppScreen.LiveTvGuide(false) },
                            onNavigateMovies = { currentScreen = AppScreen.Movies },
                            onNavigateSeries = { currentScreen = AppScreen.Series },
                            onNavigateSports = { currentScreen = AppScreen.LiveTvGuide(true) },
                            onNavigateAccounts = { currentScreen = AppScreen.Accounts },
                            onNavigateSettings = { currentScreen = AppScreen.Settings },
                            onRefreshCatalog = {
                                android.widget.Toast.makeText(context, "🔄 Atualizando canais, filmes e séries...", android.widget.Toast.LENGTH_SHORT).show()
                                syncRetryTrigger++
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
                            onSelectMovie = { vod -> currentScreen = AppScreen.MovieDetail(vod) },
                            onBack = { currentScreen = AppScreen.Home }
                        )
                    }

                    is AppScreen.MovieDetail -> {
                        MovieDetailScreen(
                            vod = screen.vod,
                            repository = repository,
                            onPlayMovie = { vod, startPos ->
                                currentScreen = AppScreen.MoviePlayer(vod, startPos)
                            },
                            onBack = { currentScreen = AppScreen.Movies }
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
                            onBack = { currentScreen = AppScreen.MovieDetail(screen.vod) }
                        )
                    }

                    is AppScreen.Series -> {
                        SeriesScreen(
                            repository = repository,
                            onSelectSeries = { series -> currentScreen = AppScreen.SeriesDetail(series) },
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
                                currentScreen = AppScreen.SeriesEpisodePlayer(ep, screen.series, epList, index)
                            },
                            onBackToSeries = { currentScreen = AppScreen.Series },
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
                                    currentScreen = AppScreen.SeriesEpisodePlayer(prevEp, screen.series, epList, epIndex - 1)
                                }
                            } else null,
                            onNextEpisode = if (hasNext) {
                                {
                                    val nextEp = epList[epIndex + 1]
                                    currentScreen = AppScreen.SeriesEpisodePlayer(nextEp, screen.series, epList, epIndex + 1)
                                }
                            } else null,
                            onSaveProgress = { pos, _ ->
                                repository.saveVodProgress(currentEp.id, pos)
                            },
                            onBack = { currentScreen = AppScreen.SeriesDetail(screen.series) }
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
                                deviceManager.switchPlaylist(idx)
                                syncRetryTrigger++
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
