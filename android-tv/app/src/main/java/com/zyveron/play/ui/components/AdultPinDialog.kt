package com.zyveron.play.ui.components

import android.view.KeyEvent
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Text
import com.zyveron.play.ui.theme.AccentEmerald
import com.zyveron.play.ui.theme.AccentRose
import com.zyveron.play.ui.theme.AccentSky
import com.zyveron.play.ui.theme.BgSurfaceDark
import com.zyveron.play.ui.theme.BorderDark
import com.zyveron.play.ui.theme.TextPrimary
import com.zyveron.play.ui.theme.TextSecondary
import com.zyveron.play.util.AdultContentHelper
import kotlinx.coroutines.delay

@Composable
fun AdultPinDialog(
    onDismiss: () -> Unit,
    onPinSuccess: () -> Unit = {}
) {
    val context = LocalContext.current
    var enteredPin by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf("") }
    val firstButtonFocusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        delay(150)
        try {
            firstButtonFocusRequester.requestFocus()
        } catch (_: Exception) {}
    }

    fun handleDigit(digit: String) {
        errorMessage = ""
        if (enteredPin.length < 4) {
            val newPin = enteredPin + digit
            enteredPin = newPin
            if (newPin.length == 4) {
                if (AdultContentHelper.verifyPin(context, newPin)) {
                    onPinSuccess()
                } else {
                    errorMessage = "Senha incorreta (Padrão: 0000)"
                    enteredPin = ""
                }
            }
        }
    }

    fun handleDelete() {
        errorMessage = ""
        if (enteredPin.isNotEmpty()) {
            enteredPin = enteredPin.dropLast(1)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.85f))
            .onKeyEvent { keyEvent ->
                if (keyEvent.nativeKeyEvent.action == KeyEvent.ACTION_DOWN) {
                    when (keyEvent.nativeKeyEvent.keyCode) {
                        KeyEvent.KEYCODE_0, KeyEvent.KEYCODE_NUMPAD_0 -> { handleDigit("0"); true }
                        KeyEvent.KEYCODE_1, KeyEvent.KEYCODE_NUMPAD_1 -> { handleDigit("1"); true }
                        KeyEvent.KEYCODE_2, KeyEvent.KEYCODE_NUMPAD_2 -> { handleDigit("2"); true }
                        KeyEvent.KEYCODE_3, KeyEvent.KEYCODE_NUMPAD_3 -> { handleDigit("3"); true }
                        KeyEvent.KEYCODE_4, KeyEvent.KEYCODE_NUMPAD_4 -> { handleDigit("4"); true }
                        KeyEvent.KEYCODE_5, KeyEvent.KEYCODE_NUMPAD_5 -> { handleDigit("5"); true }
                        KeyEvent.KEYCODE_6, KeyEvent.KEYCODE_NUMPAD_6 -> { handleDigit("6"); true }
                        KeyEvent.KEYCODE_7, KeyEvent.KEYCODE_NUMPAD_7 -> { handleDigit("7"); true }
                        KeyEvent.KEYCODE_8, KeyEvent.KEYCODE_NUMPAD_8 -> { handleDigit("8"); true }
                        KeyEvent.KEYCODE_9, KeyEvent.KEYCODE_NUMPAD_9 -> { handleDigit("9"); true }
                        KeyEvent.KEYCODE_DEL -> { handleDelete(); true }
                        KeyEvent.KEYCODE_BACK -> { onDismiss(); true }
                        else -> false
                    }
                } else false
            },
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .width(360.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(BgSurfaceDark)
                .border(1.dp, BorderDark, RoundedCornerShape(16.dp))
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "🔒 Conteúdo Adulto (+18)",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = AccentRose
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Informe a senha de 4 dígitos para liberar o acesso",
                fontSize = 11.sp,
                color = TextSecondary,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Indicadores de Dígitos (4 círculos)
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                for (i in 0 until 4) {
                    val isFilled = i < enteredPin.length
                    Box(
                        modifier = Modifier
                            .size(18.dp)
                            .clip(CircleShape)
                            .background(if (isFilled) AccentEmerald else Color.DarkGray)
                            .border(1.dp, if (isFilled) AccentEmerald else Color.Gray, CircleShape)
                    )
                }
            }

            if (errorMessage.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = errorMessage,
                    fontSize = 11.sp,
                    color = AccentRose,
                    fontWeight = FontWeight.Bold
                )
            } else {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Senha padrão: 0000",
                    fontSize = 10.sp,
                    color = TextSecondary.copy(alpha = 0.6f)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Teclado Numérico D-Pad
            val keypad = listOf(
                listOf("1", "2", "3"),
                listOf("4", "5", "6"),
                listOf("7", "8", "9"),
                listOf("Limpar", "0", "Cancelar")
            )

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                keypad.forEachIndexed { rowIndex, row ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        row.forEachIndexed { colIndex, key ->
                            val isFirst = rowIndex == 0 && colIndex == 0
                            TvTouchCard(
                                onClick = {
                                    when (key) {
                                        "Limpar" -> handleDelete()
                                        "Cancelar" -> onDismiss()
                                        else -> handleDigit(key)
                                    }
                                },
                                containerColor = when (key) {
                                    "Cancelar" -> AccentRose.copy(alpha = 0.15f)
                                    "Limpar" -> AccentSky.copy(alpha = 0.15f)
                                    else -> Color(0xFF1E2633)
                                },
                                focusedContainerColor = Color.White,
                                modifier = Modifier
                                    .weight(1f)
                                    .then(if (isFirst) Modifier.focusRequester(firstButtonFocusRequester) else Modifier),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(vertical = 10.dp)
                            ) { isFocused ->
                                Text(
                                    text = key,
                                    fontSize = if (key.length > 1) 11.sp else 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isFocused) Color.Black else TextPrimary,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ChangeAdultPinDialog(
    onDismiss: () -> Unit,
    onPinChanged: () -> Unit
) {
    val context = LocalContext.current
    var step by remember { androidx.compose.runtime.mutableIntStateOf(1) } // 1: Senha Atual, 2: Nova Senha
    var enteredPin by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf("") }
    val firstButtonFocusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        delay(150)
        try {
            firstButtonFocusRequester.requestFocus()
        } catch (_: Exception) {}
    }

    fun handleDigit(digit: String) {
        errorMessage = ""
        if (enteredPin.length < 4) {
            val newPin = enteredPin + digit
            enteredPin = newPin
            if (newPin.length == 4) {
                if (step == 1) {
                    if (AdultContentHelper.verifyPin(context, newPin)) {
                        step = 2
                        enteredPin = ""
                        errorMessage = ""
                    } else {
                        errorMessage = "Senha atual incorreta (Padrão: 0000)"
                        enteredPin = ""
                    }
                } else {
                    AdultContentHelper.setStoredPin(context, newPin)
                    onPinChanged()
                }
            }
        }
    }

    fun handleDelete() {
        errorMessage = ""
        if (enteredPin.isNotEmpty()) {
            enteredPin = enteredPin.dropLast(1)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.85f))
            .onKeyEvent { keyEvent ->
                if (keyEvent.nativeKeyEvent.action == KeyEvent.ACTION_DOWN) {
                    when (keyEvent.nativeKeyEvent.keyCode) {
                        KeyEvent.KEYCODE_0, KeyEvent.KEYCODE_NUMPAD_0 -> { handleDigit("0"); true }
                        KeyEvent.KEYCODE_1, KeyEvent.KEYCODE_NUMPAD_1 -> { handleDigit("1"); true }
                        KeyEvent.KEYCODE_2, KeyEvent.KEYCODE_NUMPAD_2 -> { handleDigit("2"); true }
                        KeyEvent.KEYCODE_3, KeyEvent.KEYCODE_NUMPAD_3 -> { handleDigit("3"); true }
                        KeyEvent.KEYCODE_4, KeyEvent.KEYCODE_NUMPAD_4 -> { handleDigit("4"); true }
                        KeyEvent.KEYCODE_5, KeyEvent.KEYCODE_NUMPAD_5 -> { handleDigit("5"); true }
                        KeyEvent.KEYCODE_6, KeyEvent.KEYCODE_NUMPAD_6 -> { handleDigit("6"); true }
                        KeyEvent.KEYCODE_7, KeyEvent.KEYCODE_NUMPAD_7 -> { handleDigit("7"); true }
                        KeyEvent.KEYCODE_8, KeyEvent.KEYCODE_NUMPAD_8 -> { handleDigit("8"); true }
                        KeyEvent.KEYCODE_9, KeyEvent.KEYCODE_NUMPAD_9 -> { handleDigit("9"); true }
                        KeyEvent.KEYCODE_DEL -> { handleDelete(); true }
                        KeyEvent.KEYCODE_BACK -> { onDismiss(); true }
                        else -> false
                    }
                } else false
            },
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .width(360.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(BgSurfaceDark)
                .border(1.dp, BorderDark, RoundedCornerShape(16.dp))
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "🔐 Alterar Senha Parental (+18)",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = AccentSky,
                textAlign = TextAlign.Center
            )

            Text(
                text = if (step == 1) "Digite a senha atual de 4 dígitos (padrão: 0000):"
                else "Agora digite a NOVA senha de 4 dígitos:",
                fontSize = 12.sp,
                color = if (step == 1) TextSecondary else AccentEmerald,
                textAlign = TextAlign.Center
            )

            // 4 Indicadores visuais de dígitos
            Row(
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                for (i in 0 until 4) {
                    val isFilled = i < enteredPin.length
                    Box(
                        modifier = Modifier
                            .size(18.dp)
                            .clip(CircleShape)
                            .background(
                                if (isFilled) (if (step == 1) AccentSky else AccentEmerald)
                                else Color.Transparent
                            )
                            .border(
                                2.dp,
                                if (isFilled) (if (step == 1) AccentSky else AccentEmerald) else BorderDark,
                                CircleShape
                            )
                    )
                }
            }

            if (errorMessage.isNotEmpty()) {
                Text(
                    text = errorMessage,
                    color = AccentRose,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center
                )
            }

            // Teclado Numérico na Tela (para controle remoto sem teclado numérico físico)
            val keypadRows = listOf(
                listOf("1", "2", "3"),
                listOf("4", "5", "6"),
                listOf("7", "8", "9"),
                listOf("Limpar", "0", "Cancelar")
            )

            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                keypadRows.forEachIndexed { rowIndex, rowKeys ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        rowKeys.forEachIndexed { colIndex, key ->
                            val isFirst = rowIndex == 0 && colIndex == 0
                            TvTouchCard(
                                onClick = {
                                    when (key) {
                                        "Limpar" -> handleDelete()
                                        "Cancelar" -> onDismiss()
                                        else -> handleDigit(key)
                                    }
                                },
                                containerColor = when (key) {
                                    "Cancelar" -> AccentRose.copy(alpha = 0.15f)
                                    "Limpar" -> AccentSky.copy(alpha = 0.15f)
                                    else -> Color(0xFF1E2633)
                                },
                                focusedContainerColor = Color.White,
                                modifier = Modifier
                                    .weight(1f)
                                    .then(if (isFirst) Modifier.focusRequester(firstButtonFocusRequester) else Modifier),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(vertical = 10.dp)
                            ) { isFocused ->
                                Text(
                                    text = key,
                                    fontSize = if (key.length > 1) 11.sp else 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isFocused) Color.Black else TextPrimary,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
