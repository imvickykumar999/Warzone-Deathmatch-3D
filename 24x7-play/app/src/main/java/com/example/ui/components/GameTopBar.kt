package com.example.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Dns
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.ScreenRotation
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.GameOrientation
import com.example.ui.theme.PlayBorderBlue
import com.example.ui.theme.PlayCyanAccent
import com.example.ui.theme.PlayFrameDark
import com.example.ui.theme.PlayGreenPlay
import com.example.ui.theme.PlayLightBlue
import com.example.ui.theme.PlayMutedBlue
import com.example.ui.theme.PlayRedClose
import com.example.ui.theme.PlayWhite

@Composable
fun GameTopBar(
    title: String,
    url: String,
    isLoading: Boolean,
    progress: Int,
    isOnline: Boolean,
    canGoBack: Boolean,
    orientation: GameOrientation,
    keepScreenOn: Boolean,
    onBackClick: () -> Unit,
    onRefreshClick: () -> Unit,
    onFullscreenClick: () -> Unit,
    onOrientationClick: () -> Unit,
    onKeepScreenOnClick: () -> Unit,
    onHelpClick: () -> Unit,
    onServerClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .border(
                width = 1.dp,
                color = PlayBorderBlue.copy(alpha = 0.8f)
            ),
        color = PlayFrameDark,
        tonalElevation = 6.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp)
                    .padding(horizontal = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Left section: Back button & Title/Online Badge
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    if (canGoBack) {
                        IconButton(
                            onClick = onBackClick,
                            modifier = Modifier
                                .size(40.dp)
                                .testTag("back_button")
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Go Back",
                                tint = PlayCyanAccent
                            )
                        }
                    }

                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(if (isOnline) PlayGreenPlay else PlayRedClose)
                            .border(1.dp, PlayWhite.copy(alpha = 0.5f), CircleShape)
                            .testTag("network_status_dot")
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    Column(
                        modifier = Modifier
                            .clickable { onServerClick() }
                            .padding(horizontal = 4.dp, vertical = 2.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "24x7 Play",
                                color = PlayWhite,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "3D ARENA",
                                color = PlayCyanAccent,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.ExtraBold,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(3.dp))
                                    .background(PlayBorderBlue)
                                    .padding(horizontal = 4.dp, vertical = 1.dp)
                            )
                        }
                        Text(
                            text = if (isOnline) url.removePrefix("https://").removePrefix("http://") else "Offline Mode",
                            color = if (isOnline) PlayLightBlue else PlayRedClose,
                            fontSize = 11.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                // Right actions
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    // Orientation toggle button with badge
                    Box(
                        contentAlignment = Alignment.BottomEnd
                    ) {
                        IconButton(
                            onClick = onOrientationClick,
                            modifier = Modifier
                                .size(42.dp)
                                .testTag("orientation_button")
                        ) {
                            Icon(
                                imageVector = Icons.Default.ScreenRotation,
                                contentDescription = "Toggle Orientation",
                                tint = when (orientation) {
                                    GameOrientation.LANDSCAPE -> PlayCyanAccent
                                    GameOrientation.SENSOR -> PlayLightBlue
                                    GameOrientation.PORTRAIT -> PlayMutedBlue
                                }
                            )
                        }
                        Text(
                            text = when (orientation) {
                                GameOrientation.LANDSCAPE -> "LAND"
                                GameOrientation.SENSOR -> "AUTO"
                                GameOrientation.PORTRAIT -> "PORT"
                            },
                            color = PlayWhite,
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .clip(RoundedCornerShape(2.dp))
                                .background(PlayBorderBlue)
                                .padding(horizontal = 2.dp)
                        )
                    }

                    // Keep screen on toggle
                    IconButton(
                        onClick = onKeepScreenOnClick,
                        modifier = Modifier
                            .size(42.dp)
                            .testTag("wakelock_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Lightbulb,
                            contentDescription = if (keepScreenOn) "Screen Sleep Prevented" else "Allow Screen Sleep",
                            tint = if (keepScreenOn) PlayCyanAccent else PlayMutedBlue.copy(alpha = 0.5f)
                        )
                    }

                    // Refresh
                    IconButton(
                        onClick = onRefreshClick,
                        modifier = Modifier
                            .size(42.dp)
                            .testTag("refresh_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Reload Page",
                            tint = PlayLightBlue
                        )
                    }

                    // Controls / Help
                    IconButton(
                        onClick = onHelpClick,
                        modifier = Modifier
                            .size(42.dp)
                            .testTag("help_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.HelpOutline,
                            contentDescription = "Game Controls & Tips",
                            tint = PlayLightBlue
                        )
                    }

                    // Server switch
                    IconButton(
                        onClick = onServerClick,
                        modifier = Modifier
                            .size(42.dp)
                            .testTag("server_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Dns,
                            contentDescription = "Server Settings",
                            tint = PlayLightBlue
                        )
                    }

                    // Enter Immersive Fullscreen
                    IconButton(
                        onClick = onFullscreenClick,
                        modifier = Modifier
                            .size(42.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(PlayBorderBlue.copy(alpha = 0.7f))
                            .border(1.dp, PlayCyanAccent.copy(alpha = 0.6f), RoundedCornerShape(6.dp))
                            .testTag("fullscreen_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Fullscreen,
                            contentDescription = "Enter Fullscreen",
                            tint = PlayCyanAccent
                        )
                    }
                }
            }

            // Neon glowing progress bar
            AnimatedVisibility(visible = isLoading && progress < 100) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.dp)
                ) {
                    LinearProgressIndicator(
                        progress = { progress / 100f },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(3.dp),
                        color = PlayCyanAccent,
                        trackColor = PlayBorderBlue
                    )
                }
            }
        }
    }
}
