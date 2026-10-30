package com.zyveron.play.util

import com.zyveron.play.data.local.CategoryEntity

enum class CategoryGroup(val priority: Int, val headerTitle: String) {
    REGIONAL_ABERTO(1, "CANAIS REGIONAIS & ABERTOS"),
    REGULAR(2, "CANAIS TEMÁTICOS"),
    VINTE_QUATRO_HORAS(3, "── CANAIS 24 HORAS ──"),
    INTERNACIONAL(4, "── CANAIS INTERNACIONAIS ──")
}

object CategorySorter {

    // Regex abrangente para códigos de país, bandeiras, delimitadores IPTV ([US], |US|, US:, (US), etc.)
    private val internationalPrefixOrCodeRegex = Regex(
        "(?i)(?:^|[\\s\\[\\|\\(\\-_])" +
        "(?:us|usa|eua|uk|gb|eng|pt|prt|es|esp|fr|fra|it|ita|de|deu|ru|rus|" +
        "ar|arg|cl|chl|co|col|mx|mex|uy|ury|py|pry|pe|per|ve|ven|" +
        "ca|can|int|lat|latin|arab|turk)" +
        "(?:[\\s\\]\\|\\)\\-_:]|$)"
    )

    // Detecção de emojis de bandeiras de países (Unicode Regional Indicator Symbols)
    private val flagEmojiRegex = Regex("[\\uD83C][\\uDDE6-\\uDDFF][\\uD83C][\\uDDE6-\\uDDFF]")

    private val internationalKeywords = listOf(
        // Termos diretos
        "internaciona", "international", "exterior", "mundo", "world",
        // Continentes / Regiões
        "europa", "europe", "european", "latino", "latinos", "latin", "hispano", "hispanic",
        "asia", "ásia", "africa", "áfrica", "oceania", "oriente",
        // Países e gentílicos comuns em IPTV
        "estados unidos", "united states", "usa", "eua", "american", "americana",
        "united kingdom", "inglaterra", "reino unido", "british", "britanico", "britânico", "english",
        "portugal", "portugues", "português", "tvi", "sic ", "rtp",
        "espanha", "españa", "spain", "spanish", "espanhol",
        "italia", "italy", "italian", "italiano", "rai ",
        "frança", "franca", "france", "french", "francês", "frances",
        "alemanha", "germany", "german", "alemão", "alemao", "deutsch",
        "argentina", "argentino", "chile", "chileno", "colombia", "colômbia",
        "mexico", "méxico", "mexicano", "uruguai", "uruguay", "paraguai", "paraguay",
        "peru", "peruano", "venezuela", "bolivia", "bolívia", "equador", "ecuador",
        "canada", "canadá", "japao", "japão", "japan", "japanese",
        "china", "chinese", "coreia", "korea", "turquia", "turkey", "turk",
        "russia", "rússia", "russian", "arabe", "árabe", "arab"
    )

    fun isInternational(name: String): Boolean {
        val n = name.lowercase().trim()

        // 1. Emoji de bandeira internacional
        if (flagEmojiRegex.containsMatchIn(name)) {
            // Se contiver bandeira brasileira especificamente (🇧🇷), verificar se não é algo como "Globo Portugal"
            val hasBrFlag = name.contains("\uD83C\uDDE7\uD83C\uDDF7")
            if (!hasBrFlag) return true
        }

        // 2. Termos e palavras-chave de países/regiões internacionais
        if (internationalKeywords.any { n.contains(it) }) return true

        // 3. Códigos e prefixos padrão IPTV
        if (internationalPrefixOrCodeRegex.containsMatchIn(n)) return true

        return false
    }

    fun is24Horas(name: String): Boolean {
        val n = name.lowercase().trim()
        return n.contains("24h") ||
               n.contains("24 h") ||
               n.contains("24 horas") ||
               n.contains("24horas") ||
               n.contains("24/7") ||
               n.contains("vinte e quatro")
    }

    fun isRegionalOrAberto(name: String): Boolean {
        // Se for internacional ou 24 horas, NUNCA pode ser regional aberto
        if (isInternational(name)) return false
        if (is24Horas(name)) return false

        val n = name.lowercase().trim()
        val regionalTerms = listOf(
            "aberto", "abertos", "tv aberta", "canal aberto", "canais abertos",
            "regional", "regionais", "local", "locais", "estadual", "estaduais",
            "globo", "sbt", "record", "band", "bandeirantes",
            "redetv", "rede tv", "tv brasil", "cultura", "afiliada", "afiliadas"
        )
        return regionalTerms.any { n.contains(it) }
    }

    fun classify(name: String): CategoryGroup {
        return when {
            isInternational(name) -> CategoryGroup.INTERNACIONAL
            is24Horas(name) -> CategoryGroup.VINTE_QUATRO_HORAS
            isRegionalOrAberto(name) -> CategoryGroup.REGIONAL_ABERTO
            else -> CategoryGroup.REGULAR
        }
    }
}
