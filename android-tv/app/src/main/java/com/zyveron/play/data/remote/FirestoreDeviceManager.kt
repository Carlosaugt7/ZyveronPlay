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
        
        // 1. Carrega imediatamente dados em cache local para inicialização instantânea e offline resiliente
        loadCachedActiveState()

        // 2. Escuta mudanças em tempo real no documento do Aparelho (MAC)
        deviceListener = firestore.collection("devices").document(virtualMac)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirestoreDeviceManager", "Erro ao ouvir dispositivo", error)
                    return@addSnapshotListener
                }

                if (snapshot == null || !snapshot.exists()) {
                    // Aparelho ainda não cadastrado no painel web
                    clearCachedActiveState()
                    _authState.value = DeviceAuthState.Unregistered(virtualMac, deviceKey)
                    return@addSnapshotListener
                }

                latestSnapshot = snapshot
                processSnapshot(snapshot)
            }

        // 3. Escuta notificações e avisos em tempo real para exibir na TV
        listenToBroadcastMessages()
    }

    private fun extractDns(snapshot: com.google.firebase.firestore.DocumentSnapshot?, vararg keys: String): String {
        if (snapshot == null) return ""
        for (key in keys) {
            val value = snapshot.getString(key)?.trim()
            if (!value.isNullOrBlank()) {
                val normalized = UrlHelper.normalizeUrl(value)
                if (normalized.isNotBlank()) return normalized
            }
        }
        return ""
    }

    private fun processSnapshot(snapshot: com.google.firebase.firestore.DocumentSnapshot) {
        val status = snapshot.getString("status")?.trim() ?: "active"
        val expDateStr = snapshot.getString("expirationDate")?.trim() ?: ""
        val serverId = snapshot.getString("serverId")?.trim() ?: ""
        val serverName = snapshot.getString("serverName")?.trim() ?: "Servidor 1"
        val rawServerDns = extractDns(snapshot, "serverDns", "activeDns", "dns", "url", "server_dns", "serverUrl")
        val username = snapshot.getString("username")?.trim() ?: ""
        val password = snapshot.getString("password")?.trim() ?: ""

        // Lista 2
        val serverId2 = snapshot.getString("serverId2")?.trim() ?: ""
        val serverName2 = snapshot.getString("serverName2")?.trim() ?: "Servidor 2"
        val rawServerDns2 = extractDns(snapshot, "serverDns2", "activeDns2", "dns2", "url2", "server_dns2", "serverUrl2")
        val username2 = snapshot.getString("username2")?.trim() ?: ""
        val password2 = snapshot.getString("password2")?.trim() ?: ""
        val expDateStr2 = snapshot.getString("expirationDate2")?.trim() ?: ""

        // Fallback cruzado resiliente de DNS: se uma lista não possui DNS configurado explicitamente, herda da outra
        val effectiveDns1 = rawServerDns.ifBlank { rawServerDns2 }
        val effectiveDns2 = rawServerDns2.ifBlank { rawServerDns }

        val signature = DeviceSnapshotSignature(
            status = status,
            expDate = expDateStr,
            serverId = serverId,
            serverDns = effectiveDns1,
            username = username,
            password = password,
            serverId2 = serverId2,
            serverDns2 = effectiveDns2,
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
                    serverDns = effectiveDns1,
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
                    serverDns = effectiveDns2,
                    username = username2,
                    password = password2,
                    expirationDate = expDateStr2
                )
            )
        }

        if (playlists.isEmpty() || (effectiveDns1.isBlank() && effectiveDns2.isBlank())) {
            Log.w("FirestoreDeviceManager", "Aparelho $virtualMac sem dados completos de ativação. Exibindo tela de ativação.")
            clearCachedActiveState()
            _authState.value = DeviceAuthState.Unregistered(virtualMac, deviceKey)
            return
        }

        val safeIndex = if (selectedPlaylistIndex in playlists.indices) selectedPlaylistIndex else 0
        val activeAccount = playlists[safeIndex]

        // Verifica se a mensalidade da lista ativa venceu
        if (isExpired(activeAccount.expirationDate)) {
            _authState.value = DeviceAuthState.Expired(activeAccount.expirationDate)
            return
        }

        val targetServerId = if (safeIndex == 0) serverId else serverId2

        val activeState = DeviceAuthState.Active(
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
        saveCachedActiveState(activeState)

        // Se já temos um estado ativo idêntico para a mesma playlist e a composição das listas não mudou, não gera emissão espúria
        val current = _authState.value
        val shouldEmitDirect = current !is DeviceAuthState.Active ||
                current.activePlaylistIndex != safeIndex ||
                current.username != activeAccount.username ||
                current.serverDns != activeAccount.serverDns ||
                current.playlists != playlists

        if (shouldEmitDirect) {
            _authState.value = activeState
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
        val currentDns = (_authState.value as? DeviceAuthState.Active)?.serverDns ?: ""
        if (listeningServerId == serverId && serverListener != null && currentDns.isNotBlank()) {
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

                val activeServerName = snapshot?.getString("name")?.takeIf { it.isNotBlank() } ?: fallbackServerName
                val rawDns = extractDns(snapshot, "activeDns", "serverDns", "dns", "url", "server_dns", "serverUrl")
                if (rawDns.isBlank()) {
                    // Mantém o DNS atual configurado no aparelho, nunca sobrescreve com vazio
                    return@addSnapshotListener
                }
                val activeDns = rawDns
                @Suppress("UNCHECKED_CAST")
                val fallbackDns = (snapshot?.get("fallbackDns") as? List<String>) ?: emptyList()

                val current = _authState.value
                if (current is DeviceAuthState.Active &&
                    current.serverDns == activeDns &&
                    current.serverName == activeServerName &&
                    current.username == username &&
                    current.activePlaylistIndex == activePlaylistIndex &&
                    current.playlists == playlists
                ) {
                    return@addSnapshotListener
                }

                Log.d("FirestoreDeviceManager", "Servidor atualizado: $activeServerName [$activeDns]")
                val updatedPlaylists = playlists.mapIndexed { idx, pl ->
                    if (idx == activePlaylistIndex) {
                        pl.copy(serverName = activeServerName, serverDns = activeDns)
                    } else pl
                }
                val updatedState = DeviceAuthState.Active(
                    mac = virtualMac,
                    serverName = activeServerName,
                    serverDns = activeDns,
                    fallbackDns = fallbackDns,
                    username = username,
                    password = password,
                    expirationDate = expDate,
                    playlists = updatedPlaylists,
                    activePlaylistIndex = activePlaylistIndex
                )
                saveCachedActiveState(updatedState)
                _authState.value = updatedState
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

                    // Se este aparelho específico já confirmou a leitura ('OK, Entendido'), não reexibe
                    if (isNotificationDismissed(doc.id)) continue

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
            clearCachedActiveState()
            _authState.value = DeviceAuthState.Unregistered(virtualMac, deviceKey)
            onComplete()
        } catch (e: Exception) {
            Log.e("FirestoreDeviceManager", "Erro ao desconectar aparelho", e)
        }
    }

    fun dismissBroadcast(messageId: String? = null) {
        val targetId = messageId ?: _activeBroadcast.value?.id
        if (!targetId.isNullOrBlank()) {
            markNotificationAsDismissed(targetId)
        }
        _activeBroadcast.value = null
    }

    private fun isNotificationDismissed(id: String): Boolean {
        return try {
            val set = prefs.getStringSet("dismissed_notification_ids", emptySet()) ?: emptySet()
            set.contains(id)
        } catch (_: Exception) {
            false
        }
    }

    private fun markNotificationAsDismissed(id: String) {
        try {
            val set = prefs.getStringSet("dismissed_notification_ids", emptySet())?.toMutableSet() ?: mutableSetOf()
            set.add(id)
            prefs.edit().putStringSet("dismissed_notification_ids", set).apply()
            Log.d("FirestoreDeviceManager", "Aviso $id marcado como lido e salvo no armazenamento local.")
        } catch (e: Exception) {
            Log.e("FirestoreDeviceManager", "Erro ao salvar aviso como lido", e)
        }
    }

    fun stopListening() {
        deviceListener?.remove()
        serverListener?.remove()
        notificationsListener?.remove()
        listeningServerId = ""
        lastProcessedSignature = null
    }

    private fun saveCachedActiveState(state: DeviceAuthState.Active) {
        try {
            val editor = prefs.edit()
                .putString("cached_server_name", state.serverName)
                .putString("cached_server_dns", state.serverDns)
                .putString("cached_username", state.username)
                .putString("cached_password", state.password)
                .putString("cached_exp_date", state.expirationDate)
                .putInt("cached_playlist_idx", state.activePlaylistIndex)

            val p2 = state.playlists.find { it.listIndex == 2 }
            if (p2 != null && p2.username.isNotBlank()) {
                editor.putString("cached_server_name2", p2.serverName)
                    .putString("cached_server_dns2", p2.serverDns)
                    .putString("cached_username2", p2.username)
                    .putString("cached_password2", p2.password)
                    .putString("cached_exp_date2", p2.expirationDate)
            } else {
                editor.remove("cached_server_name2")
                    .remove("cached_server_dns2")
                    .remove("cached_username2")
                    .remove("cached_password2")
                    .remove("cached_exp_date2")
            }
            editor.apply()
        } catch (e: Exception) {
            Log.e("FirestoreDeviceManager", "Erro ao salvar cache de autenticacao", e)
        }
    }

    private fun loadCachedActiveState(): Boolean {
        try {
            val serverDns = prefs.getString("cached_server_dns", "") ?: ""
            val username = prefs.getString("cached_username", "") ?: ""
            val password = prefs.getString("cached_password", "") ?: ""
            val serverName = prefs.getString("cached_server_name", "Lista Principal") ?: "Lista Principal"
            val expDate = prefs.getString("cached_exp_date", "") ?: ""
            val activeIdx = prefs.getInt("cached_playlist_idx", 0)

            if (serverDns.isNotBlank() && username.isNotBlank()) {
                val p1 = PlaylistAccount(
                    listIndex = 1,
                    serverName = serverName,
                    serverDns = serverDns,
                    username = username,
                    password = password,
                    expirationDate = expDate
                )
                val playlists = mutableListOf(p1)

                val username2 = prefs.getString("cached_username2", "") ?: ""
                if (username2.isNotBlank()) {
                    val serverName2 = prefs.getString("cached_server_name2", "Lista 2") ?: "Lista 2"
                    val serverDns2 = prefs.getString("cached_server_dns2", serverDns) ?: serverDns
                    val password2 = prefs.getString("cached_password2", "") ?: ""
                    val expDate2 = prefs.getString("cached_exp_date2", "") ?: ""
                    playlists.add(
                        PlaylistAccount(
                            listIndex = 2,
                            serverName = serverName2,
                            serverDns = serverDns2,
                            username = username2,
                            password = password2,
                            expirationDate = expDate2
                        )
                    )
                }

                val safeIdx = if (activeIdx in playlists.indices) activeIdx else 0
                val activeAccount = playlists[safeIdx]

                _authState.value = DeviceAuthState.Active(
                    mac = virtualMac,
                    serverName = activeAccount.serverName,
                    serverDns = activeAccount.serverDns,
                    fallbackDns = emptyList(),
                    username = activeAccount.username,
                    password = activeAccount.password,
                    expirationDate = activeAccount.expirationDate,
                    playlists = playlists,
                    activePlaylistIndex = safeIdx
                )
                return true
            }
        } catch (e: Exception) {
            Log.e("FirestoreDeviceManager", "Erro ao carregar cache de autenticacao", e)
        }
        return false
    }

    private fun clearCachedActiveState() {
        try {
            prefs.edit()
                .remove("cached_server_name")
                .remove("cached_server_dns")
                .remove("cached_username")
                .remove("cached_password")
                .remove("cached_exp_date")
                .remove("cached_playlist_idx")
                .remove("cached_server_name2")
                .remove("cached_server_dns2")
                .remove("cached_username2")
                .remove("cached_password2")
                .remove("cached_exp_date2")
                .apply()
        } catch (_: Exception) {}
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

