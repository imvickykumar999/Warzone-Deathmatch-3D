package com.example.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dns
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.ui.theme.PlayBgDark
import com.example.ui.theme.PlayBorderBlue
import com.example.ui.theme.PlayCardBg
import com.example.ui.theme.PlayCyanAccent
import com.example.ui.theme.PlayFrameDark
import com.example.ui.theme.PlayGreenPlay
import com.example.ui.theme.PlayLightBlue
import com.example.ui.theme.PlayMutedBlue
import com.example.ui.theme.PlayRedClose
import com.example.ui.theme.PlayWhite

@Composable
fun OfflineGameScreen(
    url: String,
    errorMessage: String?,
    onRetry: () -> Unit,
    onOpenServerDialog: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(PlayBgDark),
        contentAlignment = Alignment.Center
    ) {
        // Background Hero Art
        Image(
            painter = painterResource(id = R.drawable.cyber_arena_bg_1790436391280),
            contentDescription = "Cyber Arena",
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
            alpha = 0.25f
        )

        // Glassmorphism card matching #launcher-frame on play.24x7stream.shop
        Card(
            modifier = Modifier
                .padding(24.dp)
                .fillMaxWidth(0.92f)
                .border(2.dp, PlayBorderBlue, RoundedCornerShape(8.dp))
                .testTag("offline_game_card"),
            colors = CardDefaults.cardColors(containerColor = PlayCardBg),
            shape = RoundedCornerShape(8.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(RoundedCornerShape(32.dp))
                        .background(PlayRedClose.copy(alpha = 0.15f))
                        .border(1.dp, PlayRedClose.copy(alpha = 0.6f), RoundedCornerShape(32.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.WifiOff,
                        contentDescription = "Connection Lost",
                        tint = PlayRedClose,
                        modifier = Modifier.size(36.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Connection Disconnected",
                    color = PlayLightBlue,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = errorMessage ?: "Unable to establish connection with the 3D deathmatch server at $url",
                    color = PlayMutedBlue,
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(20.dp))

                // Server Status Information box
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(6.dp))
                        .background(PlayFrameDark)
                        .border(1.dp, PlayBorderBlue, RoundedCornerShape(6.dp))
                        .padding(12.dp)
                ) {
                    Column {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "Target Server:",
                                color = PlayLightBlue,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = "game.24x7stream.shop:8888",
                                color = PlayCyanAccent,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Check your internet connection or verify the game bridge status.",
                            color = PlayMutedBlue,
                            fontSize = 11.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Actions matching website's green play button and blue controls
                Button(
                    onClick = onRetry,
                    colors = ButtonDefaults.buttonColors(containerColor = PlayGreenPlay),
                    shape = RoundedCornerShape(4.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .testTag("retry_connection_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = null,
                        tint = PlayWhite,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "RECONNECT TO ARENA",
                        color = PlayWhite,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedButton(
                    onClick = onOpenServerDialog,
                    shape = RoundedCornerShape(4.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = PlayCyanAccent),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                        .testTag("change_server_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Dns,
                        contentDescription = null,
                        tint = PlayCyanAccent,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "CHANGE SERVER ADDRESS",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }
}
