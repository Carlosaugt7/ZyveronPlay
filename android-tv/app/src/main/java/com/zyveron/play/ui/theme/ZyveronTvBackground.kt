package com.zyveron.play.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/**
 * Plano de fundo ultra-leve e otimizado para Android TV e TV Sticks (Mi Stick, Fire Stick).
 * Utiliza um único gradiente vertical de alta performance sem sobrecarga no processador gráfico (GPU).
 */
@Composable
fun ZyveronTvBackground(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF0B121C),
                        Color(0xFF070A0F)
                    )
                )
            )
    ) {
        content()
    }
}
