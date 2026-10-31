package com.zyveron.play.util

object UrlHelper {

    /**
     * Normaliza a URL do servidor Xtream / IPTV.
     * Garante que possua esquema http:// ou https:// e remove barras finais,
     * prevenindo exceções de 'unexpected url' do OkHttp / Media3.
     */
    fun normalizeUrl(rawUrl: String?): String {
        if (rawUrl.isNullOrBlank()) return ""
        var trimmed = rawUrl.trim().trimEnd('/')
        if (!trimmed.startsWith("http://", ignoreCase = true) &&
            !trimmed.startsWith("https://", ignoreCase = true)
        ) {
            trimmed = "http://$trimmed"
        }
        return trimmed
    }

    fun buildLiveStreamUrl(serverDns: String, username: String, password: String, streamId: Int): String {
        val cleanDns = normalizeUrl(serverDns)
        return if (cleanDns.isNotBlank()) "$cleanDns/live/$username/$password/$streamId.ts" else ""
    }

    fun buildVodStreamUrl(serverDns: String, username: String, password: String, streamId: Int, containerExt: String = "mp4"): String {
        val cleanDns = normalizeUrl(serverDns)
        val ext = containerExt.ifBlank { "mp4" }
        return if (cleanDns.isNotBlank()) "$cleanDns/movie/$username/$password/$streamId.$ext" else ""
    }

    fun buildSeriesStreamUrl(serverDns: String, username: String, password: String, episodeId: String, containerExt: String = "mp4"): String {
        val cleanDns = normalizeUrl(serverDns)
        val ext = containerExt.ifBlank { "mp4" }
        return if (cleanDns.isNotBlank()) "$cleanDns/series/$username/$password/$episodeId.$ext" else ""
    }
}
