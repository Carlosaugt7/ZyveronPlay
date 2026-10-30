package com.zyveron.play

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.lifecycle.lifecycleScope
import androidx.tv.material3.Text
import com.zyveron.play.data.local.ChannelEntity
import com.zyveron.play.data.remote.DeviceAuthState
import com.zyveron.play.data.remote.FirestoreDeviceManager
import com.zyveron.play.data.repository.ZyveronRepository
import com.zyveron.play.player.ZyveronPlayerManager
import com.zyveron.play.ui.activation.ActivationScreen
import com.zyveron.play.ui.activation.BlockedOrExpiredScreen
import com.zyveron.play.ui.components.TvNotificationOverlay
import com.zyveron.play.ui.live.LivePlayerScreen
import com.zyveron.play.ui.theme.BgDeepDark
import com.zyveron.play.ui.theme.ZyveronTvTheme
import kotlinx.coroutines.launch

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

    // 1. Decisão 2.A: Cache-First local com canais observados do SQLite
    val localChannels by repository.getChannelsByCategory("0").collectAsState(initial = emptyList())

    // Mock inicial caso o banco ainda esteja sendo populado
    val displayChannels = if (localChannels.isNotEmpty()) {
        localChannels
    } else {
        listOf(
            ChannelEntity(1, 1, "Globo HD", null, null, "0"),
            ChannelEntity(2, 2, "ESPN Brasil FHD", null, null, "0"),
            ChannelEntity(3, 3, "Premiere Clubes 4K", null, null, "0"),
            ChannelEntity(4, 4, "Discovery Channel HD", null, null, "0"),
            ChannelEntity(5, 5, "HBO Max 1 FHD", null, null, "0")
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDeepDark)
    ) {
        when (val state = authState) {
            is DeviceAuthState.Loading -> {
                // Splash de transição ultra-rápida
                Box(modifier = Modifier.fillMaxSize())
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
                    onRetry = { /* Checagem automática via Firestore */ }
                )
            }

            is DeviceAuthState.Expired -> {
                BlockedOrExpiredScreen(
                    mac = deviceManager.virtualMac,
                    title = "Mensalidade Expirada",
                    message = "Sua assinatura venceu. Para continuar assistindo, regularize seu plano junto ao seu revendedor.",
                    isExpired = true,
                    onRetry = { /* Checagem automática via Firestore */ }
                )
            }

            is DeviceAuthState.Active -> {
                // Inicia sincronização do catálogo em segundo plano sem travar a TV
                LaunchedEffect(state.serverDns, state.username) {
                    repository.syncXtreamCatalog(
                        serverDns = state.serverDns,
                        username = state.username,
                        password = state.password
                    )
                }

                LivePlayerScreen(
                    playerManager = playerManager,
                    channels = displayChannels,
                    serverDns = state.serverDns,
                    username = state.username,
                    password = state.password,
                    onBack = onFinish
                )
            }
        }

        // Overlay de avisos e mensagens globais / por revenda da TV
        activeBroadcast?.let { broadcast ->
            TvNotificationOverlay(
                broadcast = broadcast,
                onDismiss = { deviceManager.dismissBroadcast() }
            )
        }
    }
}

