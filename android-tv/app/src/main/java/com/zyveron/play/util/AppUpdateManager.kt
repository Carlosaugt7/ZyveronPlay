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
     * Compara o versionCode remoto com o do app instalado.
     */
    suspend fun checkForUpdates(): UpdateCheckResult = withContext(Dispatchers.IO) {
        try {
            val firestore = FirebaseFirestore.getInstance()
            val doc = firestore.collection("system_config").document("app_update").get().await()

            if (!doc.exists()) {
                Log.d(TAG, "Documento 'app_update' não encontrado no Firestore. Aplicativo já na versão padrão.")
                return@withContext UpdateCheckResult.UpToDate(BuildConfig.VERSION_NAME)
            }

            val remoteVersionCode = doc.getLong("versionCode")?.toInt() ?: 0
            val remoteVersionName = doc.getString("versionName")?.trim() ?: ""
            val apkUrl = doc.getString("apkUrl")?.trim() ?: DEFAULT_FALLBACK_APK_URL
            val releaseNotes = doc.getString("releaseNotes")?.trim() ?: "Melhorias gerais e correções de estabilidade."
            val isMandatory = doc.getBoolean("isMandatory") ?: false

            val currentCode = BuildConfig.VERSION_CODE
            val currentName = BuildConfig.VERSION_NAME

            Log.d(TAG, "Versão instalada: $currentName ($currentCode) | Versão remota: $remoteVersionName ($remoteVersionCode)")

            if (remoteVersionCode > currentCode && apkUrl.isNotBlank()) {
                UpdateCheckResult.UpdateAvailable(
                    AppUpdateInfo(
                        versionCode = remoteVersionCode,
                        versionName = remoteVersionName.ifBlank { "Nova Versão" },
                        apkUrl = apkUrl,
                        releaseNotes = releaseNotes,
                        isMandatory = isMandatory
                    )
                )
            } else {
                UpdateCheckResult.UpToDate(currentName)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao consultar atualização no Firestore", e)
            UpdateCheckResult.Error("Não foi possível verificar atualizações: ${e.localizedMessage ?: "Falha de conexão"}")
        }
    }

    /**
     * Verifica se o app possui permissão para instalar fontes desconhecidas no Android 8.0+.
     */
    fun hasInstallPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.packageManager.canRequestPackageInstalls()
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
     * Realiza o download do arquivo .apk em segundo plano, reportando o progresso percentual (0 a 100).
     */
    suspend fun downloadApk(
        context: Context,
        apkUrl: String,
        onProgress: (Int) -> Unit
    ): Result<File> = withContext(Dispatchers.IO) {
        try {
            val destinationDir = File(context.cacheDir, "updates").apply { mkdirs() }
            val apkFile = File(destinationDir, "zyveron-update.apk")
            if (apkFile.exists()) apkFile.delete()

            Log.d(TAG, "Iniciando download do APK: $apkUrl")
            val request = Request.Builder().url(apkUrl).build()
            val response = httpClient.newCall(request).execute()

            if (!response.isSuccessful) {
                return@withContext Result.failure(Exception("Falha no download (HTTP ${response.code})"))
            }

            val body = response.body ?: return@withContext Result.failure(Exception("Arquivo vazio recebido do servidor."))
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
                            val progress = ((totalBytesRead * 100) / contentLength).toInt()
                            if (progress != lastReportedProgress) {
                                lastReportedProgress = progress
                                onProgress(progress)
                            }
                        }
                    }
                }
            }

            Log.d(TAG, "Download concluído com sucesso: ${apkFile.absolutePath} (${apkFile.length()} bytes)")
            onProgress(100)
            Result.success(apkFile)
        } catch (e: Exception) {
            Log.e(TAG, "Erro durante download do APK", e)
            Result.failure(e)
        }
    }

    /**
     * Aciona o instalador nativo do Android TV com FileProvider.
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
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            Log.d(TAG, "Disparando instalador nativo do pacote: $apkUri")
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao invocar instalador do pacote", e)
            throw e
        }
    }
}

