package com.zyveron.play.util

object ContentSafetyFilter {

    private val blockedKeywords = listOf(
        "+18", "18+", "xxx", "adulto", "adultos", "adult", "porn", "porno", "pornô",
        "sexy", "erotico", "erótico", "playboy", "venus", "for man", "penthouse",
        "hustler", "redlight", "sex", "hentai", "privada", "cam4", "onlyfans",
        "sensual", "strip", "babes", "hardcore", "softcore", "garotas"
    )

    fun isSafe(name: String?, categoryName: String? = null): Boolean {
        val checkText = "${name.orEmpty()} ${categoryName.orEmpty()}".lowercase()
        return blockedKeywords.none { keyword -> checkText.contains(keyword) }
    }
}

