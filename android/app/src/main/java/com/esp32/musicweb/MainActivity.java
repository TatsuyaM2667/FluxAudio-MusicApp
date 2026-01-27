package com.esp32.musicweb;

import android.os.Bundle;
import android.os.Build;
import android.graphics.Color;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MediaNotificationPlugin.class);
        super.onCreate(savedInstanceState);
        
        Window window = getWindow();
        
        // Enable edge-to-edge display
        WindowCompat.setDecorFitsSystemWindows(window, false);
        
        // Set system bars to transparent
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);
        
        // Use light/dark icons based on content
        WindowInsetsControllerCompat insetsController = 
            WindowCompat.getInsetsController(window, window.getDecorView());
        if (insetsController != null) {
            insetsController.setAppearanceLightStatusBars(false);
            insetsController.setAppearanceLightNavigationBars(false);
        }
    }
}
