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
}

