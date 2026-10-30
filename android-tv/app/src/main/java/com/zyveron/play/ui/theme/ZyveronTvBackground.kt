package com.zyveron.play.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/**
 * Plano de fundo ultra-leve, cinematográfico e suave para Android TV.
 * Usa shaders nativos Compose sem impacto em memória ou performance (60fps constante),
 * criando uma atmosfera moderna e sofisticada sem ofuscar menus e textos.
 */
@Composable
fun ZyveronTvBackground(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            // 1. Base escura profunda
            .background(Color(0xFF070A0F))
            // 2. Brilho radial suave superior direito (Ciano Noturno)
            .background(
                Brush.radialGradient(
                    colors = listOf(
                        Color(0xFF0C2436).copy(alpha = 0.40f),
                        Color(0xFF070E18).copy(alpha = 0.20f),
                        Color.Transparent
                    ),
                    center = Offset(1450f, 150f),
                    radius = 1600f
                )
            )
            // 3. Brilho radial suave inferior esquerdo (Esmeralda Profundo)
            .background(
                Brush.radialGradient(
                    colors = listOf(
                        Color(0xFF09261E).copy(alpha = 0.30f),
                        Color(0xFF061410).copy(alpha = 0.15f),
                        Color.Transparent
                    ),
                    center = Offset(200f, 900f),
                    radius = 1400f
                )
            )
            // 4. Vinheta vertical de proteção para contraste impecável dos menus
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF06090E).copy(alpha = 0.4f),
                        Color.Transparent,
                        Color(0xFF05070B).copy(alpha = 0.7f)
                    )
                )
            )
    ) {
        content()
    }
}

