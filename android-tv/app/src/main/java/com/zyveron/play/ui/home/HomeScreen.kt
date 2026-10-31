package com.zyveron.play.ui.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.zyveron.play.R
import com.zyveron.play.data.local.SeriesEntity
import com.zyveron.play.data.local.VodEntity
import com.zyveron.play.data.repository.ZyveronRepository
import com.zyveron.play.ui.components.TvTouchCard
import com.zyveron.play.ui.theme.AccentEmerald
import com.zyveron.play.ui.theme.AccentRose
import com.zyveron.play.ui.theme.AccentSky
import com.zyveron.play.ui.theme.BgCardDark
import com.zyveron.play.ui.theme.BgSurfaceDark
import com.zyveron.play.ui.theme.BorderDark
import com.zyveron.play.ui.theme.TextPrimary
import com.zyveron.play.ui.theme.TextSecondary
import com.zyveron.play.ui.theme.ZyveronTvBackground
import com.zyveron.play.util.NetworkStatus
import com.zyveron.play.util.rememberNetworkStatus
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
    onSelectSeries: (SeriesEntity) -> Unit,
    isSyncing: Boolean = false
) {
    val liveCount by repository.liveCount.collectAsState()
    val vodCount by repository.vodCount.collectAsState()
    val seriesCount by repository.seriesCount.collectAsState()

    val featuredVods by repository.getFeaturedVods().collectAsState(initial = emptyList())
    val featuredSeries by repository.getFeaturedSeries().collectAsState(initial = emptyList())

    // Monitoramento Real da Conexão de Rede (Wi-Fi / Ethernet / RSSI)
    val networkStatus = rememberNetworkStatus()
    val statusColor = when (networkStatus) {
        NetworkStatus.EXCELLENT -> AccentEmerald
        NetworkStatus.MODERATE -> Color(0xFFF59E0B) // Amber
        NetworkStatus.DISCONNECTED -> AccentRose
    }

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
        // Carrega as contagens dinâmicas do banco local
        repository.getChannelCount()
        repository.getVodCount()
        repository.getSeriesCount()

        while (true) {
            delay(10000)
            currentTime = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"))
        }
    }

    ZyveronTvBackground {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 28.dp, vertical = 14.dp)
        ) {
            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                // 1. CABEÇALHO SUPERIOR (Logo Central Oficial + Relógio/Clima)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Spacer(modifier = Modifier.width(120.dp))

                    // Logo Central Oficial Zyveron Play
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.app_logo),
                            contentDescription = "Zyveron Play Logo",
                            modifier = Modifier
                                .size(38.dp)
                                .clip(RoundedCornerShape(8.dp)),
                            contentScale = ContentScale.Fit
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "ZYVERON",
                                color = TextPrimary,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.ExtraBold,
                                letterSpacing = 2.sp
                            )
                            Text(
                                text = "— P L A Y —",
                                color = AccentSky,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 3.sp
                            )
                        }
                    }

                    // Relógio e Clima à Direita
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.End
                    ) {
                        Text(
                            text = currentTime,
                            color = TextPrimary,
                            fontSize = 17.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "⛅ 26°C",
                            color = TextSecondary,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // 2. BANNER DE SAUDAÇÃO ESTILO PÍLULA NEON
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(
                            Brush.horizontalGradient(
                                listOf(
                                    BgCardDark.copy(alpha = 0.90f),
                                    BgSurfaceDark.copy(alpha = 0.75f)
                                )
                            )
                        )
                        .border(
                            1.dp,
                            Brush.horizontalGradient(
                                listOf(
                                    AccentSky.copy(alpha = 0.4f),
                                    AccentEmerald.copy(alpha = 0.3f)
                                )
                            ),
                            RoundedCornerShape(16.dp)
                        )
                        .padding(horizontal = 20.dp, vertical = 10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(text = "👋", fontSize = 22.sp)
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = greeting,
                                    color = TextPrimary,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "Escolha uma seção abaixo para começar a assistir Zyveron Play",
                                    color = TextSecondary,
                                    fontSize = 11.sp
                                )
                            }
                        }

                        // Indicador de Sinal Real (Dinâmico)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(statusColor)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = networkStatus.label,
                                color = statusColor,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // 3. CORPO PRINCIPAL (Esquerda: 4 Cards 2x2 | Direita: Carrosséis de Destaque)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(18.dp)
                ) {
                    // --- COLUNA ESQUERDA: GRID 2x2 DE CARDS PRINCIPAIS ---
                    Column(
                        modifier = Modifier
                            .weight(1.15f)
                            .fillMaxHeight(),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        // Linha Superior: TV ao Vivo | Filmes
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f),
                            horizontalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            // TV ao Vivo
                            HomeCategoryCard(
                                title = "TV ao Vivo",
                                subtitle = if (liveCount > 0) "$liveCount canais" else "2324 canais",
                                icon = "📡",
                                glowColor = AccentSky,
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxHeight(),
                                onClick = onNavigateLiveTv
                            )

                            // Filmes
                            HomeCategoryCard(
                                title = "Filmes",
                                subtitle = if (vodCount > 0) "$vodCount filmes" else "On Demand",
                                icon = "🎬",
                                glowColor = AccentSky,
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxHeight(),
                                onClick = onNavigateMovies
                            )
                        }

                        // Linha Inferior: Séries | Esportes
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f),
                            horizontalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            // Séries
                            HomeCategoryCard(
                                title = "Séries",
                                subtitle = if (seriesCount > 0) "$seriesCount séries" else "Temporadas",
                                icon = "📺",
                                glowColor = AccentSky,
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxHeight(),
                                onClick = onNavigateSeries
                            )

                            // Esportes
                            HomeCategoryCard(
                                title = "Esportes",
                                subtitle = "Futebol • Lutas",
                                icon = "⚽",
                                glowColor = AccentSky,
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxHeight(),
                                onClick = onNavigateSports
                            )
                        }
                    }

                    // --- COLUNA DIREITA: CARROSSÉIS DE FILMES E SÉRIES EM DESTAQUE ---
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight(),
                        verticalArrangement = Arrangement.SpaceBetween
                    ) {
                        // Seção 1: Filmes em Destaque
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = "🎬 FILMES EM DESTAQUE",
                                        color = AccentSky,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        letterSpacing = 0.5.sp
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "• Lançamentos e Cinema",
                                        color = TextSecondary,
                                        fontSize = 10.sp
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                items(featuredVods.take(8)) { vod ->
                                    TvTouchCard(
                                        onClick = { onPlayVod(vod) },
                                        modifier = Modifier.size(width = 82.dp, height = 110.dp),
                                        containerColor = BgCardDark,
                                        focusedContainerColor = AccentSky,
                                        border = BorderStroke(1.dp, BorderDark),
                                        focusedBorder = BorderStroke(2.dp, Color.White),
                                        shape = RoundedCornerShape(10.dp)
                                    ) { isFocused ->
                                        Box(modifier = Modifier.fillMaxSize()) {
                                            if (!vod.streamIcon.isNullOrBlank()) {
                                                AsyncImage(
                                                    model = vod.streamIcon,
                                                    contentDescription = vod.name,
                                                    modifier = Modifier.fillMaxSize(),
                                                    contentScale = ContentScale.Crop
                                                )
                                            } else {
                                                Box(
                                                    modifier = Modifier
                                                        .fillMaxSize()
                                                        .background(BgSurfaceDark),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Text(text = "🎬", fontSize = 24.sp)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Seção 2: Séries em Destaque
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "📺 SÉRIES EM DESTAQUE",
                                    color = AccentEmerald,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 0.5.sp
                                )
                                Text(
                                    text = "Ver catálogo →",
                                    color = TextSecondary,
                                    fontSize = 10.sp
                                )
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                items(featuredSeries.take(8)) { series ->
                                    TvTouchCard(
                                        onClick = { onSelectSeries(series) },
                                        modifier = Modifier.size(width = 82.dp, height = 110.dp),
                                        containerColor = BgCardDark,
                                        focusedContainerColor = AccentEmerald,
                                        border = BorderStroke(1.dp, BorderDark),
                                        focusedBorder = BorderStroke(2.dp, Color.White),
                                        shape = RoundedCornerShape(10.dp)
                                    ) { isFocused ->
                                        Box(modifier = Modifier.fillMaxSize()) {
                                            if (!series.cover.isNullOrBlank()) {
                                                AsyncImage(
                                                    model = series.cover,
                                                    contentDescription = series.name,
                                                    modifier = Modifier.fillMaxSize(),
                                                    contentScale = ContentScale.Crop
                                                )
                                            } else {
                                                Box(
                                                    modifier = Modifier
                                                        .fillMaxSize()
                                                        .background(BgSurfaceDark),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Text(text = "📺", fontSize = 24.sp)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // 4. RODAPÉ INFERIOR (Botões Pílula no Canto Inferior Direito)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        // Contas
                        FooterPillButton(
                            text = "Contas",
                            onClick = onNavigateAccounts
                        )

                        // Ajustes
                        FooterPillButton(
                            text = "Ajustes",
                            onClick = onNavigateSettings
                        )

                        // Recarregar
                        FooterPillButton(
                            text = if (isSyncing) "Atualizando..." else "Recarregar",
                            onClick = {
                                if (!isSyncing) onRefreshCatalog()
                            }
                        )
                    }
                }
            }
        }
    }
}

/**
 * Card Grande das Categorias Principais (TV ao Vivo, Filmes, Séries, Esportes)
 * com design moderno neon cyan / dark translúcido.
 */
@Composable
fun HomeCategoryCard(
    title: String,
    subtitle: String,
    icon: String,
    glowColor: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    TvTouchCard(
        onClick = onClick,
        modifier = modifier,
        containerColor = BgCardDark.copy(alpha = 0.85f),
        focusedContainerColor = glowColor,
        border = BorderStroke(
            1.5.dp,
            Brush.linearGradient(
                listOf(
                    AccentSky.copy(alpha = 0.5f),
                    BorderDark.copy(alpha = 0.8f)
                )
            )
        ),
        focusedBorder = BorderStroke(2.5.dp, Color.White),
        shape = RoundedCornerShape(16.dp),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp)
    ) { isFocused ->
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = icon,
                fontSize = 32.sp
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = title,
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold,
                color = if (isFocused) Color.Black else TextPrimary,
                maxLines = 1
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = subtitle,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
                color = if (isFocused) Color.Black.copy(alpha = 0.85f) else TextSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

/**
 * Botão Pílula Elegante do Rodapé (Contas, Ajustes, Recarregar)
 */
@Composable
fun FooterPillButton(
    text: String,
    onClick: () -> Unit
) {
    TvTouchCard(
        onClick = onClick,
        containerColor = BgSurfaceDark,
        focusedContainerColor = AccentSky,
        border = BorderStroke(1.dp, BorderDark),
        focusedBorder = BorderStroke(2.dp, Color.White),
        shape = RoundedCornerShape(10.dp),
        contentPadding = PaddingValues(horizontal = 18.dp, vertical = 8.dp)
    ) { isFocused ->
        Text(
            text = text,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (isFocused) Color.Black else TextPrimary
        )
    }
}
