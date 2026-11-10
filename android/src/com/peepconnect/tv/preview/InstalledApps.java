package com.peepconnect.tv.preview;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Rect;
import android.graphics.Paint;
import android.graphics.drawable.Drawable;
import android.util.Base64;
import android.util.DisplayMetrics;
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
                try {
                    int resource = info.getIconResource();
                    if (resource != 0) icon = pm.getResourcesForApplication(info.activityInfo.applicationInfo)
                            .getDrawableForDensity(resource, DisplayMetrics.DENSITY_XXXHIGH, null);
                } catch (Exception unavailable) { /* Retain the package's default artwork. */ }
                if (icon != null) {
                    Bitmap bitmap = Bitmap.createBitmap(384, 384, Bitmap.Config.ARGB_8888);
                    Canvas canvas = new Canvas(bitmap);
                    int width = Math.max(1, icon.getIntrinsicWidth());
                    int height = Math.max(1, icon.getIntrinsicHeight());
                    float scale = 336f / Math.max(width, height);
                    int drawWidth = Math.max(1, Math.round(width * scale));
                    int drawHeight = Math.max(1, Math.round(height * scale));
                    int left = (384 - drawWidth) / 2, top = (384 - drawHeight) / 2;
                    icon.setBounds(left, top, left + drawWidth, top + drawHeight);
                    icon.draw(canvas);
                    // Some package drawables include a very large transparent canvas.
                    // Normalize visible ink once, without stretching or clipping the logo.
                    int[] pixels = new int[384 * 384];
                    bitmap.getPixels(pixels, 0, 384, 0, 0, 384, 384);
                    int x0 = 384, y0 = 384, x1 = -1, y1 = -1;
                    for (int y = 0; y < 384; y++) for (int x = 0; x < 384; x++) {
                        if ((pixels[y * 384 + x] >>> 24) > 24) {
                            x0 = Math.min(x0, x); y0 = Math.min(y0, y);
                            x1 = Math.max(x1, x); y1 = Math.max(y1, y);
                        }
                    }
                    if (x1 >= x0 && y1 >= y0) {
                        int inkWidth = x1 - x0 + 1, inkHeight = y1 - y0 + 1;
                        float inkScale = 352f / Math.max(inkWidth, inkHeight);
                        int targetWidth = Math.round(inkWidth * inkScale), targetHeight = Math.round(inkHeight * inkScale);
                        Bitmap normalized = Bitmap.createBitmap(384, 384, Bitmap.Config.ARGB_8888);
                        new Canvas(normalized).drawBitmap(bitmap, new Rect(x0, y0, x1 + 1, y1 + 1),
                                new Rect((384 - targetWidth) / 2, (384 - targetHeight) / 2,
                                        (384 + targetWidth) / 2, (384 + targetHeight) / 2),
                                new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG));
                        bitmap.recycle(); bitmap = normalized;
                    }
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
