package com.zyveron.play.ui.activation

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
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Text
import com.zyveron.play.ui.components.TvTouchCard
import com.zyveron.play.ui.theme.AccentAmber
import com.zyveron.play.ui.theme.AccentEmerald
import com.zyveron.play.ui.theme.AccentRose
import com.zyveron.play.ui.theme.BgCardDark
import com.zyveron.play.ui.theme.BgDeepDark
import com.zyveron.play.ui.theme.BgSurfaceDark
import com.zyveron.play.ui.theme.BorderDark
import com.zyveron.play.ui.theme.TextPrimary
import com.zyveron.play.ui.theme.TextSecondary

@Composable
fun BlockedOrExpiredScreen(
    mac: String,
    title: String,
    message: String,
    isExpired: Boolean,
    onRetry: () -> Unit,
    onExit: () -> Unit = {}
) {
    val accentColor = if (isExpired) AccentAmber else AccentRose

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDeepDark),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .width(580.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(BgCardDark)
                .border(1.dp, accentColor.copy(alpha = 0.4f), RoundedCornerShape(20.dp))
                .padding(36.dp)
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(accentColor.copy(alpha = 0.15f))
                        .border(1.dp, accentColor.copy(alpha = 0.4f), RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (isExpired) "⏳" else "⛔",
                        fontSize = 22.sp
                    )
                }

                Spacer(modifier = Modifier.height(18.dp))

                Text(
                    text = title,
                    color = accentColor,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = message,
                    color = TextSecondary,
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(20.dp))

                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(BgSurfaceDark)
                        .border(1.dp, BorderDark, RoundedCornerShape(10.dp))
                        .padding(horizontal = 20.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "SEU MAC: ",
                        color = TextSecondary,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = mac,
                        color = TextPrimary,
                        fontSize = 15.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(28.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TvTouchCard(
                        onClick = onRetry,
                        containerColor = accentColor,
                        focusedContainerColor = Color.White,
                        shape = RoundedCornerShape(12.dp),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp)
                    ) { isFocused ->
                        Text(
                            text = "🔄 Verificar Novamente",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = Color.Black
                        )
                    }

                    TvTouchCard(
                        onClick = onExit,
                        containerColor = BgSurfaceDark,
                        focusedContainerColor = Color.White,
                        border = BorderStroke(1.dp, BorderDark),
                        focusedBorder = BorderStroke(2.dp, Color.White),
                        shape = RoundedCornerShape(12.dp),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp)
                    ) { isFocused ->
                        Text(
                            text = "✕ Fechar App",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp,
                            color = if (isFocused) Color.Black else TextSecondary
                        )
                    }
                }
            }
        }
    }
}
