package com.zyveron.play.ui.settings

import android.view.KeyEvent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.onPreviewKeyEvent
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
    var selectedTab by remember { mutableStateOf("app") } // "app" ou "config"

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDeepDark)
            .onPreviewKeyEvent {
                if (it.nativeKeyEvent.action == KeyEvent.ACTION_DOWN &&
                    it.nativeKeyEvent.keyCode == KeyEvent.KEYCODE_BACK
                ) {
                    onBack()
                    true
                } else false
            }
    ) {
        Row(modifier = Modifier.fillMaxSize()) {
            // 1. Barra Lateral de Navegação
            Box(
                modifier = Modifier
                    .width(260.dp)
                    .fillMaxHeight()
                    .background(BgCardDark)
                    .border(1.dp, BorderDark)
                    .padding(24.dp)
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text(
                            text = "Configurações",
                            color = TextPrimary,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(24.dp))

                        // Botão Aba: Meu App
                        Button(
                            onClick = { selectedTab = "app" },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.colors(
                                containerColor = if (selectedTab == "app") AccentSky else Color.Transparent,
                                focusedContainerColor = AccentSky,
                                contentColor = if (selectedTab == "app") Color.Black else TextPrimary,
                                focusedContentColor = Color.Black
                            ),
                            border = ButtonDefaults.border(
                                border = Border(border = BorderStroke(1.dp, if (selectedTab == "app") AccentSky else BorderDark)),
                                focusedBorder = Border(border = BorderStroke(2.dp, Color.White))
                            ),
                            shape = ButtonDefaults.shape(shape = RoundedCornerShape(10.dp))
                        ) {
                            Text(
                                text = "▶ Meu App",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(vertical = 4.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Botão Aba: Configurações
                        Button(
                            onClick = { selectedTab = "config" },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.colors(
                                containerColor = if (selectedTab == "config") AccentSky else Color.Transparent,
                                focusedContainerColor = AccentSky,
                                contentColor = if (selectedTab == "config") Color.Black else TextPrimary,
                                focusedContentColor = Color.Black
                            ),
                            border = ButtonDefaults.border(
                                border = Border(border = BorderStroke(1.dp, if (selectedTab == "config") AccentSky else BorderDark)),
                                focusedBorder = Border(border = BorderStroke(2.dp, Color.White))
                            ),
                            shape = ButtonDefaults.shape(shape = RoundedCornerShape(10.dp))
                        ) {
                            Text(
                                text = "⚙ Performance & Player",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(vertical = 4.dp)
                            )
                        }
                    }

                    // Botão Voltar
                    Button(
                        onClick = onBack,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.colors(
                            containerColor = BgSurfaceDark,
                            focusedContainerColor = AccentEmerald,
                            contentColor = TextPrimary,
                            focusedContentColor = Color.Black
                        ),
                        border = ButtonDefaults.border(
                            border = Border(border = BorderStroke(1.dp, BorderDark)),
                            focusedBorder = Border(border = BorderStroke(2.dp, Color.White))
                        ),
                        shape = ButtonDefaults.shape(shape = RoundedCornerShape(10.dp))
                    ) {
                        Text(
                            text = "← Voltar",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(vertical = 4.dp)
                        )
                    }
                }
            }

            // 2. Conteúdo da Aba Selecionada
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .padding(36.dp)
            ) {
                if (selectedTab == "app") {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                    ) {
                        // Card 1: Identificação do Aparelho
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(16.dp))
                                .background(BgCardDark)
                                .border(1.dp, BorderDark, RoundedCornerShape(16.dp))
                                .padding(24.dp)
                        ) {
                            Column {
                                Text(
                                    text = "IDENTIFICAÇÃO DO APARELHO",
                                    color = AccentSky,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.sp
                                )
                                Spacer(modifier = Modifier.height(14.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column {
                                        Text(text = "VIRTUAL MAC", color = TextSecondary, fontSize = 11.sp)
                                        Text(
                                            text = mac,
                                            color = TextPrimary,
                                            fontSize = 18.sp,
                                            fontFamily = FontFamily.Monospace,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                    Column {
                                        Text(text = "DEVICE KEY (PIN)", color = TextSecondary, fontSize = 11.sp)
                                        Text(
                                            text = deviceKey,
                                            color = AccentSky,
                                            fontSize = 18.sp,
                                            fontFamily = FontFamily.Monospace,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(16.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column {
                                        Text(text = "Dispositivo: Android TV (Leanback)", color = TextSecondary, fontSize = 12.sp)
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(AccentEmerald))
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text(text = "Status: Ativo e Licenciado", color = AccentEmerald, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                        }
                                    }
                                    Column {
                                        Text(text = "Vencimento da Licença", color = TextSecondary, fontSize = 11.sp)
                                        Text(text = expirationDate, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(20.dp))

                        // Card 2: Aplicativo
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(16.dp))
                                .background(BgCardDark)
                                .border(1.dp, BorderDark, RoundedCornerShape(16.dp))
                                .padding(20.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(text = "APLICATIVO", color = AccentSky, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(text = "Zyveron Play TV", color = TextPrimary, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                                }
                                Text(text = "Versão 1.0.0 (Build Estável)", color = TextSecondary, fontSize = 12.sp)
                            }
                        }

                        Spacer(modifier = Modifier.height(20.dp))

                        // Card 3: Idioma
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(16.dp))
                                .background(BgCardDark)
                                .border(1.dp, BorderDark, RoundedCornerShape(16.dp))
                                .padding(20.dp)
                        ) {
                            Column {
                                Text(text = "IDIOMA", color = AccentSky, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Spacer(modifier = Modifier.height(10.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(AccentEmerald.copy(alpha = 0.2f))
                                            .border(1.dp, AccentEmerald, RoundedCornerShape(8.dp))
                                            .padding(horizontal = 16.dp, vertical = 8.dp)
                                    ) {
                                        Text(text = "Português (Brasil) ✓", color = AccentEmerald, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(BgSurfaceDark)
                                            .border(1.dp, BorderDark, RoundedCornerShape(8.dp))
                                            .padding(horizontal = 16.dp, vertical = 8.dp)
                                    ) {
                                        Text(text = "English", color = TextSecondary, fontSize = 12.sp)
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // Aba Configurações (Focada em Máxima Estabilidade e Velocidade)
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(16.dp))
                                .background(BgCardDark)
                                .border(1.dp, BorderDark, RoundedCornerShape(16.dp))
                                .padding(20.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(text = "BUFFER DE ALTA PERFORMANCE (TV)", color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "Inicia a reprodução em ~1.5s e mantém reserva dinâmica de até 15s para neutralizar oscilações.",
                                        color = TextSecondary,
                                        fontSize = 12.sp
                                    )
                                }
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(AccentEmerald.copy(alpha = 0.2f))
                                        .border(1.dp, AccentEmerald, RoundedCornerShape(6.dp))
                                        .padding(horizontal = 10.dp, vertical = 4.dp)
                                ) {
                                    Text(text = "Ativado", color = AccentEmerald, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(16.dp))
                                .background(BgCardDark)
                                .border(1.dp, BorderDark, RoundedCornerShape(16.dp))
                                .padding(20.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(text = "RECONEXÃO AUTOMÁTICA SILENCIOSA", color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "Tenta recuperar o sinal em caso de micro-interrupções da fonte antes de exibir erro.",
                                        color = TextSecondary,
                                        fontSize = 12.sp
                                    )
                                }
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(AccentEmerald.copy(alpha = 0.2f))
                                        .border(1.dp, AccentEmerald, RoundedCornerShape(6.dp))
                                        .padding(horizontal = 10.dp, vertical = 4.dp)
                                ) {
                                    Text(text = "Ativado", color = AccentEmerald, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(16.dp))
                                .background(BgCardDark)
                                .border(1.dp, BorderDark, RoundedCornerShape(16.dp))
                                .padding(20.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(text = "FILTRO FAMILIAR DE CONTEÚDO", color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "Bloqueio rígido de títulos, pôsteres e canais adultos (+18) na interface e nas recomendações.",
                                        color = TextSecondary,
                                        fontSize = 12.sp
                                    )
                                }
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(AccentSky.copy(alpha = 0.2f))
                                        .border(1.dp, AccentSky, RoundedCornerShape(6.dp))
                                        .padding(horizontal = 10.dp, vertical = 4.dp)
                                ) {
                                    Text(text = "Protegido", color = AccentSky, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

