package com.zyveron.play.util

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.core.content.FileProvider
import com.google.firebase.firestore.FirebaseFirestore
import com.zyveron.play.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.TimeUnit

data class AppUpdateInfo(
    val versionCode: Int = 0,
    val versionName: String = "",
    val apkUrl: String = "",
    val releaseNotes: String = "",
    val isMandatory: Boolean = false
)

sealed class UpdateCheckResult {
    object Idle : UpdateCheckResult()
    object Checking : UpdateCheckResult()
    data class UpToDate(val currentVersion: String) : UpdateCheckResult()
    data class UpdateAvailable(val info: AppUpdateInfo) : UpdateCheckResult()
    data class Error(val message: String) : UpdateCheckResult()
}

object AppUpdateManager {

    private const val TAG = "AppUpdateManager"
    private const val DEFAULT_FALLBACK_APK_URL = "https://github.com/Carlosaugt7/ZyveronPlay/raw/main/zyveron-play-tv.apk"

    private val httpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .followRedirects(true)
            .followSslRedirects(true)
            .build()
    }

    /**
     * Consulta o Cloud Firestore na coleção 'system_config', documento 'app_update'.
     * Caso o Firestore falhe por permissão (PERMISSION_DENIED) ou rede, realiza
     * fallback transparente e imediato via HTTP direto (GitHub / CDN).
     */
    suspend fun checkForUpdates(): UpdateCheckResult = withContext(Dispatchers.IO) {
        // 1. Tenta consulta primária via Cloud Firestore
        try {
            val firestore = FirebaseFirestore.getInstance()
            val doc = firestore.collection("system_config").document("app_update").get().await()

            if (doc.exists()) {
                val remoteVersionCode = doc.getLong("versionCode")?.toInt() ?: 0
                val remoteVersionName = doc.getString("versionName")?.trim() ?: ""
                val apkUrl = doc.getString("apkUrl")?.trim() ?: DEFAULT_FALLBACK_APK_URL
                val releaseNotes = doc.getString("releaseNotes")?.trim() ?: "Melhorias gerais e correções de estabilidade."
                val isMandatory = doc.getBoolean("isMandatory") ?: false

                val currentCode = BuildConfig.VERSION_CODE
                val currentName = BuildConfig.VERSION_NAME

                Log.d(TAG, "[Firestore] Versão instalada: $currentName ($currentCode) | Remota: $remoteVersionName ($remoteVersionCode)")

                if (remoteVersionCode > currentCode && apkUrl.isNotBlank()) {
                    return@withContext UpdateCheckResult.UpdateAvailable(
                        AppUpdateInfo(
                            versionCode = remoteVersionCode,
                            versionName = remoteVersionName.ifBlank { "Nova Versão" },
                            apkUrl = apkUrl,
                            releaseNotes = releaseNotes,
                            isMandatory = isMandatory
                        )
                    )
                } else if (remoteVersionCode > 0) {
                    return@withContext UpdateCheckResult.UpToDate(currentName)
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Consulta via Firestore falhou (${e.message}). Acionando fallback direto via HTTP...", e)
        }

        // 2. Fallback resiliente via HTTP direto (GitHub / CDN)
        try {
            val fallbackUrls = listOf(
                "https://raw.githubusercontent.com/Carlosaugt7/ZyveronPlay/main/app-update.json"
            )
            for (url in fallbackUrls) {
                try {
                    val request = Request.Builder().url(url).build()
                    val response = httpClient.newCall(request).execute()
                    if (response.isSuccessful) {
                        val bodyStr = response.body?.string() ?: ""
                        if (bodyStr.isNotBlank()) {
                            val json = org.json.JSONObject(bodyStr)
                            val remoteCode = json.optInt("versionCode", 0)
                            val remoteName = json.optString("versionName", "")
                            val apkUrl = json.optString("apkUrl", DEFAULT_FALLBACK_APK_URL)
                            val notes = json.optString("releaseNotes", "Melhorias gerais e estabilidade.")
                            val mandatory = json.optBoolean("isMandatory", false)

                            val currentCode = BuildConfig.VERSION_CODE
                            val currentName = BuildConfig.VERSION_NAME

                            Log.d(TAG, "[HTTP Fallback] Versão instalada: $currentCode | Remota: $remoteCode")

                            if (remoteCode > currentCode && apkUrl.isNotBlank()) {
                                return@withContext UpdateCheckResult.UpdateAvailable(
                                    AppUpdateInfo(
                                        versionCode = remoteCode,
                                        versionName = remoteName.ifBlank { "Nova Versão" },
                                        apkUrl = apkUrl,
                                        releaseNotes = notes,
                                        isMandatory = mandatory
                                    )
                                )
                            } else if (remoteCode > 0) {
                                return@withContext UpdateCheckResult.UpToDate(currentName)
                            }
                        }
                    }
                } catch (httpEx: Exception) {
                    Log.w(TAG, "Falha no fallback HTTP $url: ${httpEx.message}")
                }
            }
            UpdateCheckResult.UpToDate(BuildConfig.VERSION_NAME)
        } catch (e: Exception) {
            Log.e(TAG, "Erro geral ao verificar atualizações", e)
            UpdateCheckResult.Error("Não foi possível verificar atualizações: ${e.localizedMessage ?: "Falha de conexão"}")
        }
    }

    /**
     * Verifica se o app possui permissão para instalar fontes desconhecidas no Android 8.0+.
     */
    fun hasInstallPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                context.packageManager.canRequestPackageInstalls()
            } catch (_: Exception) {
                true
            }
        } else {
            true
        }
    }

    /**
     * Abre a tela de permissão de fontes desconhecidas diretamente para o pacote do Zyveron Play.
     */
    fun openInstallPermissionSettings(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Falha ao abrir configurações com URI de pacote, abrindo configurações gerais", e)
                val fallbackIntent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(fallbackIntent)
            }
        }
    }

    /**
     * Realiza o download do arquivo .apk em segundo plano com suporte a mirrors de contingência
     * e cabeçalhos apropriados para evitar bloqueios de CDN / GitHub.
     */
    suspend fun downloadApk(
        context: Context,
        apkUrl: String,
        onProgress: (Int) -> Unit
    ): Result<File> = withContext(Dispatchers.IO) {
        try {
            val baseDir = context.getExternalFilesDir(android.os.Environment.DIRECTORY_DOWNLOADS) ?: context.cacheDir
            val destinationDir = File(baseDir, "updates").apply { mkdirs() }
            val apkFile = File(destinationDir, "zyveron-update.apk")
            if (apkFile.exists()) apkFile.delete()

            // Lista de URLs candidatas para resiliência máxima (URL informada + mirrors)
            val urlsToTry = mutableListOf<String>()
            val cleanUrl = apkUrl.trim()
            if (cleanUrl.isNotBlank()) urlsToTry.add(cleanUrl)

            if (cleanUrl.contains("github.com") && cleanUrl.contains("/raw/")) {
                val rawUrl = cleanUrl.replace("github.com", "raw.githubusercontent.com").replace("/raw/", "/")
                if (!urlsToTry.contains(rawUrl)) urlsToTry.add(rawUrl)
            } else if (cleanUrl.contains("raw.githubusercontent.com")) {
                val ghUrl = cleanUrl.replace("raw.githubusercontent.com", "github.com").replace("/main/", "/raw/main/")
                if (!urlsToTry.contains(ghUrl)) urlsToTry.add(ghUrl)
            }

            var lastException: Exception? = null
            var downloadSuccess = false

            for (targetUrl in urlsToTry) {
                try {
                    Log.d(TAG, "Tentando baixar APK de: $targetUrl")
                    val request = Request.Builder()
                        .url(targetUrl)
                        .header("User-Agent", "Mozilla/5.0 (Linux; Android 10; TV Box) ZyveronPlay/2.9.2")
                        .header("Accept", "application/vnd.android.package-archive, */*")
                        .build()

                    val response = httpClient.newCall(request).execute()
                    if (!response.isSuccessful) {
                        Log.w(TAG, "Falha HTTP ${response.code} ao baixar de $targetUrl")
                        lastException = Exception("Falha no download (HTTP ${response.code}): O link do APK não está acessível publicamente.")
                        continue
                    }

                    val body = response.body
                    if (body == null) {
                        lastException = Exception("Arquivo vazio recebido do servidor.")
                        continue
                    }

                    val contentLength = body.contentLength()
                    val inputStream = body.byteStream()
                    val outputStream = FileOutputStream(apkFile)

                    val buffer = ByteArray(8192)
                    var bytesRead: Int
                    var totalBytesRead = 0L
                    var lastReportedProgress = -1

                    inputStream.use { input ->
                        outputStream.use { output ->
                            while (input.read(buffer).also { bytesRead = it } != -1) {
                                output.write(buffer, 0, bytesRead)
                                totalBytesRead += bytesRead
                                if (contentLength > 0) {
                                    val progress = ((totalBytesRead * 100) / contentLength).toInt().coerceIn(0, 100)
                                    if (progress != lastReportedProgress) {
                                        lastReportedProgress = progress
                                        onProgress(progress)
                                    }
                                }
                            }
                        }
                    }

                    if (apkFile.length() > 100_000) { // Garante que o arquivo baixado é um binário APK real e não página HTML de erro
                        Log.d(TAG, "Download concluído com sucesso: ${apkFile.absolutePath} (${apkFile.length()} bytes)")
                        onProgress(100)
                        downloadSuccess = true
                        break
                    } else {
                        Log.w(TAG, "Arquivo baixado é muito pequeno (${apkFile.length()} bytes), provavelmente erro HTML.")
                        lastException = Exception("Arquivo baixado inválido ou corrompido (${apkFile.length()} bytes).")
                        if (apkFile.exists()) apkFile.delete()
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Erro ao baixar de $targetUrl", e)
                    lastException = e
                }
            }

            if (downloadSuccess) {
                Result.success(apkFile)
            } else {
                Result.failure(lastException ?: Exception("Falha de conexão ao baixar atualização."))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Erro geral durante download do APK", e)
            Result.failure(e)
        }
    }

    /**
     * Aciona o instalador nativo do Android TV com FileProvider e permissão explícita de leitura.
     */
    fun installApk(context: Context, apkFile: File) {
        try {
            val apkUri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                apkFile
            )

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true)
            }

            // Concessão explícita para o pacote instalador de APKs do sistema Android
            val resInfoList = context.packageManager.queryIntentActivities(intent, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY)
            for (resolveInfo in resInfoList) {
                val targetPackage = resolveInfo.activityInfo.packageName
                context.grantUriPermission(targetPackage, apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            Log.d(TAG, "Disparando instalador nativo do pacote: $apkUri")
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao invocar instalador do pacote", e)
            throw e
        }
    }
}

