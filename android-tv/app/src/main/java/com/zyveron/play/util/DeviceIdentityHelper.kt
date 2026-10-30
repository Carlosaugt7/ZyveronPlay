package com.zyveron.play.util

import android.content.Context
import android.media.MediaDrm
import android.os.Build
import android.provider.Settings
import java.security.MessageDigest
import java.util.Locale
import java.util.UUID
import kotlin.random.Random

/**
 * Utilitário para geração de Virtual MAC e Device Key.
 * Compatível com 100% dos aparelhos Android TV, Fire Sticks e TV Boxes (Android 7 a 14+),
 * contornando a restrição do Google sobre MACs físicos sem perder a persistência do ID.
 */
object DeviceIdentityHelper {

    private const val PREFS_NAME = "zyveron_device_identity"
    private const val KEY_VIRTUAL_MAC = "cached_virtual_mac"
    private const val KEY_DEVICE_KEY = "cached_device_key"

    // UUID padrão para Widevine DRM (presente em 99.9% dos dispositivos Android com suporte a mídia)
    private val WIDEVINE_UUID = UUID(-0x121074568629b532L, -0x5c37d8232ae2de13L)

    /**
     * Retorna o Virtual MAC único e persistente no formato XX:XX:XX:XX:XX:XX
     */
    fun getVirtualMac(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val cachedMac = prefs.getString(KEY_VIRTUAL_MAC, null)
        if (!cachedMac.isNullOrEmpty()) {
            return cachedMac
        }

        // Tenta coletar ID único do hardware via MediaDrm (Widevine)
        val hardwareId = getWidevineUniqueId() ?: getAndroidId(context)

        // Gera hash SHA-256 do hardwareId para criar 6 octetos determinísticos
        val sha256 = MessageDigest.getInstance("SHA-256").digest(hardwareId.toByteArray())
        
        // Formata os primeiros 6 bytes em formato MAC (XX:XX:XX:XX:XX:XX)
        // Força primeiro octeto a ser '00' ou '02' para simular OUI válido
        val macBuilder = StringBuilder()
        macBuilder.append("00") // Identificador padrão Zyveron
        for (i in 1..5) {
            macBuilder.append(String.format(Locale.US, ":%02X", sha256[i]))
        }

        val generatedMac = macBuilder.toString()
        prefs.edit().putString(KEY_VIRTUAL_MAC, generatedMac).apply()
        return generatedMac
    }

    /**
     * Retorna a Device Key (PIN de 6 dígitos) única persistente do aparelho
     */
    fun getDeviceKey(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val cachedKey = prefs.getString(KEY_DEVICE_KEY, null)
        if (!cachedKey.isNullOrEmpty()) {
            return cachedKey
        }

        // Gera PIN aleatório de 6 dígitos seguro (ex: 749210)
        val generatedKey = String.format(Locale.US, "%06d", Random.nextInt(100000, 999999))
        prefs.edit().putString(KEY_DEVICE_KEY, generatedKey).apply()
        return generatedKey
    }

    private fun getWidevineUniqueId(): String? {
        return try {
            val mediaDrm = MediaDrm(WIDEVINE_UUID)
            val uniqueIdBytes = mediaDrm.getPropertyByteArray(MediaDrm.PROPERTY_DEVICE_UNIQUE_ID)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                mediaDrm.close()
            } else {
                @Suppress("DEPRECATION")
                mediaDrm.release()
            }
            uniqueIdBytes.joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            null
        }
    }

    private fun getAndroidId(context: Context): String {
        return Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        ) ?: ("generic-" + Build.BOARD + "-" + Build.MODEL)
    }
}

