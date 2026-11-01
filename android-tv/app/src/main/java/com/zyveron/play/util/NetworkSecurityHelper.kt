package com.zyveron.play.util

import android.annotation.SuppressLint
import okhttp3.ConnectionSpec
import okhttp3.OkHttpClient
import okhttp3.Protocol
import java.security.SecureRandom
import java.security.cert.X509Certificate
import java.util.concurrent.TimeUnit
import javax.net.ssl.HostnameVerifier
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

/**
 * Utilitário de conectividade de rede para servidores IPTV/Xtream.
 * Permite conexão segura e resiliente tanto para http:// quanto https://,
 * aceitando certificados auto-assinados, proxies e servidores de streaming sem travar o app.
 */
object NetworkSecurityHelper {

    val unsafeTrustManager = @SuppressLint("CustomX509TrustManager")
    object : X509TrustManager {
        @SuppressLint("TrustAllX509TrustManager")
        override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) {}

        @SuppressLint("TrustAllX509TrustManager")
        override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) {}

        override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
    }

    private val unsafeSslSocketFactory by lazy {
        val sslContext = SSLContext.getInstance("TLS")
        sslContext.init(null, arrayOf<TrustManager>(unsafeTrustManager), SecureRandom())
        sslContext.socketFactory
    }

    val unsafeHostnameVerifier = HostnameVerifier { _, _ -> true }

    private val permissiveTlsSpec by lazy {
        ConnectionSpec.Builder(ConnectionSpec.MODERN_TLS)
            .allEnabledTlsVersions()
            .allEnabledCipherSuites()
            .build()
    }

    fun createUnsafeOkHttpClient(
        connectTimeoutSec: Long = 15,
        readTimeoutSec: Long = 25
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .connectTimeout(connectTimeoutSec, TimeUnit.SECONDS)
            .readTimeout(readTimeoutSec, TimeUnit.SECONDS)
            .sslSocketFactory(unsafeSslSocketFactory, unsafeTrustManager)
            .hostnameVerifier(unsafeHostnameVerifier)
            .connectionSpecs(
                listOf(
                    permissiveTlsSpec,
                    ConnectionSpec.MODERN_TLS,
                    ConnectionSpec.COMPATIBLE_TLS,
                    ConnectionSpec.CLEARTEXT
                )
            )
            .protocols(listOf(Protocol.HTTP_1_1))
            .followRedirects(true)
            .followSslRedirects(true)
            .retryOnConnectionFailure(true)
            .addInterceptor { chain ->
                val original = chain.request()
                val urlStr = original.url.toString()
                val userAgent = if (urlStr.contains("player_api.php", ignoreCase = true)) {
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                } else {
                    "IPTVSmartersPro"
                }
                val request = original.newBuilder()
                    .header("User-Agent", userAgent)
                    .header("Accept", "*/*")
                    .build()
                chain.proceed(request)
            }
            .build()
    }
}

