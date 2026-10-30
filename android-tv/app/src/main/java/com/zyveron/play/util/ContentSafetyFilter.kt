package com.zyveron.play.util

object ContentSafetyFilter {

    private val adultKeywords = listOf(
        "+18", "18+", "xxx", "adult", "adulto", "adultos", "porn", "porno",
        "sexy", "sexo", "erotic", "erótico", "playboy", "venus", "foradults",
        "hentai", "redlight", "onlyfans", "xvideos", "privilege", "sensual",
        "sex", "nudity", "hardcore"
    )

    /**
     * Retorna true se o conteúdo for seguro para a família (livre de termos adultos)
     */
    fun isSafe(name: String?, categoryName: String? = null): Boolean {
        val checkText = "${name ?: ""} ${categoryName ?: ""}".lowercase()
        return adultKeywords.none { keyword ->
            checkText.contains(keyword)
        }
    }

    /**
     * Identifica se um canal é esportivo (Futebol, Luta, Automobilismo, etc.)
     */
    fun isSportsChannel(name: String?, categoryName: String? = null): Boolean {
        val checkText = "${name ?: ""} ${categoryName ?: ""}".lowercase()
        val sportsKeywords = listOf(
            "premiere", "sportv", "espn", "combate", "dazn", "ufc", "bandsports",
            "futebol", "esporte", "sports", "tnt sports", "space sports", "conmebol",
            "copa", "champions", "libertadores", "nba", "nfl", "formula 1", "f1",
            "fox sports", "cazetv", "nosso futebol", "ge tv"
        )
        return sportsKeywords.any { checkText.contains(it) }
    }
}

