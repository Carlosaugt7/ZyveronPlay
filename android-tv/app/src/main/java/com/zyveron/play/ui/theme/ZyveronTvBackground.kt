package com.zyveron.play.ui.theme

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/**
 * Plano de fundo cinematográfico inspirado na logo e identidade visual do Zyveron Play.
 * 100% nativo via GPU (Skia), adicionando 0 KB ao APK e com alta taxa de quadros (60fps) na TV Stick.
 * Paleta da logo:
 * - Preto espacial profundo e azul noite (#04070E / #091222)
 * - Ciano e azul elétrico néon (#00D2FF / #0284C7 / #0EA5E9)
 * - Iluminação ambiente suave em camadas que valorizam os cards de conteúdo
 */
@Composable
fun ZyveronTvBackground(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF04070E))
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val width = size.width
            val height = size.height

            // 1. Gradiente base vertical azul-noite profundo
            drawRect(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF091222),
                        Color(0xFF060B14),
                        Color(0xFF030509)
                    )
                ),
                size = size
            )

            // 2. Aura de brilho ciano néon no topo esquerdo (inspirada na curva da logo)
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFF00D2FF).copy(alpha = 0.12f),
                        Color(0xFF0284C7).copy(alpha = 0.05f),
                        Color.Transparent
                    ),
                    center = Offset(width * 0.18f, height * 0.10f),
                    radius = width * 0.45f
                ),
                radius = width * 0.45f,
                center = Offset(width * 0.18f, height * 0.10f)
            )

            // 3. Aura de profundidade azul royal no topo centro-direito
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFF2563EB).copy(alpha = 0.09f),
                        Color(0xFF0EA5E9).copy(alpha = 0.04f),
                        Color.Transparent
                    ),
                    center = Offset(width * 0.78f, height * 0.18f),
                    radius = width * 0.50f
                ),
                radius = width * 0.50f,
                center = Offset(width * 0.78f, height * 0.18f)
            )

            // 4. Reflexo de chão difuso inferior para dar acabamento 3D
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFF0284C7).copy(alpha = 0.07f),
                        Color.Transparent
                    ),
                    center = Offset(width * 0.50f, height * 1.05f),
                    radius = width * 0.60f
                ),
                radius = width * 0.60f,
                center = Offset(width * 0.50f, height * 1.05f)
            )
        }

        content()
    }
}
