package com.zyveron.play.analytics

import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi

/**
 * Métricas de Qualidade de Streaming (QoS - Quality of Service)
 * Rastreia performance do player em tempo real para debug e analytics
 */
@OptIn(UnstableApi::class)
data class QoSMetrics(
    val sessionId: String,
    val streamUrl: String,
    val streamTitle: String = "",
    val startTime: Long,
    val endTime: Long? = null,
    
    // Bitrate
    val avgBitrate: Long = 0,      // Bitrate médio em bps
    val minBitrate: Long = 0,      // Bitrate mínimo em bps
    val maxBitrate: Long = 0,      // Bitrate máximo em bps
    
    // Buffer
    val bufferedDuration: Long = 0,     // Duração bufferizada em ms
    val rebufferCount: Int = 0,         // Número de rebuffers
    val rebufferDuration: Long = 0,     // Tempo total em rebuffer (ms)
    
    // Frames
    val droppedFrames: Int = 0,         // Frames descartados
    val totalFrames: Int = 0,           // Total de frames renderizados
    
    // Network
    val networkType: String = "unknown", // wifi, ethernet, mobile
    val rssi: Int = 0,                   // Força do sinal Wi-Fi (dBm)
    
    // Errors
    val errorCount: Int = 0,
    val lastError: String? = null,
    
    // Reconnections
    val reconnectCount: Int = 0
) {
    /**
     * Calcula taxa de frame drop em porcentagem
     */
    fun getFrameDropRate(): Float {
        return if (totalFrames > 0) {
            (droppedFrames.toFloat() / totalFrames.toFloat()) * 100f
        } else 0f
    }
    
    /**
     * Calcula tempo médio de rebuffer (ms)
     */
    fun getAvgRebufferTime(): Long {
        return if (rebufferCount > 0) {
            rebufferDuration / rebufferCount
        } else 0L
    }
    
    /**
     * Calcula score de qualidade (0-100)
     * - 90-100: Excelente
     * - 70-89: Bom
     * - 50-69: Moderado
     * - 30-49: Ruim
     * - 0-29: Crítico
     */
    fun getQualityScore(): Int {
        var score = 100
        
        // Penaliza rebuffers (mais crítico)
        score -= (rebufferCount * 15).coerceAtMost(50)
        
        // Penaliza frame drops
        val dropRate = getFrameDropRate()
        when {
            dropRate > 5f -> score -= 30
            dropRate > 1f -> score -= 20
            dropRate > 0.1f -> score -= 10
        }
        
        // Penaliza erros
        score -= (errorCount * 10).coerceAtMost(30)
        
        // Penaliza reconexões
        score -= (reconnectCount * 5).coerceAtMost(20)
        
        return score.coerceAtLeast(0)
    }
    
    /**
     * Retorna classificação textual da qualidade
     */
    fun getQualityLabel(): String {
        return when (getQualityScore()) {
            in 90..100 -> "Excelente"
            in 70..89 -> "Bom"
            in 50..69 -> "Moderado"
            in 30..49 -> "Ruim"
            else -> "Crítico"
        }
    }
    
    /**
     * Verifica se a sessão está saudável
     */
    fun isHealthy(): Boolean {
        return getQualityScore() >= 70 &&
               rebufferCount <= 2 &&
               getFrameDropRate() < 1f
    }
}
