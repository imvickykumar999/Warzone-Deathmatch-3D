package com.example.ui

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import android.view.View
import android.view.ViewGroup
import android.webkit.ConsoleMessage
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.viewinterop.AndroidView
import com.example.ui.theme.PlayBgDark

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun GameWebView(
    url: String,
    onProgressUpdate: (isLoading: Boolean, progress: Int) -> Unit,
    onNavStateUpdate: (canGoBack: Boolean, canGoForward: Boolean, title: String?) -> Unit,
    onError: (String?) -> Unit,
    webViewRef: (WebView) -> Unit,
    modifier: Modifier = Modifier
) {
    var customView by remember { mutableStateOf<View?>(null) }
    var customViewCallback by remember { mutableStateOf<WebChromeClient.CustomViewCallback?>(null) }
    var webViewInstance by remember { mutableStateOf<WebView?>(null) }

    // If HTML5 custom view (e.g. video or fullscreen canvas) is active, back press closes it
    BackHandler(enabled = customView != null) {
        customViewCallback?.onCustomViewHidden()
        customView = null
        customViewCallback = null
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(PlayBgDark)
            .testTag("webview_container")
    ) {
        AndroidView(
            modifier = Modifier
                .fillMaxSize()
                .testTag("game_webview"),
            factory = { context ->
                WebView(context).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    setBackgroundColor(android.graphics.Color.BLACK)
                    setLayerType(View.LAYER_TYPE_HARDWARE, null)

                    // Gaming-optimized WebSettings
                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        databaseEnabled = true
                        mediaPlaybackRequiresUserGesture = false // Crucial for instant bullet sfx & lobby music
                        mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW // Crucial for ws:// bridges
                        useWideViewPort = true
                        loadWithOverviewMode = true
                        builtInZoomControls = false
                        displayZoomControls = false
                        allowFileAccess = true
                        allowContentAccess = true
                        cacheMode = WebSettings.LOAD_DEFAULT

                        // Enhance User Agent to modern Chrome on Android for proper WebGL support
                        val defaultUa = userAgentString
                        userAgentString = "$defaultUa 24x7PlayApp/1.0"
                    }

                    webChromeClient = object : WebChromeClient() {
                        override fun onProgressChanged(view: WebView?, newProgress: Int) {
                            super.onProgressChanged(view, newProgress)
                            val isLoading = newProgress < 100
                            onProgressUpdate(isLoading, newProgress)
                            onNavStateUpdate(
                                view?.canGoBack() == true,
                                view?.canGoForward() == true,
                                view?.title
                            )
                        }

                        override fun onReceivedTitle(view: WebView?, title: String?) {
                            super.onReceivedTitle(view, title)
                            onNavStateUpdate(
                                view?.canGoBack() == true,
                                view?.canGoForward() == true,
                                title
                            )
                        }

                        override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                            if (customView != null) {
                                callback?.onCustomViewHidden()
                                return
                            }
                            customView = view
                            customViewCallback = callback
                        }

                        override fun onHideCustomView() {
                            customViewCallback?.onCustomViewHidden()
                            customView = null
                            customViewCallback = null
                        }

                        override fun onPermissionRequest(request: PermissionRequest?) {
                            request?.grant(request.resources)
                        }

                        override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                            return true
                        }
                    }

                    webViewClient = object : WebViewClient() {
                        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                            super.onPageStarted(view, url, favicon)
                            onProgressUpdate(true, 10)
                            onError(null)
                        }

                        override fun onPageFinished(view: WebView?, url: String?) {
                            super.onPageFinished(view, url)
                            onProgressUpdate(false, 100)
                            onNavStateUpdate(
                                view?.canGoBack() == true,
                                view?.canGoForward() == true,
                                view?.title
                            )
                        }

                        override fun onReceivedError(
                            view: WebView?,
                            request: WebResourceRequest?,
                            error: WebResourceError?
                        ) {
                            super.onReceivedError(view, request, error)
                            if (request?.isForMainFrame == true) {
                                val desc = error?.description?.toString() ?: "Network error"
                                onError(desc)
                            }
                        }

                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: WebResourceRequest?
                        ): Boolean {
                            val targetUri = request?.url ?: return false
                            val scheme = targetUri.scheme?.lowercase()
                            return if (scheme == "http" || scheme == "https") {
                                false
                            } else {
                                true
                            }
                        }
                    }

                    webViewInstance = this
                    webViewRef(this)
                    loadUrl(url)
                }
            },
            update = { webView ->
                webViewInstance = webView
                webViewRef(webView)
                if (webView.url != url) {
                    webView.loadUrl(url)
                }
            }
        )

        // Overlay custom view if HTML5 Fullscreen API invoked by game
        customView?.let { cView ->
            AndroidView(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black)
                    .testTag("fullscreen_custom_view"),
                factory = { _ ->
                    FrameLayout(cView.context).apply {
                        layoutParams = ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )
                        addView(
                            cView,
                            FrameLayout.LayoutParams(
                                FrameLayout.LayoutParams.MATCH_PARENT,
                                FrameLayout.LayoutParams.MATCH_PARENT
                            )
                        )
                    }
                }
            )
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            webViewInstance?.destroy()
        }
    }
}
