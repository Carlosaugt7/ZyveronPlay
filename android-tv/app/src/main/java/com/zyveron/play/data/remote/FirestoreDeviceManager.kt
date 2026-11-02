package com.zyveron.play.data.remote

import android.content.Context
import android.util.Log
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.SetOptions
import com.zyveron.play.util.DeviceIdentityHelper
import com.zyveron.play.util.UrlHelper
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

data class PlaylistAccount(
    val listIndex: Int, // 1 ou 2
    val serverName: String,
    val serverDns: String,
    val username: String,
    val password: String,
    val expirationDate: String
)

data class DeviceSnapshotSignature(
    val status: String,
    val expDate: String,
    val serverId: String,
    val serverDns: String,
    val username: String,
    val password: String,
    val serverId2: String,
    val serverDns2: String,
    val username2: String,
    val password2: String,
    val expDate2: String,
    val selectedPlaylistIndex: Int
)

sealed class DeviceAuthState {
    object Loading : DeviceAuthState()
    data class Unregistered(val mac: String, val deviceKey: String) : DeviceAuthState()
    data class Blocked(val reason: String) : DeviceAuthState()
    data class Expired(val expirationDate: String) : DeviceAuthState()
    data class Active(
        val mac: String,
        val serverName: String = "Zyveron Server",
        val serverDns: String,
        val fallbackDns: List<String> = emptyList(),
        val username: String,
        val password: String,
        val expirationDate: String,
        val playlists: List<PlaylistAccount> = emptyList(),
        val activePlaylistIndex: Int = 0
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

    private val prefs = context.getSharedPreferences("zyveron_playlists", Context.MODE_PRIVATE)
    private var selectedPlaylistIndex = prefs.getInt("selected_playlist_idx", 0)
    private var latestSnapshot: com.google.firebase.firestore.DocumentSnapshot? = null

    private val _authState = MutableStateFlow<DeviceAuthState>(DeviceAuthState.Loading)
    val authState: StateFlow<DeviceAuthState> = _authState.asStateFlow()

    private val _activeBroadcast = MutableStateFlow<TvBroadcastMessage?>(null)
    val activeBroadcast: StateFlow<TvBroadcastMessage?> = _activeBroadcast.asStateFlow()

    private var deviceListener: ListenerRegistration? = null
    private var serverListener: ListenerRegistration? = null
    private var notificationsListener: ListenerRegistration? = null
    private var heartbeatJob: Job? = null

    private var currentServerId: String = ""
    private var currentServerId2: String = ""
    private var currentResellerId: String = ""
    private var lastProcessedSignature: DeviceSnapshotSignature? = null
    private var listeningServerId: String = ""

    val virtualMac: String = DeviceIdentityHelper.getVirtualMac(context)
    val deviceKey: String = DeviceIdentityHelper.getDeviceKey(context)

    fun switchPlaylist(index: Int) {
        selectedPlaylistIndex = index
        prefs.edit().putInt("selected_playlist_idx", index).apply()
        // Força reprocessamento da lista selecionada resetando a assinatura
        lastProcessedSignature = null
        latestSnapshot?.let { processSnapshot(it) }
    }

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

                latestSnapshot = snapshot
                processSnapshot(snapshot)
            }

        // 2. Inicia heartbeat de presença online (resiliente, não quebra nenhum código)
        startHeartbeat()

        // 3. Escuta notificações e avisos em tempo real para exibir na TV
        listenToBroadcastMessages()
    }

    private fun processSnapshot(snapshot: com.google.firebase.firestore.DocumentSnapshot) {
        val status = snapshot.getString("status") ?: "active"
        val expDateStr = snapshot.getString("expirationDate") ?: ""
        val serverId = snapshot.getString("serverId") ?: ""
        val serverName = snapshot.getString("serverName") ?: "Servidor 1"
        val rawServerDns = snapshot.getString("serverDns") ?: ""
        val username = snapshot.getString("username") ?: ""
        val password = snapshot.getString("password") ?: ""

        // Lista 2
        val serverId2 = snapshot.getString("serverId2") ?: ""
        val serverName2 = snapshot.getString("serverName2") ?: "Servidor 2"
        val rawServerDns2 = snapshot.getString("serverDns2") ?: ""
        val username2 = snapshot.getString("username2") ?: ""
        val password2 = snapshot.getString("password2") ?: ""
        val expDateStr2 = snapshot.getString("expirationDate2") ?: ""

        val signature = DeviceSnapshotSignature(
            status = status,
            expDate = expDateStr,
            serverId = serverId,
            serverDns = rawServerDns,
            username = username,
            password = password,
            serverId2 = serverId2,
            serverDns2 = rawServerDns2,
            username2 = username2,
            password2 = password2,
            expDate2 = expDateStr2,
            selectedPlaylistIndex = selectedPlaylistIndex
        )

        // Se nenhum dado relevante de autenticação/servidor mudou (apenas heartbeat de lastSeen), não reprocessa
        if (signature == lastProcessedSignature && _authState.value is DeviceAuthState.Active) {
            return
        }
        lastProcessedSignature = signature

        currentServerId = serverId
        currentServerId2 = serverId2
        currentResellerId = snapshot.getString("resellerId") ?: ""

        // Verifica bloqueio administrativo
        if (status == "blocked") {
            _authState.value = DeviceAuthState.Blocked("Acesso bloqueado pela administração.")
            return
        }

        val playlists = mutableListOf<PlaylistAccount>()
        if (username.isNotBlank()) {
            playlists.add(
                PlaylistAccount(
                    listIndex = 1,
                    serverName = if (serverName.isNotBlank()) serverName else "Lista 1",
                    serverDns = UrlHelper.normalizeUrl(rawServerDns),
                    username = username,
                    password = password,
                    expirationDate = expDateStr
                )
            )
        }
        if (username2.isNotBlank()) {
            playlists.add(
                PlaylistAccount(
                    listIndex = 2,
                    serverName = if (serverName2.isNotBlank()) serverName2 else "Lista 2",
                    serverDns = UrlHelper.normalizeUrl(rawServerDns2),
                    username = username2,
                    password = password2,
                    expirationDate = expDateStr2
                )
            )
        }

        if (playlists.isEmpty()) {
            playlists.add(
                PlaylistAccount(
                    listIndex = 1,
                    serverName = "Servidor 1",
                    serverDns = UrlHelper.normalizeUrl(rawServerDns),
                    username = username,
                    password = password,
                    expirationDate = expDateStr
                )
            )
        }

        val safeIndex = if (selectedPlaylistIndex in playlists.indices) selectedPlaylistIndex else 0
        val activeAccount = playlists[safeIndex]

        // Verifica se a mensalidade da lista ativa venceu
        if (isExpired(activeAccount.expirationDate)) {
            _authState.value = DeviceAuthState.Expired(activeAccount.expirationDate)
            return
        }

        val targetServerId = if (safeIndex == 0) serverId else serverId2

        // Se já temos um estado ativo idêntico para a mesma playlist, não gera emissão espúria
        val current = _authState.value
        val shouldEmitDirect = current !is DeviceAuthState.Active ||
                current.activePlaylistIndex != safeIndex ||
                current.username != activeAccount.username

        if (shouldEmitDirect) {
            _authState.value = DeviceAuthState.Active(
                mac = virtualMac,
                serverName = activeAccount.serverName,
                serverDns = activeAccount.serverDns,
                fallbackDns = emptyList(),
                username = activeAccount.username,
                password = activeAccount.password,
                expirationDate = activeAccount.expirationDate,
                playlists = playlists,
                activePlaylistIndex = safeIndex
            )
        }

        if (targetServerId.isNotEmpty()) {
            listenToServer(
                targetServerId,
                activeAccount.serverName,
                activeAccount.username,
                activeAccount.password,
                activeAccount.expirationDate,
                activeAccount.serverDns,
                playlists,
                safeIndex
            )
        }
    }

    private fun listenToServer(
        serverId: String,
        fallbackServerName: String,
        username: String,
        password: String,
        expDate: String,
        fallbackDnsUrl: String,
        playlists: List<PlaylistAccount>,
        activePlaylistIndex: Int
    ) {
        if (listeningServerId == serverId && serverListener != null) {
            return
        }
        listeningServerId = serverId
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

                val current = _authState.value
                if (current is DeviceAuthState.Active &&
                    current.serverDns == activeDns &&
                    current.serverName == activeServerName &&
                    current.username == username &&
                    current.activePlaylistIndex == activePlaylistIndex
                ) {
                    return@addSnapshotListener
                }

                Log.d("FirestoreDeviceManager", "Servidor atualizado: $activeServerName [$activeDns]")
                _authState.value = DeviceAuthState.Active(
                    mac = virtualMac,
                    serverName = activeServerName,
                    serverDns = activeDns,
                    fallbackDns = fallbackDns,
                    username = username,
                    password = password,
                    expirationDate = expDate,
                    playlists = playlists,
                    activePlaylistIndex = activePlaylistIndex
                )
            }
    }

    private fun listenToBroadcastMessages() {
        notificationsListener?.remove()
        notificationsListener = firestore.collection("notifications")
            .whereEqualTo("active", true)
            .addSnapshotListener { snapshots, error ->
                if (error != null || snapshots == null) return@addSnapshotListener

                var matchingMessage: TvBroadcastMessage? = null
                val nowIso = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US).format(java.util.Date())

                for (doc in snapshots.documents) {
                    val expiresAt = doc.getString("expiresAt") ?: ""
                    // Se o aviso já expirou pelo horário limite, ignora
                    if (expiresAt.isNotBlank() && expiresAt < nowIso) continue

                    val targetType = doc.getString("targetType") ?: "all"
                    val targetId = doc.getString("targetId") ?: "all"
                    val title = doc.getString("title") ?: "Aviso"
                    val message = doc.getString("message") ?: ""

                    // Verifica público-alvo:
                    // 1. Global (todos os clientes)
                    // 2. Aparelho específico (MAC)
                    // 3. Por Servidor (cobre Lista 1 ou Lista 2)
                    // 4. Por Revenda (resellerId da conta)
                    val isMatch = when (targetType) {
                        "all" -> true
                        "device" -> targetId.equals(virtualMac, ignoreCase = true)
                        "server" -> targetId.isNotBlank() && (targetId == currentServerId || targetId == currentServerId2)
                        "reseller" -> targetId.isNotBlank() && targetId == currentResellerId
                        else -> false
                    }

                    if (isMatch) {
                        matchingMessage = TvBroadcastMessage(
                            id = doc.id,
                            title = title,
                            message = message
                        )
                        break
                    }
                }
                _activeBroadcast.value = matchingMessage
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
                            latestSnapshot = snapshot
                            processSnapshot(snapshot)
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
        stopHeartbeat()
        deviceListener?.remove()
        serverListener?.remove()
        notificationsListener?.remove()
        listeningServerId = ""
        lastProcessedSignature = null
    }

    private fun startHeartbeat() {
        heartbeatJob?.cancel()
        heartbeatJob = scope.launch {
            while (isActive) {
                try {
                    val update = mapOf(
                        "isOnline" to true,
                        "lastSeen" to System.currentTimeMillis(),
                        "lastSeenIso" to SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
                            timeZone = TimeZone.getTimeZone("UTC")
                        }.format(Date()),
                        "appVersion" to "2.8.1"
                    )
                    firestore.collection("devices").document(virtualMac)
                        .set(update, SetOptions.merge())
                } catch (e: Exception) {
                    Log.w("FirestoreDeviceManager", "Heartbeat silencioso ignorado: ${e.message}")
                }
                delay(45_000)
            }
        }
    }

    private fun stopHeartbeat() {
        heartbeatJob?.cancel()
        heartbeatJob = null
        scope.launch {
            try {
                firestore.collection("devices").document(virtualMac)
                    .set(
                        mapOf(
                            "isOnline" to false,
                            "lastSeen" to System.currentTimeMillis()
                        ),
                        SetOptions.merge()
                    )
            } catch (_: Exception) {}
        }
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

