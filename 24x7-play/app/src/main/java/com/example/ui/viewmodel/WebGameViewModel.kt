package com.example.ui.viewmodel

import android.app.Application
import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.lifecycle.AndroidViewModel
import com.example.model.GameOrientation
import com.example.model.WebGameState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

class WebGameViewModel(application: Application) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(WebGameState())
    val uiState: StateFlow<WebGameState> = _uiState.asStateFlow()

    private val connectivityManager =
        application.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager

    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            _uiState.update { it.copy(isOnline = true, errorMessage = null) }
        }

        override fun onLost(network: Network) {
            _uiState.update { it.copy(isOnline = false) }
        }
    }

    init {
        checkInitialConnectivity()
        registerNetworkCallback()
    }

    private fun checkInitialConnectivity() {
        val activeNetwork = connectivityManager?.activeNetwork
        val capabilities = connectivityManager?.getNetworkCapabilities(activeNetwork)
        val isConnected = capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
        _uiState.update { it.copy(isOnline = isConnected) }
    }

    private fun registerNetworkCallback() {
        try {
            val request = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build()
            connectivityManager?.registerNetworkCallback(request, networkCallback)
        } catch (_: Exception) {
            // Graceful fallback if network callback cannot be registered
        }
    }

    override fun onCleared() {
        super.onCleared()
        try {
            connectivityManager?.unregisterNetworkCallback(networkCallback)
        } catch (_: Exception) {
        }
    }

    fun setPageProgress(isLoading: Boolean, progress: Int) {
        _uiState.update {
            it.copy(
                isLoading = isLoading,
                progress = progress,
                errorMessage = if (isLoading && progress < 100) it.errorMessage else if (progress == 100) null else it.errorMessage
            )
        }
    }

    fun setNavState(canGoBack: Boolean, canGoForward: Boolean, title: String? = null) {
        _uiState.update {
            it.copy(
                canGoBack = canGoBack,
                canGoForward = canGoForward,
                title = if (!title.isNullOrBlank()) title else it.title
            )
        }
    }

    fun setError(message: String?) {
        _uiState.update { it.copy(errorMessage = message, isLoading = false) }
    }

    fun toggleImmersive() {
        _uiState.update { it.copy(isImmersive = !it.isImmersive) }
    }

    fun setImmersive(enabled: Boolean) {
        _uiState.update { it.copy(isImmersive = enabled) }
    }

    fun setOrientation(orientation: GameOrientation) {
        _uiState.update { it.copy(orientation = orientation) }
    }

    fun cycleOrientation() {
        _uiState.update {
            val next = when (it.orientation) {
                GameOrientation.LANDSCAPE -> GameOrientation.SENSOR
                GameOrientation.SENSOR -> GameOrientation.PORTRAIT
                GameOrientation.PORTRAIT -> GameOrientation.LANDSCAPE
            }
            it.copy(orientation = next)
        }
    }

    fun toggleKeepScreenOn() {
        _uiState.update { it.copy(keepScreenOn = !it.keepScreenOn) }
    }

    fun setShowHelpDialog(show: Boolean) {
        _uiState.update { it.copy(showHelpDialog = show) }
    }

    fun setShowExitDialog(show: Boolean) {
        _uiState.update { it.copy(showExitDialog = show) }
    }

    fun setShowServerDialog(show: Boolean) {
        _uiState.update { it.copy(showServerDialog = show) }
    }

    fun loadCustomUrl(url: String) {
        val sanitized = when {
            url.startsWith("http://") || url.startsWith("https://") -> url
            else -> "https://$url"
        }
        _uiState.update {
            it.copy(
                currentUrl = sanitized,
                customServerUrl = sanitized,
                errorMessage = null,
                isLoading = true,
                progress = 0
            )
        }
    }

    fun resetToDefault() {
        _uiState.update {
            it.copy(
                currentUrl = "https://play.24x7stream.shop",
                errorMessage = null,
                isLoading = true,
                progress = 0
            )
        }
    }
}
