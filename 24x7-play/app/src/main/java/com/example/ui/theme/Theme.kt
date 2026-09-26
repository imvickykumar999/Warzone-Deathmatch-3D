package com.example.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme =
  darkColorScheme(
    primary = PlayCyanAccent,
    onPrimary = PlayBgDark,
    primaryContainer = PlayBorderBlue,
    onPrimaryContainer = PlayCyanAccent,
    secondary = PlayLightBlue,
    onSecondary = PlayBgDark,
    secondaryContainer = PlayInputBg,
    onSecondaryContainer = PlayLightBlue,
    tertiary = PlayGreenPlay,
    onTertiary = PlayWhite,
    background = PlayBgDark,
    onBackground = PlayWhite,
    surface = PlayFrameDark,
    onSurface = PlayWhite,
    surfaceVariant = PlayInputBg,
    onSurfaceVariant = PlayMutedBlue,
    outline = PlayBorderBlue,
    error = PlayRedClose,
    onError = PlayWhite
  )

@Composable
fun MyApplicationTheme(
  content: @Composable () -> Unit,
) {
  MaterialTheme(
    colorScheme = DarkColorScheme,
    typography = Typography,
    content = content
  )
}
