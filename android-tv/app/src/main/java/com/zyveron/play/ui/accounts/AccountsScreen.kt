package com.zyveron.play.ui.accounts

import android.view.KeyEvent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
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
fun AccountsScreen(
    mac: String,
    deviceKey: String,
    serverName: String,
    username: String,
    expirationDate: String,
    onBack: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDeepDark)
            .padding(40.dp)
            .onPreviewKeyEvent {
                if (it.nativeKeyEvent.action == KeyEvent.ACTION_DOWN &&
                    it.nativeKeyEvent.keyCode == KeyEvent.KEYCODE_BACK
                ) {
                    onBack()
                    true
                } else false
            }
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Cabeçalho
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(AccentSky.copy(alpha = 0.15f))
                            .border(1.dp, AccentSky.copy(alpha = 0.4f), RoundedCornerShape(8.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = "🔑", fontSize = 18.sp)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "Contas",
                            color = TextPrimary,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Sua conta neste aparelho. Gerenciada centralmente pelo painel web.",
                            color = TextSecondary,
                            fontSize = 12.sp
                        )
                    }
                }

                Button(
                    onClick = onBack,
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
                        fontSize = 12.sp,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Card da Conta Ativa
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(BgCardDark)
                    .border(1.dp, BorderDark, RoundedCornerShape(16.dp))
                    .padding(24.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .clip(CircleShape)
                                .background(AccentEmerald)
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = if (serverName.isNotBlank()) serverName else "Zyveron Play",
                                    color = TextPrimary,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = "EM USO",
                                    color = AccentEmerald,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(AccentEmerald.copy(alpha = 0.2f))
                                        .border(1.dp, AccentEmerald.copy(alpha = 0.4f), RoundedCornerShape(4.dp))
                                        .padding(horizontal = 8.dp, vertical = 2.dp)
                                )
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "MAC: $mac  •  Usuário: ${if (username.isNotBlank()) username else "Ativo"}  •  Vencimento: $expirationDate",
                                color = TextSecondary,
                                fontSize = 12.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }

                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(BgSurfaceDark)
                            .border(1.dp, BorderDark, RoundedCornerShape(8.dp))
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = "Ativação por MAC (Segura)",
                            color = AccentSky,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Informação de Segurança
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(BgSurfaceDark.copy(alpha = 0.5f))
                    .border(1.dp, BorderDark.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                    .padding(16.dp)
            ) {
                Text(
                    text = "ℹ Esta Smart TV está vinculada ao seu provedor através do Virtual MAC exclusivo. Qualquer renovação ou alteração de lista é sincronizada automaticamente em tempo real.",
                    color = TextSecondary,
                    fontSize = 12.sp,
                    lineHeight = 18.sp
                )
            }
        }
    }
}

