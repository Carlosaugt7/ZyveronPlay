package com.zyveron.play.data.remote

import android.content.Context
import android.util.Log
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.zyveron.play.util.DeviceIdentityHelper
import com.zyveron.play.util.UrlHelper
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

sealed class DeviceAuthState {
    object Loading : DeviceAuthState()
    data class Unregistered(val mac: String, val deviceKey: String) : DeviceAuthState()
    data class Blocked(val reason: String) : DeviceAuthState()
    data class Expired(val expirationDate: String) : DeviceAuthState()
    data class Active(
        val mac: String,
        val serverName: String = "Zyveron Server",
        val serverDns: String,
        val fallbackDns: List<String>,
        val username: String,
        val password: String,
        val expirationDate: String
    ) : DeviceAuthState()
}

data class TvBroadcastMessage(
    val id: String,
    val title: String,
    val message: String
)

class FirestoreDeviceManager(private val context: Context) {

    private val firestore = FirebaseFirestore.getInstance()
    private val scope = CoroutineScope(Dispatchers.IO + CoroutineExceptionHandler { _, err ->
        Log.e("FirestoreDeviceManager", "Erro no escopo coroutines", err)
    })

    private val _authState = MutableStateFlow<DeviceAuthState>(DeviceAuthState.Loading)
    val authState: StateFlow<DeviceAuthState> = _authState.asStateFlow()

    private val _activeBroadcast = MutableStateFlow<TvBroadcastMessage?>(null)
    val activeBroadcast: StateFlow<TvBroadcastMessage?> = _activeBroadcast.asStateFlow()

    private var deviceListener: ListenerRegistration? = null
    private var serverListener: ListenerRegistration? = null
    private var notificationsListener: ListenerRegistration? = null

    val virtualMac: String = DeviceIdentityHelper.getVirtualMac(context)
    val deviceKey: String = DeviceIdentityHelper.getDeviceKey(context)

    fun startListening() {
        Log.d("FirestoreDeviceManager", "Iniciando monitoramento para MAC: $virtualMac")
        
        // 1. Escuta mudanças em tempo real no documento do Aparelho (MAC)
        deviceListener = firestore.collection("devices").document(virtualMac)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirestoreDeviceManager", "Erro ao ouvir dispositivo", error)
                    return@addSnapshotListener
                }

                if (snapshot == null || !snapshot.exists()) {
                    // Aparelho ainda não cadastrado no painel web
                    _authState.value = DeviceAuthState.Unregistered(virtualMac, deviceKey)
                    return@addSnapshotListener
                }

                val status = snapshot.getString("status") ?: "active"
                val expDateStr = snapshot.getString("expirationDate") ?: ""
                val serverId = snapshot.getString("serverId") ?: ""
                val serverName = snapshot.getString("serverName") ?: "Zyveron Server"
                val rawServerDns = snapshot.getString("serverDns") ?: ""
                val serverDns = UrlHelper.normalizeUrl(rawServerDns)
                val username = snapshot.getString("username") ?: ""
                val password = snapshot.getString("password") ?: ""

                // Verifica bloqueio administrativo
                if (status == "blocked") {
                    _authState.value = DeviceAuthState.Blocked("Acesso bloqueado pela administração.")
                    return@addSnapshotListener
                }

                // Verifica se a mensalidade venceu
                if (isExpired(expDateStr)) {
                    _authState.value = DeviceAuthState.Expired(expDateStr)
                    return@addSnapshotListener
                }

                // 2. Libera o acesso imediatamente e conecta ao Servidor para obter atualizações em tempo real
                _authState.value = DeviceAuthState.Active(
                    mac = virtualMac,
                    serverName = serverName,
                    serverDns = serverDns,
                    fallbackDns = emptyList(),
                    username = username,
                    password = password,
                    expirationDate = expDateStr
                )

                if (serverId.isNotEmpty()) {
                    listenToServer(serverId, serverName, username, password, expDateStr, serverDns)
                }
            }

        // 3. Escuta notificações e avisos em tempo real para exibir na TV
        listenToBroadcastMessages()
    }

    private fun listenToServer(
        serverId: String,
        fallbackServerName: String,
        username: String,
        password: String,
        expDate: String,
        fallbackDnsUrl: String
    ) {
        serverListener?.remove()

        serverListener = firestore.collection("servers").document(serverId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirestoreDeviceManager", "Erro ao obter servidor $serverId", error)
                    return@addSnapshotListener
                }

                val activeServerName = snapshot?.getString("name") ?: fallbackServerName
                val activeDns = UrlHelper.normalizeUrl(snapshot?.getString("activeDns") ?: fallbackDnsUrl)
                @Suppress("UNCHECKED_CAST")
                val fallbackDns = (snapshot?.get("fallbackDns") as? List<String>) ?: emptyList()

                Log.d("FirestoreDeviceManager", "Servidor atualizado: $activeServerName [$activeDns]")
                _authState.value = DeviceAuthState.Active(
                    mac = virtualMac,
                    serverName = activeServerName,
                    serverDns = activeDns,
                    fallbackDns = fallbackDns,
                    username = username,
                    password = password,
                    expirationDate = expDate
                )
            }
    }

    private fun listenToBroadcastMessages() {
        notificationsListener?.remove()
        notificationsListener = firestore.collection("notifications")
            .whereEqualTo("active", true)
            .addSnapshotListener { snapshots, error ->
                if (error != null || snapshots == null) return@addSnapshotListener

                for (doc in snapshots.documents) {
                    val targetType = doc.getString("targetType") ?: "all"
                    val targetId = doc.getString("targetId") ?: "all"
                    val title = doc.getString("title") ?: "Aviso"
                    val message = doc.getString("message") ?: ""

                    if (targetType == "all" || targetId == virtualMac) {
                        _activeBroadcast.value = TvBroadcastMessage(
                            id = doc.id,
                            title = title,
                            message = message
                        )
                        break
                    }
                }
            }
    }

    fun checkStatusNow() {
        scope.launch {
            try {
                Log.d("FirestoreDeviceManager", "Verificação manual solicitada para MAC: $virtualMac")
                firestore.collection("devices").document(virtualMac)
                    .get()
                    .addOnSuccessListener { snapshot ->
                        if (snapshot != null && snapshot.exists()) {
                            val status = snapshot.getString("status") ?: "active"
                            val expDateStr = snapshot.getString("expirationDate") ?: ""
                            val serverId = snapshot.getString("serverId") ?: ""
                            val serverName = snapshot.getString("serverName") ?: "Zyveron Server"
                            val rawServerDns = snapshot.getString("serverDns") ?: ""
                            val serverDns = UrlHelper.normalizeUrl(rawServerDns)
                            val username = snapshot.getString("username") ?: ""
                            val password = snapshot.getString("password") ?: ""

                            if (status == "blocked") {
                                _authState.value = DeviceAuthState.Blocked("Acesso bloqueado pela administração.")
                            } else if (isExpired(expDateStr)) {
                                _authState.value = DeviceAuthState.Expired(expDateStr)
                            } else {
                                Log.d("FirestoreDeviceManager", "Aparelho liberado! Iniciando streaming...")
                                _authState.value = DeviceAuthState.Active(
                                    mac = virtualMac,
                                    serverName = serverName,
                                    serverDns = serverDns,
                                    fallbackDns = emptyList(),
                                    username = username,
                                    password = password,
                                    expirationDate = expDateStr
                                )
                                if (serverId.isNotEmpty()) {
                                    listenToServer(serverId, serverName, username, password, expDateStr, serverDns)
                                }
                            }
                        } else {
                            Log.d("FirestoreDeviceManager", "Documento $virtualMac ainda não encontrado.")
                        }
                    }
                    .addOnFailureListener { err ->
                        Log.e("FirestoreDeviceManager", "Falha ao consultar dispositivo", err)
                    }
            } catch (e: Exception) {
                Log.e("FirestoreDeviceManager", "Erro no checkStatusNow", e)
            }
        }
    }

    fun disconnectDevice(onComplete: () -> Unit = {}) {
        try {
            stopListening()
            _authState.value = DeviceAuthState.Unregistered(virtualMac, deviceKey)
            onComplete()
        } catch (e: Exception) {
            Log.e("FirestoreDeviceManager", "Erro ao desconectar aparelho", e)
        }
    }

    fun dismissBroadcast() {
        _activeBroadcast.value = null
    }

    fun stopListening() {
        deviceListener?.remove()
        serverListener?.remove()
        notificationsListener?.remove()
    }

    private fun isExpired(dateStr: String): Boolean {
        if (dateStr.isBlank()) return false
        val patterns = listOf(
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            "yyyy-MM-dd'T'HH:mm:ss",
            "yyyy-MM-dd"
        )
        for (pattern in patterns) {
            try {
                val format = SimpleDateFormat(pattern, Locale.US)
                format.timeZone = TimeZone.getTimeZone("UTC")
                val date = format.parse(dateStr)
                if (date != null) {
                    return date.before(Date())
                }
            } catch (_: Exception) {
                // Tenta próximo padrão
            }
        }
        return false
    }
}

