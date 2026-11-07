package com.peepconnect.tv.preview;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public final class MainActivity extends Activity {
    private static final String START = "http://127.0.0.1:8770/";
    // Dashboard Painel do GestorPeep: abre primeiro, sempre que o app abre. Voltar leva à skin.
    private static final String PAINEL = "https://gestorpeep.com/painel_tv.php";
    private WebView web;
    private WebView painel;          // WebView separado, SEM a ponte PeepTV: página remota não comanda a TV
    private boolean skinCarregada;
    // Peep Horizons Bluetooth 0.13
    private BluetoothStatus peepBluetooth;
    private DeviceMetrics peepMetrics;
    void notifyBluetooth() {
        runOnUiThread(() -> {
            if (web != null && !isFinishing()) web.evaluateJavascript("window.dispatchEvent(new Event('peep-bluetooth'))", null);
        });
    }
    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        if (code == 1313 && peepBluetooth != null) { peepBluetooth.start(); notifyBluetooth(); }
    }


    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        // Diagnostic opt-in for this launch only; ordinary launches keep it off.
        WebView.setWebContentsDebuggingEnabled(getIntent().getBooleanExtra("peep_debug", false));
        abrirPainel();
    }

    // A skin e seus sensores só são necessários depois de sair do painel.
    private void prepararSkin() {
        if (web != null) return;
        peepBluetooth = new BluetoothStatus(this);
        peepMetrics = new DeviceMetrics(this);
        web = new WebView(this);
        peepBluetooth.start();
        web.setBackgroundColor(Color.BLACK);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setTextZoom(100);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        web.addJavascriptInterface(new TVActions(), "PeepTV");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (local(uri)) {
                    if (uri.getPath() != null && uri.getPath().startsWith("/api/youtube/connect")) {
                        Toast.makeText(MainActivity.this, "Conecte sua conta no painel do Mac. Os canais serão compartilhados com esta TV.", Toast.LENGTH_LONG).show();
                        return true;
                    }
                    return false;
                }
                if ("https".equals(uri.getScheme()) && request.hasGesture()) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (ActivityNotFoundException error) { message("Não há um aplicativo disponível para abrir este link."); }
                }
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (!local(Uri.parse(url))) return;
                String script = "(function(){if(!document.querySelector('#apps'))return;" +
                    "window.openApp=function(app){PeepTV.launchApp(app.id)};" +
                    "var el=document.querySelector('#store');if(el)el.onclick=function(){PeepTV.openSettings('store')};" +
                    "el=document.querySelector('#system-settings');if(el)el.onclick=function(){PeepTV.openSettings('system')};" +
                    "var first=document.querySelector('.app-card');if(first)first.focus();})()";
                view.evaluateJavascript(script, null);
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showConnectionHelp();
            }
        });
    }

    /** Painel do GestorPeep em tela cheia. Só navega dentro de gestorpeep.com/painel_tv.php. */
    private void abrirPainel() {
        painel = new WebView(this);
        painel.setBackgroundColor(Color.rgb(12, 25, 44));
        WebSettings s = painel.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);           // guarda o pareamento da TV (localStorage)
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setTextZoom(100);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSupportMultipleWindows(false);
        painel.setFocusable(true);
        painel.setFocusableInTouchMode(true);
        painel.setWebChromeClient(new WebChromeClient()); // confirm() de "Desconectar esta TV"
        painel.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                return !("https".equals(uri.getScheme()) && "gestorpeep.com".equals(uri.getHost())
                        && uri.getPath() != null && uri.getPath().startsWith("/painel_tv.php"));
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) { message("Painel indisponível agora (sem internet?). Abrindo a Peep Connect."); abrirSkin(); }
            }
        });
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(painel);
        painel.requestFocus();
        if (web != null) {
            web.stopLoading(); web.removeJavascriptInterface("PeepTV"); web.destroy(); web = null;
            skinCarregada = false;
            if (peepBluetooth != null) { peepBluetooth.close(); peepBluetooth = null; }
            peepMetrics = null;
        }
        painel.loadUrl(PAINEL);
    }

    /** Sai do painel para a skin; a skin só carrega na primeira vez que é aberta. */
    private void abrirSkin() {
        runOnUiThread(() -> {
            if (isFinishing()) return;
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            if (painel != null) { WebView p = painel; painel = null; p.stopLoading(); p.onPause(); p.destroy(); }
            prepararSkin();
            setContentView(web);
            web.requestFocus();
            if (!skinCarregada) { skinCarregada = true; web.loadUrl(START); }
        });
    }

    private static boolean local(Uri uri) {
        return "http".equals(uri.getScheme()) && "127.0.0.1".equals(uri.getHost()) && uri.getPort() == 8770;
    }

    private void message(final String text) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, text, Toast.LENGTH_LONG).show());
    }

    private void showConnectionHelp() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(80, 70, 80, 50);
        box.setBackgroundColor(Color.rgb(11, 31, 59));
        TextView title = new TextView(this);
        title.setText("Peep Connect"); title.setTextSize(32); title.setTextColor(Color.WHITE);
        box.addView(title);
        TextView detail = new TextView(this);
        detail.setText("Prévia conectada\n\nMantenha o serviço aberto no Mac e a conexão ADB ativa.\nExecute instalar_tv.py no Mac para refazer a conexão.\n\nEsta prévia ainda depende do Mac.");
        detail.setTextColor(Color.rgb(215, 223, 230)); detail.setTextSize(20); detail.setPadding(0, 24, 0, 30);
        box.addView(detail);
        Button retry = new Button(this); retry.setText("Tentar novamente");
        retry.setOnClickListener(v -> { skinCarregada = true; setContentView(web); web.requestFocus(); web.loadUrl(START); }); box.addView(retry);
        Button exit = new Button(this); exit.setText("Voltar à TV"); exit.setOnClickListener(v -> finish()); box.addView(exit);
        setContentView(box); retry.requestFocus();
    }

    public final class TVActions {
        @JavascriptInterface public void openDashboard() { runOnUiThread(() -> { if (!isFinishing() && painel == null) abrirPainel(); }); }
        @JavascriptInterface public String installedApps() { return InstalledApps.list(MainActivity.this); }
        @JavascriptInterface public String deviceMetrics() { return peepMetrics == null ? "{}" : peepMetrics.snapshot(); }
        @JavascriptInterface public String bluetoothStatus() {
            if (peepBluetooth != null) runOnUiThread(() -> peepBluetooth.start());
            return peepBluetooth == null ? "{\"state\":\"unavailable\"}" : peepBluetooth.snapshot();
        }
        @JavascriptInterface public void requestBluetooth() { if (peepBluetooth != null) peepBluetooth.requestAccess(); }
        @JavascriptInterface public void openBluetoothSettings() { if (peepBluetooth != null) peepBluetooth.openSettings(); }

        // Peep Living: delegado ao assistente instalado, sem gravar áudio no app.
        @JavascriptInterface public void openAssistant() {
            runOnUiThread(() -> {
                Intent[] candidates = new Intent[] {
                    new Intent(Intent.ACTION_VOICE_COMMAND).setPackage("com.google.android.katniss"),
                    new Intent(Intent.ACTION_VOICE_COMMAND),
                    new Intent(Intent.ACTION_ASSIST)
                };
                for (Intent candidate : candidates) {
                    try { startActivity(candidate); return; }
                    catch (ActivityNotFoundException unavailable) { }
                }
                message("Assistente de voz indisponível. Tente o microfone do controle remoto.");
            });
        }

        @JavascriptInterface public void openTrailer(String videoId) {
            if (videoId == null || !videoId.matches("[A-Za-z0-9_-]{11}")) return;
            runOnUiThread(() -> {
                Uri url = Uri.parse("https://www.youtube.com/watch?v=" + videoId);
                Intent intent = new Intent(Intent.ACTION_VIEW, url);
                intent.setPackage("com.google.android.youtube.tv");
                try { startActivity(intent); }
                catch (ActivityNotFoundException unavailable) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, url)); }
                    catch (ActivityNotFoundException error) { message("Não há um aplicativo disponível para abrir o trailer."); }
                }
            });
        }
        @JavascriptInterface public void launchApp(String id) {
            final String target;
            switch (id) {
                case "netflix": target = "com.netflix.ninja"; break;
                case "youtube": target = "com.google.android.youtube.tv"; break;
                case "prime": target = "com.amazon.amazonvideo.livingroom"; break;
                case "disney": target = "com.disney.disneyplus"; break;
                case "globoplay": target = "com.globo.globoplay"; break;
                case "spotify": target = "com.spotify.tv.android"; break;
                case "jellyfin": target = "org.jellyfin.androidtv"; break;
                case "max": target = "com.wbd.stream"; break;
                case "appletv": target = "com.apple.atve.androidtv.appletv"; break;
                default:
                    if (id == null || !id.matches("[A-Za-z0-9_]+(?:\\.[A-Za-z0-9_]+)+")) {
                        message("Aplicativo ainda não integrado."); return;
                    }
                    target = id;
            }
            runOnUiThread(() -> {
                Intent launch = getPackageManager().getLeanbackLaunchIntentForPackage(target);
                if (launch == null) launch = getPackageManager().getLaunchIntentForPackage(target);
                if (launch == null) { message("Aplicativo não encontrado na TV: " + id); return; }
                try { startActivity(launch); } catch (ActivityNotFoundException error) { message("Não foi possível abrir o aplicativo."); }
            });
        }
        @JavascriptInterface public void openSettings(String section) {
            runOnUiThread(() -> {
                Intent intent = "store".equals(section) ? new Intent(Intent.ACTION_VIEW, Uri.parse("market://search?q=apps&c=apps")) : new Intent("network".equals(section) ? Settings.ACTION_WIFI_SETTINGS : Settings.ACTION_SETTINGS);
                try { startActivity(intent); } catch (ActivityNotFoundException error) { message("Atalho indisponível nesta TV."); }
            });
        }
        @JavascriptInterface public void accountHelp() { runOnUiThread(() -> web.evaluateJavascript("if(typeof youtubeAccount==='function')youtubeAccount()", null)); }
        @JavascriptInterface public void close() { runOnUiThread(() -> finish()); }
    }

    @Override public void onBackPressed() {
        if (painel != null) { abrirSkin(); return; }
        web.evaluateJavascript("(function(){if(window.PeepIdle&&PeepIdle.active){PeepIdle.wake();return}var p=document.querySelector('dialog[open]');if(p){p.close();return}if(typeof page!=='undefined'&&page!=='home'){navigate('home');return}PeepTV.close()})()", null);
    }
    @Override protected void onPause() { if (painel != null) painel.onPause(); if (web != null) { web.onPause(); web.pauseTimers(); } super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (painel != null) painel.onResume(); if (web != null) { web.onResume(); web.resumeTimers(); if (skinCarregada) web.evaluateJavascript("window.dispatchEvent(new Event('peep-apps-refresh'))", null); } }
    @Override protected void onDestroy() { if (painel != null) { painel.stopLoading(); painel.destroy(); } if (peepBluetooth != null) peepBluetooth.close(); if (web != null) { web.stopLoading(); web.removeJavascriptInterface("PeepTV"); web.destroy(); } super.onDestroy(); }
}
