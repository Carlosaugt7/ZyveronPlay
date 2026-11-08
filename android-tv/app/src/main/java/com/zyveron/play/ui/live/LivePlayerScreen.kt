package com.zyveron.play.ui.live

import android.view.KeyEvent
import androidx.annotation.OptIn
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.util.UnstableApi
import androidx.media3.ui.PlayerView
import androidx.tv.material3.Text
import com.zyveron.play.data.local.ChannelEntity
import com.zyveron.play.data.model.EpgProgram
import com.zyveron.play.data.repository.ZyveronRepository
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
import androidx.compose.ui.platform.LocalContext
import com.zyveron.play.util.SettingsHelper
import com.zyveron.play.util.UrlHelper
import kotlinx.coroutines.delay

@OptIn(UnstableApi::class)
@Composable
fun LivePlayerScreen(
    repository: ZyveronRepository? = null,
    playerManager: ZyveronPlayerManager,
    channels: List<ChannelEntity>,
    serverDns: String,
    username: String,
    password: String,
    initialChannelIndex: Int = 0,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    var currentChannelIndex by remember { mutableIntStateOf(if (initialChannelIndex in channels.indices) initialChannelIndex else 0) }
    var showOsd by remember { mutableStateOf(true) }
    var showChannelList by remember { mutableStateOf(false) }
    var isOsdFocused by remember { mutableStateOf(false) }
    var lastInteractionTime by remember { mutableLongStateOf(System.currentTimeMillis()) }
    val channelListState = rememberLazyListState()

    var playerEpgList by remember { mutableStateOf<List<EpgProgram>>(emptyList()) }
    var nowSec by remember { mutableLongStateOf(System.currentTimeMillis() / 1000L) }

    // Atualiza relógio a cada 30 segundos para cálculo dinâmico da barra de progresso do EPG
    LaunchedEffect(Unit) {
        while (true) {
            delay(30_000)
            nowSec = System.currentTimeMillis() / 1000L
        }
    }

    // Busca EPG do canal atual em segundo plano
    LaunchedEffect(currentChannelIndex, serverDns) {
        val ch = channels.getOrNull(currentChannelIndex)
        if (repository != null && ch != null && serverDns.isNotBlank()) {
            val list = repository.getChannelEpg(serverDns, username, password, ch.streamId)
            playerEpgList = list
        } else {
            playerEpgList = emptyList()
        }
    }

    fun markInteraction() {
        lastInteractionTime = System.currentTimeMillis()
        showOsd = true
    }

    val playerSurfaceFocusRequester = remember { FocusRequester() }
    val osdButtonsFocusRequester = remember { FocusRequester() }
    val selectedChannelFocusRequester = remember { FocusRequester() }

    val playbackState by playerManager.playbackState.collectAsState()
    val currentChannel = channels.getOrNull(currentChannelIndex)

    // Interrompe reprodução ao sair da tela
    DisposableEffect(Unit) {
        onDispose {
            playerManager.stop()
        }
    }

    // Registra ouvinte nativo global para teclas do controle remoto (Cima/Baixo/Laterais)
    // Garante 100% de resposta no 1º clique físico mesmo se o Compose perder foco
    DisposableEffect(channels, currentChannelIndex, showChannelList, showOsd) {
        com.zyveron.play.MainActivity.onGlobalKeyDownListener = { event ->
            when (event.keyCode) {
                KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_CHANNEL_UP -> {
                    if (!showChannelList && channels.isNotEmpty()) {
                        currentChannelIndex = if (currentChannelIndex > 0) currentChannelIndex - 1 else channels.size - 1
                        markInteraction()
                        true
                    } else false
                }
                KeyEvent.KEYCODE_DPAD_DOWN, KeyEvent.KEYCODE_CHANNEL_DOWN -> {
                    if (!showChannelList && channels.isNotEmpty()) {
                        currentChannelIndex = (currentChannelIndex + 1) % channels.size
                        markInteraction()
                        true
                    } else false
                }
                KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT -> {
                    if (!showChannelList) {
                        showChannelList = true
                        true
                    } else false
                }
                KeyEvent.KEYCODE_BACK -> {
                    if (showChannelList) {
                        showChannelList = false
                        true
                    } else if (showOsd) {
                        showOsd = false
                        true
                    } else {
                        playerManager.stop()
                        onBack()
                        true
                    }
                }
                else -> false
            }
        }
        onDispose {
            com.zyveron.play.MainActivity.onGlobalKeyDownListener = null
        }
    }

    // Auto-scroll e foco automático com retry do canal ativo na gaveta lateral
    LaunchedEffect(showChannelList) {
        if (showChannelList) {
            if (currentChannelIndex in channels.indices) {
                try {
                    channelListState.scrollToItem(currentChannelIndex)
                } catch (_: Exception) {}
            }
            for (i in 1..10) {
                delay(50)
                try {
                    selectedChannelFocusRequester.requestFocus()
                    break
                } catch (_: Exception) {}
            }
        } else {
            delay(50)
            try {
                if (showOsd) {
                    osdButtonsFocusRequester.requestFocus()
                } else {
                    playerSurfaceFocusRequester.requestFocus()
                }
            } catch (_: Exception) {}
        }
    }

    // Reprodução ao mudar canal com debounce de 350ms para zapping suave
    LaunchedEffect(currentChannelIndex) {
        if (channels.isNotEmpty() && currentChannelIndex in channels.indices) {
            showOsd = true
            delay(350)
            val ch = channels[currentChannelIndex]
            val streamUrl = ch.directSourceUrl?.takeIf { it.isNotBlank() } ?: if (repository != null) {
                repository.buildLiveStreamUrl(serverDns, username, password, ch.streamId)
            } else {
                val prot = SettingsHelper.getLiveProtocol(context)
                UrlHelper.buildLiveStreamUrl(serverDns, username, password, ch.streamId, prot)
            }
            playerManager.playStream(streamUrl, ch.name)
        }
    }

    // Foco automático nos botões do OSD ao exibir o menu
    LaunchedEffect(showOsd) {
        if (showOsd && !showChannelList) {
            for (i in 1..8) {
                delay(40)
                try {
                    osdButtonsFocusRequester.requestFocus()
                    break
                } catch (_: Exception) {}
            }
        }
    }

    // Auto-ocultar OSD após 2 segundos de inatividade
    LaunchedEffect(showOsd, lastInteractionTime, showChannelList) {
        if (showOsd && !showChannelList) {
            delay(2000)
            showOsd = false
            try {
                playerSurfaceFocusRequester.requestFocus()
            } catch (_: Exception) {}
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
                if (showOsd) {
                    showOsd = false
                } else {
                    markInteraction()
                    try { osdButtonsFocusRequester.requestFocus() } catch (_: Exception) {}
                }
            }
            .onPreviewKeyEvent { keyEvent ->
                if (keyEvent.nativeKeyEvent.action == KeyEvent.ACTION_DOWN) {
                    when (keyEvent.nativeKeyEvent.keyCode) {
                        KeyEvent.KEYCODE_BACK -> {
                            if (showChannelList) {
                                showChannelList = false
                                true
                            } else if (showOsd) {
                                showOsd = false
                                true
                            } else {
                                playerManager.stop()
                                onBack()
                                true
                            }
                        }
                        // Zapping com UM clique: setas Cima/Baixo ou CH+/CH- trocam canal DIRETAMENTE
                        KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_CHANNEL_UP, KeyEvent.KEYCODE_PAGE_UP -> {
                            if (!showChannelList) {
                                if (channels.isNotEmpty()) {
                                    currentChannelIndex = if (currentChannelIndex > 0) currentChannelIndex - 1 else channels.size - 1
                                    markInteraction()
                                }
                                true
                            } else false
                        }
                        KeyEvent.KEYCODE_DPAD_DOWN, KeyEvent.KEYCODE_CHANNEL_DOWN, KeyEvent.KEYCODE_PAGE_DOWN -> {
                            if (!showChannelList) {
                                if (channels.isNotEmpty()) {
                                    currentChannelIndex = (currentChannelIndex + 1) % channels.size
                                    markInteraction()
                                }
                                true
                            } else false
                        }
                        KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT -> {
                            if (!showChannelList) {
                                showChannelList = true
                                true
                            } else false
                        }
                        // OK apenas mostra o OSD (não é necessário para trocar canal)
                        KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_NUMPAD_ENTER -> {
                            if (!showChannelList) {
                                if (!showOsd) {
                                    markInteraction()
                                } else {
                                    showOsd = false
                                    try { playerSurfaceFocusRequester.requestFocus() } catch (_: Exception) {}
                                }
                                true
                            } else false
                        }
                        else -> false
                    }
                } else false
            }
    ) {
        // 1. Superfície do Player (Media3 / ExoPlayer) - nunca rouba foco do D-Pad
        AndroidView(
            factory = { ctx ->
                try {
                    PlayerView(ctx).apply {
                        player = playerManager.getPlayer()
                        useController = false
                        keepScreenOn = true
                        isFocusable = false
                        isFocusableInTouchMode = false
                    }
                } catch (e: Exception) {
                    android.util.Log.e("LivePlayerScreen", "Erro ao inicializar PlayerView", e)
                    android.view.View(ctx)
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // 2. Indicadores de Status (Buffering, Reconexão e Erro)
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
                                .background(Color(0xFFF59E0B))
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Reconectando (${state.attempt}/${state.maxAttempts})...",
                            color = Color(0xFFF59E0B),
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
                        .width(520.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(BgCardDark.copy(alpha = 0.96f))
                        .border(1.dp, AccentRose.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                        .padding(28.dp)
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(AccentRose.copy(alpha = 0.15f))
                                .border(1.dp, AccentRose.copy(alpha = 0.4f), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(text = "⚠", color = AccentRose, fontSize = 20.sp)
                        }

                        Spacer(modifier = Modifier.height(14.dp))
                        Text(
                            text = "Falha na Reprodução",
                            color = AccentRose,
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )

                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = state.message,
                            color = TextSecondary,
                            fontSize = 13.sp,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        // Ações Universais (Touch + D-Pad): Tentar Novamente, Trocar Canal, Sair
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TvTouchCard(
                                onClick = { playerManager.retryCurrentStream() },
                                containerColor = AccentEmerald,
                                focusedContainerColor = Color.White,
                                shape = RoundedCornerShape(10.dp),
                                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                            ) { isFocused ->
                                Text(
                                    text = "🔄 Tentar Novamente",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    color = Color.Black
                                )
                            }

                            TvTouchCard(
                                onClick = { showChannelList = true },
                                containerColor = BgSurfaceDark,
                                focusedContainerColor = AccentSky,
                                border = BorderStroke(1.dp, BorderDark),
                                focusedBorder = BorderStroke(2.dp, Color.White),
                                shape = RoundedCornerShape(10.dp),
                                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                            ) { isFocused ->
                                Text(
                                    text = "📺 Trocar Canal",
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 12.sp,
                                    color = if (isFocused) Color.Black else TextPrimary
                                )
                            }

                            TvTouchCard(
                                onClick = {
                                    playerManager.stop()
                                    onBack()
                                },
                                containerColor = BgSurfaceDark,
                                focusedContainerColor = AccentRose,
                                border = BorderStroke(1.dp, BorderDark),
                                focusedBorder = BorderStroke(2.dp, Color.White),
                                shape = RoundedCornerShape(10.dp),
                                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                            ) { isFocused ->
                                Text(
                                    text = "✕ Sair",
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 12.sp,
                                    color = if (isFocused) Color.White else TextSecondary
                                )
                            }
                        }
                    }
                }
            }

            else -> {}
        }

        // 3. OSD Inferior (Informações do Canal e Botões Touch / D-Pad)
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
                    .padding(24.dp)
            ) {
                if (currentChannel != null) {
                    Column(modifier = Modifier.fillMaxWidth()) {
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
                                        fontSize = 22.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                val nowProg = remember(playerEpgList, nowSec) {
                                    playerEpgList.firstOrNull { it.isNowPlaying || (it.startTimestamp > 0 && nowSec in it.startTimestamp..it.stopTimestamp) }
                                        ?: playerEpgList.firstOrNull()
                                }
                                val nextProg = remember(playerEpgList, nowProg) {
                                    playerEpgList.firstOrNull { it != nowProg }
                                }

                                if (nowProg != null) {
                                    val prog = remember(nowProg, nowSec) {
                                        if (nowProg.startTimestamp > 0 && nowProg.stopTimestamp > nowProg.startTimestamp) {
                                            ((nowSec - nowProg.startTimestamp).toFloat() / (nowProg.stopTimestamp - nowProg.startTimestamp).toFloat()).coerceIn(0f, 1f)
                                        } else nowProg.progress
                                    }

                                    Spacer(modifier = Modifier.height(4.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(4.dp))
                                                .background(AccentEmerald.copy(alpha = 0.2f))
                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                        ) {
                                            Text(
                                                text = "● NO AR",
                                                color = AccentEmerald,
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = nowProg.title,
                                            color = TextPrimary,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = "${nowProg.startFormatted} - ${nowProg.endFormatted}",
                                            color = TextSecondary,
                                            fontSize = 11.sp,
                                            fontFamily = FontFamily.Monospace
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(4.dp))
                                    // Barra de progresso do programa atual
                                    Box(
                                        modifier = Modifier
                                            .width(280.dp)
                                            .height(3.dp)
                                            .clip(RoundedCornerShape(2.dp))
                                            .background(Color.White.copy(alpha = 0.15f))
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth(prog)
                                                .fillMaxHeight()
                                                .background(AccentEmerald)
                                        )
                                    }

                                    if (nextProg != null) {
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text(
                                                text = "A Seguir:",
                                                color = AccentSky,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.SemiBold
                                            )
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text(
                                                text = "${nextProg.title} (${nextProg.startFormatted})",
                                                color = TextSecondary,
                                                fontSize = 11.sp,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }
                                    }
                                } else {
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
                                            text = "Toque na tela ou use ▲ ▼ para trocar canal",
                                            color = TextSecondary,
                                            fontSize = 12.sp
                                        )
                                    }
                                }
                            }

                            // Botões Touch de Atalho Rápido para Celular e TV
                            Row(
                                modifier = Modifier
                                    .onFocusChanged { isOsdFocused = it.hasFocus }
                                    .onPreviewKeyEvent { keyEvent ->
                                        if (keyEvent.nativeKeyEvent.action == KeyEvent.ACTION_DOWN) {
                                            markInteraction()
                                            when (keyEvent.nativeKeyEvent.keyCode) {
                                                KeyEvent.KEYCODE_DPAD_UP -> {
                                                    if (channels.isNotEmpty()) {
                                                        currentChannelIndex = if (currentChannelIndex > 0) currentChannelIndex - 1 else channels.size - 1
                                                    }
                                                    true
                                                }
                                                KeyEvent.KEYCODE_DPAD_DOWN -> {
                                                    if (channels.isNotEmpty()) {
                                                        currentChannelIndex = (currentChannelIndex + 1) % channels.size
                                                    }
                                                    true
                                                }
                                                // BACK fecha OSD sem fechar o player
                                                KeyEvent.KEYCODE_BACK -> {
                                                    showOsd = false
                                                    try { playerSurfaceFocusRequester.requestFocus() } catch (_: Exception) {}
                                                    true
                                                }
                                                else -> false
                                            }
                                        } else false
                                    },
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                TvTouchCard(
                                    onClick = {
                                        if (channels.isNotEmpty()) {
                                            currentChannelIndex = if (currentChannelIndex > 0) currentChannelIndex - 1 else channels.size - 1
                                            showOsd = true
                                        }
                                    },
                                    modifier = Modifier
                                        .focusRequester(osdButtonsFocusRequester),
                                    containerColor = BgSurfaceDark,
                                    focusedContainerColor = AccentEmerald,
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                                ) { isFocused ->
                                    Text(
                                        text = "▲ Anterior",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isFocused) Color.Black else TextPrimary
                                    )
                                }

                                TvTouchCard(
                                    onClick = {
                                        if (channels.isNotEmpty()) {
                                            currentChannelIndex = (currentChannelIndex + 1) % channels.size
                                            showOsd = true
                                        }
                                    },
                                    containerColor = BgSurfaceDark,
                                    focusedContainerColor = AccentEmerald,
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                                ) { isFocused ->
                                    Text(
                                        text = "▼ Próximo",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isFocused) Color.Black else TextPrimary
                                    )
                                }

                                TvTouchCard(
                                    onClick = { showChannelList = true },
                                    containerColor = BgSurfaceDark,
                                    focusedContainerColor = AccentSky,
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                                ) { isFocused ->
                                    Text(
                                        text = "📋 Lista",
                                        fontSize = 12.sp,
                                        color = if (isFocused) Color.Black else AccentSky,
                                        fontWeight = FontWeight.Bold
                                    )
                                }

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
                                        text = "✕ Voltar",
                                        fontSize = 12.sp,
                                        color = if (isFocused) Color.White else TextSecondary,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // 4. Barra Lateral de Navegação de Canais (Quando pressiona Esquerda, OK ou clica em Lista)
        AnimatedVisibility(
            visible = showChannelList,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.align(Alignment.CenterStart)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .width(380.dp)
                    .background(BgCardDark.copy(alpha = 0.98f))
                    .border(1.dp, BorderDark)
                    .padding(20.dp)
                    .onPreviewKeyEvent { keyEvent ->
                        if (keyEvent.nativeKeyEvent.action == KeyEvent.ACTION_DOWN) {
                            when (keyEvent.nativeKeyEvent.keyCode) {
                                KeyEvent.KEYCODE_BACK, KeyEvent.KEYCODE_DPAD_RIGHT -> {
                                    showChannelList = false
                                    try { playerSurfaceFocusRequester.requestFocus() } catch (_: Exception) {}
                                    true
                                }
                                else -> false
                            }
                        } else false
                    }
            ) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
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
                        }
                        TvTouchCard(
                            onClick = {
                                showChannelList = false
                                try { playerSurfaceFocusRequester.requestFocus() } catch (_: Exception) {}
                            },
                            containerColor = BgSurfaceDark,
                            focusedContainerColor = AccentRose,
                            shape = RoundedCornerShape(6.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                        ) { isFocused ->
                            Text(
                                text = "✕ Fechar",
                                color = if (isFocused) Color.White else TextSecondary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    LazyColumn(
                        state = channelListState,
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        itemsIndexed(channels) { index, ch ->
                            val isSelected = index == currentChannelIndex
                            TvTouchCard(
                                onClick = {
                                    currentChannelIndex = index
                                    showChannelList = false
                                    try { playerSurfaceFocusRequester.requestFocus() } catch (_: Exception) {}
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .then(if (isSelected) Modifier.focusRequester(selectedChannelFocusRequester) else Modifier),
                                containerColor = if (isSelected) AccentEmerald.copy(alpha = 0.25f) else Color.Transparent,
                                focusedContainerColor = AccentEmerald,
                                border = BorderStroke(1.dp, if (isSelected) AccentEmerald.copy(alpha = 0.5f) else Color.Transparent),
                                focusedBorder = BorderStroke(2.dp, Color.White),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 10.dp)
                            ) { isFocused ->
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = ch.num.toString().padStart(3, '0'),
                                        fontFamily = FontFamily.Monospace,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isFocused) Color.Black else (if (isSelected) AccentEmerald else TextSecondary)
                                    )
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Text(
                                        text = ch.name,
                                        fontSize = 13.sp,
                                        fontWeight = if (isSelected || isFocused) FontWeight.Bold else FontWeight.Medium,
                                        maxLines = 1,
                                        color = if (isFocused) Color.Black else (if (isSelected) AccentEmerald else TextPrimary),
                                        modifier = Modifier.weight(1f)
                                    )
                                    if (isSelected) {
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Box(
                                            modifier = Modifier
                                                .size(8.dp)
                                                .clip(CircleShape)
                                                .background(if (isFocused) Color.Black else AccentEmerald)
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
}
