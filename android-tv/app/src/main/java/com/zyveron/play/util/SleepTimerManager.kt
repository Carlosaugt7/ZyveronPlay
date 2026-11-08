package com.zyveron.play.util

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Gerenciador universal de Modo Soneca / Temporizador de Suspensão (Sleep Timer).
 * Permite desativar a reprodução e poupar banda quando o cliente dorme assistindo.
 */
object SleepTimerManager {
    private var timerJob: Job? = null
    private val _remainingMinutes = MutableStateFlow(0)
    val remainingMinutes: StateFlow<Int> = _remainingMinutes.asStateFlow()

    fun setTimer(minutes: Int, onFinish: () -> Unit) {
        timerJob?.cancel()
        if (minutes <= 0) {
            _remainingMinutes.value = 0
            return
        }

        _remainingMinutes.value = minutes
        timerJob = CoroutineScope(Dispatchers.Main).launch {
            var current = minutes
            while (current > 0) {
                delay(60_000L) // 1 minuto
                current--
                _remainingMinutes.value = current
            }
            onFinish()
        }
    }

    fun cancelTimer() {
        timerJob?.cancel()
        _remainingMinutes.value = 0
    }
}

