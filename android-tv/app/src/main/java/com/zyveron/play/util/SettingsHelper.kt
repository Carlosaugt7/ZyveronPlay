package com.zyveron.play.util

import android.content.Context

object SettingsHelper {

    private const val PREFS_NAME = "zyveron_settings"
    private const val KEY_ADAPTIVE_QUALITY = "adaptive_quality"
    private const val KEY_LIVE_PROTOCOL = "live_protocol"

    fun isAdaptiveQualityEnabled(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getBoolean(KEY_ADAPTIVE_QUALITY, true)
    }

    fun setAdaptiveQuality(context: Context, enabled: Boolean) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putBoolean(KEY_ADAPTIVE_QUALITY, enabled).apply()
    }

    fun getLiveProtocol(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_LIVE_PROTOCOL, "ts") ?: "ts"
    }

    fun setLiveProtocol(context: Context, protocol: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_LIVE_PROTOCOL, protocol.lowercase()).apply()
    }
}

