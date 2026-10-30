package com.zyveron.play

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Border
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.Text
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
import com.zyveron.play.util.ContentSafetyFilter
import com.zyveron.play.util.UrlHelper
import java.net.URI

enum class ActiveScreen {
    HOME,
    LIVE_PLAYER,
    SPORTS_PLAYER,
    ACCOUNTS,
    SETTINGS
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
    val context = LocalContext.current
    val authState by deviceManager.authState.collectAsState()
    val activeBroadcast by deviceManager.activeBroadcast.collectAsState()

    // Cache-First local com canais observados do SQLite Room
    val localChannels by repository.getAllChannels().collectAsState(initial = emptyList())

    // Sub-navegação interna quando o dispositivo está ativo
    var currentScreen by remember { mutableStateOf(ActiveScreen.HOME) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDeepDark)
    ) {
        when (val state = authState) {
            is DeviceAuthState.Loading -> {
                // Splash de transição ultra-rápida
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
                val cleanDns = remember(state.serverDns) {
                    UrlHelper.normalizeUrl(state.serverDns)
                }

                val serverDisplayName = remember(cleanDns) {
                    try {
                        val host = URI(cleanDns).host
                        if (!host.isNullOrBlank()) host else "Zyveron Play"
                    } catch (_: Exception) {
                        "Zyveron Play"
                    }
                }

                var syncRetryTrigger by remember { mutableIntStateOf(0) }
                var isSyncing by remember { mutableStateOf(false) }
                var syncError by remember { mutableStateOf<String?>(null) }

                // Dispara sincronização do catálogo com o servidor Xtream
                LaunchedEffect(cleanDns, state.username, syncRetryTrigger) {
                    if (cleanDns.isNotBlank() && state.username.isNotBlank()) {
                        isSyncing = true
                        syncError = null
                        val result = repository.syncXtreamCatalog(
                            serverDns = cleanDns,
                            username = state.username,
                            password = state.password
                        )
                        isSyncing = false
                        if (result.isFailure) {
                            val err = result.exceptionOrNull()
                            syncError = err?.localizedMessage ?: "Falha ao conectar ao servidor IPTV."
                        }
                    }
                }

                if (localChannels.isEmpty()) {
                    // Tela de carregamento / sincronização inicial de canais
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(BgDeepDark),
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .width(560.dp)
                                .clip(RoundedCornerShape(20.dp))
                                .background(BgCardDark)
                                .border(1.dp, BorderDark, RoundedCornerShape(20.dp))
                                .padding(32.dp)
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.Center
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(36.dp)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(AccentEmerald.copy(alpha = 0.15f))
                                            .border(1.dp, AccentEmerald.copy(alpha = 0.4f), RoundedCornerShape(8.dp)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(text = "▶", color = AccentEmerald, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                                    }
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Text(text = "Zyveron ", color = TextPrimary, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                                    Text(text = "Play", color = AccentEmerald, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                                }

                                Spacer(modifier = Modifier.height(20.dp))

                                if (syncError != null) {
                                    Text(
                                        text = "Falha ao Carregar Canais",
                                        color = AccentRose,
                                        fontSize = 17.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = syncError ?: "",
                                        color = TextSecondary,
                                        fontSize = 13.sp,
                                        textAlign = TextAlign.Center
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        text = "Verifique o DNS e as credenciais no painel web.",
                                        color = TextSecondary.copy(alpha = 0.7f),
                                        fontSize = 11.sp,
                                        textAlign = TextAlign.Center
                                    )

                                    Spacer(modifier = Modifier.height(24.dp))

                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Button(
                                            onClick = { syncRetryTrigger++ },
                                            colors = ButtonDefaults.colors(
                                                containerColor = AccentEmerald,
                                                focusedContainerColor = Color.White,
                                                contentColor = Color.Black,
                                                focusedContentColor = Color.Black
                                            ),
                                            shape = ButtonDefaults.shape(shape = RoundedCornerShape(10.dp))
                                        ) {
                                            Text(
                                                text = "🔄 Tentar Novamente",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 12.sp,
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                            )
                                        }

                                        Button(
                                            onClick = onFinish,
                                            colors = ButtonDefaults.colors(
                                                containerColor = BgSurfaceDark,
                                                focusedContainerColor = AccentRose,
                                                contentColor = TextSecondary,
                                                focusedContentColor = Color.White
                                            ),
                                            border = ButtonDefaults.border(
                                                border = Border(border = BorderStroke(1.dp, BorderDark)),
                                                focusedBorder = Border(border = BorderStroke(2.dp, Color.White))
                                            ),
                                            shape = ButtonDefaults.shape(shape = RoundedCornerShape(10.dp))
                                        ) {
                                            Text(
                                                text = "✕ Sair",
                                                fontWeight = FontWeight.SemiBold,
                                                fontSize = 12.sp,
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                            )
                                        }
                                    }
                                } else {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.Center
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(10.dp)
                                                .clip(CircleShape)
                                                .background(AccentEmerald)
                                        )
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Text(
                                            text = "Sincronizando grade de canais com o servidor...",
                                            color = TextPrimary,
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = "Aguarde enquanto os canais são carregados na memória da TV...",
                                        color = TextSecondary,
                                        fontSize = 12.sp,
                                        textAlign = TextAlign.Center
                                    )

                                    if (cleanDns.isNotBlank()) {
                                        Spacer(modifier = Modifier.height(14.dp))
                                        Text(
                                            text = "Servidor: $cleanDns",
                                            color = AccentSky,
                                            fontSize = 11.sp,
                                            fontFamily = FontFamily.Monospace
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(20.dp))
                                    Button(
                                        onClick = onFinish,
                                        colors = ButtonDefaults.colors(
                                            containerColor = BgSurfaceDark,
                                            focusedContainerColor = AccentRose,
                                            contentColor = TextSecondary,
                                            focusedContentColor = Color.White
                                        ),
                                        shape = ButtonDefaults.shape(shape = RoundedCornerShape(10.dp))
                                    ) {
                                        Text(
                                            text = "✕ Cancelar / Sair",
                                            fontWeight = FontWeight.Normal,
                                            fontSize = 12.sp,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // Canais com filtro anti-adulto obrigatório aplicado
                    val safeChannels = remember(localChannels) {
                        localChannels.filter { ContentSafetyFilter.isSafe(it.name, it.categoryId) }
                    }
                    val sportsChannels = remember(safeChannels) {
                        safeChannels.filter { ContentSafetyFilter.isSportsChannel(it.name, it.categoryId) }
                    }

                    // Navegação entre as telas do APK
                    when (currentScreen) {
                        ActiveScreen.HOME -> {
                            HomeScreen(
                                serverName = serverDisplayName,
                                channels = safeChannels,
                                onOpenLiveTv = {
                                    currentScreen = ActiveScreen.LIVE_PLAYER
                                },
                                onOpenMovies = {
                                    Toast.makeText(context, "Abrindo catálogo de TV ao Vivo", Toast.LENGTH_SHORT).show()
                                    currentScreen = ActiveScreen.LIVE_PLAYER
                                },
                                onOpenSeries = {
                                    Toast.makeText(context, "Abrindo catálogo de TV ao Vivo", Toast.LENGTH_SHORT).show()
                                    currentScreen = ActiveScreen.LIVE_PLAYER
                                },
                                onOpenSports = {
                                    currentScreen = ActiveScreen.SPORTS_PLAYER
                                },
                                onOpenAccounts = {
                                    currentScreen = ActiveScreen.ACCOUNTS
                                },
                                onOpenSettings = {
                                    currentScreen = ActiveScreen.SETTINGS
                                },
                                onReloadCatalog = {
                                    Toast.makeText(context, "Sincronizando com o servidor...", Toast.LENGTH_SHORT).show()
                                    syncRetryTrigger++
                                },
                                onExit = onFinish
                            )
                        }

                        ActiveScreen.LIVE_PLAYER -> {
                            LivePlayerScreen(
                                playerManager = playerManager,
                                channels = safeChannels,
                                serverDns = cleanDns,
                                username = state.username,
                                password = state.password,
                                onBack = { currentScreen = ActiveScreen.HOME }
                            )
                        }

                        ActiveScreen.SPORTS_PLAYER -> {
                            LivePlayerScreen(
                                playerManager = playerManager,
                                channels = if (sportsChannels.isNotEmpty()) sportsChannels else safeChannels,
                                serverDns = cleanDns,
                                username = state.username,
                                password = state.password,
                                onBack = { currentScreen = ActiveScreen.HOME }
                            )
                        }

                        ActiveScreen.ACCOUNTS -> {
                            AccountsScreen(
                                mac = deviceManager.virtualMac,
                                deviceKey = deviceManager.deviceKey,
                                serverName = serverDisplayName,
                                username = state.username,
                                expirationDate = state.expirationDate.ifBlank { "Ativo" },
                                onBack = { currentScreen = ActiveScreen.HOME }
                            )
                        }

                        ActiveScreen.SETTINGS -> {
                            SettingsScreen(
                                mac = deviceManager.virtualMac,
                                deviceKey = deviceManager.deviceKey,
                                expirationDate = state.expirationDate.ifBlank { "Ativo" },
                                onBack = { currentScreen = ActiveScreen.HOME }
                            )
                        }
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
