package com.zyveron.play.ui.series

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.zyveron.play.data.local.SeriesEntity
import com.zyveron.play.data.repository.ZyveronRepository
import com.zyveron.play.ui.components.TvTouchCard
import com.zyveron.play.ui.live.CategoryItem
import com.zyveron.play.ui.theme.AccentEmerald
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
fun SeriesScreen(
    repository: ZyveronRepository,
    initialCategoryId: String = "ALL",
    initialSeriesId: Int? = null,
    onSelectSeries: (SeriesEntity, String) -> Unit,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val categories by repository.getSeriesCategories().collectAsState(initial = emptyList())
    val allSeries by repository.getAllSeries().collectAsState(initial = emptyList())
    val favorites by repository.getFavoriteSeries().collectAsState(initial = emptyList())

    var selectedCategoryId by remember { mutableStateOf(initialCategoryId) }
    var searchQuery by remember { mutableStateOf("") }

    val gridState = rememberLazyGridState()
    val categoryFocusRequester = remember { FocusRequester() }
    val itemFocusRequester = remember { FocusRequester() }

    // Quantitativo exato de cada categoria
    val seriesCountByCat = remember(allSeries) {
        allSeries.groupingBy { it.categoryId }.eachCount()
    }

    // Pasta Recém Adicionadas
    val recentSeries = remember(allSeries) {
        allSeries.sortedByDescending { it.seriesId }.take(100)
    }

    // Pasta Lançamentos
    val releaseSeries = remember(allSeries, categories) {
        val releaseCatIds = categories.filter {
            val n = it.categoryName.lowercase()
            n.contains("lançamento") || n.contains("lancamento") || n.contains("estreia") || n.contains("novas")
        }.map { it.categoryId }.toSet()

        allSeries.filter {
            it.categoryId in releaseCatIds ||
            it.year?.toIntOrNull()?.let { y -> y >= 2024 } == true ||
            it.name.contains("2026") || it.name.contains("2025") || it.name.contains("2024")
        }
    }

    val displayedSeries = remember(selectedCategoryId, searchQuery, allSeries, favorites, recentSeries, releaseSeries) {
        val baseList = when (selectedCategoryId) {
            "FAV" -> favorites
            "ALL" -> allSeries
            "RECENT" -> recentSeries
            "RELEASES" -> releaseSeries
            else -> allSeries.filter { it.categoryId == selectedCategoryId }
        }
        if (searchQuery.isBlank()) {
            baseList
        } else {
            val q = searchQuery.trim().lowercase()
            baseList.filter { it.name.lowercase().contains(q) }
        }
    }

    // Foco inicial garantido: na categoria ou no item anterior (NUNCA abre teclado na busca)
    LaunchedEffect(Unit) {
        delay(150)
        try {
            if (initialSeriesId != null) {
                itemFocusRequester.requestFocus()
            } else {
                categoryFocusRequester.requestFocus()
            }
        } catch (_: Exception) {
            try { categoryFocusRequester.requestFocus() } catch (_: Exception) {}
        }
    }

    // Posiciona na série selecionada anteriormente ao voltar
    LaunchedEffect(displayedSeries, initialSeriesId) {
        if (initialSeriesId != null && displayedSeries.isNotEmpty()) {
            val idx = displayedSeries.indexOfFirst { it.seriesId == initialSeriesId }
            if (idx >= 0) {
                try {
                    gridState.scrollToItem(idx)
                    for (i in 1..5) {
                        delay(50)
                        itemFocusRequester.requestFocus()
                    }
                } catch (_: Exception) {}
            }
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
                            text = "${displayedSeries.size} títulos disponíveis",
                            fontSize = 12.sp,
                            color = TextSecondary
                        )
                    }

                    TvTouchCard(
                        onClick = onBack,
                        containerColor = BgCardDark,
                        focusedContainerColor = AccentEmerald,
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                    ) { isFocused ->
                        Text(
                            text = "← Voltar",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (isFocused) Color.Black else TextPrimary
                        )
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
                            // Busca rápida de série
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(BgSurfaceDark)
                                        .border(
                                            1.dp,
                                            if (searchQuery.isNotEmpty()) AccentSky else BorderDark,
                                            RoundedCornerShape(8.dp)
                                        )
                                        .padding(horizontal = 8.dp, vertical = 6.dp)
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(text = "🔍", fontSize = 11.sp)
                                        Spacer(modifier = Modifier.width(6.dp))
                                        BasicTextField(
                                            value = searchQuery,
                                            onValueChange = { searchQuery = it },
                                            singleLine = true,
                                            textStyle = TextStyle(color = TextPrimary, fontSize = 11.sp),
                                            cursorBrush = SolidColor(AccentSky),
                                            decorationBox = { innerTextField ->
                                                if (searchQuery.isEmpty()) {
                                                    Text(
                                                        text = "Buscar série...",
                                                        color = TextSecondary,
                                                        fontSize = 11.sp
                                                    )
                                                }
                                                innerTextField()
                                            },
                                            modifier = Modifier.weight(1f)
                                        )
                                        if (searchQuery.isNotEmpty()) {
                                            Text(
                                                text = "✕",
                                                color = TextSecondary,
                                                fontSize = 11.sp,
                                                modifier = Modifier.clickable { searchQuery = "" }
                                            )
                                        }
                                    }
                                }
                            }

                            // 1. FAVORITOS
                            item {
                                CategoryItem(
                                    title = "★ Favoritos",
                                    count = favorites.size,
                                    isSelected = selectedCategoryId == "FAV",
                                    onClick = { selectedCategoryId = "FAV" }
                                )
                            }

                            // 2. TODAS AS SÉRIES
                            item {
                                CategoryItem(
                                    title = "Todas as Séries",
                                    count = allSeries.size,
                                    isSelected = selectedCategoryId == "ALL",
                                    modifier = Modifier.focusRequester(categoryFocusRequester),
                                    onClick = { selectedCategoryId = "ALL" }
                                )
                            }

                            // 3. RECÉM ADICIONADAS (Logo após Todos)
                            item {
                                CategoryItem(
                                    title = "⏱️ Recém Adicionadas",
                                    count = recentSeries.size,
                                    isSelected = selectedCategoryId == "RECENT",
                                    onClick = { selectedCategoryId = "RECENT" }
                                )
                            }

                            // 4. LANÇAMENTOS (Logo após Todos)
                            item {
                                CategoryItem(
                                    title = "✨ Lançamentos",
                                    count = releaseSeries.size,
                                    isSelected = selectedCategoryId == "RELEASES",
                                    onClick = { selectedCategoryId = "RELEASES" }
                                )
                            }

                            // 5. DEMAIS CATEGORIAS COM QUANTITATIVO REAL
                            items(categories) { cat ->
                                CategoryItem(
                                    title = cat.categoryName,
                                    count = seriesCountByCat[cat.categoryId] ?: 0,
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
                                    text = if (selectedCategoryId == "FAV") "Nenhuma série favoritada ainda.\nAperte Amarelo/Menu no controle para favoritar!"
                                    else "Nenhuma série encontrada",
                                    color = TextSecondary,
                                    fontSize = 13.sp
                                )
                            }
                        } else {
                            LazyVerticalGrid(
                                state = gridState,
                                columns = GridCells.Adaptive(135.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalArrangement = Arrangement.spacedBy(14.dp),
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(4.dp)
                            ) {
                                itemsIndexed(displayedSeries) { index, series ->
                                    val isTargetItem = initialSeriesId != null && series.seriesId == initialSeriesId
                                    TvTouchCard(
                                        onClick = { onSelectSeries(series, selectedCategoryId) },
                                        onLongClick = {
                                            scope.launch { repository.toggleSeriesFavorite(series) }
                                        },
                                        modifier = Modifier
                                            .width(135.dp)
                                            .then(if (isTargetItem) Modifier.focusRequester(itemFocusRequester) else Modifier)
                                            .onKeyEvent { keyEvent ->
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
                                        containerColor = BgSurfaceDark,
                                        focusedContainerColor = AccentEmerald,
                                        border = BorderStroke(1.dp, BorderDark),
                                        focusedBorder = BorderStroke(2.dp, Color.White),
                                        shape = RoundedCornerShape(10.dp)
                                    ) { isFocused ->
                                        Column(modifier = Modifier.fillMaxWidth()) {
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
                                                        Text(text = "★ Favorito", color = Color.Black, fontSize = 8.sp, fontWeight = FontWeight.Bold)
                                                    }
                                                }
                                            }

                                            Text(
                                                text = series.name,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis,
                                                color = if (isFocused) Color.Black else TextPrimary,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 6.dp)
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
