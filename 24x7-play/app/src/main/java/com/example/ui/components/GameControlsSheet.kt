package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Keyboard
import androidx.compose.material.icons.filled.ScreenRotation
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.SportsEsports
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.ui.theme.PlayBgDark
import com.example.ui.theme.PlayBorderBlue
import com.example.ui.theme.PlayCardBg
import com.example.ui.theme.PlayCyanAccent
import com.example.ui.theme.PlayFrameDark
import com.example.ui.theme.PlayGreenPlay
import com.example.ui.theme.PlayInputBg
import com.example.ui.theme.PlayLightBlue
import com.example.ui.theme.PlayMutedBlue
import com.example.ui.theme.PlayRedClose
import com.example.ui.theme.PlayWhite

@Composable
fun GameControlsDialog(
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .border(2.dp, PlayBorderBlue, RoundedCornerShape(8.dp))
                .testTag("controls_guide_dialog"),
            colors = CardDefaults.cardColors(containerColor = PlayCardBg),
            shape = RoundedCornerShape(8.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.SportsEsports,
                            contentDescription = null,
                            tint = PlayCyanAccent,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "GAMEPLAY CONTROLS",
                            color = PlayLightBlue,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = PlayMutedBlue
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Landscape Tip Notice
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(6.dp))
                        .background(PlayInputBg)
                        .border(1.dp, PlayCyanAccent.copy(alpha = 0.5f), RoundedCornerShape(6.dp))
                        .padding(12.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.ScreenRotation,
                            contentDescription = null,
                            tint = PlayCyanAccent,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = "Landscape Mode is recommended to unlock the full dual-stick touch controls in the 3D deathmatch!",
                            color = PlayLightBlue,
                            fontSize = 12.sp,
                            lineHeight = 16.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Controls & Keybindings",
                    color = PlayCyanAccent,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(8.dp))

                ControlItem("Move / Strafe", "Left Virtual Stick / [WASD]")
                ControlItem("Look / Aim", "Right Screen Swipe / [Mouse]")
                ControlItem("Primary Fire", "Right Shoot Button / [LMB]")
                ControlItem("Aim Down Sights (Zoom)", "ADS Button / [RMB] or [C]")
                ControlItem("Jump", "Jump Button / [SPACE]")
                ControlItem("Reload Weapon", "Reload Icon / [R] or [E]")
                ControlItem("Toggle Camera (1st/3rd)", "View Button / [V]")
                ControlItem("Free Mouse / Unlock", "[ESC]")

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Game Server Info",
                    color = PlayCyanAccent,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(8.dp))

                ControlItem("Default Host", "game.24x7stream.shop")
                ControlItem("Port Number", "8888")
                ControlItem("Health Points", "250 HP")
                ControlItem("Ammo Magazine", "15 Bullets")

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.buttonColors(containerColor = PlayGreenPlay),
                    shape = RoundedCornerShape(4.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                ) {
                    Text(
                        text = "GOT IT, LET'S PLAY",
                        color = PlayWhite,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
private fun ControlItem(action: String, key: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = action,
            color = PlayWhite,
            fontSize = 12.sp
        )
        Text(
            text = key,
            color = PlayCyanAccent,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier
                .clip(RoundedCornerShape(3.dp))
                .background(PlayFrameDark)
                .border(1.dp, PlayBorderBlue, RoundedCornerShape(3.dp))
                .padding(horizontal = 6.dp, vertical = 2.dp)
        )
    }
}

@Composable
fun ServerConfigDialog(
    currentUrl: String,
    onConfirm: (String) -> Unit,
    onResetDefault: () -> Unit,
    onDismiss: () -> Unit
) {
    var textValue by remember { mutableStateOf(currentUrl) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .border(2.dp, PlayBorderBlue, RoundedCornerShape(8.dp))
                .testTag("server_config_dialog"),
            colors = CardDefaults.cardColors(containerColor = PlayCardBg),
            shape = RoundedCornerShape(8.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp)
            ) {
                Text(
                    text = "Server Configuration",
                    color = PlayLightBlue,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Configure web application target URL or bridge connection address:",
                    color = PlayMutedBlue,
                    fontSize = 12.sp
                )

                Spacer(modifier = Modifier.height(14.dp))

                OutlinedTextField(
                    value = textValue,
                    onValueChange = { textValue = it },
                    label = { Text("Game WebApp URL", color = PlayLightBlue) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = PlayCyanAccent,
                        unfocusedBorderColor = PlayBorderBlue,
                        focusedTextColor = PlayWhite,
                        unfocusedTextColor = PlayWhite,
                        focusedContainerColor = PlayInputBg,
                        unfocusedContainerColor = PlayInputBg
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("server_url_input")
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Quick presets matching Tkinter options on site
                Text(
                    text = "Presets:",
                    color = PlayMutedBlue,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    TextButton(
                        onClick = { textValue = "https://play.24x7stream.shop" },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Default", color = PlayCyanAccent, fontSize = 11.sp)
                    }
                    TextButton(
                        onClick = { onResetDefault(); onDismiss() },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Reset", color = PlayLightBlue, fontSize = 11.sp)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cancel", color = PlayMutedBlue)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            if (textValue.isNotBlank()) {
                                onConfirm(textValue.trim())
                            }
                            onDismiss()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = PlayGreenPlay),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text("Connect", color = PlayWhite, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun ExitGameConfirmationDialog(
    onConfirmExit: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "Exit Deathmatch Session?",
                color = PlayLightBlue,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Text(
                text = "Are you sure you want to close 24x7 Play? Your active match progress will be lost.",
                color = PlayWhite,
                fontSize = 13.sp
            )
        },
        confirmButton = {
            Button(
                onClick = onConfirmExit,
                colors = ButtonDefaults.buttonColors(containerColor = PlayRedClose),
                shape = RoundedCornerShape(4.dp),
                modifier = Modifier.testTag("confirm_exit_button")
            ) {
                Text("Exit Game", color = PlayWhite, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                modifier = Modifier.testTag("cancel_exit_button")
            ) {
                Text("Keep Playing", color = PlayCyanAccent)
            }
        },
        containerColor = PlayCardBg,
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier
            .border(2.dp, PlayBorderBlue, RoundedCornerShape(8.dp))
            .testTag("exit_confirmation_dialog")
    )
}
