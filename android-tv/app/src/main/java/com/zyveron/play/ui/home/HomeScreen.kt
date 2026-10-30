package com.zyveron.play.ui.home

import android.view.KeyEvent
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Border
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.Text
import com.zyveron.play.data.local.ChannelEntity
import com.zyveron.play.ui.theme.AccentEmerald
import com.zyveron.play.ui.theme.AccentSky
import com.zyveron.play.ui.theme.BgCardDark
import com.zyveron.play.ui.theme.BgDeepDark
import com.zyveron.play.ui.theme.BgSurfaceDark
import com.zyveron.play.ui.theme.BorderDark
import com.zyveron.play.ui.theme.TextPrimary
import com.zyveron.play.ui.theme.TextSecondary
import com.zyveron.play.util.ContentSafetyFilter
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

data class MatchItem(
    val teamA: String,
    val teamB: String,
    val time: String,
    val league: String
)

data class FeaturedItem(
    val title: String,
    val type: String, // "Filme" ou "Série"
    val category: String
)

@Composable
fun HomeScreen(
    serverName: String,
    channels: List<ChannelEntity>,
    onOpenLiveTv: () -> Unit,
    onOpenMovies: () -> Unit,
    onOpenSeries: () -> Unit,
    onOpenSports: () -> Unit,
    onOpenAccounts: () -> Unit,
    onOpenSettings: () -> Unit,
    onReloadCatalog: () -> Unit,
    onExit: () -> Unit = {}
) {
    // Relógio em tempo real
    var currentTime by remember { mutableStateOf("") }
    var greeting by remember { mutableStateOf("Boa tarde") }

    LaunchedEffect(Unit) {
        while (true) {
            val now = Calendar.getInstance()
            currentTime = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
            val hour = now.get(Calendar.HOUR_OF_DAY)
            greeting = when (hour) {
                in 5..11 -> "Bom dia"
                in 12..17 -> "Boa tarde"
                else -> "Boa noite"
            }
            delay(15000)
        }
    }

    // Filtra canais seguros para métricas e exibições
    val safeChannels = remember(channels) {
        channels.filter { ContentSafetyFilter.isSafe(it.name, it.categoryId) }
    }

    val sportsChannels = remember(safeChannels) {
        safeChannels.filter { ContentSafetyFilter.isSportsChannel(it.name, it.categoryId) }
    }

    // Lista de Jogos do Dia
    val matches = remember {
        listOf(
            MatchItem("Flamengo", "Palmeiras", "16:00", "Brasileirão Série A"),
            MatchItem("Real Madrid", "Barcelona", "17:00", "LaLiga Santander"),
            MatchItem("Liverpool", "Man. City", "17:30", "Premier League"),
            MatchItem("São Paulo", "Corinthians", "18:30", "Brasileirão Série A"),
            MatchItem("UFC Fight Night", "Ao Vivo", "20:00", "Combate Oficial")
        )
    }

    // Lista de Destaques Família (Seguros - Zero Conteúdo Adulto)
    val featuredList = remember {
        listOf(
            FeaturedItem("Velozes & Furiosos 10", "Filme", "Ação / Aventura"),
            FeaturedItem("Duna: Parte 2", "Filme", "Ficção Científica"),
            FeaturedItem("House of the Dragon", "Série", "Fantasia / Drama"),
            FeaturedItem("Oppenheimer", "Filme", "Histórico / Drama"),
            FeaturedItem("The Last of Us", "Série", "Ação / Suspense"),
            FeaturedItem("Planeta Terra III", "Série", "Documentário 4K")
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDeepDark)
            .onPreviewKeyEvent {
                if (it.nativeKeyEvent.action == KeyEvent.ACTION_DOWN &&
                    it.nativeKeyEvent.keyCode == KeyEvent.KEYCODE_BACK
                ) {
                    onExit()
                    true
                } else false
            }
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 36.dp, vertical = 24.dp)
        ) {
            // 1. BARRA SUPERIOR (HEADER)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Esquerda: Nome do Servidor
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(AccentEmerald)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (serverName.isNotBlank()) serverName else "Zyveron Play",
                        color = TextPrimary,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Centro: Nome e Logo do Aplicativo
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(AccentEmerald.copy(alpha = 0.2f))
                            .border(1.dp, AccentEmerald.copy(alpha = 0.5f), RoundedCornerShape(6.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = "▶", color = AccentEmerald, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(text = "Zyveron ", color = TextPrimary, fontSize = 19.sp, fontWeight = FontWeight.Bold)
                    Text(text = "Play", color = AccentEmerald, fontSize = 19.sp, fontWeight = FontWeight.Bold)
                }

                // Direita: Horário e Clima
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = if (currentTime.isNotBlank()) currentTime else "15:00",
                        color = TextPrimary,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(text = "⛅ 24°C", color = AccentSky, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // 2. BANNER DE BOAS-VINDAS
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(
                        Brush.horizontalGradient(
                            listOf(
                                BgCardDark,
                                Color(0xFF0F1A28)
                            )
                        )
                    )
                    .border(1.dp, BorderDark, RoundedCornerShape(16.dp))
                    .padding(horizontal = 24.dp, vertical = 18.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = "👋", fontSize = 28.sp)
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Text(
                                text = greeting,
                                color = TextPrimary,
                                fontSize = 19.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "Escolha uma seção abaixo para começar a assistir no Zyveron Play.",
                                color = TextSecondary,
                                fontSize = 12.sp
                            )
                        }
                    }

                    // Indicadores discretos de carrossel
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(AccentSky))
                        Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(BorderDark))
                        Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(BorderDark))
                    }
                }
            }

            Spacer(modifier = Modifier.height(22.dp))

            // 3. JOGOS DO DIA
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = "⚽", fontSize = 14.sp)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "JOGOS DO DIA",
                    color = AccentEmerald,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                contentPadding = PaddingValues(end = 20.dp)
            ) {
                items(matches) { match ->
                    MatchCard(match = match, onClick = onOpenSports)
                }
            }

            Spacer(modifier = Modifier.height(22.dp))

            // 4. EM DESTAQUE (FILMES E SÉRIES FAMÍLIA)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = "⭐", fontSize = 13.sp)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "EM DESTAQUE",
                    color = AccentSky,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                contentPadding = PaddingValues(end = 20.dp)
            ) {
                items(featuredList) { item ->
                    FeaturedCard(
                        item = item,
                        onClick = {
                            if (item.type == "Filme") onOpenMovies() else onOpenSeries()
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(26.dp))

            // 5. MENUS PRINCIPAIS (NAVEGAÇÃO INFERIOR D-PAD)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // TV AO VIVO
                NavMenuCard(
                    icon = "📡",
                    title = "TV ao Vivo",
                    subtitle = "${safeChannels.size} canais",
                    modifier = Modifier.weight(1.3f),
                    accentColor = AccentEmerald,
                    onClick = onOpenLiveTv
                )

                // FILMES
                NavMenuCard(
                    icon = "🎬",
                    title = "Filmes",
                    subtitle = "On Demand",
                    modifier = Modifier.weight(1f),
                    accentColor = AccentSky,
                    onClick = onOpenMovies
                )

                // SÉRIES
                NavMenuCard(
                    icon = "📺",
                    title = "Séries",
                    subtitle = "Temporadas",
                    modifier = Modifier.weight(1f),
                    accentColor = AccentSky,
                    onClick = onOpenSeries
                )

                // ESPORTES (Substituiu Cortex)
                NavMenuCard(
                    icon = "🏆",
                    title = "Esportes",
                    subtitle = "${sportsChannels.size} canais",
                    modifier = Modifier.weight(1.1f),
                    accentColor = AccentEmerald,
                    onClick = onOpenSports
                )

                // CONTAS
                NavMenuCard(
                    icon = "🔑",
                    title = "Contas",
                    subtitle = "Sua conta",
                    modifier = Modifier.weight(0.9f),
                    accentColor = AccentSky,
                    onClick = onOpenAccounts
                )

                // AJUSTES
                NavMenuCard(
                    icon = "⚙",
                    title = "Ajustes",
                    subtitle = "Preferências",
                    modifier = Modifier.weight(0.9f),
                    accentColor = TextSecondary,
                    onClick = onOpenSettings
                )

                // RECARREGAR
                NavMenuCard(
                    icon = "🔄",
                    title = "Recarregar",
                    subtitle = "Atualizar",
                    modifier = Modifier.weight(0.9f),
                    accentColor = AccentEmerald,
                    onClick = onReloadCatalog
                )
            }
        }
    }
}

@Composable
fun MatchCard(
    match: MatchItem,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        colors = ButtonDefaults.colors(
            containerColor = BgCardDark,
            focusedContainerColor = Color(0xFF132032),
            contentColor = TextPrimary,
            focusedContentColor = Color.White
        ),
        border = ButtonDefaults.border(
            border = Border(border = BorderStroke(1.dp, BorderDark)),
            focusedBorder = Border(border = BorderStroke(2.dp, AccentEmerald))
        ),
        shape = ButtonDefaults.shape(shape = RoundedCornerShape(12.dp))
    ) {
        Box(
            modifier = Modifier
                .width(200.dp)
                .padding(vertical = 6.dp)
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = match.league,
                        color = TextSecondary,
                        fontSize = 10.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(AccentEmerald.copy(alpha = 0.2f))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = match.time,
                            color = AccentEmerald,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = "${match.teamA} x ${match.teamB}",
                    color = TextPrimary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "▶ Assistir ao vivo",
                    color = AccentSky,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
fun FeaturedCard(
    item: FeaturedItem,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        colors = ButtonDefaults.colors(
            containerColor = BgCardDark,
            focusedContainerColor = Color(0xFF132032),
            contentColor = TextPrimary,
            focusedContentColor = Color.White
        ),
        border = ButtonDefaults.border(
            border = Border(border = BorderStroke(1.dp, BorderDark)),
            focusedBorder = Border(border = BorderStroke(2.dp, AccentSky))
        ),
        shape = ButtonDefaults.shape(shape = RoundedCornerShape(12.dp))
    ) {
        Box(
            modifier = Modifier
                .width(180.dp)
                .padding(vertical = 6.dp)
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(if (item.type == "Filme") AccentSky.copy(alpha = 0.25f) else AccentEmerald.copy(alpha = 0.25f))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = item.type,
                            color = if (item.type == "Filme") AccentSky else AccentEmerald,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Text(
                        text = "HD/FHD",
                        color = TextSecondary.copy(alpha = 0.6f),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = item.title,
                    color = TextPrimary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = item.category,
                    color = TextSecondary,
                    fontSize = 10.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
fun NavMenuCard(
    icon: String,
    title: String,
    subtitle: String,
    accentColor: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = modifier,
        colors = ButtonDefaults.colors(
            containerColor = BgCardDark,
            focusedContainerColor = Color(0xFF162234),
            contentColor = TextPrimary,
            focusedContentColor = Color.White
        ),
        border = ButtonDefaults.border(
            border = Border(border = BorderStroke(1.dp, BorderDark)),
            focusedBorder = Border(border = BorderStroke(2.dp, accentColor))
        ),
        shape = ButtonDefaults.shape(shape = RoundedCornerShape(12.dp))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = icon, fontSize = 22.sp)
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                color = TextPrimary,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                maxLines = 1
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = subtitle,
                color = TextSecondary,
                fontSize = 10.sp,
                textAlign = TextAlign.Center,
                maxLines = 1
            )
        }
    }
}
