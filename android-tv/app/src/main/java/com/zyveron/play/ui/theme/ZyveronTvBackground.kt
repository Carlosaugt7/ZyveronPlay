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
            .background(Color(0xFF040814))
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val width = size.width
            val height = size.height

            // 1. Fundo Gradiente Base Azul-Noite Cósmico (visível e imersivo)
            drawRect(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF0D1E3A), // Topo azul noite vivo
                        Color(0xFF081324), // Centro meia-noite
                        Color(0xFF03070F)  // Base profunda
                    )
                ),
                size = size
            )

            // 2. Grande nébula néon ciano no topo-esquerdo (ilumina o logotipo e TV ao Vivo)
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFF00D2FF).copy(alpha = 0.35f),
                        Color(0xFF0284C7).copy(alpha = 0.18f),
                        Color.Transparent
                    ),
                    center = Offset(width * 0.20f, height * 0.15f),
                    radius = width * 0.50f
                ),
                radius = width * 0.50f,
                center = Offset(width * 0.20f, height * 0.15f)
            )

            // 3. Nébula azul elétrico no topo central/direito (ilumina Filmes e Séries)
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFF2563EB).copy(alpha = 0.30f),
                        Color(0xFF0EA5E9).copy(alpha = 0.15f),
                        Color.Transparent
                    ),
                    center = Offset(width * 0.70f, height * 0.22f),
                    radius = width * 0.55f
                ),
                radius = width * 0.55f,
                center = Offset(width * 0.70f, height * 0.22f)
            )

            // 4. Brilho central inferior (halo cósmico suave sob os cards principais)
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFF0284C7).copy(alpha = 0.25f),
                        Color(0xFF0369A1).copy(alpha = 0.12f),
                        Color.Transparent
                    ),
                    center = Offset(width * 0.40f, height * 0.75f),
                    radius = width * 0.45f
                ),
                radius = width * 0.45f,
                center = Offset(width * 0.40f, height * 0.75f)
            )

            // 5. Linha de horizonte luminosa e sutil no topo
            drawLine(
                brush = Brush.horizontalGradient(
                    colors = listOf(
                        Color.Transparent,
                        Color(0xFF00D2FF).copy(alpha = 0.40f),
                        Color(0xFF2563EB).copy(alpha = 0.30f),
                        Color.Transparent
                    )
                ),
                start = Offset(0f, 1f),
                end = Offset(width, 1f),
                strokeWidth = 2f
            )
        }

        content()
    }
}
