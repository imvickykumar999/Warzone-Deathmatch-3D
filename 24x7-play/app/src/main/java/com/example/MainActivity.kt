package com.example

import android.content.pm.ActivityInfo
import android.os.Bundle
import android.view.WindowManager
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.model.GameOrientation
import com.example.ui.GameWebView
import com.example.ui.components.ExitGameConfirmationDialog
import com.example.ui.components.GameControlsDialog
import com.example.ui.components.GameFloatingControls
import com.example.ui.components.GameTopBar
import com.example.ui.components.OfflineGameScreen
import com.example.ui.components.ServerConfigDialog
import com.example.ui.theme.MyApplicationTheme
import com.example.ui.theme.PlayBgDark
import com.example.ui.viewmodel.WebGameViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: WebGameViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            MyApplicationTheme {
                val uiState by viewModel.uiState.collectAsStateWithLifecycle()
                var webViewRef by remember { mutableStateOf<WebView?>(null) }

                // Manage Keep-Screen-On flag
                LaunchedEffect(uiState.keepScreenOn) {
                    if (uiState.keepScreenOn) {
                        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                    } else {
                        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                    }
                }

                // Manage Orientation Mode
                LaunchedEffect(uiState.orientation) {
                    requestedOrientation = when (uiState.orientation) {
                        GameOrientation.LANDSCAPE -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                        GameOrientation.SENSOR -> ActivityInfo.SCREEN_ORIENTATION_SENSOR
                        GameOrientation.PORTRAIT -> ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                    }
                }

                // Manage Immersive Fullscreen Mode
                LaunchedEffect(uiState.isImmersive) {
                    val insetsController = WindowCompat.getInsetsController(window, window.decorView)
                    if (uiState.isImmersive) {
                        insetsController.systemBarsBehavior =
                            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                        insetsController.hide(WindowInsetsCompat.Type.systemBars())
                    } else {
                        insetsController.show(WindowInsetsCompat.Type.systemBars())
                    }
                }

                // Smart Back press handling
                BackHandler {
                    when {
                        uiState.showHelpDialog -> viewModel.setShowHelpDialog(false)
                        uiState.showServerDialog -> viewModel.setShowServerDialog(false)
                        uiState.showExitDialog -> viewModel.setShowExitDialog(false)
                        uiState.isImmersive -> viewModel.setImmersive(false)
                        webViewRef?.canGoBack() == true -> webViewRef?.goBack()
                        else -> viewModel.setShowExitDialog(true)
                    }
                }

                Scaffold(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(PlayBgDark)
                        .testTag("main_scaffold"),
                    containerColor = PlayBgDark
                ) { innerPadding ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(PlayBgDark)
                    ) {
                        Column(modifier = Modifier.fillMaxSize()) {
                            // Top Bar (visible when NOT in immersive mode)
                            AnimatedVisibility(
                                visible = !uiState.isImmersive,
                                enter = slideInVertically(initialOffsetY = { -it }),
                                exit = slideOutVertically(targetOffsetY = { -it })
                            ) {
                                GameTopBar(
                                    title = uiState.title,
                                    url = uiState.currentUrl,
                                    isLoading = uiState.isLoading,
                                    progress = uiState.progress,
                                    isOnline = uiState.isOnline,
                                    canGoBack = uiState.canGoBack,
                                    orientation = uiState.orientation,
                                    keepScreenOn = uiState.keepScreenOn,
                                    onBackClick = { webViewRef?.goBack() },
                                    onRefreshClick = { webViewRef?.reload() },
                                    onFullscreenClick = { viewModel.setImmersive(true) },
                                    onOrientationClick = { viewModel.cycleOrientation() },
                                    onKeepScreenOnClick = { viewModel.toggleKeepScreenOn() },
                                    onHelpClick = { viewModel.setShowHelpDialog(true) },
                                    onServerClick = { viewModel.setShowServerDialog(true) }
                                )
                            }

                            // Main Content Area: WebView or Offline Screen
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxSize()
                            ) {
                                GameWebView(
                                    url = uiState.currentUrl,
                                    onProgressUpdate = { loading, progress ->
                                        viewModel.setPageProgress(loading, progress)
                                    },
                                    onNavStateUpdate = { canGoBack, canGoForward, title ->
                                        viewModel.setNavState(canGoBack, canGoForward, title)
                                    },
                                    onError = { error ->
                                        viewModel.setError(error)
                                    },
                                    webViewRef = { webView ->
                                        webViewRef = webView
                                    }
                                )

                                // Offline Screen overlay if offline or fatal error
                                if (!uiState.isOnline || (uiState.errorMessage != null && !uiState.isLoading)) {
                                    OfflineGameScreen(
                                        url = uiState.currentUrl,
                                        errorMessage = uiState.errorMessage,
                                        onRetry = {
                                            viewModel.setError(null)
                                            webViewRef?.reload()
                                        },
                                        onOpenServerDialog = {
                                            viewModel.setShowServerDialog(true)
                                        }
                                    )
                                }
                            }
                        }

                        // Floating Game Controls when in Immersive Mode
                        if (uiState.isImmersive) {
                            GameFloatingControls(
                                orientation = uiState.orientation,
                                onExitFullscreen = { viewModel.setImmersive(false) },
                                onRefresh = { webViewRef?.reload() },
                                onOrientationToggle = { viewModel.cycleOrientation() },
                                onHelp = { viewModel.setShowHelpDialog(true) },
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                            )
                        }

                        // Dialogs
                        if (uiState.showHelpDialog) {
                            GameControlsDialog(
                                onDismiss = { viewModel.setShowHelpDialog(false) }
                            )
                        }

                        if (uiState.showServerDialog) {
                            ServerConfigDialog(
                                currentUrl = uiState.currentUrl,
                                onConfirm = { newUrl ->
                                    viewModel.loadCustomUrl(newUrl)
                                    webViewRef?.loadUrl(newUrl)
                                },
                                onResetDefault = {
                                    viewModel.resetToDefault()
                                    webViewRef?.loadUrl("https://play.24x7stream.shop")
                                },
                                onDismiss = { viewModel.setShowServerDialog(false) }
                            )
                        }

                        if (uiState.showExitDialog) {
                            ExitGameConfirmationDialog(
                                onConfirmExit = { finish() },
                                onDismiss = { viewModel.setShowExitDialog(false) }
                            )
                        }
                    }
                }
            }
        }
    }
}
