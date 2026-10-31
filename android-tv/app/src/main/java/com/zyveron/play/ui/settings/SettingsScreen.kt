package com.zyveron.play.ui.settings

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Text
import com.zyveron.play.BuildConfig
import com.zyveron.play.ui.components.TvTouchCard
import com.zyveron.play.util.SettingsHelper
import com.zyveron.play.ui.theme.AccentEmerald
import com.zyveron.play.ui.theme.AccentSky
import com.zyveron.play.ui.theme.BgCardDark
import com.zyveron.play.ui.theme.BgDeepDark
import com.zyveron.play.ui.theme.BgSurfaceDark
import com.zyveron.play.ui.theme.BorderDark
import com.zyveron.play.ui.theme.TextPrimary
import com.zyveron.play.ui.theme.TextSecondary
import com.zyveron.play.ui.theme.ZyveronTvBackground

@Composable
fun SettingsScreen(
    mac: String,
    deviceKey: String,
    expirationDate: String,
    onBack: () -> Unit
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    var selectedTab by remember { mutableStateOf("MY_APP") }

    // Preferências de Configuração do Player com persistência local
    var adaptiveQualityEnabled by remember {
        mutableStateOf(SettingsHelper.isAdaptiveQualityEnabled(context))
    }
    var protocolIsHls by remember {
        mutableStateOf(SettingsHelper.getLiveProtocol(context).equals("hls", ignoreCase = true))
    }

    ZyveronTvBackground {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Configurações",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )

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

                // Layout 2 Colunas: Sidebar de Abas à Esquerda | Painel de Conteúdo à Direita
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(20.dp)
                ) {
                    // Sidebar de Abas
                    Box(
                        modifier = Modifier
                            .width(220.dp)
                            .fillMaxHeight()
                            .clip(RoundedCornerShape(14.dp))
                            .background(BgCardDark)
                            .border(1.dp, BorderDark, RoundedCornerShape(14.dp))
                            .padding(10.dp)
                    ) {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            TabSidebarButton(
                                title = "Meu App",
                                icon = "📱",
                                isSelected = selectedTab == "MY_APP",
                                onClick = { selectedTab = "MY_APP" }
                            )
                            TabSidebarButton(
                                title = "Configurações",
                                icon = "⚙️",
                                isSelected = selectedTab == "SETTINGS",
                                onClick = { selectedTab = "SETTINGS" }
                            )
                            TabSidebarButton(
                                title = "Aparência",
                                icon = "🎨",
                                isSelected = selectedTab == "THEME",
                                onClick = { selectedTab = "THEME" }
                            )
                            Spacer(modifier = Modifier.weight(1f))
                            TabSidebarButton(
                                title = "Voltar",
                                icon = "←",
                                isSelected = false,
                                onClick = onBack
                            )
                        }
                    }

                    // Painel da Aba Selecionada
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .clip(RoundedCornerShape(14.dp))
                            .background(BgCardDark)
                            .border(1.dp, BorderDark, RoundedCornerShape(14.dp))
                            .padding(20.dp)
                    ) {
                        when (selectedTab) {
                            "MY_APP" -> {
                                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                                    // Card Identificação do Aparelho
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(BgSurfaceDark)
                                            .border(1.dp, BorderDark, RoundedCornerShape(12.dp))
                                            .padding(16.dp)
                                    ) {
                                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Text(text = "IDENTIFICAÇÃO DO APARELHO", color = AccentSky, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Text(text = "MAC:", color = TextSecondary, fontSize = 12.sp)
                                                Text(text = mac, color = TextPrimary, fontSize = 13.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
                                            }
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Text(text = "DEVICE KEY (PIN):", color = TextSecondary, fontSize = 12.sp)
                                                Text(text = deviceKey, color = AccentSky, fontSize = 13.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
                                            }
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Text(text = "Aparelho:", color = TextSecondary, fontSize = 12.sp)
                                                Text(text = "Android TV / Smartphone", color = TextPrimary, fontSize = 12.sp)
                                            }
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Text(text = "Status:", color = TextSecondary, fontSize = 12.sp)
                                                Text(text = "● Ativo e Sincronizado", color = AccentEmerald, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                            }
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Text(text = "Vencimento:", color = TextSecondary, fontSize = 12.sp)
                                                Text(text = expirationDate.take(10).ifBlank { "Ativo" }, color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }

                                    // Card Aplicativo
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(BgSurfaceDark)
                                            .border(1.dp, BorderDark, RoundedCornerShape(12.dp))
                                            .padding(16.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column {
                                                Text(text = "APLICATIVO", color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                                Text(text = "Zyveron Play • v${BuildConfig.VERSION_NAME}", color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                            }
                                            Box(
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(4.dp))
                                                    .background(AccentEmerald.copy(alpha = 0.2f))
                                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                                            ) {
                                                Text(text = "Versão Mais Recente", color = AccentEmerald, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }

                                    // Card Idioma
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(BgSurfaceDark)
                                            .border(1.dp, BorderDark, RoundedCornerShape(12.dp))
                                            .padding(16.dp)
                                    ) {
                                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Text(text = "IDIOMA DO APLICATIVO", color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                                TvTouchCard(
                                                    onClick = {},
                                                    containerColor = AccentEmerald,
                                                    focusedContainerColor = Color.White,
                                                    shape = RoundedCornerShape(8.dp),
                                                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                                                ) { isFocused ->
                                                    Text(
                                                        text = "Português (Brasil) ✓",
                                                        fontSize = 12.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = Color.Black
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            "SETTINGS" -> {
                                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                                    // Qualidade Adaptativa
                                    SettingToggleCard(
                                        title = "QUALIDADE ADAPTATIVA (AO VIVO)",
                                        description = "Troca automaticamente para versão mais leve do canal se a conexão oscilar.",
                                        isEnabled = adaptiveQualityEnabled,
                                        onToggle = {
                                            val newVal = !adaptiveQualityEnabled
                                            adaptiveQualityEnabled = newVal
                                            SettingsHelper.setAdaptiveQuality(context, newVal)
                                        }
                                    )

                                    // Protocolo de Streaming (TS vs HLS)
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(BgSurfaceDark)
                                            .border(1.dp, BorderDark, RoundedCornerShape(12.dp))
                                            .padding(16.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(text = "PROTOCOLO (AO VIVO)", color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                                Text(
                                                    text = if (protocolIsHls) "HLS (.m3u8): playlist segmentada (HTTP Live Streaming)" else "MPEG-TS (.ts): fluxo contínuo de baixa latência direto (recomendado para TV)",
                                                    color = TextSecondary,
                                                    fontSize = 11.sp
                                                )
                                            }
                                            TvTouchCard(
                                                onClick = {
                                                    val nextHls = !protocolIsHls
                                                    protocolIsHls = nextHls
                                                    SettingsHelper.setLiveProtocol(context, if (nextHls) "hls" else "ts")
                                                },
                                                containerColor = if (protocolIsHls) AccentSky else AccentEmerald,
                                                focusedContainerColor = Color.White,
                                                shape = RoundedCornerShape(8.dp),
                                                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                                            ) { isFocused ->
                                                Text(
                                                    text = if (protocolIsHls) "Protocolo: HLS" else "Protocolo: TS",
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color.Black
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            else -> {
                                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    Text(text = "Tema Padrão Cinematic Stealth Dark ativado", color = TextSecondary, fontSize = 13.sp)
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
fun TabSidebarButton(
    title: String,
    icon: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    TvTouchCard(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        containerColor = if (isSelected) AccentSky else Color.Transparent,
        focusedContainerColor = AccentEmerald,
        border = BorderStroke(1.dp, if (isSelected) AccentSky else Color.Transparent),
        focusedBorder = BorderStroke(2.dp, Color.White),
        shape = RoundedCornerShape(8.dp),
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 10.dp)
    ) { isFocused ->
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = icon, fontSize = 14.sp)
            Spacer(modifier = Modifier.width(10.dp))
            Text(
                text = title,
                fontSize = 12.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = if (isFocused || isSelected) Color.Black else TextPrimary
            )
        }
    }
}

@Composable
fun SettingToggleCard(
    title: String,
    description: String,
    isEnabled: Boolean,
    onToggle: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(BgSurfaceDark)
            .border(1.dp, BorderDark, RoundedCornerShape(12.dp))
            .padding(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(text = title, color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(2.dp))
                Text(text = description, color = TextSecondary, fontSize = 11.sp)
            }
            Spacer(modifier = Modifier.width(12.dp))
            TvTouchCard(
                onClick = onToggle,
                containerColor = if (isEnabled) AccentEmerald else BgCardDark,
                focusedContainerColor = Color.White,
                border = BorderStroke(1.dp, BorderDark),
                focusedBorder = BorderStroke(2.dp, Color.White),
                shape = RoundedCornerShape(8.dp),
                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
            ) { isFocused ->
                Text(
                    text = if (isEnabled) "● Ativado" else "○ Desativado",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isFocused) Color.Black else (if (isEnabled) Color.Black else TextSecondary)
                )
            }
        }
    }
}
