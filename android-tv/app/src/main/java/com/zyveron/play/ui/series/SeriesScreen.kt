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
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.layout.ContentScale
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
import com.zyveron.play.data.repository.ZyveronRepository
import com.zyveron.play.ui.live.CategoryItem
import com.zyveron.play.ui.theme.AccentEmerald
import com.zyveron.play.ui.theme.AccentSky
import com.zyveron.play.ui.theme.BgCardDark
import com.zyveron.play.ui.theme.BgDeepDark
import com.zyveron.play.ui.theme.BorderDark
import com.zyveron.play.ui.theme.TextPrimary
import com.zyveron.play.ui.theme.TextSecondary
import com.zyveron.play.ui.theme.ZyveronTvBackground
import kotlinx.coroutines.launch

@Composable
fun SeriesScreen(
    repository: ZyveronRepository,
    onSelectSeries: (SeriesEntity) -> Unit,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val categories by repository.getSeriesCategories().collectAsState(initial = emptyList())
    val allSeries by repository.getAllSeries().collectAsState(initial = emptyList())
    val favorites by repository.getFavoriteSeries().collectAsState(initial = emptyList())

    var selectedCategoryId by remember { mutableStateOf("ALL") }

    val displayedSeries = remember(selectedCategoryId, allSeries, favorites) {
        when (selectedCategoryId) {
            "FAV" -> favorites
            "ALL" -> allSeries
            else -> allSeries.filter { it.categoryId == selectedCategoryId }
        }
    }

    ZyveronTvBackground {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(18.dp)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "Séries & Novelas",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Text(
                            text = "${displayedSeries.size} séries disponíveis",
                            fontSize = 12.sp,
                            color = TextSecondary
                        )
                    }

                    Button(
                        onClick = onBack,
                        colors = ButtonDefaults.colors(
                            containerColor = BgCardDark,
                            focusedContainerColor = AccentEmerald,
                            contentColor = TextPrimary,
                            focusedContentColor = Color.Black
                        ),
                        shape = ButtonDefaults.shape(RoundedCornerShape(8.dp)),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                    ) {
                        Text(text = "← Voltar", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                }

                // Layout 2 Colunas: Categorias à Esquerda | Grade de Séries à Direita
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // Categorias
                    Box(
                        modifier = Modifier
                            .width(260.dp)
                            .fillMaxHeight()
                            .clip(RoundedCornerShape(14.dp))
                            .background(BgCardDark)
                            .border(1.dp, BorderDark, RoundedCornerShape(14.dp))
                            .padding(10.dp)
                    ) {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            item {
                                CategoryItem(
                                    title = "★ Favoritos",
                                    count = favorites.size,
                                    isSelected = selectedCategoryId == "FAV",
                                    onClick = { selectedCategoryId = "FAV" }
                                )
                            }
                            item {
                                CategoryItem(
                                    title = "Todas as Séries",
                                    count = allSeries.size,
                                    isSelected = selectedCategoryId == "ALL",
                                    onClick = { selectedCategoryId = "ALL" }
                                )
                            }
                            items(categories) { cat ->
                                CategoryItem(
                                    title = cat.categoryName,
                                    count = null,
                                    isSelected = selectedCategoryId == cat.categoryId,
                                    onClick = { selectedCategoryId = cat.categoryId }
                                )
                            }
                        }
                    }

                    // Grade de Posters de Séries
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .clip(RoundedCornerShape(14.dp))
                            .background(BgCardDark)
                            .border(1.dp, BorderDark, RoundedCornerShape(14.dp))
                            .padding(12.dp)
                    ) {
                        if (displayedSeries.isEmpty()) {
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Text(
                                    text = if (selectedCategoryId == "FAV") "Nenhuma série favoritada ainda.\nPressione o botão Amarelo/Menu no controle para favoritar!"
                                    else "Nenhuma série nesta categoria",
                                    color = TextSecondary,
                                    fontSize = 13.sp
                                )
                            }
                        } else {
                            LazyVerticalGrid(
                                columns = GridCells.Adaptive(135.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalArrangement = Arrangement.spacedBy(14.dp),
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(4.dp)
                            ) {
                                items(displayedSeries) { series ->
                                    Button(
                                        onClick = { onSelectSeries(series) },
                                        modifier = Modifier.onKeyEvent { keyEvent ->
                                            if (keyEvent.type == KeyEventType.KeyDown &&
                                                (keyEvent.nativeKeyEvent.keyCode == android.view.KeyEvent.KEYCODE_STAR ||
                                                 keyEvent.nativeKeyEvent.keyCode == android.view.KeyEvent.KEYCODE_PROG_YELLOW ||
                                                 keyEvent.nativeKeyEvent.keyCode == android.view.KeyEvent.KEYCODE_MENU ||
                                                 keyEvent.nativeKeyEvent.keyCode == android.view.KeyEvent.KEYCODE_BOOKMARK)
                                            ) {
                                                scope.launch { repository.toggleSeriesFavorite(series) }
                                                true
                                            } else false
                                        },
                                        colors = ButtonDefaults.colors(
                                            containerColor = Color.Transparent,
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
                                        Column(modifier = Modifier.width(135.dp)) {
                                            Box(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .height(180.dp)
                                                    .clip(RoundedCornerShape(topStart = 10.dp, topEnd = 10.dp))
                                                    .background(Color.Black)
                                            ) {
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
                                                                listOf(Color.Transparent, Color.Black.copy(alpha = 0.7f))
                                                            )
                                                        )
                                                )
                                                if (!series.rating.isNullOrBlank()) {
                                                    Box(
                                                        modifier = Modifier
                                                            .align(Alignment.TopEnd)
                                                            .padding(6.dp)
                                                            .clip(RoundedCornerShape(4.dp))
                                                            .background(Color.Black.copy(alpha = 0.8f))
                                                            .padding(horizontal = 4.dp, vertical = 2.dp)
                                                    ) {
                                                        Text(text = "★ ${series.rating}", color = AccentSky, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                                                    }
                                                }
                                                if (series.isFavorite) {
                                                    Box(
                                                        modifier = Modifier
                                                            .align(Alignment.TopStart)
                                                            .padding(6.dp)
                                                            .clip(RoundedCornerShape(4.dp))
                                                            .background(Color(0xFFF59E0B))
                                                            .padding(horizontal = 4.dp, vertical = 2.dp)
                                                    ) {
                                                        Text(text = "★ Favorita", color = Color.Black, fontSize = 8.sp, fontWeight = FontWeight.Bold)
                                                    }
                                                }
                                            }

                                            Text(
                                                text = series.name,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp)
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
    }
}
