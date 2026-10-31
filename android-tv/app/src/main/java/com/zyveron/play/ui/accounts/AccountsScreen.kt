package com.zyveron.play.ui.accounts

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
import androidx.compose.foundation.shape.CircleShape
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
import com.zyveron.play.data.remote.PlaylistAccount
import com.zyveron.play.ui.components.TvTouchCard
import com.zyveron.play.ui.theme.AccentEmerald
import com.zyveron.play.ui.theme.AccentRose
import com.zyveron.play.ui.theme.AccentSky
import com.zyveron.play.ui.theme.BgCardDark
import com.zyveron.play.ui.theme.BgDeepDark
import com.zyveron.play.ui.theme.BgSurfaceDark
import com.zyveron.play.ui.theme.BorderDark
import com.zyveron.play.ui.theme.TextPrimary
import com.zyveron.play.ui.theme.TextSecondary
import com.zyveron.play.ui.theme.ZyveronTvBackground

@Composable
fun AccountsScreen(
    serverName: String,
    username: String,
    mac: String,
    deviceKey: String,
    expirationDate: String,
    playlists: List<PlaylistAccount> = emptyList(),
    activePlaylistIndex: Int = 0,
    onSelectPlaylist: (Int) -> Unit = {},
    onDisconnect: () -> Unit,
    onBack: () -> Unit
) {
    var showConfirmDialog by remember { mutableStateOf(false) }

    val displayPlaylists = if (playlists.isNotEmpty()) {
        playlists
    } else {
        listOf(
            PlaylistAccount(
                listIndex = 1,
                serverName = serverName.ifBlank { "Lista Principal" },
                serverDns = "",
                username = username,
                password = "",
                expirationDate = expirationDate
            )
        )
    }

    ZyveronTvBackground {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp)
        ) {
            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = "🔑", fontSize = 24.sp)
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "Contas & Listas Conectadas",
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = "Exibindo até 2 listas de servidores configuradas para este aparelho.",
                                fontSize = 12.sp,
                                color = TextSecondary
                            )
                        }
                    }

                    TvTouchCard(
                        onClick = onBack,
                        containerColor = BgCardDark,
                        focusedContainerColor = AccentEmerald,
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                    ) { isFocused ->
                        Text(
                            text = "← Voltar",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (isFocused) Color.Black else TextPrimary
                        )
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                // Cards de Listas de Servidores
                displayPlaylists.forEachIndexed { index, pl ->
                    val isActive = index == activePlaylistIndex

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(if (isActive) BgCardDark else BgSurfaceDark.copy(alpha = 0.6f))
                            .border(
                                width = if (isActive) 1.5.dp else 1.dp,
                                color = if (isActive) AccentEmerald.copy(alpha = 0.6f) else BorderDark,
                                shape = RoundedCornerShape(16.dp)
                            )
                            .padding(20.dp)
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
                                        .background(if (isActive) AccentEmerald else TextSecondary.copy(alpha = 0.4f))
                                )
                                Spacer(modifier = Modifier.width(16.dp))
                                Column {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = pl.serverName.ifBlank { "Lista ${index + 1}" },
                                            fontSize = 18.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = TextPrimary
                                        )
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(4.dp))
                                                .background(
                                                    if (isActive) AccentEmerald.copy(alpha = 0.2f)
                                                    else BorderDark.copy(alpha = 0.4f)
                                                )
                                                .padding(horizontal = 8.dp, vertical = 2.dp)
                                        ) {
                                            Text(
                                                text = if (isActive) "EM USO" else "DISPONÍVEL",
                                                color = if (isActive) AccentEmerald else TextSecondary,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "Usuário: ${pl.username.ifBlank { "autenticado" }} • Validade: ${pl.expirationDate.take(10).ifBlank { "Ativo" }}",
                                        color = TextSecondary,
                                        fontSize = 12.sp,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }
                            }

                            // Botão de Trocar Lista
                            if (!isActive) {
                                TvTouchCard(
                                    onClick = { onSelectPlaylist(index) },
                                    containerColor = AccentSky,
                                    focusedContainerColor = Color.White,
                                    shape = RoundedCornerShape(10.dp),
                                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                                ) { isFocused ->
                                    Text(
                                        text = "▶ Usar esta Lista",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isFocused) Color.Black else Color.Black
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Card Informativo de Identificação e Desconectar
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(BgSurfaceDark.copy(alpha = 0.5f))
                        .border(1.dp, BorderDark, RoundedCornerShape(16.dp))
                        .padding(20.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(text = "IDENTIFICAÇÃO DESTE APARELHO", color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                Text(text = "MAC: $mac", color = TextPrimary, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                                Text(text = "PIN: $deviceKey", color = AccentSky, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                            }
                        }

                        TvTouchCard(
                            onClick = { showConfirmDialog = true },
                            containerColor = BgCardDark,
                            focusedContainerColor = AccentRose,
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                        ) { isFocused ->
                            Text(
                                text = "✕ Desconectar Aparelho",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = if (isFocused) Color.White else AccentRose
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.weight(1f))
            }

            // Diálogo de Confirmação de Desconexão
            if (showConfirmDialog) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.85f)),
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .width(420.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(BgCardDark)
                            .border(1.dp, AccentRose.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
                            .padding(24.dp)
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(text = "Desconectar Aparelho?", color = AccentRose, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Ao desconectar, o aplicativo voltará para a tela inicial de ativação (MAC/PIN). Deseja continuar?",
                                color = TextSecondary,
                                fontSize = 12.sp,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(20.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                                TvTouchCard(
                                    onClick = { showConfirmDialog = false },
                                    containerColor = BgSurfaceDark,
                                    focusedContainerColor = Color.White,
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                                ) { isFocused ->
                                    Text(
                                        text = "Cancelar",
                                        fontSize = 12.sp,
                                        color = if (isFocused) Color.Black else TextPrimary
                                    )
                                }
                                TvTouchCard(
                                    onClick = {
                                        showConfirmDialog = false
                                        onDisconnect()
                                    },
                                    containerColor = AccentRose,
                                    focusedContainerColor = Color.White,
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                                ) { isFocused ->
                                    Text(
                                        text = "Sim, Desconectar",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isFocused) Color.Black else Color.White
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
