package com.zyveron.play

import android.app.Application

class ZyveronApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Inicialização global de dependências, logging seguro e telemetria
    }
}

