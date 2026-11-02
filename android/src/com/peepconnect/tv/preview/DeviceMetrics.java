package com.peepconnect.tv.preview;

import android.app.ActivityManager;
import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.TrafficStats;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Environment;
import android.os.StatFs;
import android.os.SystemClock;
import org.json.JSONObject;

/** Local counters, not an internet speed test. No scans or location requests. */
final class DeviceMetrics {
    private final Context context;
    private long lastRx = -1, lastTx = -1, lastTime = -1;
    private String lastTransport = "";
    private long appMemoryAt=0, appPssKiB=-1;
    DeviceMetrics(Context owner) { context = owner.getApplicationContext(); }

    synchronized String snapshot() {
        JSONObject out = new JSONObject();
        try {
            long monotonic = SystemClock.elapsedRealtime();
            JSONObject network = new JSONObject();
            ConnectivityManager manager = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            Network active = manager == null ? null : manager.getActiveNetwork();
            NetworkCapabilities capabilities = active == null ? null : manager.getNetworkCapabilities(active);
            boolean wifi = capabilities != null && capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI);
            boolean online = capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
            String transport = wifi ? "Wi-Fi" : capabilities != null && capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) ? "Ethernet" : capabilities == null ? "Sem rede" : "Outra rede";
            network.put("transport", transport).put("interface", capabilities == null ? JSONObject.NULL : wifi ? "wifi" : "active");
            network.put("online", online).put("validated", capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED));
            WifiInfo info = null;
            if (wifi) {
                if (Build.VERSION.SDK_INT >= 29 && capabilities.getTransportInfo() instanceof WifiInfo) info = (WifiInfo) capabilities.getTransportInfo();
                if (info == null) {
                    WifiManager wm = (WifiManager) context.getSystemService(Context.WIFI_SERVICE);
                    if (wm != null) info = wm.getConnectionInfo();
                }
            }
            int rssi = info == null ? -127 : info.getRssi();
            network.put("rssi", wifi && rssi > -127 && rssi < 0 ? rssi : JSONObject.NULL);
            network.put("rxLinkMbps", info != null && Build.VERSION.SDK_INT >= 29 && info.getRxLinkSpeedMbps() > 0 ? info.getRxLinkSpeedMbps() : JSONObject.NULL);
            network.put("txLinkMbps", info != null && Build.VERSION.SDK_INT >= 29 && info.getTxLinkSpeedMbps() > 0 ? info.getTxLinkSpeedMbps() : JSONObject.NULL);
            network.put("frequencyMHz", info != null && info.getFrequency() > 0 ? info.getFrequency() : JSONObject.NULL);
            long rx = TrafficStats.getTotalRxBytes(), tx = TrafficStats.getTotalTxBytes();
            double seconds = lastTime >= 0 ? (monotonic - lastTime) / 1000.0 : 0;
            if (capabilities != null && transport.equals(lastTransport) && seconds >= .5 && seconds < 12 && lastRx >= 0 && lastTx >= 0 && rx >= lastRx && tx >= lastTx) {
                network.put("traffic", new JSONObject().put("downloadMbps", (rx-lastRx)*8.0/seconds/1000000).put("uploadMbps", (tx-lastTx)*8.0/seconds/1000000).put("intervalSeconds", seconds));
            } else network.put("traffic", JSONObject.NULL);
            lastRx=rx; lastTx=tx; lastTime=monotonic; lastTransport=transport;
            network.put("counterScope", "device-total");
            if (rx >= 0) network.put("receivedBytesSinceBoot",rx);
            if (tx >= 0) network.put("sentBytesSinceBoot",tx);
            ActivityManager am=(ActivityManager)context.getSystemService(Context.ACTIVITY_SERVICE);
            ActivityManager.MemoryInfo memory=new ActivityManager.MemoryInfo(); am.getMemoryInfo(memory);
            StatFs disk=new StatFs(Environment.getDataDirectory().getAbsolutePath());
            out.put("connected", true).put("at", System.currentTimeMillis()/1000.0).put("sampleId", monotonic).put("source", "Android nativo");
            out.put("model", Build.MODEL).put("android", Build.VERSION.RELEASE).put("network", network);
            out.put("ram",new JSONObject().put("totalBytes",memory.totalMem).put("availableBytes",memory.availMem).put("lowMemory",memory.lowMemory));
            out.put("storage",new JSONObject().put("totalBytes",disk.getTotalBytes()).put("availableBytes",disk.getAvailableBytes()));
            if (monotonic-appMemoryAt>15000) { appPssKiB=android.os.Debug.getPss(); appMemoryAt=monotonic; }
            if(appPssKiB>=0) out.put("appMemory",new JSONObject().put("pssKiB",appPssKiB).put("scope","main-process"));
            out.put("uptimeSeconds",SystemClock.elapsedRealtime()/1000.0);
        } catch (Exception error) {
            try { out.put("connected",false).put("error","Leitura local indisponível"); } catch(Exception ignored) { }
        }
        return out.toString();
    }
}
