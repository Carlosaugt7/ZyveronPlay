package com.zyveron.play.ui.components

import android.view.KeyEvent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.unit.dp
import com.zyveron.play.ui.theme.AccentEmerald
import com.zyveron.play.ui.theme.BgCardDark
import com.zyveron.play.ui.theme.BorderDark

/**
 * Componente universal compatível com SMARTPHONES (Touchscreen) e ANDROID TV (D-Pad Controle Remoto).
 * - No Smartphone/Tablet: responde imediatamente a toques, cliques e toques longos com os dedos.
 * - Na Android TV: ganha foco visual com borda branca e responde a 1 único clique nas teclas D-Pad (OK/Center).
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun TvTouchCard(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    onLongClick: (() -> Unit)? = null,
    enabled: Boolean = true,
    containerColor: Color = BgCardDark,
    focusedContainerColor: Color = AccentEmerald,
    border: BorderStroke? = BorderStroke(1.dp, BorderDark),
    focusedBorder: BorderStroke? = BorderStroke(2.dp, Color.White),
    shape: Shape = RoundedCornerShape(10.dp),
    contentPadding: PaddingValues = PaddingValues(0.dp),
    content: @Composable BoxScope.(isFocused: Boolean) -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }
    val currentBg = if (isFocused) focusedContainerColor else containerColor
    val currentBorder = if (isFocused) focusedBorder else border

    Box(
        modifier = modifier
            .clip(shape)
            .background(currentBg)
            .then(if (currentBorder != null) Modifier.border(currentBorder, shape) else Modifier)
            .onFocusChanged { isFocused = it.isFocused }
            .onKeyEvent { keyEvent ->
                if (enabled && keyEvent.nativeKeyEvent.action == KeyEvent.ACTION_DOWN &&
                    (keyEvent.nativeKeyEvent.keyCode == KeyEvent.KEYCODE_DPAD_CENTER ||
                     keyEvent.nativeKeyEvent.keyCode == KeyEvent.KEYCODE_ENTER ||
                     keyEvent.nativeKeyEvent.keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER)) {
                    onClick()
                    true
                } else false
            }
            .combinedClickable(
                enabled = enabled,
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick,
                onLongClick = onLongClick
            )
            .padding(contentPadding),
        contentAlignment = Alignment.Center
    ) {
        content(isFocused)
    }
}

