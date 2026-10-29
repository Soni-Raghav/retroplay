package com.retroplay.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

public class MainActivity extends Activity {

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private static final int FILE_CHOOSER_REQUEST = 1001;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(Color.parseColor("#0b0e1a"));
        getWindow().setNavigationBarColor(Color.parseColor("#0b0e1a"));

        webView = new WebView(this);
        setContentView(webView);

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // IndexedDB ROM library
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setSafeBrowsingEnabled(true);

        webView.setWebViewClient(new LocalContentWebViewClient(assetLoader));
        webView.setWebChromeClient(new ChromeClient());
        webView.setBackgroundColor(Color.parseColor("#0b0e1a"));

        // Prevent Android from throttling/pausing the WebView renderer,
        // which causes emulation stutter and dropped frames.
        if (Build.VERSION.SDK_INT >= 25) {
            webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, true);
        }

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl("https://appassets.androidplatform.net/assets/index.html");
        }
    }

    /** Serves app assets over a secure https origin so WebRTC/IndexedDB work. */
    private static class LocalContentWebViewClient extends WebViewClientCompat {
        private final WebViewAssetLoader loader;

        LocalContentWebViewClient(WebViewAssetLoader loader) {
            this.loader = loader;
        }

        // CRITICAL: routes every request through the asset loader. Without this
        // override the WebView tries a real DNS lookup of
        // appassets.androidplatform.net and fails with ERR_NAME_NOT_RESOLVED.
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view,
                                                          WebResourceRequest request) {
            return loader.shouldInterceptRequest(request.getUrl());
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            Uri uri = Uri.parse(url);
            if ("appassets.androidplatform.net".equals(uri.getHost())) {
                return false; // let the asset loader serve it
            }
            // external links open in the browser
            try {
                view.getContext().startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (Exception ignored) { }
            return true;
        }
    }

    private class ChromeClient extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                         FileChooserParams params) {
            if (filePathCallback != null) {
                filePathCallback.onReceiveValue(null);
            }
            filePathCallback = callback;
            try {
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                startActivityForResult(
                        Intent.createChooser(intent, "Select ROM files"), FILE_CHOOSER_REQUEST);
            } catch (Exception e) {
                filePathCallback = null;
                return false;
            }
            return true;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST) {
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int n = data.getClipData().getItemCount();
                    results = new Uri[n];
                    for (int i = 0; i < n; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                } else if (data.getData() != null) {
                    results = new Uri[]{ data.getData() };
                }
            }
            if (filePathCallback != null) {
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.destroy();
        }
        super.onDestroy();
    }
}
