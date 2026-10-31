package com.zyveron.play.ui.crash

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Text
import com.zyveron.play.MainActivity
import com.zyveron.play.ui.components.TvTouchCard
import com.zyveron.play.ui.theme.AccentEmerald
import com.zyveron.play.ui.theme.AccentRose
import com.zyveron.play.ui.theme.BgCardDark
import com.zyveron.play.ui.theme.BgDeepDark
import com.zyveron.play.ui.theme.BgSurfaceDark
import com.zyveron.play.ui.theme.BorderDark
import com.zyveron.play.ui.theme.TextPrimary
import com.zyveron.play.ui.theme.TextSecondary
import com.zyveron.play.ui.theme.ZyveronTvTheme

class CrashActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val errorMessage = intent.getStringExtra("CRASH_ERROR") ?: "Erro desconhecido"
        val stackTrace = intent.getStringExtra("CRASH_STACKTRACE") ?: "Sem detalhes disponíveis"

        setContent {
            ZyveronTvTheme {
                CrashScreen(
                    errorMessage = errorMessage,
                    stackTrace = stackTrace,
                    onRestart = {
                        val intent = Intent(this, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        }
                        startActivity(intent)
                        finish()
                    },
                    onClearCacheAndRestart = {
                        try {
                            cacheDir.deleteRecursively()
                            deleteDatabase("zyveron_play.db")
                        } catch (_: Exception) {}

                        val intent = Intent(this, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        }
                        startActivity(intent)
                        finish()
                    }
                )
            }
        }
    }
}

@Composable
fun CrashScreen(
    errorMessage: String,
    stackTrace: String,
    onRestart: () -> Unit,
    onClearCacheAndRestart: () -> Unit
) {
    val scrollState = rememberScrollState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDeepDark)
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .width(620.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(BgCardDark)
                .border(1.dp, AccentRose.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
                .padding(28.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = "⚠", color = AccentRose, fontSize = 24.sp)
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = "Zyveron Play encontrou uma falha inesperada",
                        color = AccentRose,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "O aplicativo foi mantido seguro e isolado para proteção do sistema.",
                        color = TextSecondary,
                        fontSize = 11.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            // Resumo do Erro
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(BgSurfaceDark)
                    .border(1.dp, BorderDark, RoundedCornerShape(8.dp))
                    .padding(14.dp)
            ) {
                Text(
                    text = errorMessage,
                    color = TextPrimary,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Detalhes da StackTrace com Scroll
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color.Black.copy(alpha = 0.4f))
                    .border(1.dp, BorderDark, RoundedCornerShape(8.dp))
                    .padding(12.dp)
                    .verticalScroll(scrollState)
            ) {
                Text(
                    text = stackTrace,
                    color = TextSecondary,
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                TvTouchCard(
                    onClick = onRestart,
                    modifier = Modifier.weight(1f),
                    containerColor = AccentEmerald,
                    focusedContainerColor = Color.White,
                    border = BorderStroke(1.dp, BorderDark),
                    focusedBorder = BorderStroke(2.dp, AccentEmerald),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(vertical = 10.dp)
                ) { isFocused ->
                    Text(
                        text = "🔄 Reiniciar Aplicativo",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = Color.Black
                    )
                }

                TvTouchCard(
                    onClick = onClearCacheAndRestart,
                    modifier = Modifier.weight(1f),
                    containerColor = BgSurfaceDark,
                    focusedContainerColor = Color(0xFFEF4444),
                    border = BorderStroke(1.dp, BorderDark),
                    focusedBorder = BorderStroke(2.dp, Color.White),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(vertical = 10.dp)
                ) { isFocused ->
                    Text(
                        text = "🧹 Limpar Cache e Reiniciar",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp,
                        color = if (isFocused) Color.White else TextPrimary
                    )
                }
            }
        }
    }
}
