package com.peepconnect.tv.preview;

import android.Manifest;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothClass;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

/** Local observation only: no discovery, pairing, location or network access. */
final class BluetoothStatus {
    private final Activity activity;
    private final BluetoothAdapter adapter;
    private final Map<Integer, BluetoothProfile> profiles = new HashMap<>();
    private final Map<String, BluetoothDevice> observed = new LinkedHashMap<>();
    private boolean registered = false;
    private int pending = 0;
    private boolean started = false;
    private boolean closed = false;

    BluetoothStatus(Activity owner) {
        activity = owner;
        BluetoothManager manager = (BluetoothManager) owner.getSystemService(Context.BLUETOOTH_SERVICE);
        adapter = manager == null ? null : manager.getAdapter();
    }

    private boolean allowed() {
        return Build.VERSION.SDK_INT < 31 || activity.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
    }

    private void changed() {
        if (activity instanceof MainActivity) ((MainActivity) activity).notifyBluetooth();
    }

    private final BroadcastReceiver receiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            if (!allowed()) return;
            String action = intent.getAction();
            BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
            synchronized (BluetoothStatus.this) {
                if (BluetoothAdapter.ACTION_STATE_CHANGED.equals(action)) {
                    if (intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.STATE_OFF) == BluetoothAdapter.STATE_OFF) observed.clear();
                } else if (device != null) {
                    int transport = intent.getIntExtra("android.bluetooth.device.extra.TRANSPORT", 0);
                    String key = device.getAddress() + "/" + transport;
                    if (BluetoothDevice.ACTION_ACL_CONNECTED.equals(action)) observed.put(key, device);
                    if (BluetoothDevice.ACTION_ACL_DISCONNECTED.equals(action)) {
                        if (transport == 0) observed.entrySet().removeIf(e -> e.getKey().startsWith(device.getAddress() + "/"));
                        else observed.remove(key);
                    }
                }
            }
            changed();
        }
    };

    private final BluetoothProfile.ServiceListener listener = new BluetoothProfile.ServiceListener() {
        @Override public void onServiceConnected(int id, BluetoothProfile proxy) {
            synchronized (BluetoothStatus.this) { if (closed) { try { adapter.closeProfileProxy(id, proxy); } catch (RuntimeException ignored) { } return; } profiles.put(id, proxy); pending = Math.max(0, pending - 1); }
            changed();
        }
        @Override public void onServiceDisconnected(int id) {
            synchronized (BluetoothStatus.this) { profiles.remove(id); }
            changed();
        }
    };

    synchronized void start() {
        if (closed || adapter == null || !allowed() || started) return;
        started = true;
        IntentFilter filter = new IntentFilter();
        filter.addAction(BluetoothDevice.ACTION_ACL_CONNECTED);
        filter.addAction(BluetoothDevice.ACTION_ACL_DISCONNECTED);
        filter.addAction(BluetoothAdapter.ACTION_STATE_CHANGED);
        try {
            // Bluetooth system broadcasts originate from the privileged Bluetooth app.
            if (Build.VERSION.SDK_INT >= 33) activity.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED);
            else activity.registerReceiver(receiver, filter);
            registered = true;
        } catch (RuntimeException unavailable) { }
        // 4 (HID host), 11 (audio sink) and 16 (headset client) are optional TV
        // profiles in AOSP. No reflection/hidden methods; unsupported profiles fail safely.
        int[] ids = Build.VERSION.SDK_INT >= 33 ? new int[]{1,2,4,11,16,21,22} : new int[]{1,2,4,11,16,21};
        for (int id : ids) {
            try { pending++; if (!adapter.getProfileProxy(activity, listener, id)) pending--; }
            catch (RuntimeException unsupported) { pending = Math.max(0, pending - 1); }
        }
    }

    private JSONObject deviceJSON(BluetoothDevice device) throws Exception {
        String name = device.getName();
        if (name == null || name.trim().isEmpty()) name = "Dispositivo Bluetooth";
        if (name.length() > 80) name = name.substring(0,80);
        String kind = "Acessório";
        BluetoothClass type = device.getBluetoothClass();
        if (type != null) {
            switch (type.getMajorDeviceClass()) {
                case BluetoothClass.Device.Major.AUDIO_VIDEO: kind = "Áudio"; break;
                case BluetoothClass.Device.Major.PERIPHERAL: kind = "Controle ou dispositivo de entrada"; break;
                case BluetoothClass.Device.Major.COMPUTER: kind = "Computador"; break;
                case BluetoothClass.Device.Major.PHONE: kind = "Celular"; break;
            }
        }
        return new JSONObject().put("name", name).put("kind", kind);
    }

    synchronized String snapshot() {
        JSONObject out = new JSONObject();
        try {
            out.put("devices", new JSONArray()).put("paired", new JSONArray());
            if (adapter == null) return out.put("state", "unsupported").toString();
            if (!allowed()) return out.put("state", "permission").toString();
            if (!adapter.isEnabled()) return out.put("state", "off").toString();
            Map<String, BluetoothDevice> connected = new LinkedHashMap<>();
            for (BluetoothDevice device : observed.values()) connected.put(device.getAddress(), device);
            for (BluetoothProfile profile : profiles.values()) {
                try { for (BluetoothDevice device : profile.getConnectedDevices()) connected.put(device.getAddress(), device); }
                catch (RuntimeException unavailable) { }
            }
            BluetoothManager manager = (BluetoothManager) activity.getSystemService(Context.BLUETOOTH_SERVICE);
            if (manager != null) {
                for (int id : new int[]{BluetoothProfile.GATT, BluetoothProfile.GATT_SERVER}) {
                    try { for (BluetoothDevice device : manager.getConnectedDevices(id)) connected.put(device.getAddress(), device); }
                    catch (RuntimeException unavailable) { }
                }
            }
            JSONArray active = new JSONArray(), paired = new JSONArray();
            for (BluetoothDevice device : connected.values()) active.put(deviceJSON(device));
            for (BluetoothDevice device : adapter.getBondedDevices()) if (!connected.containsKey(device.getAddress())) paired.put(deviceJSON(device));
            out.put("devices", active).put("paired", paired).put("state", !started || (pending > 0 && profiles.isEmpty()) ? "loading" : "ready");
        } catch (SecurityException denied) {
            observed.clear();
            try { out.put("state", "permission").put("devices", new JSONArray()).put("paired", new JSONArray()); } catch (Exception ignored) { }
        } catch (Exception unavailable) {
            try { out.put("state", "error").put("devices", new JSONArray()).put("paired", new JSONArray()); } catch (Exception ignored) { }
        }
        return out.toString();
    }

    void requestAccess() {
        activity.runOnUiThread(() -> {
            if (!allowed()) activity.requestPermissions(new String[]{Manifest.permission.BLUETOOTH_CONNECT}, 1313);
            else { start(); changed(); }
        });
    }

    void openSettings() {
        activity.runOnUiThread(() -> {
            try { activity.startActivity(new Intent(Settings.ACTION_BLUETOOTH_SETTINGS)); }
            catch (RuntimeException unavailable) {
                try { activity.startActivity(new Intent(Settings.ACTION_SETTINGS)); } catch (RuntimeException ignored) { }
            }
        });
    }

    synchronized void close() {
        closed = true;
        if (registered) { try { activity.unregisterReceiver(receiver); } catch (RuntimeException ignored) { } registered = false; }
        if (adapter != null) for (Map.Entry<Integer,BluetoothProfile> entry : profiles.entrySet()) {
            try { adapter.closeProfileProxy(entry.getKey(), entry.getValue()); } catch (RuntimeException ignored) { }
        }
        profiles.clear(); observed.clear(); started = false;
    }
}
