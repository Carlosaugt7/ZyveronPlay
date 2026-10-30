package com.zyveron.play.ui.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Border
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.zyveron.play.data.local.SeriesEntity
import com.zyveron.play.data.local.VodEntity
import com.zyveron.play.data.repository.ZyveronRepository
import com.zyveron.play.ui.theme.AccentEmerald
import com.zyveron.play.ui.theme.AccentRose
import com.zyveron.play.ui.theme.AccentSky
import com.zyveron.play.ui.theme.BgCardDark
import com.zyveron.play.ui.theme.BgDeepDark
import com.zyveron.play.ui.theme.BgSurfaceDark
import com.zyveron.play.ui.theme.BorderDark
import com.zyveron.play.ui.theme.TextPrimary
import com.zyveron.play.ui.theme.TextSecondary
import com.zyveron.play.ui.theme.ZyveronTvBackground
import kotlinx.coroutines.delay
import java.time.LocalTime
import java.time.format.DateTimeFormatter

@Composable
fun HomeScreen(
    repository: ZyveronRepository,
    onNavigateLiveTv: () -> Unit,
    onNavigateMovies: () -> Unit,
    onNavigateSeries: () -> Unit,
    onNavigateSports: () -> Unit,
    onNavigateAccounts: () -> Unit,
    onNavigateSettings: () -> Unit,
    onRefreshCatalog: () -> Unit,
    onPlayVod: (VodEntity) -> Unit,
    onSelectSeries: (SeriesEntity) -> Unit
) {
    val liveCount by repository.liveCount.collectAsState()
    val vodCount by repository.vodCount.collectAsState()
    val seriesCount by repository.seriesCount.collectAsState()

    val featuredVods by repository.getFeaturedVods().collectAsState(initial = emptyList())
    val featuredSeries by repository.getFeaturedSeries().collectAsState(initial = emptyList())

    // Relógio e Saudação Dinâmica
    var currentTime by remember { mutableStateOf(LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"))) }
    val greeting = remember(currentTime) {
        val hour = LocalTime.now().hour
        when {
            hour in 5..11 -> "Bom dia"
            hour in 12..17 -> "Boa tarde"
            else -> "Boa noite"
        }
    }

    LaunchedEffect(Unit) {
        while (true) {
            delay(10000)
            currentTime = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"))
        }
    }

    ZyveronTvBackground {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 36.dp, vertical = 20.dp)
        ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // 1. TOP HEADER (Sem DNS nem Nome de Servidor, Limpo com Relógio)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Espaçador esquerdo invisível para manter equilíbrio
                Spacer(modifier = Modifier.width(80.dp))

                // Logo Central Zyveron Play
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(AccentEmerald.copy(alpha = 0.2f))
                            .border(1.dp, AccentEmerald.copy(alpha = 0.5f), RoundedCornerShape(8.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = "▶", color = AccentEmerald, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(text = "Zyveron ", color = TextPrimary, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                    Text(text = "Play", color = AccentEmerald, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                }

                // Relógio e Ícone Clima à Direita
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = currentTime,
                        color = TextPrimary,
                        fontSize = 18.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(text = "⛅ 26°C", color = TextSecondary, fontSize = 13.sp)
                }
            }

            // 2. BANNER DE BOAS-VINDAS
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(
                        Brush.horizontalGradient(
                            listOf(BgCardDark, BgSurfaceDark.copy(alpha = 0.7f))
                        )
                    )
                    .border(1.dp, BorderDark, RoundedCornerShape(14.dp))
                    .padding(horizontal = 24.dp, vertical = 14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = "👋", fontSize = 28.sp)
                        Spacer(modifier = Modifier.width(14.dp))
                        Column {
                            Text(
                                text = greeting,
                                color = TextPrimary,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Escolha uma seção abaixo para começar a assistir Zyveron Play.",
                                color = TextSecondary,
                                fontSize = 12.sp
                            )
                        }
                    }

                    // Indicador de Status Conectado
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(AccentEmerald)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(text = "Sinal Estável", color = AccentEmerald, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            // 3. FILMES EM DESTAQUE (Superior)
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "🎬 FILMES EM DESTAQUE",
                            color = AccentSky,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.8.sp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "• Lançamentos e Cinema",
                            color = TextSecondary,
                            fontSize = 11.sp
                        )
                    }
                    Text(
                        text = "Ver catálogo →",
                        color = TextSecondary,
                        fontSize = 10.sp
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    contentPadding = PaddingValues(end = 16.dp)
                ) {
                    items(featuredVods.take(10)) { vod ->
                        Button(
                            onClick = { onPlayVod(vod) },
                            colors = ButtonDefaults.colors(
                                containerColor = BgCardDark,
                                focusedContainerColor = AccentSky,
                                contentColor = TextPrimary,
                                focusedContentColor = Color.Black
                            ),
                            border = ButtonDefaults.border(
                                border = Border(BorderStroke(1.dp, BorderDark)),
                                focusedBorder = Border(BorderStroke(2.dp, Color.White))
                            ),
                            shape = ButtonDefaults.shape(RoundedCornerShape(12.dp)),
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Box(modifier = Modifier.size(width = 145.dp, height = 78.dp)) {
                                if (!vod.streamIcon.isNullOrBlank()) {
                                    AsyncImage(
                                        model = vod.streamIcon,
                                        contentDescription = vod.name,
                                        modifier = Modifier.fillMaxSize(),
                                        contentScale = ContentScale.Crop
                                    )
                                }
                                Box(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .background(
                                            Brush.verticalGradient(
                                                listOf(Color.Transparent, Color.Black.copy(alpha = 0.85f))
                                            )
                                        )
                                )
                                Box(
                                    modifier = Modifier
                                        .align(Alignment.TopStart)
                                        .padding(6.dp)
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(AccentSky)
                                        .padding(horizontal = 4.dp, vertical = 2.dp)
                                ) {
                                    Text(text = "Filme", color = Color.Black, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                                }
                                Text(
                                    text = vod.name,
                                    color = TextPrimary,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier
                                        .align(Alignment.BottomStart)
                                        .padding(6.dp)
                                )
                            }
                        }
                    }
                }
            }

            // 4. SÉRIES EM DESTAQUE (Inferior)
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "📺 SÉRIES EM DESTAQUE",
                            color = AccentEmerald,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.8.sp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "• Temporadas e Novelas",
                            color = TextSecondary,
                            fontSize = 11.sp
                        )
                    }
                    Text(
                        text = "Ver catálogo →",
                        color = TextSecondary,
                        fontSize = 10.sp
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    contentPadding = PaddingValues(end = 16.dp)
                ) {
                    items(featuredSeries.take(10)) { series ->
                        Button(
                            onClick = { onSelectSeries(series) },
                            colors = ButtonDefaults.colors(
                                containerColor = BgCardDark,
                                focusedContainerColor = AccentEmerald,
                                contentColor = TextPrimary,
                                focusedContentColor = Color.Black
                            ),
                            border = ButtonDefaults.border(
                                border = Border(BorderStroke(1.dp, BorderDark)),
                                focusedBorder = Border(BorderStroke(2.dp, Color.White))
                            ),
                            shape = ButtonDefaults.shape(RoundedCornerShape(12.dp)),
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Box(modifier = Modifier.size(width = 145.dp, height = 78.dp)) {
                                if (!series.cover.isNullOrBlank()) {
                                    AsyncImage(
                                        model = series.cover,
                                        contentDescription = series.name,
                                        modifier = Modifier.fillMaxSize(),
                                        contentScale = ContentScale.Crop
                                    )
                                }
                                Box(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .background(
                                            Brush.verticalGradient(
                                                listOf(Color.Transparent, Color.Black.copy(alpha = 0.85f))
                                            )
                                        )
                                )
                                Box(
                                    modifier = Modifier
                                        .align(Alignment.TopStart)
                                        .padding(6.dp)
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(AccentEmerald)
                                        .padding(horizontal = 4.dp, vertical = 2.dp)
                                ) {
                                    Text(text = "Série", color = Color.Black, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                                }
                                Text(
                                    text = series.name,
                                    color = TextPrimary,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier
                                        .align(Alignment.BottomStart)
                                        .padding(6.dp)
                                )
                            }
                        }
                    }
                }
            }

            // 5. BARRA INFERIOR DE MENUS PRINCIPAIS COM CONTADORES
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // TV ao Vivo
                MenuCardButton(
                    title = "TV ao Vivo",
                    subtitle = if (liveCount > 0) "$liveCount canais" else "Carregando...",
                    icon = "📡",
                    accentColor = AccentEmerald,
                    modifier = Modifier.weight(1.2f),
                    onClick = onNavigateLiveTv
                )

                // Filmes
                MenuCardButton(
                    title = "Filmes",
                    subtitle = if (vodCount > 0) "$vodCount títulos" else "On Demand",
                    icon = "🎬",
                    accentColor = AccentSky,
                    modifier = Modifier.weight(1.1f),
                    onClick = onNavigateMovies
                )

                // Séries
                MenuCardButton(
                    title = "Séries",
                    subtitle = if (seriesCount > 0) "$seriesCount séries" else "Temporadas",
                    icon = "📺",
                    accentColor = AccentSky,
                    modifier = Modifier.weight(1.1f),
                    onClick = onNavigateSeries
                )

                // Esportes (Atalho rápido de canais esportivos e lutas)
                MenuCardButton(
                    title = "Esportes",
                    subtitle = "Futebol • Lutas",
                    icon = "⚽",
                    accentColor = AccentEmerald,
                    modifier = Modifier.weight(1.1f),
                    onClick = onNavigateSports
                )

                // Contas
                MenuCardButton(
                    title = "Contas",
                    subtitle = "Sua conta",
                    icon = "🔑",
                    accentColor = AccentSky,
                    modifier = Modifier.weight(0.95f),
                    onClick = onNavigateAccounts
                )

                // Ajustes
                MenuCardButton(
                    title = "Ajustes",
                    subtitle = "Preferências",
                    icon = "⚙️",
                    accentColor = TextSecondary,
                    modifier = Modifier.weight(0.95f),
                    onClick = onNavigateSettings
                )

                // Recarregar
                MenuCardButton(
                    title = "Recarregar",
                    subtitle = "Atualizar lista",
                    icon = "🔄",
                    accentColor = AccentEmerald,
                    modifier = Modifier.weight(0.95f),
                    onClick = onRefreshCatalog
                )
            }
        }
    }
}
}

@Composable
fun MenuCardButton(
    title: String,
    subtitle: String,
    icon: String,
    accentColor: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = modifier.height(64.dp),
        colors = ButtonDefaults.colors(
            containerColor = BgCardDark,
            focusedContainerColor = accentColor,
            contentColor = TextPrimary,
            focusedContentColor = Color.Black
        ),
        border = ButtonDefaults.border(
            border = Border(BorderStroke(1.dp, BorderDark)),
            focusedBorder = Border(BorderStroke(2.dp, Color.White))
        ),
        shape = ButtonDefaults.shape(RoundedCornerShape(12.dp)),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = icon, fontSize = 16.sp)
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = title,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1
            )
            Text(
                text = subtitle,
                fontSize = 9.sp,
                color = TextSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

