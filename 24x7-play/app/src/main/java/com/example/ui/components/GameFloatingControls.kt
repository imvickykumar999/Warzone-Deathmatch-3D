package com.example.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloseFullscreen
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.ScreenRotation
import androidx.compose.material.icons.filled.SportsEsports
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.GameOrientation
import com.example.ui.theme.PlayBorderBlue
import com.example.ui.theme.PlayCardBg
import com.example.ui.theme.PlayCyanAccent
import com.example.ui.theme.PlayLightBlue
import com.example.ui.theme.PlayWhite

@Composable
fun GameFloatingControls(
    orientation: GameOrientation,
    onExitFullscreen: () -> Unit,
    onRefresh: () -> Unit,
    onOrientationToggle: () -> Unit,
    onHelp: () -> Unit,
    modifier: Modifier = Modifier
) {
    var isExpanded by remember { mutableStateOf(false) }

    Box(
        modifier = modifier
            .padding(12.dp)
            .testTag("floating_controls_container")
    ) {
        if (!isExpanded) {
            // Collapsed semi-transparent floating badge
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(PlayCardBg.copy(alpha = 0.75f))
                    .border(1.5.dp, PlayCyanAccent.copy(alpha = 0.8f), CircleShape)
                    .clickable { isExpanded = true }
                    .testTag("floating_pill_button"),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.SportsEsports,
                    contentDescription = "Show Fullscreen Game Menu",
                    tint = PlayCyanAccent,
                    modifier = Modifier.size(24.dp)
                )
            }
        } else {
            // Expanded bar
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(24.dp))
                    .background(PlayCardBg)
                    .border(1.5.dp, PlayCyanAccent, RoundedCornerShape(24.dp))
                    .padding(horizontal = 6.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Exit Fullscreen
                IconButton(
                    onClick = {
                        isExpanded = false
                        onExitFullscreen()
                    },
                    modifier = Modifier
                        .size(40.dp)
                        .testTag("exit_fullscreen_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.CloseFullscreen,
                        contentDescription = "Exit Fullscreen",
                        tint = PlayCyanAccent
                    )
                }

                // Orientation toggle
                IconButton(
                    onClick = onOrientationToggle,
                    modifier = Modifier
                        .size(40.dp)
                        .testTag("floating_orientation_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.ScreenRotation,
                        contentDescription = "Orientation: $orientation",
                        tint = PlayLightBlue
                    )
                }

                // Refresh
                IconButton(
                    onClick = onRefresh,
                    modifier = Modifier
                        .size(40.dp)
                        .testTag("floating_refresh_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = "Reload Page",
                        tint = PlayLightBlue
                    )
                }

                // Help / Controls
                IconButton(
                    onClick = onHelp,
                    modifier = Modifier
                        .size(40.dp)
                        .testTag("floating_help_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.HelpOutline,
                        contentDescription = "Controls Guide",
                        tint = PlayLightBlue
                    )
                }

                // Close menu
                Box(
                    modifier = Modifier
                        .padding(start = 2.dp, end = 6.dp)
                        .clickable { isExpanded = false }
                        .padding(horizontal = 8.dp, vertical = 6.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "HIDE",
                        color = PlayCyanAccent,
                        fontSize = 11.sp
                    )
                }
            }
        }
    }
}
