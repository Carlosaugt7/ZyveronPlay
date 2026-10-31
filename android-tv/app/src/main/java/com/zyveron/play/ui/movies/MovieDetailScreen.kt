package com.zyveron.play.ui.movies

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Text
import coil.compose.AsyncImage
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
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun MovieDetailScreen(
    vod: VodEntity,
    repository: ZyveronRepository,
    onPlayMovie: (VodEntity, startPositionMs: Long) -> Unit,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var isFavoriteState by remember { mutableStateOf(vod.isFavorite) }
    var savedProgressMs by remember { mutableStateOf(0L) }
    val playButtonFocusRequester = remember { FocusRequester() }

    LaunchedEffect(vod.streamId) {
        savedProgressMs = repository.getVodProgress(vod.streamId)
        delay(200)
        try {
            playButtonFocusRequester.requestFocus()
        } catch (_: Exception) {}
    }

    val hasSavedProgress = savedProgressMs > 5000L
    val minutesWatched = (savedProgressMs / 1000) / 60
    val secondsWatched = (savedProgressMs / 1000) % 60

    ZyveronTvBackground {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(28.dp)
        ) {
            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                // Top Bar
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Detalhes do Filme",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextSecondary
                    )
                    TvTouchCard(
                        onClick = onBack,
                        containerColor = BgSurfaceDark,
                        focusedContainerColor = AccentRose,
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                    ) { isFocused ->
                        Text(
                            text = "← Voltar",
                            color = if (isFocused) Color.White else TextSecondary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                // Conteúdo Principal: Pôster à esquerda + Informações à direita
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .padding(vertical = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(28.dp)
                ) {
                    // Pôster em Destaque
                    Box(
                        modifier = Modifier
                            .width(200.dp)
                            .height(290.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(BgCardDark)
                            .border(1.dp, BorderDark, RoundedCornerShape(16.dp))
                    ) {
                        if (!vod.streamIcon.isNullOrBlank()) {
                            AsyncImage(
                                model = vod.streamIcon,
                                contentDescription = vod.name,
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        }
                    }

                    // Detalhes, Metadados e Ações
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .padding(vertical = 4.dp),
                        verticalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                text = vod.name,
                                fontSize = 26.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )

                            Spacer(modifier = Modifier.height(10.dp))

                            // Badges (Ano, Nota, Formato)
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                if (!vod.year.isNullOrBlank()) {
                                    Text(
                                        text = vod.year,
                                        color = TextSecondary,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(BgSurfaceDark)
                                            .padding(horizontal = 8.dp, vertical = 3.dp)
                                    )
                                }

                                if (!vod.rating.isNullOrBlank()) {
                                    Text(
                                        text = "★ ${vod.rating}",
                                        color = AccentSky,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(BgSurfaceDark)
                                            .padding(horizontal = 8.dp, vertical = 3.dp)
                                    )
                                }

                                Text(
                                    text = vod.containerExtension.uppercase(),
                                    color = AccentEmerald,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(AccentEmerald.copy(alpha = 0.15f))
                                        .padding(horizontal = 8.dp, vertical = 3.dp)
                                )

                                Text(
                                    text = "Full HD 1080p",
                                    color = TextSecondary,
                                    fontSize = 11.sp
                                )
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            // Sinopse
                            Text(
                                text = "Sinopse",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Aproveite a transmissão em alta definição. Selecione uma das opções abaixo para iniciar a reprodução com navegação completa por cenas (avanço e retrocesso de 10s) pelo controle remoto.",
                                fontSize = 13.sp,
                                color = TextSecondary,
                                lineHeight = 18.sp
                            )
                        }

                        // Botões de Ação D-Pad
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(top = 16.dp)
                        ) {
                            if (hasSavedProgress) {
                                // Botão Continuar
                                TvTouchCard(
                                    onClick = { onPlayMovie(vod, savedProgressMs) },
                                    modifier = Modifier.focusRequester(playButtonFocusRequester),
                                    containerColor = AccentEmerald,
                                    focusedContainerColor = Color.White,
                                    shape = RoundedCornerShape(10.dp),
                                    contentPadding = PaddingValues(horizontal = 18.dp, vertical = 10.dp)
                                ) { isFocused ->
                                    Text(
                                        text = "▶ Continuar (${minutesWatched}m ${secondsWatched}s)",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = Color.Black
                                    )
                                }

                                // Botão Reiniciar
                                TvTouchCard(
                                    onClick = {
                                        repository.clearVodProgress(vod.streamId)
                                        onPlayMovie(vod, 0L)
                                    },
                                    containerColor = BgSurfaceDark,
                                    focusedContainerColor = AccentSky,
                                    border = BorderStroke(1.dp, BorderDark),
                                    focusedBorder = BorderStroke(2.dp, Color.White),
                                    shape = RoundedCornerShape(10.dp),
                                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp)
                                ) { isFocused ->
                                    Text(
                                        text = "🔄 Reiniciar do Início",
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 13.sp,
                                        color = if (isFocused) Color.Black else TextPrimary
                                    )
                                }
                            } else {
                                // Botão Começar / Play
                                TvTouchCard(
                                    onClick = { onPlayMovie(vod, 0L) },
                                    modifier = Modifier.focusRequester(playButtonFocusRequester),
                                    containerColor = AccentEmerald,
                                    focusedContainerColor = Color.White,
                                    shape = RoundedCornerShape(10.dp),
                                    contentPadding = PaddingValues(horizontal = 22.dp, vertical = 10.dp)
                                ) { isFocused ->
                                    Text(
                                        text = "▶ Começar / Play",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = Color.Black
                                    )
                                }
                            }

                            // Botão Favoritar
                            TvTouchCard(
                                onClick = {
                                    isFavoriteState = !isFavoriteState
                                    scope.launch { repository.toggleVodFavorite(vod) }
                                },
                                containerColor = BgSurfaceDark,
                                focusedContainerColor = Color(0xFFF59E0B),
                                border = BorderStroke(1.dp, BorderDark),
                                focusedBorder = BorderStroke(2.dp, Color.White),
                                shape = RoundedCornerShape(10.dp),
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp)
                            ) { isFocused ->
                                Text(
                                    text = if (isFavoriteState) "★ Favorito" else "☆ Favoritar",
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp,
                                    color = if (isFocused) Color.Black else (if (isFavoriteState) Color(0xFFF59E0B) else TextPrimary)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

