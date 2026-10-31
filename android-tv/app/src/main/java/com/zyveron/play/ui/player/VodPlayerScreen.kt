package com.zyveron.play.ui.player

import android.view.KeyEvent
import androidx.annotation.OptIn
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
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
import androidx.tv.material3.Text
import com.zyveron.play.player.PlaybackState
import com.zyveron.play.player.ZyveronPlayerManager
import com.zyveron.play.ui.components.TvTouchCard
import com.zyveron.play.ui.theme.AccentEmerald
import com.zyveron.play.ui.theme.AccentRose
import com.zyveron.play.ui.theme.AccentSky
import com.zyveron.play.ui.theme.BgCardDark
import com.zyveron.play.ui.theme.BgSurfaceDark
import com.zyveron.play.ui.theme.BorderDark
import com.zyveron.play.ui.theme.TextPrimary
import com.zyveron.play.ui.theme.TextSecondary
import kotlinx.coroutines.delay

@OptIn(UnstableApi::class)
@Composable
fun VodPlayerScreen(
    title: String,
    streamUrl: String,
    playerManager: ZyveronPlayerManager,
    startPositionMs: Long = 0L,
    onSaveProgress: ((positionMs: Long, durationMs: Long) -> Unit)? = null,
    onBack: () -> Unit
) {
    val playbackState by playerManager.playbackState.collectAsState()
    var showOsd by remember { mutableStateOf(true) }
    var isOsdFocused by remember { mutableStateOf(false) }

    var currentPositionMs by remember { mutableLongStateOf(startPositionMs) }
    var durationMs by remember { mutableLongStateOf(0L) }
    var isPlaying by remember { mutableStateOf(true) }

    val playPauseFocusRequester = remember { FocusRequester() }
    val playerSurfaceFocusRequester = remember { FocusRequester() }

    fun seekRelative(deltaMs: Long) {
        val player = playerManager.getPlayer()
        val current = player.currentPosition
        val dur = player.duration.coerceAtLeast(0L)
        val target = (current + deltaMs).coerceIn(0L, if (dur > 0) dur else Long.MAX_VALUE)
        player.seekTo(target)
        currentPositionMs = target
        showOsd = true
        onSaveProgress?.invoke(target, dur)
    }

    LaunchedEffect(streamUrl) {
        if (streamUrl.isNotBlank()) {
            playerManager.playStream(streamUrl, title)
            if (startPositionMs > 1000L) {
                delay(400)
                try {
                    playerManager.getPlayer().seekTo(startPositionMs)
                } catch (_: Exception) {}
            }
        }
        showOsd = true
    }

    // Monitora tempo de reprodução para barra de progresso e persistência contínua
    LaunchedEffect(Unit) {
        while (true) {
            delay(1000)
            try {
                val player = playerManager.getPlayer()
                if (player.isPlaying) {
                    currentPositionMs = player.currentPosition
                    durationMs = player.duration.coerceAtLeast(0L)
                    isPlaying = player.playWhenReady
                    onSaveProgress?.invoke(currentPositionMs, durationMs)
                }
            } catch (_: Exception) {}
        }
    }

    // Auto-oculta o OSD após 5 segundos se o usuário não estiver focado nos botões
    LaunchedEffect(showOsd, isOsdFocused) {
        if (showOsd && !isOsdFocused) {
            delay(5000)
            showOsd = false
        }
    }

    // Foco inicial no botão Play/Pause
    LaunchedEffect(Unit) {
        delay(300)
        try {
            playPauseFocusRequester.requestFocus()
        } catch (_: Exception) {}
    }

    DisposableEffect(Unit) {
        onDispose {
            try {
                val player = playerManager.getPlayer()
                onSaveProgress?.invoke(player.currentPosition, player.duration)
            } catch (_: Exception) {}
            playerManager.stop()
        }
    }

    fun formatDuration(ms: Long): String {
        if (ms <= 0L) return "00:00"
        val totalSecs = ms / 1000
        val hours = totalSecs / 3600
        val mins = (totalSecs % 3600) / 60
        val secs = totalSecs % 60
        return if (hours > 0) {
            String.format("%02d:%02d:%02d", hours, mins, secs)
        } else {
            String.format("%02d:%02d", mins, secs)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .focusRequester(playerSurfaceFocusRequester)
            .focusable()
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) {
                showOsd = !showOsd
                if (showOsd) {
                    try { playPauseFocusRequester.requestFocus() } catch (_: Exception) {}
                }
            }
            .onKeyEvent { keyEvent ->
                if (keyEvent.nativeKeyEvent.action == KeyEvent.ACTION_DOWN) {
                    when (keyEvent.nativeKeyEvent.keyCode) {
                        KeyEvent.KEYCODE_BACK -> {
                            if (showOsd) {
                                showOsd = false
                                true
                            } else {
                                playerManager.stop()
                                onBack()
                                true
                            }
                        }
                        // Seta Esquerda do controle remoto -> Retrocede 10s
                        KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_MEDIA_REWIND -> {
                            seekRelative(-10_000L)
                            true
                        }
                        // Seta Direita do controle remoto -> Avança 10s
                        KeyEvent.KEYCODE_DPAD_RIGHT, KeyEvent.KEYCODE_MEDIA_FAST_FORWARD -> {
                            seekRelative(+10_000L)
                            true
                        }
                        // Botão Centro / OK -> Alterna Play / Pause
                        KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> {
                            val player = playerManager.getPlayer()
                            player.playWhenReady = !player.playWhenReady
                            isPlaying = player.playWhenReady
                            showOsd = true
                            true
                        }
                        else -> {
                            showOsd = true
                            false
                        }
                    }
                } else false
            }
    ) {
        // Player Surface (Media3 / ExoPlayer)
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    player = playerManager.getPlayer()
                    useController = false
                    keepScreenOn = true
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // Buffering
        if (playbackState is PlaybackState.Buffering) {
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color.Black.copy(alpha = 0.75f))
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(AccentSky))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(text = "Carregando mídia...", color = TextPrimary, fontSize = 13.sp)
                }
            }
        }

        // Erro
        if (playbackState is PlaybackState.Error) {
            val err = playbackState as PlaybackState.Error
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .width(440.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(BgCardDark.copy(alpha = 0.96f))
                    .border(1.dp, AccentRose.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                    .padding(24.dp)
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = "Falha ao Reproduzir", color = AccentRose, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(text = err.message, color = TextSecondary, fontSize = 12.sp)
                    Spacer(modifier = Modifier.height(18.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        TvTouchCard(
                            onClick = { playerManager.retryCurrentStream() },
                            containerColor = AccentEmerald,
                            focusedContainerColor = Color.White,
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                        ) {
                            Text(text = "🔄 Tentar Novamente", fontWeight = FontWeight.Bold, color = Color.Black)
                        }
                        TvTouchCard(
                            onClick = {
                                playerManager.stop()
                                onBack()
                            },
                            containerColor = AccentRose,
                            focusedContainerColor = Color.White,
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                        ) {
                            Text(text = "✕ Voltar", fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }
        }

        // OSD Inferior com Barra de Progresso e Botões de Avanço / Retrocesso
        AnimatedVisibility(
            visible = showOsd,
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
                    .padding(horizontal = 28.dp, vertical = 20.dp)
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    // Título e Dicas de Atalho
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Bottom
                    ) {
                        Text(
                            text = title,
                            color = TextPrimary,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Use ◀ e ▶ para avançar/retroceder 10s • OK para pausar",
                            color = TextSecondary,
                            fontSize = 11.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Linha da Barra de Progresso
                    val progressFraction = if (durationMs > 0) {
                        (currentPositionMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f)
                    } else 0f

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp))
                            .background(Color.White.copy(alpha = 0.2f))
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(progressFraction)
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp))
                                .background(AccentEmerald)
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Tempo Decorrido e Duração Total
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = formatDuration(currentPositionMs),
                            color = AccentEmerald,
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = formatDuration(durationMs),
                            color = TextSecondary,
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Linha de Botões de Controle (Retroceder 10s, Play/Pause, Avançar 10s, Sair)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .onFocusChanged { isOsdFocused = it.hasFocus },
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Botão Retroceder 10s
                        TvTouchCard(
                            onClick = { seekRelative(-10_000L) },
                            containerColor = BgSurfaceDark,
                            focusedContainerColor = AccentSky,
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                        ) { isFocused ->
                            Text(
                                text = "⏪ -10s",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isFocused) Color.Black else TextPrimary
                            )
                        }

                        // Botão Play / Pause
                        TvTouchCard(
                            onClick = {
                                val player = playerManager.getPlayer()
                                player.playWhenReady = !player.playWhenReady
                                isPlaying = player.playWhenReady
                            },
                            modifier = Modifier.focusRequester(playPauseFocusRequester),
                            containerColor = BgSurfaceDark,
                            focusedContainerColor = AccentEmerald,
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 18.dp, vertical = 8.dp)
                        ) { isFocused ->
                            Text(
                                text = if (isPlaying) "⏸ Pausar" else "▶ Reproduzir",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isFocused) Color.Black else TextPrimary
                            )
                        }

                        // Botão Avançar 10s
                        TvTouchCard(
                            onClick = { seekRelative(+10_000L) },
                            containerColor = BgSurfaceDark,
                            focusedContainerColor = AccentSky,
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                        ) { isFocused ->
                            Text(
                                text = "⏩ +10s",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isFocused) Color.Black else TextPrimary
                            )
                        }

                        Spacer(modifier = Modifier.weight(1f))

                        // Botão Voltar
                        TvTouchCard(
                            onClick = {
                                playerManager.stop()
                                onBack()
                            },
                            containerColor = BgSurfaceDark,
                            focusedContainerColor = AccentRose,
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                        ) { isFocused ->
                            Text(
                                text = "✕ Sair",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isFocused) Color.White else TextSecondary
                            )
                        }
                    }
                }
            }
        }
    }
}
