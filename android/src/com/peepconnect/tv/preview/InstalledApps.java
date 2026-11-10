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
                Artwork artwork = null;
                if (banner != null) try {
                    artwork = encodeArtwork(banner, BANNER_MAX_WIDTH, BANNER_MAX_HEIGHT);
                    app.put("banner", true);
                } catch (Exception unavailable) { /* A damaged banner may still have a valid icon. */ }
                if (artwork == null && icon != null) try {
                    artwork = encodeArtwork(icon, ICON_MAX_SIZE, ICON_MAX_SIZE);
                } catch (Exception unavailable) { /* Keep the launchable app even without artwork. */ }
                if (artwork != null) {
                    app.put("icon", artwork.dataUri);
                    // Real proportions of the encoded image; the interface never stretches it.
                    app.put("ratio", Math.round(artwork.width * 1000f / artwork.height) / 1000.0);
                    if (artwork.fill != null) app.put("fill", artwork.fill);
                }
                result.put(app);
            } catch (Exception ignored) { /* One broken icon should not hide the other apps. */ }
        }
        return result.toString();
    }
    private static final int BANNER_MAX_WIDTH = 640, BANNER_MAX_HEIGHT = 360, ICON_MAX_SIZE = 384;

    /** Encoded artwork cropped to its visible ink, with its true size and optional edge colour. */
    private static final class Artwork {
        final String dataUri, fill;
        final int width, height;
        Artwork(String dataUri, int width, int height, String fill) {
            this.dataUri = dataUri; this.width = width; this.height = height; this.fill = fill;
        }
    }

    private static Artwork encodeArtwork(Drawable artwork, int maxWidth, int maxHeight) {
        int width = Math.max(1, artwork.getIntrinsicWidth()), height = Math.max(1, artwork.getIntrinsicHeight());
        float scale = Math.min((float) maxWidth / width, (float) maxHeight / height);
        int drawWidth = Math.max(1, Math.round(width * scale)), drawHeight = Math.max(1, Math.round(height * scale));
        Bitmap bitmap = Bitmap.createBitmap(drawWidth, drawHeight, Bitmap.Config.ARGB_8888);
        artwork.setBounds(0, 0, drawWidth, drawHeight);
        artwork.draw(new Canvas(bitmap));
        // Trim transparent resource padding; the result keeps the aspect ratio of the visible art.
        int[] pixels = new int[drawWidth * drawHeight];
        bitmap.getPixels(pixels, 0, drawWidth, 0, 0, drawWidth, drawHeight);
        int x0 = drawWidth, y0 = drawHeight, x1 = -1, y1 = -1;
        for (int y = 0; y < drawHeight; y++) for (int x = 0; x < drawWidth; x++) {
            if ((pixels[y * drawWidth + x] >>> 24) > 24) {
                x0 = Math.min(x0, x); y0 = Math.min(y0, y);
                x1 = Math.max(x1, x); y1 = Math.max(y1, y);
            }
        }
        if (x1 >= x0 && y1 >= y0 && (x0 > 0 || y0 > 0 || x1 < drawWidth - 1 || y1 < drawHeight - 1)) {
            int inkWidth = x1 - x0 + 1, inkHeight = y1 - y0 + 1;
            float inkScale = Math.min((float) maxWidth / inkWidth, (float) maxHeight / inkHeight);
            int targetWidth = Math.max(1, Math.round(inkWidth * inkScale)), targetHeight = Math.max(1, Math.round(inkHeight * inkScale));
            Bitmap trimmed = Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888);
            new Canvas(trimmed).drawBitmap(bitmap, new Rect(x0, y0, x1 + 1, y1 + 1),
                    new Rect(0, 0, targetWidth, targetHeight), new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG));
            bitmap.recycle(); bitmap = trimmed;
            pixels = new int[targetWidth * targetHeight];
            bitmap.getPixels(pixels, 0, targetWidth, 0, 0, targetWidth, targetHeight);
        }
        int outWidth = bitmap.getWidth(), outHeight = bitmap.getHeight();
        String fill = edgeColor(pixels, outWidth, outHeight);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
        bitmap.recycle();
        return new Artwork("data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP), outWidth, outHeight, fill);
    }

    /** Average colour of the image border, only when the art is opaque there; otherwise null. */
    private static String edgeColor(int[] pixels, int width, int height) {
        long red = 0, green = 0, blue = 0;
        int opaque = 0, total = 0;
        for (int y = 0; y < height; y++) {
            boolean border = y == 0 || y == height - 1;
            for (int x = 0; x < width; x += border ? 1 : Math.max(1, width - 1)) {
                int pixel = pixels[y * width + x];
                total++;
                if ((pixel >>> 24) >= 240) {
                    opaque++;
                    red += (pixel >> 16) & 0xff; green += (pixel >> 8) & 0xff; blue += pixel & 0xff;
                }
            }
        }
        if (total == 0 || opaque * 10 < total * 9) return null;
        return String.format(java.util.Locale.US, "#%02x%02x%02x", red / opaque, green / opaque, blue / opaque);
    }
}
