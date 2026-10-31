package com.zyveron.play.util

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.WifiManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext

enum class NetworkStatus(val label: String) {
    EXCELLENT("Sinal Estável"),
    MODERATE("Sinal Oscilando"),
    DISCONNECTED("Sem Internet")
}

@Composable
fun rememberNetworkStatus(): NetworkStatus {
    val context = LocalContext.current
    var status by remember { mutableStateOf(getNetworkStatus(context)) }

    DisposableEffect(context) {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                status = getNetworkStatus(context)
            }

            override fun onLost(network: Network) {
                status = getNetworkStatus(context)
            }

            override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
                status = getNetworkStatus(context)
            }
        }

        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        try {
            cm?.registerNetworkCallback(request, callback)
        } catch (_: Exception) {}

        onDispose {
            try {
                cm?.unregisterNetworkCallback(callback)
            } catch (_: Exception) {}
        }
    }

    return status
}

fun getNetworkStatus(context: Context): NetworkStatus {
    val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        ?: return NetworkStatus.DISCONNECTED
    val activeNetwork = cm.activeNetwork ?: return NetworkStatus.DISCONNECTED
    val caps = cm.getNetworkCapabilities(activeNetwork) ?: return NetworkStatus.DISCONNECTED

    if (!caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) {
        return NetworkStatus.DISCONNECTED
    }

    // Conexão via Cabo de Rede Ethernet (Mi Box / Adaptador USB-RJ45)
    if (caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
        return NetworkStatus.EXCELLENT
    }

    // Conexão via Wi-Fi (Padrão Mi TV Stick)
    if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
        return try {
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            val rssi = wifiManager?.connectionInfo?.rssi ?: -60

            // RSSI acima de -72 dBm indica sinal forte e ideal para streaming 1080p/4K
            if (rssi >= -72) {
                NetworkStatus.EXCELLENT
            } else {
                NetworkStatus.MODERATE
            }
        } catch (_: Exception) {
            NetworkStatus.EXCELLENT
        }
    }

    return NetworkStatus.EXCELLENT
}

