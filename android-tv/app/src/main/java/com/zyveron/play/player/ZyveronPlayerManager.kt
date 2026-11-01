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
    private val maxReconnectAttempts = 3
    private val backoffIntervals = listOf(1500L, 3000L, 6000L) // Decisão 1.A

    private val okHttpClient = NetworkSecurityHelper.createUnsafeOkHttpClient(connectTimeoutSec = 12, readTimeoutSec = 20)

    fun getPlayer(): ExoPlayer {
        return exoPlayer ?: createPlayer().also { exoPlayer = it }
    }

    private fun createPlayer(): ExoPlayer {
        try {
            // 1. Buffer Inteligente para TV: Início ultra-rápido (~1.5s) e absorção de oscilações
            val loadControl = DefaultLoadControl.Builder()
                .setBufferDurationsMs(
                    2500,  // Mínimo de buffer (ms)
                    15000, // Máximo de buffer (ms)
                    1500,  // Buffer para iniciar reprodução imediatamente no Zapping
                    3000   // Buffer após re-buffer
                )
                .setPrioritizeTimeOverSizeThresholds(true)
                .build()

            // 2. Tolerância a falhas MPEG-TS e resets de PCR/PTS em IPTV ao vivo (Multi-PMT padrão)
            val extractorsFactory = DefaultExtractorsFactory().apply {
                setTsExtractorFlags(
                    DefaultTsPayloadReaderFactory.FLAG_ALLOW_NON_IDR_KEYFRAMES or
                    DefaultTsPayloadReaderFactory.FLAG_DETECT_ACCESS_UNITS
                )
            }

            // 3. User-Agent e Headers customizados para contornar bloqueios HTTP 403
            val httpDataSourceFactory = OkHttpDataSource.Factory(okHttpClient)
                .setUserAgent("IPTVSmartersPro")

            val defaultDataSourceFactory = DefaultDataSource.Factory(context.applicationContext, httpDataSourceFactory)

            val mediaSourceFactory = DefaultMediaSourceFactory(defaultDataSourceFactory, extractorsFactory)

            val isAdaptive = SettingsHelper.isAdaptiveQualityEnabled(context.applicationContext)
            val trackSelector = androidx.media3.exoplayer.trackselection.DefaultTrackSelector(context.applicationContext).apply {
                parameters = buildUponParameters()
                    .setForceHighestSupportedBitrate(!isAdaptive)
                    .build()
            }

            val builder = ExoPlayer.Builder(context.applicationContext)
                .setTrackSelector(trackSelector)
                .setLoadControl(loadControl)
                .setMediaSourceFactory(mediaSourceFactory)
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

    private fun generateStreamCandidates(rawUrl: String): List<String> {
        val candidates = mutableListOf<String>()
        val primary = UrlHelper.normalizeUrl(rawUrl)
        if (primary.isNotBlank()) candidates.add(primary)

        // 1. Fallback alternando entre HTTPS e HTTP
        if (primary.startsWith("https://", ignoreCase = true)) {
            val httpUrl = primary.replaceFirst("https://", "http://", ignoreCase = true)
            if (!candidates.contains(httpUrl)) candidates.add(httpUrl)
        } else if (primary.startsWith("http://", ignoreCase = true)) {
            val httpsUrl = primary.replaceFirst("http://", "https://", ignoreCase = true)
            if (!candidates.contains(httpsUrl)) candidates.add(httpsUrl)
        }

        // 2. Fallback de extensão de container (.ts <-> .m3u8)
        val extVariants = mutableListOf<String>()
        for (c in candidates) {
            if (c.endsWith(".ts", ignoreCase = true)) {
                extVariants.add(c.substringBeforeLast(".ts") + ".m3u8")
            } else if (c.endsWith(".m3u8", ignoreCase = true)) {
                extVariants.add(c.substringBeforeLast(".m3u8") + ".ts")
            }
        }
        for (v in extVariants) {
            if (!candidates.contains(v)) candidates.add(v)
        }

        return candidates
    }

    /**
     * Executa a decisão 1.A: Reconexão gradual silenciosa com Exponential Backoff
     * e rotação inteligente de protocolo/esquema (HTTPS/HTTP e TS/M3U8).
     */
    private fun handlePlaybackError(errorMsg: String) {
        // Tenta primeiro os candidatos alternativos (ex: https -> http, ts -> m3u8)
        if (currentCandidateIndex + 1 < streamCandidates.size) {
            currentCandidateIndex++
            val nextUrl = streamCandidates[currentCandidateIndex]
            Log.w("ZyveronPlayer", "Falha no canal. Tentando rota alternativa ($currentCandidateIndex/${streamCandidates.size}): $nextUrl")
            _playbackState.value = PlaybackState.Buffering
            reconnectJob?.cancel()
            reconnectJob = scope.launch {
                delay(600)
                try {
                    val player = getPlayer()
                    player.stop()
                    val mediaItem = MediaItem.fromUri(Uri.parse(nextUrl))
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

            val mediaItem = MediaItem.Builder()
                .setUri(Uri.parse(targetUrl))
                .setMediaId(targetUrl)
                .build()

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
            val mediaItem = MediaItem.fromUri(Uri.parse(url))
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
