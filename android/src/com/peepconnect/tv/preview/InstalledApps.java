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
                Drawable banner = null;
                try { banner = info.activityInfo.loadBanner(pm); } catch (Exception unavailable) { }
                String artwork = null;
                if (banner != null) try {
                    artwork = encodeArtwork(banner, 640, 360);
                    app.put("banner", true);
                } catch (Exception unavailable) { /* A damaged banner may still have a valid icon. */ }
                if (artwork == null && icon != null) try {
                    artwork = encodeArtwork(icon, 384, 384);
                } catch (Exception unavailable) { /* Keep the launchable app even without artwork. */ }
                if (artwork != null) app.put("icon", artwork);
                result.put(app);
            } catch (Exception ignored) { /* One broken icon should not hide the other apps. */ }
        }
        return result.toString();
    }
    private static String encodeArtwork(Drawable artwork, int canvasWidth, int canvasHeight) {
        Bitmap bitmap = Bitmap.createBitmap(canvasWidth, canvasHeight, Bitmap.Config.ARGB_8888);
        int width = Math.max(1, artwork.getIntrinsicWidth()), height = Math.max(1, artwork.getIntrinsicHeight());
        float scale = Math.min((canvasWidth - 16f) / width, (canvasHeight - 16f) / height);
        int drawWidth = Math.max(1, Math.round(width * scale)), drawHeight = Math.max(1, Math.round(height * scale));
        int left = (canvasWidth - drawWidth) / 2, top = (canvasHeight - drawHeight) / 2;
        artwork.setBounds(left, top, left + drawWidth, top + drawHeight);
        artwork.draw(new Canvas(bitmap));
        // Trim transparent resource padding once; preserve visible ink and aspect ratio.
        int[] pixels = new int[canvasWidth * canvasHeight];
        bitmap.getPixels(pixels, 0, canvasWidth, 0, 0, canvasWidth, canvasHeight);
        int x0 = canvasWidth, y0 = canvasHeight, x1 = -1, y1 = -1;
        for (int y = 0; y < canvasHeight; y++) for (int x = 0; x < canvasWidth; x++) {
            if ((pixels[y * canvasWidth + x] >>> 24) > 24) {
                x0 = Math.min(x0, x); y0 = Math.min(y0, y);
                x1 = Math.max(x1, x); y1 = Math.max(y1, y);
            }
        }
        if (x1 >= x0 && y1 >= y0) {
            int inkWidth = x1 - x0 + 1, inkHeight = y1 - y0 + 1;
            float inkScale = Math.min((canvasWidth - 16f) / inkWidth, (canvasHeight - 16f) / inkHeight);
            int targetWidth = Math.round(inkWidth * inkScale), targetHeight = Math.round(inkHeight * inkScale);
            Bitmap normalized = Bitmap.createBitmap(canvasWidth, canvasHeight, Bitmap.Config.ARGB_8888);
            new Canvas(normalized).drawBitmap(bitmap, new Rect(x0, y0, x1 + 1, y1 + 1),
                    new Rect((canvasWidth - targetWidth) / 2, (canvasHeight - targetHeight) / 2,
                            (canvasWidth + targetWidth) / 2, (canvasHeight + targetHeight) / 2),
                    new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG));
            bitmap.recycle(); bitmap = normalized;
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
        bitmap.recycle();
        return "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
    }

}
