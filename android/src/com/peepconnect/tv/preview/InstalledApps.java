package com.peepconnect.tv.preview;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class InstalledApps {
    private InstalledApps() { }

    static String list(Context context) {
        PackageManager pm = context.getPackageManager();
        Map<String, ResolveInfo> apps = new LinkedHashMap<>();
        for (String category : new String[]{Intent.CATEGORY_LEANBACK_LAUNCHER, Intent.CATEGORY_LAUNCHER}) {
            Intent intent = new Intent(Intent.ACTION_MAIN).addCategory(category);
            List<ResolveInfo> matches = pm.queryIntentActivities(intent, 0);
            for (ResolveInfo info : matches) {
                if (info.activityInfo != null && info.activityInfo.applicationInfo != null
                        && !context.getPackageName().equals(info.activityInfo.packageName)) {
                    apps.putIfAbsent(info.activityInfo.packageName, info);
                }
            }
        }
        JSONArray result = new JSONArray();
        for (Map.Entry<String, ResolveInfo> entry : apps.entrySet()) {
            try {
                ResolveInfo info = entry.getValue();
                JSONObject app = new JSONObject();
                app.put("package", entry.getKey());
                CharSequence label = info.loadLabel(pm);
                app.put("name", label == null ? entry.getKey() : label.toString());
                Drawable icon = info.loadIcon(pm);
                if (icon != null) {
                    Bitmap bitmap = Bitmap.createBitmap(192, 192, Bitmap.Config.ARGB_8888);
                    Canvas canvas = new Canvas(bitmap);
                    icon.setBounds(0, 0, 192, 192);
                    icon.draw(canvas);
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    bitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
                    app.put("icon", "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP));
                    bitmap.recycle();
                }
                result.put(app);
            } catch (Exception ignored) { /* One broken icon should not hide the other apps. */ }
        }
        return result.toString();
    }
}
