package com.zyveron.play.analytics

import android.content.Context
import android.util.Log
import androidx.annotation.OptIn
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.analytics.AnalyticsListener
import com.zyveron.play.util.getNetworkStatus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID

/**
 * Monitor de Qualidade de Streaming em Tempo Real
 * Rastreia métricas do ExoPlayer para analytics e debug
 */
@OptIn(UnstableApi::class)
class QoSMonitor(private val context: Context) {
    private val _metrics = MutableStateFlow<QoSMetrics?>(null)
    val metrics: StateFlow<QoSMetrics?> = _metrics.asStateFlow()
    
    private var sessionId: String = UUID.randomUUID().toString()
    private var streamUrl: String = ""
    private var streamTitle: String = ""
    private var startTime: Long = 0
    
    private var isBuffering = false
    private var bufferStartTime: Long = 0
    private var totalRebufferDuration: Long = 0
    private var rebufferCount = 0
    
    private var errorCount = 0
    private var lastError: String? = null
    private var reconnectCount = 0
    
    private var avgBitrate: Long = 0
    private var minBitrate: Long = Long.MAX_VALUE
    private var maxBitrate: Long = 0
    private var bitrateSum: Long = 0
    private var bitrateSamples: Int = 0
    
    private var analyticsListener: AnalyticsListener? = null
    
    /**
     * Anexa o monitor a um player e stream
     */
    fun attach(player: ExoPlayer, url: String, title: String = "") {
        reset()
        sessionId = UUID.randomUUID().toString()
        streamUrl = url
        streamTitle = title
        startTime = System.currentTimeMillis()
        
        // Remove listener anterior se existir
        analyticsListener?.let { player.removeAnalyticsListener(it) }
        
        analyticsListener = object : AnalyticsListener {
            
            override fun onBandwidthEstimate(
                eventTime: AnalyticsListener.EventTime,
                totalLoadTimeMs: Int,
                totalBytesLoaded: Long,
                bitrateEstimate: Long
            ) {
                if (bitrateEstimate > 0) {
                    bitrateSum += bitrateEstimate
                    bitrateSamples++
                    avgBitrate = bitrateSum / bitrateSamples
                    
                    if (bitrateEstimate < minBitrate) minBitrate = bitrateEstimate
                    if (bitrateEstimate > maxBitrate) maxBitrate = bitrateEstimate
                }
                updateMetrics(player)
            }
            
            override fun onPlaybackStateChanged(
                eventTime: AnalyticsListener.EventTime,
                state: Int
            ) {
                when (state) {
                    Player.STATE_BUFFERING -> {
                        if (!isBuffering) {
                            isBuffering = true
                            bufferStartTime = System.currentTimeMillis()
                            rebufferCount++
                            Log.d(TAG, "Rebuffer iniciado (#$rebufferCount)")
                        }
                    }
                    Player.STATE_READY -> {
                        if (isBuffering) {
                            isBuffering = false
                            val duration = System.currentTimeMillis() - bufferStartTime
                            totalRebufferDuration += duration
                            Log.d(TAG, "Rebuffer finalizado (${duration}ms)")
                        }
                    }
                    Player.STATE_ENDED -> {
                        logFinalReport()
                    }
                }
                updateMetrics(player)
            }
            
            override fun onDroppedVideoFrames(
                eventTime: AnalyticsListener.EventTime,
                droppedFrames: Int,
                elapsedMs: Long
            ) {
                if (droppedFrames > 0) {
                    Log.w(TAG, "Frames descartados: $droppedFrames em ${elapsedMs}ms")
                }
                updateMetrics(player)
            }
            
            override fun onPlayerError(
                eventTime: AnalyticsListener.EventTime,
                error: androidx.media3.common.PlaybackException
            ) {
                errorCount++
                lastError = error.errorCodeName
                Log.e(TAG, "Erro de playback: ${error.errorCodeName} - ${error.message}")
                updateMetrics(player)
            }
        }
        
        player.addAnalyticsListener(analyticsListener!!)
        Log.d(TAG, "QoS Monitor anexado (SessionID: $sessionId)")
    }
    
    /**
     * Incrementa contador de reconexões
     */
    fun incrementReconnectCount() {
        reconnectCount++
        _metrics.value?.let { current ->
            _metrics.value = current.copy(reconnectCount = reconnectCount)
        }
    }
    
    /**
     * Atualiza métricas em tempo real
     */
    private fun updateMetrics(player: ExoPlayer) {
        val videoFormat = player.videoFormat
        val stats = player.videoDecoderCounters
        val networkStatus = getNetworkStatus(context)
        
        val currentMetrics = QoSMetrics(
            sessionId = sessionId,
            streamUrl = streamUrl,
            streamTitle = streamTitle,
            startTime = startTime,
            endTime = if (player.playbackState == Player.STATE_ENDED) System.currentTimeMillis() else null,
            avgBitrate = avgBitrate,
            minBitrate = if (minBitrate == Long.MAX_VALUE) 0 else minBitrate,
            maxBitrate = maxBitrate,
            bufferedDuration = player.totalBufferedDuration,
            rebufferCount = rebufferCount,
            rebufferDuration = totalRebufferDuration,
            droppedFrames = stats?.droppedBufferCount ?: 0,
            totalFrames = stats?.renderedOutputBufferCount ?: 0,
            networkType = networkStatus.name.lowercase(),
            errorCount = errorCount,
            lastError = lastError,
            reconnectCount = reconnectCount
        )
        
        _metrics.value = currentMetrics
        
        // Log periódico de qualidade
        if (currentMetrics.getQualityScore() < 50) {
            Log.w(TAG, "Qualidade baixa detectada: ${currentMetrics.getQualityLabel()} (${currentMetrics.getQualityScore()}/100)")
        }
    }
    
    /**
     * Reseta todas as métricas
     */
    fun reset() {
        _metrics.value = null
        sessionId = UUID.randomUUID().toString()
        streamUrl = ""
        streamTitle = ""
        startTime = 0
        isBuffering = false
        bufferStartTime = 0
        totalRebufferDuration = 0
        rebufferCount = 0
        errorCount = 0
        lastError = null
        reconnectCount = 0
        avgBitrate = 0
        minBitrate = Long.MAX_VALUE
        maxBitrate = 0
        bitrateSum = 0
        bitrateSamples = 0
    }
    
    /**
     * Remove listener do player
     */
    fun detach(player: ExoPlayer?) {
        analyticsListener?.let { 
            player?.removeAnalyticsListener(it)
        }
        analyticsListener = null
    }
    
    /**
     * Gera relatório textual completo
     */
    fun getReport(): String {
        val m = _metrics.value ?: return "Sem dados de QoS disponíveis"
        val duration = (m.endTime ?: System.currentTimeMillis()) - m.startTime
        val durationSec = duration / 1000
        
        return """
            ╔═══════════════════════════════════════════════════════
            ║ RELATÓRIO DE QUALIDADE DE STREAMING (QoS)
            ╠═══════════════════════════════════════════════════════
            ║ Sessão: ${m.sessionId}
            ║ Canal: ${m.streamTitle.ifEmpty { "N/A" }}
            ║ Duração: ${durationSec}s
            ║
            ╠─── SCORE DE QUALIDADE ────────────────────────────────
            ║ Score: ${m.getQualityScore()}/100
            ║ Status: ${m.getQualityLabel()}
            ║ Saudável: ${if (m.isHealthy()) "✓ Sim" else "✗ Não"}
            ║
            ╠─── BITRATE ───────────────────────────────────────────
            ║ Médio: ${m.avgBitrate / 1_000} Kbps
            ║ Mínimo: ${m.minBitrate / 1_000} Kbps
            ║ Máximo: ${m.maxBitrate / 1_000} Kbps
            ║
            ╠─── BUFFER E REBUFFER ─────────────────────────────────
            ║ Rebuffers: ${m.rebufferCount}
            ║ Tempo total: ${m.rebufferDuration / 1000}s
            ║ Tempo médio: ${m.getAvgRebufferTime()}ms
            ║ Bufferizado: ${m.bufferedDuration / 1000}s
            ║
            ╠─── FRAMES ────────────────────────────────────────────
            ║ Drops: ${m.droppedFrames} / ${m.totalFrames}
            ║ Taxa de drop: ${String.format("%.2f", m.getFrameDropRate())}%
            ║
            ╠─── REDE ──────────────────────────────────────────────
            ║ Tipo: ${m.networkType}
            ║ Reconexões: ${m.reconnectCount}
            ║
            ╠─── ERROS ─────────────────────────────────────────────
            ║ Total: ${m.errorCount}
            ║ Último: ${m.lastError ?: "Nenhum"}
            ╚═══════════════════════════════════════════════════════
        """.trimIndent()
    }
    
    /**
     * Log do relatório final ao terminar sessão
     */
    private fun logFinalReport() {
        Log.i(TAG, getReport())
    }
    
    companion object {
        private const val TAG = "QoSMonitor"
    }
}
