package com.zyveron.play.ui.live

import androidx.annotation.OptIn
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
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
    val categories by repository.getCategories().collectAsState(initial = emptyList())
    val allChannels by repository.getAllChannels().collectAsState(initial = emptyList())
    val sportsChannels by repository.getSportsChannels().collectAsState(initial = emptyList())
    val favorites by repository.getFavorites().collectAsState(initial = emptyList())

    var selectedCategoryId by remember { mutableStateOf(if (initialFilterSports) "SPORTS" else "ALL") }
    var selectedChannelIndex by remember { mutableIntStateOf(0) }

    // Determina lista de canais da categoria selecionada
    val displayedChannels = remember(selectedCategoryId, allChannels, sportsChannels, favorites) {
        when (selectedCategoryId) {
            "SPORTS" -> sportsChannels
            "FAV" -> favorites
            "ALL" -> allChannels
            else -> allChannels.filter { it.categoryId == selectedCategoryId }
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

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDeepDark)
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
                // COLUNA 1: Categorias (~240dp)
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
                        items(categories) { cat ->
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

                // COLUNA 2: Lista de Canais (~340dp)
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
                                    modifier = Modifier.fillMaxWidth(),
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
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Text(
                                            text = channel.name,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // COLUNA 3: Mini Player + Nome + Guia EPG
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

                            // Botão sobreposto para tela cheia
                            Button(
                                onClick = {
                                    if (currentChannel != null) {
                                        onOpenFullScreenPlayer(currentChannel, displayedChannels)
                                    }
                                },
                                modifier = Modifier
                                    .align(Alignment.BottomEnd)
                                    .padding(8.dp),
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

                        Spacer(modifier = Modifier.height(10.dp))

                        // Nome do Canal
                        Text(
                            text = currentChannel?.name ?: "Selecione um canal",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )

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

