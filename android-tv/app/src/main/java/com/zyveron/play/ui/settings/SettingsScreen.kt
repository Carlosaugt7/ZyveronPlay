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
import androidx.tv.material3.Border
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.Text
import com.zyveron.play.ui.theme.AccentEmerald
import com.zyveron.play.ui.theme.AccentSky
import com.zyveron.play.ui.theme.BgCardDark
import com.zyveron.play.ui.theme.BgDeepDark
import com.zyveron.play.ui.theme.BgSurfaceDark
import com.zyveron.play.ui.theme.BorderDark
import com.zyveron.play.ui.theme.TextPrimary
import com.zyveron.play.ui.theme.TextSecondary

@Composable
fun SettingsScreen(
    mac: String,
    deviceKey: String,
    expirationDate: String,
    onBack: () -> Unit
) {
    var selectedTab by remember { mutableStateOf("MY_APP") }

    // Preferências de Configuração do Player
    var goalAlertEnabled by remember { mutableStateOf(true) }
    var crowdSoundEnabled by remember { mutableStateOf(true) }
    var adaptiveQualityEnabled by remember { mutableStateOf(true) }
    var protocolIsHls by remember { mutableStateOf(false) } // Padrão TS nativo de TV

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDeepDark)
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
                                            Text(text = "Android TV / Smart TV", color = TextPrimary, fontSize = 12.sp)
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
                                            Text(text = "Zyveron Play • v1.0.0", color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
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
                                            Button(
                                                onClick = {},
                                                colors = ButtonDefaults.colors(
                                                    containerColor = AccentEmerald,
                                                    contentColor = Color.Black
                                                ),
                                                shape = ButtonDefaults.shape(RoundedCornerShape(8.dp)),
                                                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                                            ) {
                                                Text(text = "Português (Brasil) ✓", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        "SETTINGS" -> {
                            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                                // Alerta de Gol
                                SettingToggleCard(
                                    title = "ALERTA DE GOL",
                                    description = "Comemoração na tela quando sai um gol nos jogos ao vivo (Início e Player).",
                                    isEnabled = goalAlertEnabled,
                                    onToggle = { goalAlertEnabled = !goalAlertEnabled }
                                )

                                // Som da Torcida
                                SettingToggleCard(
                                    title = "SOM DA TORCIDA",
                                    description = "Reproduz áudio comemoração de torcida ao sair gol.",
                                    isEnabled = crowdSoundEnabled,
                                    onToggle = { crowdSoundEnabled = !crowdSoundEnabled }
                                )

                                // Qualidade Adaptativa
                                SettingToggleCard(
                                    title = "QUALIDADE ADAPTATIVA (AO VIVO)",
                                    description = "Troca automaticamente para versão mais leve do canal se a conexão oscilar.",
                                    isEnabled = adaptiveQualityEnabled,
                                    onToggle = { adaptiveQualityEnabled = !adaptiveQualityEnabled }
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
                                                text = if (protocolIsHls) "HLS (.m3u8): playlist segmentada" else "MPEG-TS (.ts): fluxo contínuo de baixa latência direto (recomendado para TV)",
                                                color = TextSecondary,
                                                fontSize = 11.sp
                                            )
                                        }
                                        Button(
                                            onClick = { protocolIsHls = !protocolIsHls },
                                            colors = ButtonDefaults.colors(
                                                containerColor = if (protocolIsHls) AccentSky else AccentEmerald,
                                                focusedContainerColor = Color.White,
                                                contentColor = Color.Black,
                                                focusedContentColor = Color.Black
                                            ),
                                            shape = ButtonDefaults.shape(RoundedCornerShape(8.dp)),
                                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                                        ) {
                                            Text(text = if (protocolIsHls) "Protocolo: HLS" else "Protocolo: TS", fontSize = 11.sp, fontWeight = FontWeight.Bold)
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

@Composable
fun TabSidebarButton(
    title: String,
    icon: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        colors = ButtonDefaults.colors(
            containerColor = if (isSelected) AccentSky else Color.Transparent,
            focusedContainerColor = AccentEmerald,
            contentColor = if (isSelected) Color.Black else TextPrimary,
            focusedContentColor = Color.Black
        ),
        border = ButtonDefaults.border(
            border = Border(BorderStroke(1.dp, if (isSelected) AccentSky else Color.Transparent)),
            focusedBorder = Border(BorderStroke(2.dp, Color.White))
        ),
        shape = ButtonDefaults.shape(RoundedCornerShape(8.dp)),
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = icon, fontSize = 14.sp)
            Spacer(modifier = Modifier.width(10.dp))
            Text(
                text = title,
                fontSize = 12.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
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
            Button(
                onClick = onToggle,
                colors = ButtonDefaults.colors(
                    containerColor = if (isEnabled) AccentEmerald else BgCardDark,
                    focusedContainerColor = Color.White,
                    contentColor = if (isEnabled) Color.Black else TextSecondary,
                    focusedContentColor = Color.Black
                ),
                border = ButtonDefaults.border(
                    border = Border(BorderStroke(1.dp, BorderDark)),
                    focusedBorder = Border(BorderStroke(2.dp, Color.White))
                ),
                shape = ButtonDefaults.shape(RoundedCornerShape(8.dp)),
                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
            ) {
                Text(text = if (isEnabled) "● Ativado" else "○ Desativado", fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

