package com.zyveron.play.player

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.annotation.OptIn
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.extractor.DefaultExtractorsFactory
import androidx.media3.extractor.ts.DefaultTsPayloadReaderFactory
import androidx.media3.common.MimeTypes
import androidx.media3.extractor.ts.TsExtractor
import com.zyveron.play.analytics.QoSMonitor
import com.zyveron.play.util.NetworkSecurityHelper
import com.zyveron.play.util.SettingsHelper
import com.zyveron.play.util.UrlHelper
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

sealed class PlaybackState {
    object Idle : PlaybackState()
    object Buffering : PlaybackState()
    object Playing : PlaybackState()
    data class Reconnecting(val attempt: Int, val maxAttempts: Int) : PlaybackState()
    data class Error(val message: String, val canRetry: Boolean) : PlaybackState()
}

@OptIn(UnstableApi::class)
class ZyveronPlayerManager(private val context: Context) {

    @Volatile
    private var exoPlayer: ExoPlayer? = null
    private val coroutineExceptionHandler = CoroutineExceptionHandler { _, throwable ->
        Log.e("ZyveronPlayer", "Erro não tratado no CoroutineScope do player", throwable)
    }
    private val scope = CoroutineScope(Dispatchers.Main + coroutineExceptionHandler)
    private var reconnectJob: Job? = null

    private val _playbackState = MutableStateFlow<PlaybackState>(PlaybackState.Idle)
    val playbackState: StateFlow<PlaybackState> = _playbackState.asStateFlow()

    private var currentStreamUrl: String? = null
    private var currentStreamTitle: String = ""
    private var streamCandidates: List<String> = emptyList()
    private var currentCandidateIndex: Int = 0
    private var reconnectAttempts = 0
    private val maxReconnectAttempts = 4 // Aumentado de 3 para 4 tentativas
    private val backoffIntervals = listOf(3000L, 6000L, 12000L, 20000L) // Exponential backoff real (3s → 6s → 12s → 20s)

    private val okHttpClient = NetworkSecurityHelper.createUnsafeOkHttpClient(connectTimeoutSec = 20, readTimeoutSec = 120)

    // QoS Monitor para telemetria e analytics
    val qosMonitor = QoSMonitor(context)

    fun getPlayer(): ExoPlayer {
        return exoPlayer ?: createPlayer().also { exoPlayer = it }
    }

    private fun createPlayer(): ExoPlayer {
        try {
            // Renderizador com fallback de hardware acelerado, otimizado para TV Boxes / Mi Stick
            val renderersFactory = androidx.media3.exoplayer.DefaultRenderersFactory(context.applicationContext).apply {
                setEnableDecoderFallback(true)
                setExtensionRendererMode(androidx.media3.exoplayer.DefaultRenderersFactory.EXTENSION_RENDERER_MODE_OFF)
            }

            // 1. Buffer Inteligente para TV: Otimizado para TV Boxes e Mi Sticks (1GB-2GB RAM)
            // Elimina pausas de Garbage Collector e micro-travamentos descartando back-buffer desnecessário
            val loadControl = DefaultLoadControl.Builder()
                .setBufferDurationsMs(
                    2500,   // Mínimo: 2.5s (absorve oscilações sem saturar a memória)
                    12000,  // Máximo: 12s (teto seguro para evitar acúmulo de frames no heap)
                    1500,   // Início: 1.5s (início instantâneo sem delay de áudio/vídeo)
                    2500    // Re-buffer: 2.5s
                )
                .setBackBuffer(0, false) // 0s de back-buffer: poupa 50-80MB de RAM imediata no Mi Stick
                .setPrioritizeTimeOverSizeThresholds(true)
                .build()

            // 2. Tolerância a falhas MPEG-TS e resets de PCR/PTS em IPTV ao vivo (Multi-PMT padrão)
            // Sem FLAG_DETECT_ACCESS_UNITS e sem FLAG_ALLOW_NON_IDR_KEYFRAMES:
            // evita consumo excessivo de CPU em decodificação de software e travamentos momentâneos
            val extractorsFactory = DefaultExtractorsFactory().apply {
                setTsExtractorFlags(
                    DefaultTsPayloadReaderFactory.FLAG_IGNORE_SPLICE_INFO_STREAM or
                    DefaultTsPayloadReaderFactory.FLAG_ENABLE_HDMV_DTS_AUDIO_STREAMS or
                    DefaultTsPayloadReaderFactory.FLAG_OVERRIDE_CAPTION_DESCRIPTORS
                )
                setTsExtractorMode(TsExtractor.MODE_MULTI_PMT)
                setTsExtractorTimestampSearchBytes(1800 * TsExtractor.TS_PACKET_SIZE)
            }

            // 3. User-Agent e Headers customizados para contornar bloqueios HTTP 403
            val httpDataSourceFactory = OkHttpDataSource.Factory(okHttpClient)
                .setUserAgent("IPTVSmartersPro")

            val defaultDataSourceFactory = DefaultDataSource.Factory(context.applicationContext, httpDataSourceFactory)

            val mediaSourceFactory = DefaultMediaSourceFactory(defaultDataSourceFactory, extractorsFactory)

            // 4. ABR (Adaptive Bitrate) ativo por padrão para melhor experiência em redes variáveis
            val isAdaptive = SettingsHelper.isAdaptiveQualityEnabled(context.applicationContext)
            val trackSelector = androidx.media3.exoplayer.trackselection.DefaultTrackSelector(context.applicationContext).apply {
                parameters = buildUponParameters()
                    .setForceHighestSupportedBitrate(!isAdaptive)
                    .setMaxVideoBitrate(8_000_000)  // Max 8 Mbps (4K safe limit)
                    .setMaxVideoSize(1920, 1080)    // Limita resolução a 1080p por padrão
                    .setPreferredAudioLanguage("por") // Prioriza áudio em português
                    .build()
            }

            val builder = ExoPlayer.Builder(context.applicationContext, renderersFactory)
                .setTrackSelector(trackSelector)
                .setLoadControl(loadControl)
                .setMediaSourceFactory(mediaSourceFactory)
                .setSeekParameters(androidx.media3.exoplayer.SeekParameters.CLOSEST_SYNC)
                .setHandleAudioBecomingNoisy(true)

            return builder.build().apply {
                addListener(createPlayerListener())
            }
        } catch (e: Exception) {
            Log.e("ZyveronPlayer", "Falha na criação do ExoPlayer customizado, usando fallback padrão", e)
            // Fallback seguro caso o dispositivo TV Box tenha alguma limitação
            return ExoPlayer.Builder(context.applicationContext).build().apply {
                addListener(createPlayerListener())
            }
        }
    }

    private fun createPlayerListener() = object : Player.Listener {
        override fun onPlaybackStateChanged(state: Int) {
            when (state) {
                Player.STATE_BUFFERING -> {
                    if (_playbackState.value !is PlaybackState.Reconnecting) {
                        _playbackState.value = PlaybackState.Buffering
                    }
                }
                Player.STATE_READY -> {
                    reconnectAttempts = 0
                    reconnectJob?.cancel()
                    _playbackState.value = PlaybackState.Playing
                    Log.d("ZyveronPlayer", "Reprodução pronta e estável: $currentStreamTitle")
                }
                Player.STATE_ENDED -> {
                    // Ao vivo não deve finalizar; se finalizar tenta recuperar
                    handlePlaybackError("Fim de transmissão inesperado")
                }
                Player.STATE_IDLE -> {
                    // Estado inativo
                }
            }
        }

        override fun onPlayerError(error: PlaybackException) {
            val causeDetail = error.cause?.localizedMessage ?: error.cause?.message ?: error.localizedMessage ?: error.errorCodeName
            Log.w("ZyveronPlayer", "Erro na reprodução (${error.errorCodeName}): ${error.message} [Causa: $causeDetail]")
            handlePlaybackError(causeDetail)
        }
    }

    private fun buildMediaItem(targetUrl: String): MediaItem {
        val builder = MediaItem.Builder()
            .setUri(Uri.parse(targetUrl))
            .setMediaId(targetUrl)

        if (targetUrl.contains(".m3u8", ignoreCase = true)) {
            builder.setMimeType(MimeTypes.APPLICATION_M3U8)
        } else if (targetUrl.contains(".ts", ignoreCase = true)) {
            builder.setMimeType(MimeTypes.VIDEO_MP2T)
        }
        return builder.build()
    }

    private fun generateStreamCandidates(rawUrl: String): List<String> {
        val candidates = mutableListOf<String>()
        val primary = UrlHelper.normalizeUrl(rawUrl)
        if (primary.isBlank()) return candidates
        candidates.add(primary)

        // 1. Alternativas de formato/container no mesmo servidor e porta (.ts <-> .m3u8 e sem extensão)
        if (primary.contains(".ts", ignoreCase = true)) {
            val m3u8 = primary.replace(".ts", ".m3u8", ignoreCase = true)
            if (!candidates.contains(m3u8)) candidates.add(m3u8)
            val noExt = primary.replace(".ts", "", ignoreCase = true)
            if (!candidates.contains(noExt)) candidates.add(noExt)
        } else if (primary.contains(".m3u8", ignoreCase = true)) {
            val ts = primary.replace(".m3u8", ".ts", ignoreCase = true)
            if (!candidates.contains(ts)) candidates.add(ts)
            val noExt = primary.replace(".m3u8", "", ignoreCase = true)
            if (!candidates.contains(noExt)) candidates.add(noExt)
        }

        // 2. Fallback resiliente de protocolo (HTTPS <-> HTTP)
        val schemeVariants = mutableListOf<String>()
        for (c in candidates) {
            val scheme = Uri.parse(c).scheme?.lowercase() ?: ""
            if (scheme == "http") {
                val httpsUrl = c.replaceFirst("http://", "https://", ignoreCase = true)
                schemeVariants.add(httpsUrl)
            } else if (scheme == "https") {
                val httpUrl = c.replaceFirst("https://", "http://", ignoreCase = true)
                schemeVariants.add(httpUrl)
            }
        }
        for (sv in schemeVariants) {
            if (!candidates.contains(sv)) candidates.add(sv)
        }

        return candidates
    }

    /**
     * Executa a decisão 1.A: Reconexão gradual silenciosa com Exponential Backoff
     * e rotação inteligente de formato e protocolo (TS/M3U8 e HTTPS/HTTP).
     */
    private fun handlePlaybackError(errorMsg: String) {
        // Tenta primeiro os candidatos alternativos (ex: ts -> m3u8 -> sem extensão)
        if (currentCandidateIndex + 1 < streamCandidates.size) {
            currentCandidateIndex++
            val nextUrl = streamCandidates[currentCandidateIndex]
            Log.w("ZyveronPlayer", "Falha no canal. Tentando rota alternativa ($currentCandidateIndex/${streamCandidates.size}): $nextUrl")
            _playbackState.value = PlaybackState.Buffering
            reconnectJob?.cancel()
            reconnectJob = scope.launch {
                delay(500)
                try {
                    val player = getPlayer()
                    player.stop()
                    val mediaItem = buildMediaItem(nextUrl)
                    player.setMediaItem(mediaItem)
                    player.prepare()
                    player.playWhenReady = true
                } catch (e: Exception) {
                    Log.e("ZyveronPlayer", "Erro ao alternar para rota alternativa", e)
                    handlePlaybackError(e.localizedMessage ?: errorMsg)
                }
            }
            return
        }

        // Se todos os candidatos falharam, realiza reconexão gradual com Exponential Backoff
        if (reconnectAttempts < maxReconnectAttempts && !currentStreamUrl.isNullOrBlank()) {
            reconnectAttempts++
            qosMonitor.incrementReconnectCount() // Registra reconexão no QoS
            val delayMs = backoffIntervals.getOrElse(reconnectAttempts - 1) { 5000L }
            _playbackState.value = PlaybackState.Reconnecting(reconnectAttempts, maxReconnectAttempts)

            Log.d("ZyveronPlayer", "Tentativa silenciosa $reconnectAttempts/$maxReconnectAttempts em ${delayMs}ms...")

            reconnectJob?.cancel()
            reconnectJob = scope.launch {
                delay(delayMs)
                retryCurrentStream()
            }
        } else {
            _playbackState.value = PlaybackState.Error(
                message = "Transmissão temporariamente indisponível na fonte. ($errorMsg)",
                canRetry = true
            )
        }
    }

    fun playStream(url: String, title: String) {
        try {
            reconnectJob?.cancel()
            reconnectAttempts = 0
            currentStreamUrl = url
            currentStreamTitle = title

            streamCandidates = generateStreamCandidates(url)
            currentCandidateIndex = 0

            val targetUrl = streamCandidates.getOrElse(0) { UrlHelper.normalizeUrl(url) }
            if (targetUrl.isBlank()) {
                Log.w("ZyveronPlayer", "URL vazia ou não configurada para stream.")
                _playbackState.value = PlaybackState.Error(
                    message = "Servidor ou canal não configurado no painel web.",
                    canRetry = false
                )
                return
            }

            _playbackState.value = PlaybackState.Buffering

            val player = getPlayer()
            player.stop()

            // Anexa QoS Monitor para rastrear métricas
            qosMonitor.attach(player, targetUrl, title)

            val mediaItem = buildMediaItem(targetUrl)

            player.setMediaItem(mediaItem)
            player.prepare()
            player.playWhenReady = true
            Log.d("ZyveronPlayer", "Iniciando canal: $title [$targetUrl] (Candidato 1/${streamCandidates.size})")
        } catch (e: Exception) {
            Log.e("ZyveronPlayer", "Erro ao executar playStream", e)
            _playbackState.value = PlaybackState.Error(
                message = "Falha ao inicializar stream: ${e.localizedMessage ?: e.javaClass.simpleName}",
                canRetry = true
            )
        }
    }

    fun retryCurrentStream() {
        try {
            val rawUrl = currentStreamUrl ?: return
            streamCandidates = generateStreamCandidates(rawUrl)
            currentCandidateIndex = 0
            val url = streamCandidates.firstOrNull() ?: UrlHelper.normalizeUrl(rawUrl)
            if (url.isBlank()) return
            _playbackState.value = PlaybackState.Buffering
            val player = getPlayer()
            player.stop()
            val mediaItem = buildMediaItem(url)
            player.setMediaItem(mediaItem)
            player.prepare()
            player.playWhenReady = true
        } catch (e: Exception) {
            Log.e("ZyveronPlayer", "Erro no retryCurrentStream", e)
            _playbackState.value = PlaybackState.Error(
                message = "Falha ao reiniciar stream: ${e.localizedMessage ?: e.javaClass.simpleName}",
                canRetry = true
            )
        }
    }

    fun stop() {
        try {
            reconnectJob?.cancel()
            exoPlayer?.stop()
            _playbackState.value = PlaybackState.Idle
        } catch (e: Exception) {
            Log.e("ZyveronPlayer", "Erro ao parar player", e)
        }
    }

    fun release() {
        try {
            reconnectJob?.cancel()
            exoPlayer?.release()
            exoPlayer = null
            _playbackState.value = PlaybackState.Idle
        } catch (e: Exception) {
            Log.e("ZyveronPlayer", "Erro ao liberar player", e)
        }
    }
}
