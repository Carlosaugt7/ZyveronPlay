package com.zyveron.play.ui.live

import android.view.KeyEvent
import androidx.annotation.OptIn
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.util.UnstableApi
import androidx.media3.ui.PlayerView
import androidx.tv.material3.Border
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.Text
import com.zyveron.play.data.local.ChannelEntity
import com.zyveron.play.player.PlaybackState
import com.zyveron.play.player.ZyveronPlayerManager
import com.zyveron.play.ui.theme.AccentEmerald
import com.zyveron.play.ui.theme.AccentRose
import com.zyveron.play.ui.theme.AccentSky
import com.zyveron.play.ui.theme.BgCardDark
import com.zyveron.play.ui.theme.BorderDark
import com.zyveron.play.ui.theme.TextPrimary
import com.zyveron.play.ui.theme.TextSecondary
import kotlinx.coroutines.delay

@OptIn(UnstableApi::class)
@Composable
fun LivePlayerScreen(
    playerManager: ZyveronPlayerManager,
    channels: List<ChannelEntity>,
    serverDns: String,
    username: String,
    password: String,
    onBack: () -> Unit
) {
    var currentChannelIndex by remember { mutableIntStateOf(0) }
    var showOsd by remember { mutableStateOf(true) }
    var showChannelList by remember { mutableStateOf(false) }

    val playbackState by playerManager.playbackState.collectAsState()
    val currentChannel = channels.getOrNull(currentChannelIndex)

    // Toca o canal selecionado
    LaunchedEffect(currentChannelIndex, serverDns) {
        val ch = channels.getOrNull(currentChannelIndex)
        if (ch != null) {
            val streamUrl = ch.directSourceUrl ?: if (serverDns.isNotBlank()) {
                "$serverDns/live/$username/$password/${ch.streamId}.ts"
            } else ""

            if (streamUrl.isNotBlank()) {
                playerManager.playStream(streamUrl, ch.name)
            }
            showOsd = true
        }
    }

    // Auto-oculta o OSD após 4 segundos sem interação
    LaunchedEffect(showOsd) {
        if (showOsd) {
            delay(4000)
            showOsd = false
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .focusable()
            .onKeyEvent { keyEvent ->
                if (keyEvent.nativeKeyEvent.action == KeyEvent.ACTION_DOWN) {
                    when (keyEvent.nativeKeyEvent.keyCode) {
                        KeyEvent.KEYCODE_DPAD_UP -> {
                            // Zapping Rápido: Canal Anterior
                            if (channels.isNotEmpty()) {
                                currentChannelIndex = if (currentChannelIndex > 0) currentChannelIndex - 1 else channels.size - 1
                            }
                            true
                        }
                        KeyEvent.KEYCODE_DPAD_DOWN -> {
                            // Zapping Rápido: Próximo Canal
                            if (channels.isNotEmpty()) {
                                currentChannelIndex = (currentChannelIndex + 1) % channels.size
                            }
                            true
                        }
                        KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                            // Abre a grade de canais
                            showChannelList = !showChannelList
                            true
                        }
                        KeyEvent.KEYCODE_BACK -> {
                            if (showChannelList) {
                                showChannelList = false
                                true
                            } else {
                                onBack()
                                true
                            }
                        }
                        else -> {
                            showOsd = true
                            false
                        }
                    }
                } else {
                    false
                }
            }
    ) {
        // 1. Superfície do Player (Media3 / ExoPlayer) com proteção contra falhas de layout
        AndroidView(
            factory = { ctx ->
                try {
                    PlayerView(ctx).apply {
                        player = playerManager.getPlayer()
                        useController = false
                        keepScreenOn = true
                    }
                } catch (e: Exception) {
                    android.util.Log.e("LivePlayerScreen", "Erro ao inicializar PlayerView", e)
                    android.view.View(ctx)
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // 2. Indicador discreto de Reconexão / Buffer no topo direito (Decisão 1.A)
        when (val state = playbackState) {
            is PlaybackState.Buffering -> {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(24.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.Black.copy(alpha = 0.75f))
                        .border(1.dp, BorderDark, RoundedCornerShape(8.dp))
                        .padding(horizontal = 14.dp, vertical = 6.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(AccentSky)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(text = "Carregando...", color = TextPrimary, fontSize = 12.sp)
                    }
                }
            }
            is PlaybackState.Reconnecting -> {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(24.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.Black.copy(alpha = 0.85f))
                        .border(1.dp, AccentSky.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                        .padding(horizontal = 14.dp, vertical = 6.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(AccentEmerald)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Recuperando sinal (${state.attempt}/${state.maxAttempts})...",
                            color = AccentSky,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
            is PlaybackState.Error -> {
                Box(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color.Black.copy(alpha = 0.9f))
                        .border(1.dp, AccentRose.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                        .padding(24.dp)
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = "⚠ Falha na Reprodução", color = AccentRose, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(text = state.message, color = TextSecondary, fontSize = 13.sp)
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { playerManager.retryCurrentStream() },
                            colors = ButtonDefaults.colors(containerColor = AccentEmerald, contentColor = Color.Black)
                        ) {
                            Text(text = "Tentar Novamente", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
            else -> {}
        }

        // 3. OSD Overlay Inferior de Zapping Rápido
        AnimatedVisibility(
            visible = showOsd && !showChannelList,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Transparent, Color.Black.copy(alpha = 0.95f))
                        )
                    )
                    .padding(32.dp)
            ) {
                if (currentChannel != null) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Bottom
                    ) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = currentChannel.num.toString().padStart(3, '0'),
                                    color = AccentEmerald,
                                    fontSize = 28.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.width(16.dp))
                                Text(
                                    text = currentChannel.name,
                                    color = TextPrimary,
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = "AO VIVO",
                                    color = AccentEmerald,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(AccentEmerald.copy(alpha = 0.2f))
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = "▲ ▼ Trocar de Canal  •  ◄ Abrir Lista de Canais",
                                    color = TextSecondary,
                                    fontSize = 12.sp
                                )
                            }
                        }

                        Text(
                            text = "FHD 1080p",
                            color = AccentSky,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .border(1.dp, AccentSky.copy(alpha = 0.4f), RoundedCornerShape(6.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }
        }

        // 4. Barra Lateral de Navegação de Canais (Quando pressiona Esquerda ou OK)
        AnimatedVisibility(
            visible = showChannelList,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.align(Alignment.CenterStart)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .width(360.dp)
                    .background(BgCardDark.copy(alpha = 0.96f))
                    .border(1.dp, BorderDark)
                    .padding(20.dp)
            ) {
                Column {
                    Text(
                        text = "Grade de Canais",
                        color = TextPrimary,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${channels.size} canais disponíveis",
                        color = TextSecondary,
                        fontSize = 11.sp
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        itemsIndexed(channels) { index, ch ->
                            val isSelected = index == currentChannelIndex
                            Button(
                                onClick = {
                                    currentChannelIndex = index
                                    showChannelList = false
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.colors(
                                    containerColor = if (isSelected) AccentEmerald.copy(alpha = 0.2f) else Color.Transparent,
                                    focusedContainerColor = AccentEmerald,
                                    contentColor = if (isSelected) AccentEmerald else TextPrimary,
                                    focusedContentColor = Color.Black
                                ),
                                border = ButtonDefaults.border(
                                    border = Border(border = androidx.compose.foundation.BorderStroke(1.dp, if (isSelected) AccentEmerald.copy(alpha = 0.4f) else Color.Transparent)),
                                    focusedBorder = Border(border = androidx.compose.foundation.BorderStroke(2.dp, Color.White))
                                ),
                                shape = ButtonDefaults.shape(shape = RoundedCornerShape(8.dp))
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = ch.num.toString().padStart(3, '0'),
                                        fontFamily = FontFamily.Monospace,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Text(
                                        text = ch.name,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Medium,
                                        maxLines = 1
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

