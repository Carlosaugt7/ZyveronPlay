package com.zyveron.play.ui.live

import androidx.annotation.OptIn
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.util.UnstableApi
import androidx.media3.ui.PlayerView
import androidx.tv.material3.Border
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.zyveron.play.data.local.CategoryEntity
import com.zyveron.play.data.local.ChannelEntity
import com.zyveron.play.data.repository.ZyveronRepository
import com.zyveron.play.player.ZyveronPlayerManager
import com.zyveron.play.ui.theme.AccentEmerald
import com.zyveron.play.ui.theme.AccentSky
import com.zyveron.play.ui.theme.BgCardDark
import com.zyveron.play.ui.theme.BgDeepDark
import com.zyveron.play.ui.theme.BgSurfaceDark
import com.zyveron.play.ui.theme.BorderDark
import com.zyveron.play.ui.theme.TextPrimary
import com.zyveron.play.ui.theme.TextSecondary
import com.zyveron.play.ui.theme.ZyveronTvBackground
import kotlinx.coroutines.launch

private fun isInternationalCategory(name: String): Boolean {
    val n = name.lowercase()
    return n.contains("internaciona") ||
           n.contains("international") ||
           n.contains("usa") ||
           n.contains("estados unidos") ||
           n.contains("uk") ||
           n.contains("united kingdom") ||
           n.contains("inglaterra") ||
           n.contains("espan") ||
           n.contains("spain") ||
           n.contains("portugal") ||
           n.contains("italia") ||
           n.contains("italy") ||
           n.contains("frança") ||
           n.contains("france") ||
           n.contains("alemanha") ||
           n.contains("germany") ||
           n.contains("mexic") ||
           n.contains("argentin") ||
           n.contains("chile") ||
           n.contains("colomb") ||
           n.contains("urugua") ||
           n.contains("paragua") ||
           n.contains("latino") ||
           n.contains("mundo") ||
           n.contains("world") ||
           n.contains("arab") ||
           n.contains("turk") ||
           n.contains("russia")
}

@OptIn(UnstableApi::class)
@Composable
fun LiveTvGuideScreen(
    repository: ZyveronRepository,
    playerManager: ZyveronPlayerManager,
    serverDns: String,
    username: String,
    password: String,
    initialFilterSports: Boolean = false,
    onOpenFullScreenPlayer: (ChannelEntity, List<ChannelEntity>) -> Unit,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val categories by repository.getCategories().collectAsState(initial = emptyList())
    val allChannels by repository.getAllChannels().collectAsState(initial = emptyList())
    val sportsChannels by repository.getSportsChannels().collectAsState(initial = emptyList())
    val favorites by repository.getFavorites().collectAsState(initial = emptyList())

    var searchQuery by remember { mutableStateOf("") }
    var selectedCategoryId by remember { mutableStateOf(if (initialFilterSports) "SPORTS" else "ALL") }
    var selectedChannelIndex by remember { mutableIntStateOf(0) }

    // Separação estrita: Categorias Nacionais no início, Internacionais no final
    val (internationalCategories, nationalCategories) = remember(categories) {
        categories.partition { isInternationalCategory(it.categoryName) }
    }

    // Determina lista de canais da categoria selecionada + filtro de busca
    val displayedChannels = remember(selectedCategoryId, searchQuery, allChannels, sportsChannels, favorites) {
        val baseList = when (selectedCategoryId) {
            "SPORTS" -> sportsChannels
            "FAV" -> favorites
            "ALL" -> allChannels
            "SEARCH" -> allChannels
            else -> allChannels.filter { it.categoryId == selectedCategoryId }
        }
        if (searchQuery.isNotBlank()) {
            baseList.filter { it.name.contains(searchQuery, ignoreCase = true) }
        } else {
            baseList
        }
    }

    val currentChannel = displayedChannels.getOrNull(selectedChannelIndex)

    // Toca automaticamente o canal selecionado na Mini-Transmissão
    LaunchedEffect(currentChannel, serverDns) {
        if (currentChannel != null) {
            val streamUrl = currentChannel.directSourceUrl ?: if (serverDns.isNotBlank()) {
                repository.buildLiveStreamUrl(serverDns, username, password, currentChannel.streamId)
            } else ""

            if (streamUrl.isNotBlank()) {
                playerManager.playStream(streamUrl, currentChannel.name)
            }
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            playerManager.stop()
        }
    }

    ZyveronTvBackground {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(18.dp)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Top Bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "TV ao Vivo",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Text(
                            text = "${displayedChannels.size} canais disponíveis",
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

                // Grade de 3 Colunas: Categorias | Canais | Mini Player & EPG
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // COLUNA 1: Categorias (Busca, Favoritos, Nacionais, e Internacionais no Final)
                    Box(
                        modifier = Modifier
                            .weight(1f)
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
                            // 1. CAMPO DE PESQUISA NO TOPO
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
                                            onValueChange = {
                                                searchQuery = it
                                                if (it.isNotBlank()) selectedCategoryId = "SEARCH"
                                                else if (selectedCategoryId == "SEARCH") selectedCategoryId = "ALL"
                                            },
                                            singleLine = true,
                                            textStyle = TextStyle(color = TextPrimary, fontSize = 11.sp),
                                            cursorBrush = SolidColor(AccentSky),
                                            decorationBox = { innerTextField ->
                                                if (searchQuery.isEmpty()) {
                                                    Text(
                                                        text = "Buscar canal...",
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
                                                modifier = Modifier.clickable {
                                                    searchQuery = ""
                                                    if (selectedCategoryId == "SEARCH") selectedCategoryId = "ALL"
                                                }
                                            )
                                        }
                                    }
                                }
                            }

                            // 2. FAVORITOS
                            item {
                                CategoryItem(
                                    title = "★ Favoritos",
                                    count = favorites.size,
                                    isSelected = selectedCategoryId == "FAV",
                                    onClick = {
                                        selectedCategoryId = "FAV"
                                        selectedChannelIndex = 0
                                    }
                                )
                            }

                            // 3. TODOS OS CANAIS
                            item {
                                CategoryItem(
                                    title = "Todos os Canais",
                                    count = allChannels.size,
                                    isSelected = selectedCategoryId == "ALL",
                                    onClick = {
                                        selectedCategoryId = "ALL"
                                        selectedChannelIndex = 0
                                    }
                                )
                            }

                            // 4. GUIA DE JOGOS / ESPORTES
                            item {
                                CategoryItem(
                                    title = "⚽ Guia de Jogos / Esportes",
                                    count = sportsChannels.size,
                                    isSelected = selectedCategoryId == "SPORTS",
                                    onClick = {
                                        selectedCategoryId = "SPORTS"
                                        selectedChannelIndex = 0
                                    }
                                )
                            }

                            // 5. DEMAIS CATEGORIAS NACIONAIS
                            items(nationalCategories) { cat ->
                                CategoryItem(
                                    title = cat.categoryName,
                                    count = null,
                                    isSelected = selectedCategoryId == cat.categoryId,
                                    onClick = {
                                        selectedCategoryId = cat.categoryId
                                        selectedChannelIndex = 0
                                    }
                                )
                            }

                            // 6. CATEGORIAS INTERNACIONAIS (SEMPRE NO FINAL DA LISTA)
                            if (internationalCategories.isNotEmpty()) {
                                item {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(top = 10.dp, bottom = 4.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = "── CANAIS INTERNACIONAIS ──",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = AccentSky,
                                            letterSpacing = 0.5.sp
                                        )
                                    }
                                }
                                items(internationalCategories) { cat ->
                                    CategoryItem(
                                        title = cat.categoryName,
                                        count = null,
                                        isSelected = selectedCategoryId == cat.categoryId,
                                        onClick = {
                                            selectedCategoryId = cat.categoryId
                                            selectedChannelIndex = 0
                                        }
                                    )
                                }
                            }
                        }
                    }

                    // COLUNA 2: Lista de Canais (~340dp) com Favoritos via Remoto
                    Box(
                        modifier = Modifier
                            .weight(1.3f)
                            .fillMaxHeight()
                            .clip(RoundedCornerShape(14.dp))
                            .background(BgCardDark)
                            .border(1.dp, BorderDark, RoundedCornerShape(14.dp))
                            .padding(10.dp)
                    ) {
                        if (displayedChannels.isEmpty()) {
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Text(text = "Nenhum canal encontrado", color = TextSecondary, fontSize = 12.sp)
                            }
                        } else {
                            LazyColumn(
                                verticalArrangement = Arrangement.spacedBy(6.dp),
                                modifier = Modifier.fillMaxSize()
                            ) {
                                itemsIndexed(displayedChannels) { index, channel ->
                                    val isSelected = index == selectedChannelIndex
                                    Button(
                                        onClick = {
                                            selectedChannelIndex = index
                                            onOpenFullScreenPlayer(channel, displayedChannels)
                                        },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .onKeyEvent { keyEvent ->
                                                if (keyEvent.type == KeyEventType.KeyDown &&
                                                    (keyEvent.nativeKeyEvent.keyCode == android.view.KeyEvent.KEYCODE_STAR ||
                                                     keyEvent.nativeKeyEvent.keyCode == android.view.KeyEvent.KEYCODE_PROG_YELLOW ||
                                                     keyEvent.nativeKeyEvent.keyCode == android.view.KeyEvent.KEYCODE_MENU ||
                                                     keyEvent.nativeKeyEvent.keyCode == android.view.KeyEvent.KEYCODE_BOOKMARK)
                                                ) {
                                                    scope.launch { repository.toggleChannelFavorite(channel) }
                                                    true
                                                } else {
                                                    false
                                                }
                                            },
                                        colors = ButtonDefaults.colors(
                                            containerColor = if (isSelected) AccentEmerald.copy(alpha = 0.2f) else BgSurfaceDark,
                                            focusedContainerColor = AccentEmerald,
                                            contentColor = if (isSelected) AccentEmerald else TextPrimary,
                                            focusedContentColor = Color.Black
                                        ),
                                        border = ButtonDefaults.border(
                                            border = Border(BorderStroke(1.dp, if (isSelected) AccentEmerald.copy(alpha = 0.5f) else BorderDark)),
                                            focusedBorder = Border(BorderStroke(2.dp, Color.White))
                                        ),
                                        shape = ButtonDefaults.shape(RoundedCornerShape(10.dp)),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 8.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            if (!channel.streamIcon.isNullOrBlank()) {
                                                AsyncImage(
                                                    model = channel.streamIcon,
                                                    contentDescription = channel.name,
                                                    modifier = Modifier
                                                        .size(24.dp)
                                                        .clip(RoundedCornerShape(4.dp))
                                                )
                                                Spacer(modifier = Modifier.width(10.dp))
                                            }
                                            Text(
                                                text = channel.num.toString().padStart(3, '0'),
                                                fontFamily = FontFamily.Monospace,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                text = channel.name,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis,
                                                modifier = Modifier.weight(1f)
                                            )
                                            if (channel.isFavorite) {
                                                Spacer(modifier = Modifier.width(6.dp))
                                                Text(
                                                    text = "★",
                                                    color = Color(0xFFF59E0B),
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // COLUNA 3: Mini Player + Nome + Guia EPG + Botão Favoritar
                    Box(
                        modifier = Modifier
                            .weight(1.7f)
                            .fillMaxHeight()
                            .clip(RoundedCornerShape(14.dp))
                            .background(BgCardDark)
                            .border(1.dp, BorderDark, RoundedCornerShape(14.dp))
                            .padding(14.dp)
                    ) {
                        Column(modifier = Modifier.fillMaxSize()) {
                            // Mini Player Surface
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(190.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Color.Black)
                                    .border(1.dp, BorderDark, RoundedCornerShape(10.dp))
                            ) {
                                AndroidView(
                                    factory = { ctx ->
                                        PlayerView(ctx).apply {
                                            player = playerManager.getPlayer()
                                            useController = false
                                            keepScreenOn = true
                                        }
                                    },
                                    modifier = Modifier.fillMaxSize()
                                )

                                // Botões sobrepostos: Favoritar e Tela Cheia
                                Row(
                                    modifier = Modifier
                                        .align(Alignment.BottomEnd)
                                        .padding(8.dp),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    if (currentChannel != null) {
                                        val isFav = currentChannel.isFavorite
                                        Button(
                                            onClick = {
                                                scope.launch {
                                                    repository.toggleChannelFavorite(currentChannel)
                                                }
                                            },
                                            colors = ButtonDefaults.colors(
                                                containerColor = if (isFav) Color(0xFFF59E0B).copy(alpha = 0.85f) else Color.Black.copy(alpha = 0.7f),
                                                focusedContainerColor = Color(0xFFF59E0B),
                                                contentColor = if (isFav) Color.Black else Color.White,
                                                focusedContentColor = Color.Black
                                            ),
                                            shape = ButtonDefaults.shape(RoundedCornerShape(6.dp)),
                                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                                        ) {
                                            Text(
                                                text = if (isFav) "★ Favorito" else "☆ Favoritar",
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }

                                    Button(
                                        onClick = {
                                            if (currentChannel != null) {
                                                onOpenFullScreenPlayer(currentChannel, displayedChannels)
                                            }
                                        },
                                        colors = ButtonDefaults.colors(
                                            containerColor = Color.Black.copy(alpha = 0.7f),
                                            focusedContainerColor = AccentEmerald,
                                            contentColor = Color.White,
                                            focusedContentColor = Color.Black
                                        ),
                                        shape = ButtonDefaults.shape(RoundedCornerShape(6.dp)),
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                                    ) {
                                        Text(text = "⛶ Tela Cheia", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            // Nome do Canal
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = currentChannel?.name ?: "Selecione um canal",
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f)
                                )
                                if (currentChannel?.isFavorite == true) {
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(text = "★", color = Color(0xFFF59E0B), fontSize = 16.sp)
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // Bloco de EPG / Programação
                            Text(
                                text = "GUIA DE PROGRAMAÇÃO (EPG)",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = AccentSky,
                                letterSpacing = 0.8.sp
                            )

                            Spacer(modifier = Modifier.height(8.dp))

                            // Programa Atual (No Ar)
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(BgSurfaceDark)
                                    .border(1.dp, BorderDark, RoundedCornerShape(8.dp))
                                    .padding(10.dp)
                            ) {
                                Column {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(4.dp))
                                                .background(AccentEmerald.copy(alpha = 0.2f))
                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                        ) {
                                            Text(text = "AGORA", color = AccentEmerald, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                                        }
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = "16:00 - 18:00",
                                            color = TextSecondary,
                                            fontSize = 10.sp,
                                            fontFamily = FontFamily.Monospace
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "Programação Ao Vivo • ${currentChannel?.name ?: "Canal HD"}",
                                        color = TextPrimary,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = "Transmissão contínua em alta definição sem travamentos.",
                                        color = TextSecondary,
                                        fontSize = 10.sp,
                                        maxLines = 2
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            // Próximo Programa
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(BgSurfaceDark.copy(alpha = 0.6f))
                                    .padding(10.dp)
                            ) {
                                Column {
                                    Text(text = "18:00 - 19:30 • A Seguir", color = TextSecondary, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                                    Text(text = "Edição Especial & Notícias", color = TextPrimary, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CategoryItem(
    title: String,
    count: Int?,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        colors = ButtonDefaults.colors(
            containerColor = if (isSelected) AccentEmerald.copy(alpha = 0.25f) else Color.Transparent,
            focusedContainerColor = AccentEmerald,
            contentColor = if (isSelected) AccentEmerald else TextPrimary,
            focusedContentColor = Color.Black
        ),
        border = ButtonDefaults.border(
            border = Border(BorderStroke(1.dp, if (isSelected) AccentEmerald.copy(alpha = 0.5f) else Color.Transparent)),
            focusedBorder = Border(BorderStroke(2.dp, Color.White))
        ),
        shape = ButtonDefaults.shape(RoundedCornerShape(8.dp)),
        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 8.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = title,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )
            if (count != null) {
                Text(
                    text = "$count",
                    fontSize = 10.sp,
                    color = if (isSelected) Color.Black else TextSecondary,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

