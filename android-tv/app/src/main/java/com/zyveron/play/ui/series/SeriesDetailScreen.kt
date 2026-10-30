package com.zyveron.play.ui.series

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import com.zyveron.play.data.local.EpisodeItem
import com.zyveron.play.data.local.SeasonEpisodes
import com.zyveron.play.data.local.SeriesEntity
import com.zyveron.play.data.repository.ZyveronRepository
import com.zyveron.play.ui.theme.AccentEmerald
import com.zyveron.play.ui.theme.AccentSky
import com.zyveron.play.ui.theme.BgCardDark
import com.zyveron.play.ui.theme.BgDeepDark
import com.zyveron.play.ui.theme.BgSurfaceDark
import com.zyveron.play.ui.theme.BorderDark
import com.zyveron.play.ui.theme.TextPrimary
import com.zyveron.play.ui.theme.TextSecondary

@Composable
fun SeriesDetailScreen(
    series: SeriesEntity,
    repository: ZyveronRepository,
    serverDns: String,
    username: String,
    password: String,
    onPlayEpisode: (EpisodeItem) -> Unit,
    onBackToSeries: () -> Unit,
    onBackToHome: () -> Unit
) {
    var seasonsData by remember { mutableStateOf<List<SeasonEpisodes>>(emptyList()) }
    var selectedSeasonIndex by remember { mutableIntStateOf(0) }
    var isLoadingEpisodes by remember { mutableStateOf(true) }

    LaunchedEffect(series.seriesId) {
        isLoadingEpisodes = true
        val result = repository.getSeriesSeasonsAndEpisodes(
            serverDns = serverDns,
            username = username,
            password = password,
            seriesId = series.seriesId
        )
        if (result.isSuccess) {
            seasonsData = result.getOrDefault(emptyList())
        }
        isLoadingEpisodes = false
    }

    val currentSeason = seasonsData.getOrNull(selectedSeasonIndex)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDeepDark)
            .padding(24.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Seção Superior: Banner, Detalhes, Sinopse e Botões
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                horizontalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                // Pôster Principal
                Box(
                    modifier = Modifier
                        .width(180.dp)
                        .height(260.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(BgCardDark)
                        .border(1.dp, BorderDark, RoundedCornerShape(14.dp))
                ) {
                    if (!series.cover.isNullOrBlank()) {
                        AsyncImage(
                            model = series.cover,
                            contentDescription = series.name,
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    }
                }

                // Informações e Sinopse
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .padding(vertical = 4.dp)
                ) {
                    Text(
                        text = series.name,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Metadados (Ano, Nota, Classificação, Gênero)
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = series.year ?: "2024",
                            color = TextSecondary,
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace
                        )
                        if (!series.rating.isNullOrBlank()) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(AccentEmerald.copy(alpha = 0.2f))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = "★ ${series.rating}",
                                    color = AccentEmerald,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .border(1.dp, BorderDark, RoundedCornerShape(4.dp))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(text = "14+", color = TextSecondary, fontSize = 10.sp)
                        }
                        Text(
                            text = series.genre ?: "Drama / Séries",
                            color = AccentSky,
                            fontSize = 11.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Sinopse
                    Text(
                        text = series.plot ?: "Sem sinopse disponível para esta série.",
                        color = TextSecondary,
                        fontSize = 12.sp,
                        maxLines = 4,
                        overflow = TextOverflow.Ellipsis
                    )

                    Spacer(modifier = Modifier.height(18.dp))

                    // Botões de Ação
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(
                            onClick = onBackToSeries,
                            colors = ButtonDefaults.colors(
                                containerColor = BgSurfaceDark,
                                focusedContainerColor = AccentEmerald,
                                contentColor = TextPrimary,
                                focusedContentColor = Color.Black
                            ),
                            shape = ButtonDefaults.shape(RoundedCornerShape(8.dp)),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                        ) {
                            Text(text = "← Séries", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }

                        Button(
                            onClick = onBackToHome,
                            colors = ButtonDefaults.colors(
                                containerColor = BgSurfaceDark,
                                focusedContainerColor = AccentSky,
                                contentColor = TextPrimary,
                                focusedContentColor = Color.Black
                            ),
                            shape = ButtonDefaults.shape(RoundedCornerShape(8.dp)),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                        ) {
                            Text(text = "⌂ Início", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Seletor de Temporadas (Pills)
            if (seasonsData.isNotEmpty()) {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(seasonsData.indices.toList()) { index ->
                        val season = seasonsData[index]
                        val isSelected = index == selectedSeasonIndex
                        Button(
                            onClick = { selectedSeasonIndex = index },
                            colors = ButtonDefaults.colors(
                                containerColor = if (isSelected) AccentEmerald else BgSurfaceDark,
                                focusedContainerColor = Color.White,
                                contentColor = if (isSelected) Color.Black else TextPrimary,
                                focusedContentColor = Color.Black
                            ),
                            shape = ButtonDefaults.shape(RoundedCornerShape(8.dp)),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = "Temporada ${season.seasonNumber.toString().padStart(2, '0')} (${season.episodes.size} ep)",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Lista Horizontal de Episódios
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(115.dp)
            ) {
                if (isLoadingEpisodes) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(text = "Carregando episódios...", color = TextSecondary, fontSize = 12.sp)
                    }
                } else if (currentSeason == null || currentSeason.episodes.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(text = "Nenhum episódio cadastrado nesta temporada.", color = TextSecondary, fontSize = 12.sp)
                    }
                } else {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(currentSeason.episodes) { ep ->
                            Button(
                                onClick = { onPlayEpisode(ep) },
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
                                shape = ButtonDefaults.shape(RoundedCornerShape(10.dp)),
                                contentPadding = PaddingValues(0.dp)
                            ) {
                                Box(modifier = Modifier.size(width = 175.dp, height = 105.dp)) {
                                    if (!series.cover.isNullOrBlank()) {
                                        AsyncImage(
                                            model = series.cover,
                                            contentDescription = ep.title,
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
                                    // Badge do Número do Episódio
                                    Box(
                                        modifier = Modifier
                                            .align(Alignment.TopStart)
                                            .padding(6.dp)
                                            .clip(RoundedCornerShape(4.dp))
                                            .background(AccentEmerald)
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text(text = "EP ${ep.episodeNum}", color = Color.Black, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                                    }
                                    // Título
                                    Text(
                                        text = ep.title,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        modifier = Modifier
                                            .align(Alignment.BottomStart)
                                            .padding(8.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

