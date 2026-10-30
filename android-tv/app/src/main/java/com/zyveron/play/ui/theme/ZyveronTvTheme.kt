package com.zyveron.play.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.darkColorScheme

// Diretriz: Cinematic Stealth Dark (Banimento estrito de roxo/violeta)
val BgDeepDark = Color(0xFF090D12)
val BgCardDark = Color(0xFF0C121A)
val BgSurfaceDark = Color(0xFF131A24)

val AccentEmerald = Color(0xFF10B981)
val AccentSky = Color(0xFF0EA5E9)
val AccentAmber = Color(0xFFF59E0B)
val AccentRose = Color(0xFFF43F5E)

val TextPrimary = Color(0xFFF3F4F6)
val TextSecondary = Color(0xFF9CA3AF)
val BorderDark = Color(0xFF1F2937)

private val TvDarkColorScheme = darkColorScheme(
    primary = AccentEmerald,
    onPrimary = Color(0xFF051B11),
    primaryContainer = Color(0xFF064E3B),
    onPrimaryContainer = Color(0xFFA7F3D0),
    secondary = AccentSky,
    onSecondary = Color(0xFF082F49),
    secondaryContainer = Color(0xFF0C4A6E),
    onSecondaryContainer = Color(0xFFBAE6FD),
    tertiary = AccentAmber,
    onTertiary = Color(0xFF451A03),
    tertiaryContainer = Color(0xFF78350F),
    onTertiaryContainer = Color(0xFFFDE68A),
    background = BgDeepDark,
    onBackground = TextPrimary,
    surface = BgCardDark,
    onSurface = TextPrimary,
    surfaceVariant = BgSurfaceDark,
    onSurfaceVariant = TextSecondary,
    error = AccentRose,
    onError = Color(0xFFFFFFFF),
    border = BorderDark
)

@Composable
fun ZyveronTvTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = TvDarkColorScheme,
        content = content
    )
}

