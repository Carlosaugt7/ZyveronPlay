package com.zyveron.play.util

import android.util.Base64
import com.zyveron.play.data.model.EpgProgram
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object EpgHelper {

    private val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
    private val dateTimeFormatters = listOf(
        SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()),
        SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault()),
        SimpleDateFormat("yyyyMMddHHmmss", Locale.getDefault())
    )

    /**
     * Decodifica título ou sinopse do EPG caso o servidor envie em Base64,
     * ou mantém como texto original caso já esteja em texto legível.
     */
    fun decodeEpgText(raw: String?): String {
        if (raw.isNullOrBlank()) return ""
        val trimmed = raw.trim()
        if (trimmed.contains(" ") || trimmed.contains("\n") || trimmed.contains("\r")) {
            return trimmed
        }
        return try {
            val decodedBytes = Base64.decode(trimmed, Base64.DEFAULT)
            val decoded = String(decodedBytes, Charsets.UTF_8).trim()
            if (decoded.isNotEmpty() && decoded.all { !it.isISOControl() || it == '\n' || it == '\r' || it == '\t' }) {
                decoded
            } else {
                trimmed
            }
        } catch (_: Exception) {
            trimmed
        }
    }

    /**
     * Converte timestamp (em segundos ou ms) ou string de data para Unix timestamp em segundos.
     */
    fun parseTimestamp(tsString: String?, dateString: String?): Long {
        if (!tsString.isNullOrBlank()) {
            tsString.toLongOrNull()?.let {
                return if (it > 9999999999L) it / 1000L else it
            }
        }
        if (!dateString.isNullOrBlank()) {
            val cleanDate = dateString.trim()
            for (formatter in dateTimeFormatters) {
                try {
                    val date = formatter.parse(cleanDate)
                    if (date != null) {
                        return date.time / 1000L
                    }
                } catch (_: Exception) {}
            }
        }
        return 0L
    }

    /**
     * Formata horário amigável HH:mm
     */
    fun formatTime(timestampSec: Long, fallbackDateStr: String?): String {
        if (timestampSec > 0L) {
            return timeFormat.format(Date(timestampSec * 1000L))
        }
        if (!fallbackDateStr.isNullOrBlank()) {
            val parts = fallbackDateStr.trim().split(" ")
            if (parts.size >= 2) {
                val timePart = parts[1]
                val timeSegments = timePart.split(":")
                if (timeSegments.size >= 2) {
                    return "${timeSegments[0]}:${timeSegments[1]}"
                }
            }
        }
        return "--:--"
    }

    /**
     * Faz o parse completo de resposta JSON de EPG do Xtream Codes.
     * Suporta tanto formato { "epg_listings": [...] } quanto formato direto [ {...} ]
     */
    fun parseEpgJson(jsonString: String): List<EpgProgram> {
        val result = mutableListOf<EpgProgram>()
        val trimmed = jsonString.trim()
        if (trimmed.isEmpty()) return result

        try {
            val listings = when {
                trimmed.startsWith("{") -> {
                    val obj = JSONObject(trimmed)
                    obj.optJSONArray("epg_listings") ?: JSONArray()
                }
                trimmed.startsWith("[") -> {
                    JSONArray(trimmed)
                }
                else -> JSONArray()
            }

            val nowSec = System.currentTimeMillis() / 1000L

            for (i in 0 until listings.length()) {
                val item = listings.optJSONObject(i) ?: continue
                val id = item.optString("id", "$i")
                val title = decodeEpgText(item.optString("title"))
                val desc = decodeEpgText(item.optString("description"))

                val startTs = parseTimestamp(
                    item.optString("start_timestamp"),
                    item.optString("start")
                )
                val stopTs = parseTimestamp(
                    item.optString("stop_timestamp"),
                    item.optString("end")
                )

                val startFormatted = formatTime(startTs, item.optString("start"))
                val endFormatted = formatTime(stopTs, item.optString("end"))

                val isNowPlaying = item.optInt("now_playing") == 1 ||
                        (startTs > 0L && stopTs > 0L && nowSec in startTs..stopTs)

                val progress = if (startTs > 0L && stopTs > startTs && nowSec in startTs..stopTs) {
                    ((nowSec - startTs).toFloat() / (stopTs - startTs).toFloat()).coerceIn(0f, 1f)
                } else if (nowSec > stopTs && stopTs > 0L) {
                    1f
                } else {
                    0f
                }

                if (title.isNotBlank()) {
                    result.add(
                        EpgProgram(
                            id = id,
                            title = title,
                            description = desc,
                            startFormatted = startFormatted,
                            endFormatted = endFormatted,
                            startTimestamp = startTs,
                            stopTimestamp = stopTs,
                            isNowPlaying = isNowPlaying,
                            progress = progress
                        )
                    )
                }
            }
        } catch (_: Exception) {}

        result.sortBy { it.startTimestamp }
        return result
    }
}

