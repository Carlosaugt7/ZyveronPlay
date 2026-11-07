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
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
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
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.zyveron.play.data.local.CategoryEntity
import com.zyveron.play.data.local.ChannelEntity
import com.zyveron.play.data.model.EpgProgram
import com.zyveron.play.data.repository.ZyveronRepository
import com.zyveron.play.player.PlaybackState
import com.zyveron.play.player.ZyveronPlayerManager
import com.zyveron.play.ui.components.AdultPinDialog
import com.zyveron.play.ui.components.TvTouchCard
import com.zyveron.play.ui.theme.AccentEmerald
import com.zyveron.play.ui.theme.AccentRose
import kotlinx.coroutines.delay
import com.zyveron.play.ui.theme.AccentSky
import com.zyveron.play.ui.theme.BgCardDark
import com.zyveron.play.ui.theme.BgSurfaceDark
import com.zyveron.play.ui.theme.BorderDark
import com.zyveron.play.ui.theme.TextPrimary
import com.zyveron.play.ui.theme.TextSecondary
import com.zyveron.play.ui.theme.ZyveronTvBackground
import com.zyveron.play.util.AdultContentHelper
import com.zyveron.play.util.CategoryGroup
import com.zyveron.play.util.CategorySorter
import kotlinx.coroutines.launch

@OptIn(UnstableApi::class)
@Composable
fun LiveTvGuideScreen(
    repository: ZyveronRepository,
    playerManager: ZyveronPlayerManager,
    serverDns: String,
    username: String,
    password: String,
    initialFilterSports: Boolean = false,
    initialCategoryId: String? = null,
    initialChannelId: Int? = null,
    onOpenFullScreenPlayer: (ChannelEntity, List<ChannelEntity>, String) -> Unit,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val playbackState by playerManager.playbackState.collectAsState()
    val categories by repository.getCategories().collectAsState(initial = emptyList())
    val allChannels by repository.getAllChannels().collectAsState(initial = emptyList())
    val sportsChannels by repository.getSportsChannels().collectAsState(initial = emptyList())
    val favorites by repository.getFavorites().collectAsState(initial = emptyList())

    var searchQuery by remember { mutableStateOf("") }
    var isSearchFocusable by remember { mutableStateOf(false) }
    var selectedCategoryId by remember { mutableStateOf(initialCategoryId ?: (if (initialFilterSports) "SPORTS" else "ALL")) }
    var selectedChannelIndex by remember { mutableIntStateOf(0) }
    val channelListState = rememberLazyListState()

    val categoryAllFocusRequester = remember { FocusRequester() }
    val channelListFocusRequester = remember { FocusRequester() }

    var showAdultPinDialog by remember { mutableStateOf(false) }
    var pendingAdultCategoryId by remember { mutableStateOf<String?>(null) }

    // Ação para selecionar categoria e mover foco automaticamente para o 1º canal
    val onSelectCategory: (String) -> Unit = { catId ->
        selectedCategoryId = catId
        selectedChannelIndex = 0
        scope.launch {
            try {
                channelListState.scrollToItem(0)
            } catch (_: Exception) {}
            for (attempt in 0..15) {
                delay(40)
                try {
                    channelListFocusRequester.requestFocus()
                    break
                } catch (_: Exception) {}
            }
        }
    }

    val handleCategoryClick: (CategoryEntity) -> Unit = { cat ->
        val isAdult = AdultContentHelper.isAdultCategory(cat.categoryName)
        if (isAdult && !AdultContentHelper.isSessionUnlocked()) {
            pendingAdultCategoryId = cat.categoryId
            showAdultPinDialog = true
        } else {
            onSelectCategory(cat.categoryId)
        }
    }

    // Quantitativo exato de canais por categoria
    val channelCountByCat = remember(allChannels) {
        allChannels.groupingBy { it.categoryId }.eachCount()
    }

    // Pasta Recém Adicionados
    val recentChannels = remember(allChannels) {
        allChannels.sortedByDescending { it.streamId }.take(100)
    }

    // Foco inicial garantido: no canal anterior ou na categoria "Todos os Canais" (NUNCA abre teclado na busca)
    LaunchedEffect(Unit) {
        // Delay maior para garantir que os itens já foram compostos na tela
        delay(200)
        if (initialChannelId != null) {
            // Voltando da tela cheia: tenta focar diretamente no canal da lista
            var focused = false
            repeat(15) {
                if (!focused) {
                    delay(60)
                    try {
                        channelListFocusRequester.requestFocus()
                        focused = true
                    } catch (_: Exception) {}
                }
            }
            // Fallback: se não conseguiu focar no canal, foca na categoria Todos
            if (!focused) {
                try { categoryAllFocusRequester.requestFocus() } catch (_: Exception) {}
            }
        } else {
            // Entrada normal: foca na categoria Todos
            try {
                categoryAllFocusRequester.requestFocus()
            } catch (_: Exception) {}
        }
        delay(150)
        isSearchFocusable = true
    }

    // Agrupamento estrito de categorias: Regionais/Abertos -> Temáticos -> 24 Horas -> Internacionais -> Adultos (+18)
    val groupedCategories = remember(categories) {
        val regionaisAbertos = mutableListOf<CategoryEntity>()
        val regulares = mutableListOf<CategoryEntity>()
        val vinteQuatroHoras = mutableListOf<CategoryEntity>()
        val internacionais = mutableListOf<CategoryEntity>()
        val adultos = mutableListOf<CategoryEntity>()

        categories.forEach { cat ->
            if (AdultContentHelper.isAdultCategory(cat.categoryName)) {
                adultos.add(cat)
            } else {
                when (CategorySorter.classify(cat.categoryName)) {
                    CategoryGroup.REGIONAL_ABERTO -> regionaisAbertos.add(cat)
                    CategoryGroup.REGULAR -> regulares.add(cat)
                    CategoryGroup.VINTE_QUATRO_HORAS -> vinteQuatroHoras.add(cat)
                    CategoryGroup.INTERNACIONAL -> internacionais.add(cat)
                }
            }
        }
        regionaisAbertos.sortBy { it.categoryName.lowercase() }
        regulares.sortBy { it.categoryName.lowercase() }
        vinteQuatroHoras.sortBy { it.categoryName.lowercase() }
        internacionais.sortBy { it.categoryName.lowercase() }
        adultos.sortBy { it.categoryName.lowercase() }

        object {
            val regional = regionaisAbertos
            val regular = regulares
            val vinteQuatro = vinteQuatroHoras
            val internacional = internacionais
            val adulto = adultos
        }
    }

    // Determina lista de canais da categoria selecionada + filtro de busca (busca global em TODOS os canais)
    val displayedChannels = remember(selectedCategoryId, searchQuery, allChannels, sportsChannels, favorites, recentChannels) {
        if (searchQuery.isNotBlank()) {
            allChannels.filter { it.name.contains(searchQuery, ignoreCase = true) }
        } else {
            when (selectedCategoryId) {
                "SPORTS" -> sportsChannels
                "FAV" -> favorites
                "ALL" -> allChannels
                "RECENT" -> recentChannels
                "SEARCH" -> allChannels
                else -> allChannels.filter { it.categoryId == selectedCategoryId }
            }
        }
    }

    val currentChannel = displayedChannels.getOrNull(selectedChannelIndex)

    // Posiciona o canal ativo caso venha de retorno da tela cheia
    LaunchedEffect(displayedChannels, initialChannelId) {
        if (initialChannelId != null && displayedChannels.isNotEmpty()) {
            val idx = displayedChannels.indexOfFirst { it.streamId == initialChannelId }
            if (idx >= 0) {
                selectedChannelIndex = idx
                try {
                    channelListState.scrollToItem(idx)
                } catch (_: Exception) {}
                for (attempt in 0..15) {
                    delay(50)
                    try {
                        channelListFocusRequester.requestFocus()
                        break
                    } catch (_: Exception) {}
                }
            }
        }
    }

    // Toca o canal selecionado na Mini-Transmissão
    LaunchedEffect(currentChannel?.streamId, serverDns) {
        if (currentChannel != null) {
            val streamUrl = currentChannel.directSourceUrl ?: if (serverDns.isNotBlank()) {
                repository.buildLiveStreamUrl(serverDns, username, password, currentChannel.streamId)
            } else ""

            if (streamUrl.isNotBlank()) {
                playerManager.playStream(streamUrl, currentChannel.name)
            }
        }
    }

    var epgPrograms by remember { mutableStateOf<List<EpgProgram>>(emptyList()) }
    var isEpgLoading by remember { mutableStateOf(false) }
    var nowSec by remember { mutableLongStateOf(System.currentTimeMillis() / 1000L) }

    // Atualiza relógio a cada 30 segundos para atualizar barra de progresso do EPG
    LaunchedEffect(Unit) {
        while (true) {
            delay(30_000)
            nowSec = System.currentTimeMillis() / 1000L
        }
    }

    // Busca EPG sob demanda para o canal atual com debounce para zapping fluido
    LaunchedEffect(currentChannel?.streamId, serverDns) {
        val ch = currentChannel
        if (ch != null && serverDns.isNotBlank()) {
            isEpgLoading = true
            delay(250)
            val list = repository.getChannelEpg(serverDns, username, password, ch.streamId)
            epgPrograms = list
            isEpgLoading = false
        } else {
            epgPrograms = emptyList()
            isEpgLoading = false
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

                // Grade de 3 Colunas: Categorias | Canais | Mini Player & EPG
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // COLUNA 1: Categorias (Busca -> Favoritos -> Todos -> Regionais/Abertos -> Temáticos -> 24h -> Internacionais)
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
                                    onClick = { onSelectCategory("FAV") }
                                )
                            }

                            // 3. TODOS OS CANAIS
                            item {
                                CategoryItem(
                                    title = "Todos os Canais",
                                    count = allChannels.size,
                                    isSelected = selectedCategoryId == "ALL",
                                    modifier = Modifier.focusRequester(categoryAllFocusRequester),
                                    onClick = { onSelectCategory("ALL") }
                                )
                            }

                            // 4. RECÉM ADICIONADOS (Logo após Todos)
                            item {
                                CategoryItem(
                                    title = "⏱️ Recém Adicionados",
                                    count = recentChannels.size,
                                    isSelected = selectedCategoryId == "RECENT",
                                    onClick = { onSelectCategory("RECENT") }
                                )
                            }

                            // 5. GUIA DE JOGOS / ESPORTES
                            item {
                                CategoryItem(
                                    title = "⚽ Guia de Jogos / Esportes",
                                    count = sportsChannels.size,
                                    isSelected = selectedCategoryId == "SPORTS",
                                    onClick = { onSelectCategory("SPORTS") }
                                )
                            }

                            // 6. CANAIS REGIONAIS & ABERTOS (LOGO APÓS TODOS)
                            if (groupedCategories.regional.isNotEmpty()) {
                                item {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(top = 8.dp, bottom = 4.dp),
                                        contentAlignment = Alignment.CenterStart
                                    ) {
                                        Text(
                                            text = "REGIONAIS & ABERTOS",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = AccentEmerald,
                                            letterSpacing = 0.5.sp
                                        )
                                    }
                                }
                                items(groupedCategories.regional) { cat ->
                                    CategoryItem(
                                        title = cat.categoryName,
                                        count = channelCountByCat[cat.categoryId] ?: 0,
                                        isSelected = selectedCategoryId == cat.categoryId,
                                        onClick = { onSelectCategory(cat.categoryId) }
                                    )
                                }
                            }

                            // 7. DEMAIS CATEGORIAS NACIONAIS E TEMÁTICAS
                            if (groupedCategories.regular.isNotEmpty()) {
                                item {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(top = 8.dp, bottom = 4.dp),
                                        contentAlignment = Alignment.CenterStart
                                    ) {
                                        Text(
                                            text = "CANAIS TEMÁTICOS",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = TextSecondary,
                                            letterSpacing = 0.5.sp
                                        )
                                    }
                                }
                                items(groupedCategories.regular) { cat ->
                                    CategoryItem(
                                        title = cat.categoryName,
                                        count = channelCountByCat[cat.categoryId] ?: 0,
                                        isSelected = selectedCategoryId == cat.categoryId,
                                        onClick = { onSelectCategory(cat.categoryId) }
                                    )
                                }
                            }

                            // 8. CANAIS 24 HORAS (NO FINAL, ANTES DOS INTERNACIONAIS)
                            if (groupedCategories.vinteQuatro.isNotEmpty()) {
                                item {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(top = 10.dp, bottom = 4.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = "── CANAIS 24 HORAS ──",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = AccentSky,
                                            letterSpacing = 0.5.sp
                                        )
                                    }
                                }
                                items(groupedCategories.vinteQuatro) { cat ->
                                    CategoryItem(
                                        title = cat.categoryName,
                                        count = channelCountByCat[cat.categoryId] ?: 0,
                                        isSelected = selectedCategoryId == cat.categoryId,
                                        onClick = { onSelectCategory(cat.categoryId) }
                                    )
                                }
                            }

                            // 9. CANAIS INTERNACIONAIS (ESTRITAMENTE NO FINAL DE TUDO)
                            if (groupedCategories.internacional.isNotEmpty()) {
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
                                            color = Color(0xFFF59E0B),
                                            letterSpacing = 0.5.sp
                                        )
                                    }
                                }
                                items(groupedCategories.internacional) { cat ->
                                    CategoryItem(
                                        title = cat.categoryName,
                                        count = channelCountByCat[cat.categoryId] ?: 0,
                                        isSelected = selectedCategoryId == cat.categoryId,
                                        onClick = { onSelectCategory(cat.categoryId) }
                                    )
                                }
                            }

                            // 10. CANAIS ADULTOS (+18) PROTEGIDOS POR PIN (ESTRITAMENTE NO FINAL DE TUDO)
                            if (groupedCategories.adulto.isNotEmpty()) {
                                item {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(top = 10.dp, bottom = 4.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = "── 🔒 CONTEÚDO ADULTO (+18) ──",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = AccentRose,
                                            letterSpacing = 0.5.sp
                                        )
                                    }
                                }
                                items(groupedCategories.adulto) { cat ->
                                    CategoryItem(
                                        title = "🔒 ${cat.categoryName}",
                                        count = channelCountByCat[cat.categoryId] ?: 0,
                                        isSelected = selectedCategoryId == cat.categoryId,
                                        onClick = { handleCategoryClick(cat) }
                                    )
                                }
                            }
                        }
                    }

                    // COLUNA 2: Lista de Canais (~340dp) com Suporte Touch + D-Pad + Favoritos
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
                                state = channelListState,
                                verticalArrangement = Arrangement.spacedBy(6.dp),
                                modifier = Modifier.fillMaxSize()
                            ) {
                                itemsIndexed(displayedChannels) { index, channel ->
                                    val isSelected = index == selectedChannelIndex
                                    TvTouchCard(
                                        onClick = {
                                            if (selectedChannelIndex != index) {
                                                // Primeiro clique: seleciona o canal e exibe na prévia do mini-player
                                                selectedChannelIndex = index
                                            } else {
                                                // Segundo clique no canal ativo na prévia: entra em tela cheia
                                                onOpenFullScreenPlayer(channel, displayedChannels, selectedCategoryId)
                                            }
                                        },
                                        onLongClick = {
                                            // Pressionar e segurar OK por 1.5s - 2s -> Favorita/desfavorita sem entrar em tela cheia!
                                            scope.launch { repository.toggleChannelFavorite(channel) }
                                        },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .then(if (isSelected) Modifier.focusRequester(channelListFocusRequester) else Modifier)
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
                                        containerColor = if (isSelected) AccentEmerald.copy(alpha = 0.2f) else BgSurfaceDark,
                                        focusedContainerColor = AccentEmerald,
                                        border = BorderStroke(1.dp, if (isSelected) AccentEmerald.copy(alpha = 0.5f) else BorderDark),
                                        focusedBorder = BorderStroke(2.dp, Color.White),
                                        shape = RoundedCornerShape(10.dp),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 8.dp)
                                    ) { isFocused ->
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
                                                fontWeight = FontWeight.Bold,
                                                color = if (isFocused) Color.Black else (if (isSelected) AccentEmerald else TextPrimary)
                                            )
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                text = channel.name,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis,
                                                color = if (isFocused) Color.Black else (if (isSelected) AccentEmerald else TextPrimary),
                                                modifier = Modifier
                                                 .weight(1f)
                                                 .focusProperties { canFocus = isSearchFocusable }
                                            )
                                            if (channel.isFavorite) {
                                                Spacer(modifier = Modifier.width(6.dp))
                                                Text(
                                                    text = "★",
                                                    color = if (isFocused) Color.Black else Color(0xFFF59E0B),
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
                                            isFocusable = false
                                            isFocusableInTouchMode = false
                                        }
                                    },
                                    modifier = Modifier.fillMaxSize()
                                )

                                // Feedback de sinal / carregamento / erro
                                when (val st = playbackState) {
                                    is PlaybackState.Buffering -> {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxSize()
                                                .background(Color.Black.copy(alpha = 0.5f)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = "⏳ Carregando sinal...",
                                                color = AccentEmerald,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.SemiBold
                                            )
                                        }
                                    }
                                    is PlaybackState.Error -> {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxSize()
                                                .background(Color.Black.copy(alpha = 0.85f))
                                                .padding(10.dp),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = "⚠️ Sinal indisponível ou limite de conexões atingido.\n${st.message}",
                                                color = AccentRose,
                                                fontSize = 11.sp,
                                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                                lineHeight = 14.sp
                                            )
                                        }
                                    }
                                    else -> {
                                        if (serverDns.isBlank()) {
                                            Box(
                                                modifier = Modifier
                                                    .fillMaxSize()
                                                    .background(Color.Black.copy(alpha = 0.85f))
                                                    .padding(10.dp),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Text(
                                                    text = "⚠️ DNS do servidor não configurado no painel.",
                                                    color = AccentRose,
                                                    fontSize = 11.sp,
                                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                                )
                                            }
                                        }
                                    }
                                }

                                // Botões sobrepostos: Favoritar e Tela Cheia
                                Row(
                                    modifier = Modifier
                                        .align(Alignment.BottomEnd)
                                        .padding(8.dp),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    if (currentChannel != null) {
                                        val isFav = currentChannel.isFavorite
                                        TvTouchCard(
                                            onClick = {
                                                scope.launch {
                                                    repository.toggleChannelFavorite(currentChannel)
                                                }
                                            },
                                            containerColor = if (isFav) Color(0xFFF59E0B).copy(alpha = 0.85f) else Color.Black.copy(alpha = 0.7f),
                                            focusedContainerColor = Color(0xFFF59E0B),
                                            shape = RoundedCornerShape(6.dp),
                                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                                        ) { isFocused ->
                                            Text(
                                                text = if (isFav) "★ Favorito" else "☆ Favoritar",
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (isFocused || isFav) Color.Black else Color.White
                                            )
                                        }
                                    }

                                    TvTouchCard(
                                        onClick = {
                                            if (currentChannel != null) {
                                                onOpenFullScreenPlayer(currentChannel, displayedChannels, selectedCategoryId)
                                            }
                                        },
                                        containerColor = Color.Black.copy(alpha = 0.7f),
                                        focusedContainerColor = AccentEmerald,
                                        shape = RoundedCornerShape(6.dp),
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                                    ) { isFocused ->
                                        Text(
                                            text = "⛶ Tela Cheia",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (isFocused) Color.Black else Color.White
                                        )
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
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "GUIA DE PROGRAMAÇÃO (EPG)",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = AccentSky,
                                    letterSpacing = 0.8.sp
                                )
                                if (isEpgLoading) {
                                    Text(
                                        text = "Sincronizando...",
                                        fontSize = 10.sp,
                                        color = TextSecondary
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            val nowProgram = remember(epgPrograms, nowSec) {
                                epgPrograms.firstOrNull { it.isNowPlaying || (it.startTimestamp > 0 && nowSec in it.startTimestamp..it.stopTimestamp) }
                                    ?: epgPrograms.firstOrNull()
                            }
                            val nextPrograms = remember(epgPrograms, nowProgram) {
                                epgPrograms.filter { it != nowProgram }
                            }
                            val nextProgram = nextPrograms.firstOrNull()

                            if (isEpgLoading && epgPrograms.isEmpty()) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(BgSurfaceDark)
                                        .border(1.dp, BorderDark, RoundedCornerShape(8.dp))
                                        .padding(14.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = "Carregando programação do canal...",
                                        color = TextSecondary,
                                        fontSize = 11.sp
                                    )
                                }
                            } else if (nowProgram != null) {
                                val prog = remember(nowProgram, nowSec) {
                                    if (nowProgram.startTimestamp > 0 && nowProgram.stopTimestamp > nowProgram.startTimestamp) {
                                        ((nowSec - nowProgram.startTimestamp).toFloat() / (nowProgram.stopTimestamp - nowProgram.startTimestamp).toFloat()).coerceIn(0f, 1f)
                                    } else nowProgram.progress
                                }

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
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Box(
                                                    modifier = Modifier
                                                        .clip(RoundedCornerShape(4.dp))
                                                        .background(AccentEmerald.copy(alpha = 0.2f))
                                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                                ) {
                                                    Text(
                                                        text = "● NO AR",
                                                        color = AccentEmerald,
                                                        fontSize = 9.sp,
                                                        fontWeight = FontWeight.Bold
                                                    )
                                                }
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text(
                                                    text = "${nowProgram.startFormatted} - ${nowProgram.endFormatted}",
                                                    color = TextSecondary,
                                                    fontSize = 10.sp,
                                                    fontFamily = FontFamily.Monospace
                                                )
                                            }
                                            if (prog > 0f) {
                                                Text(
                                                    text = "${(prog * 100).toInt()}%",
                                                    color = AccentEmerald,
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    fontFamily = FontFamily.Monospace
                                                )
                                            }
                                        }
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Text(
                                            text = nowProgram.title,
                                            color = TextPrimary,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Spacer(modifier = Modifier.height(5.dp))
                                        // Barra de progresso do programa
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .height(3.dp)
                                                .clip(RoundedCornerShape(2.dp))
                                                .background(Color.White.copy(alpha = 0.12f))
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .fillMaxWidth(prog)
                                                    .fillMaxHeight()
                                                    .background(AccentEmerald)
                                            )
                                        }
                                        if (nowProgram.description.isNotBlank()) {
                                            Spacer(modifier = Modifier.height(5.dp))
                                            Text(
                                                text = nowProgram.description,
                                                color = TextSecondary,
                                                fontSize = 10.sp,
                                                maxLines = 2,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }
                                    }
                                }

                                // Próximo Programa (A Seguir)
                                if (nextProgram != null) {
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(BgSurfaceDark.copy(alpha = 0.6f))
                                            .border(1.dp, BorderDark.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                                            .padding(10.dp)
                                    ) {
                                        Column {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Box(
                                                    modifier = Modifier
                                                        .clip(RoundedCornerShape(4.dp))
                                                        .background(AccentSky.copy(alpha = 0.18f))
                                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                                ) {
                                                    Text(
                                                        text = "A SEGUIR",
                                                        color = AccentSky,
                                                        fontSize = 8.sp,
                                                        fontWeight = FontWeight.Bold
                                                    )
                                                }
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text(
                                                    text = "${nextProgram.startFormatted} - ${nextProgram.endFormatted}",
                                                    color = TextSecondary,
                                                    fontSize = 10.sp,
                                                    fontFamily = FontFamily.Monospace
                                                )
                                            }
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                text = nextProgram.title,
                                                color = TextPrimary,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }
                                    }
                                }
                            } else {
                                // Canal sem dados de EPG cadastrados no servidor
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(BgSurfaceDark)
                                        .border(1.dp, BorderDark, RoundedCornerShape(8.dp))
                                        .padding(12.dp)
                                ) {
                                    Column {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Box(
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(4.dp))
                                                    .background(AccentEmerald.copy(alpha = 0.2f))
                                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                                            ) {
                                                Text(
                                                    text = "AO VIVO",
                                                    color = AccentEmerald,
                                                    fontSize = 9.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                text = "Transmissão Contínua",
                                                color = TextSecondary,
                                                fontSize = 10.sp
                                            )
                                        }
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Text(
                                            text = currentChannel?.name ?: "Canal Selecionado",
                                            color = TextPrimary,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = "Guia de programação não disponibilizado pelo servidor para este canal.",
                                            color = TextSecondary,
                                            fontSize = 10.sp
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (showAdultPinDialog) {
                AdultPinDialog(
                    onDismiss = {
                        showAdultPinDialog = false
                        pendingAdultCategoryId = null
                    },
                    onPinSuccess = {
                        showAdultPinDialog = false
                        pendingAdultCategoryId?.let { onSelectCategory(it) }
                        pendingAdultCategoryId = null
                    }
                )
            }
        }
    }
}

@Composable
fun CategoryItem(
    title: String,
    count: Int?,
    isSelected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    TvTouchCard(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
        containerColor = if (isSelected) AccentEmerald.copy(alpha = 0.25f) else Color.Transparent,
        focusedContainerColor = AccentEmerald,
        border = BorderStroke(1.dp, if (isSelected) AccentEmerald.copy(alpha = 0.5f) else Color.Transparent),
        focusedBorder = BorderStroke(2.dp, Color.White),
        shape = RoundedCornerShape(8.dp),
        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 8.dp)
    ) { isFocused ->
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
                color = if (isFocused) Color.Black else (if (isSelected) AccentEmerald else TextPrimary),
                modifier = Modifier.weight(1f)
            )
            if (count != null) {
                Text(
                    text = "$count",
                    fontSize = 10.sp,
                    color = if (isFocused || isSelected) Color.Black else TextSecondary,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
