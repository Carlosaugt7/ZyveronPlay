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
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.source.MediaSource
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import androidx.media3.extractor.DefaultExtractorsFactory
import androidx.media3.extractor.ts.DefaultTsPayloadReaderFactory
import androidx.media3.extractor.ts.TsExtractor
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

    private var exoPlayer: ExoPlayer? = null
    private val scope = CoroutineScope(Dispatchers.Main)
    private var reconnectJob: Job? = null

    private val _playbackState = MutableStateFlow<PlaybackState>(PlaybackState.Idle)
    val playbackState: StateFlow<PlaybackState> = _playbackState.asStateFlow()

    private var currentStreamUrl: String? = null
    private var currentStreamTitle: String = ""
    private var reconnectAttempts = 0
    private val maxReconnectAttempts = 3
    private val backoffIntervals = listOf(1500L, 3000L, 6000L) // Decisão 1.A

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    fun getPlayer(): ExoPlayer {
        return exoPlayer ?: createPlayer().also { exoPlayer = it }
    }

    private fun createPlayer(): ExoPlayer {
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

        // 2. Tolerância a falhas MPEG-TS e resets de PCR/PTS em IPTV ao vivo
        val extractorsFactory = DefaultExtractorsFactory().apply {
            setTsExtractorFlags(
                DefaultTsPayloadReaderFactory.FLAG_ALLOW_NON_IDR_KEYFRAMES or
                DefaultTsPayloadReaderFactory.FLAG_DETECT_ACCESS_UNITS
            )
            setTsExtractorMode(TsExtractor.MODE_SINGLE_PMT)
        }

        // 3. User-Agent e Headers customizados para contornar bloqueios HTTP 403
        val httpDataSourceFactory = OkHttpDataSource.Factory(okHttpClient)
            .setUserAgent("ZyveronPlayTV/1.0 (Linux; Android TV; Media3 ExoPlayer)")

        val mediaSourceFactory = DefaultMediaSourceFactory(httpDataSourceFactory, extractorsFactory)

        return ExoPlayer.Builder(context)
            .setLoadControl(loadControl)
            .setMediaSourceFactory(mediaSourceFactory)
            .setHandleAudioBecomingNoisy(true)
            .setWakeMode(C.WAKE_MODE_NETWORK)
            .build()
            .apply {
                addListener(createPlayerListener())
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
            Log.w("ZyveronPlayer", "Erro na reprodução (${error.errorCodeName}): ${error.message}")
            handlePlaybackError(error.localizedMessage ?: "Erro na transmissão")
        }
    }

    /**
     * Executa a decisão 1.A: Reconexão gradual silenciosa com Exponential Backoff
     */
    private fun handlePlaybackError(errorMsg: String) {
        if (reconnectAttempts < maxReconnectAttempts && currentStreamUrl != null) {
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
        reconnectJob?.cancel()
        reconnectAttempts = 0
        currentStreamUrl = url
        currentStreamTitle = title
        _playbackState.value = PlaybackState.Buffering

        val player = getPlayer()
        player.stop()

        val mediaItem = MediaItem.Builder()
            .setUri(Uri.parse(url))
            .setMediaId(url)
            .build()

        player.setMediaItem(mediaItem)
        player.prepare()
        player.playWhenReady = true
        Log.d("ZyveronPlayer", "Iniciando canal: $title [$url]")
    }

    fun retryCurrentStream() {
        val url = currentStreamUrl ?: return
        val player = getPlayer()
        val mediaItem = MediaItem.fromUri(Uri.parse(url))
        player.setMediaItem(mediaItem)
        player.prepare()
        player.playWhenReady = true
    }

    fun stop() {
        reconnectJob?.cancel()
        exoPlayer?.stop()
        _playbackState.value = PlaybackState.Idle
    }

    fun release() {
        reconnectJob?.cancel()
        exoPlayer?.release()
        exoPlayer = null
        _playbackState.value = PlaybackState.Idle
    }
}

