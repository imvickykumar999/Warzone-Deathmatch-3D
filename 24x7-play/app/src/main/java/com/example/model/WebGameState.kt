package com.example.model

enum class GameOrientation {
    SENSOR,
    LANDSCAPE,
    PORTRAIT
}

data class WebGameState(
    val currentUrl: String = "https://play.24x7stream.shop",
    val title: String = "Ursina TCP Deathmatch",
    val isLoading: Boolean = true,
    val progress: Int = 0,
    val canGoBack: Boolean = false,
    val canGoForward: Boolean = false,
    val isOnline: Boolean = true,
    val isImmersive: Boolean = false,
    val orientation: GameOrientation = GameOrientation.LANDSCAPE,
    val keepScreenOn: Boolean = true,
    val showHelpDialog: Boolean = false,
    val showExitDialog: Boolean = false,
    val showServerDialog: Boolean = false,
    val customServerUrl: String = "https://play.24x7stream.shop",
    val errorMessage: String? = null
)
