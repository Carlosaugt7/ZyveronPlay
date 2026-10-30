package com.zyveron.play

import android.app.Application
import android.content.Intent
import android.util.Log
import com.zyveron.play.ui.crash.CrashActivity
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter

class ZyveronApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        // Handler global para capturar qualquer exceção não tratada e exibir na tela em vez de fechar
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            try {
                Log.e("ZyveronCrash", "FATAL CRASH na thread ${thread.name}: ${throwable.message}", throwable)

                val sw = StringWriter()
                throwable.printStackTrace(PrintWriter(sw))
                val stackTrace = sw.toString()

                // Salva o crash em arquivo local para inspeção
                try {
                    val crashFile = File(filesDir, "crash_log.txt")
                    crashFile.writeText("Thread: ${thread.name}\nTimestamp: ${System.currentTimeMillis()}\n\n$stackTrace")
                } catch (e: Exception) {
                    Log.e("ZyveronCrash", "Falha ao gravar arquivo de crash", e)
                }

                // Dispara a CrashActivity para navegação na TV
                val intent = Intent(this, CrashActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    putExtra("CRASH_ERROR", throwable.localizedMessage ?: throwable.toString())
                    putExtra("CRASH_STACKTRACE", stackTrace)
                }
                startActivity(intent)

                // Aguarda 500ms para permitir que a CrashActivity inicie no processo isolado :crash
                try {
                    Thread.sleep(500)
                } catch (_: InterruptedException) {}

                android.os.Process.killProcess(android.os.Process.myPid())
                System.exit(10)
            } catch (e: Exception) {
                Log.e("ZyveronCrash", "Falha no handler global de crash", e)
                defaultHandler?.uncaughtException(thread, throwable)
            }
        }
    }
}
