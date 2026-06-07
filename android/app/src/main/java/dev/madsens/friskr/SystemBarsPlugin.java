package dev.madsens.friskr;

import android.graphics.Color;
import android.os.Build;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SystemBars")
public class SystemBarsPlugin extends Plugin {
    @PluginMethod
    public void setTheme(PluginCall call) {
        boolean dark = call.getBoolean("dark", false);
        String background = call.getString("background", dark ? "#0D1310" : "#F4F1E8");

        getActivity().runOnUiThread(() -> {
            try {
                Window window = getActivity().getWindow();
                int color = Color.parseColor(background);
                window.setStatusBarColor(color);
                window.setNavigationBarColor(color);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    window.setNavigationBarDividerColor(color);
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    window.setStatusBarContrastEnforced(false);
                    window.setNavigationBarContrastEnforced(false);
                }

                WindowInsetsControllerCompat controller =
                    WindowCompat.getInsetsController(window, window.getDecorView());
                controller.setAppearanceLightStatusBars(!dark);
                controller.setAppearanceLightNavigationBars(!dark);

                JSObject result = new JSObject();
                result.put("dark", dark);
                call.resolve(result);
            } catch (Exception error) {
                call.reject("Could not update Android system bars", error);
            }
        });
    }
}
