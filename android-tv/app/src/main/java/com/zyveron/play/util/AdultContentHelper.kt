package com.zyveron.play.util

import android.content.Context

object AdultContentHelper {

    private val ADULT_KEYWORDS = listOf(
        "ADULTO", "ADULTOS", "XXX", "+18", "18+", "EROTICO", "ERÓTICO",
        "PRIVE", "PRIVÉ", "PLAYBOY", "SEXY", "FORBIDDEN", "VENUS", "HOT",
        "PENTHOUSE", "REDLIGHT", "HUSTLER", "BRAZZERS", "PORNO", "PÔRNO"
    )

    private const val PREFS_NAME = "zyveron_security"
    private const val KEY_PIN = "adult_content_pin"
    private const val DEFAULT_PIN = "0000"

    // Desbloqueio válido durante a sessão atual do app
    @Volatile
    private var isUnlockedForSession = false

    fun isSessionUnlocked(): Boolean = isUnlockedForSession

    fun unlockSession() {
        isUnlockedForSession = true
    }

    fun lockSession() {
        isUnlockedForSession = false
    }

    fun isAdultCategory(categoryName: String?): Boolean {
        if (categoryName.isNullOrBlank()) return false
        val upper = categoryName.uppercase()
        return ADULT_KEYWORDS.any { keyword ->
            upper.contains(keyword)
        }
    }

    fun getStoredPin(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_PIN, DEFAULT_PIN) ?: DEFAULT_PIN
    }

    fun setStoredPin(context: Context, newPin: String) {
        val clean = newPin.trim().take(4)
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_PIN, clean).apply()
    }

    fun verifyPin(context: Context, inputPin: String): Boolean {
        val currentPin = getStoredPin(context)
        val valid = inputPin.trim() == currentPin
        if (valid) {
            unlockSession()
        }
        return valid
    }

    /**
     * Reordena a lista de categorias colocando SEMPRE as categorias adultas no FINAL.
     */
    fun <T> partitionAdultCategories(
        categories: List<T>,
        nameSelector: (T) -> String
    ): List<T> {
        val regular = ArrayList<T>()
        val adult = ArrayList<T>()

        for (cat in categories) {
            if (isAdultCategory(nameSelector(cat))) {
                adult.add(cat)
            } else {
                regular.add(cat)
            }
        }
        return regular + adult
    }
}

