package com.esp32.musicweb;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MediaNotification")
public class MediaNotificationPlugin extends Plugin {
    private static final String TAG = "MediaNotificationPlugin";

    private BroadcastReceiver mediaActionReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getStringExtra("action");
            if (action != null) {
                Log.d(TAG, "Received media action: " + action);
                JSObject data = new JSObject();
                data.put("action", action);
                notifyListeners("mediaAction", data, true);
            }
        }
    };

    @Override
    public void load() {
        super.load();
        
        IntentFilter filter = new IntentFilter("com.esp32.musicweb.MEDIA_ACTION");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(mediaActionReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(mediaActionReceiver, filter);
        }
    }

    @PluginMethod
    public void show(PluginCall call) {
        Intent intent = new Intent(getContext(), MediaNotificationService.class);
        intent.setAction("SHOW");
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
        
        call.resolve();
    }

    @PluginMethod
    public void hide(PluginCall call) {
        Intent intent = new Intent(getContext(), MediaNotificationService.class);
        intent.setAction("HIDE");
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void updateMetadata(PluginCall call) {
        String title = call.getString("title", "FluxAudio");
        String artist = call.getString("artist", "Unknown Artist");
        String album = call.getString("album", "FluxAudio");
        String artwork = call.getString("artwork", "");

        Intent intent = new Intent(getContext(), MediaNotificationService.class);
        intent.setAction("UPDATE_METADATA");
        intent.putExtra("title", title);
        intent.putExtra("artist", artist);
        intent.putExtra("album", album);
        intent.putExtra("artwork", artwork);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }

        call.resolve();
    }

    @PluginMethod
    public void updatePlayback(PluginCall call) {
        boolean isPlaying = call.getBoolean("isPlaying", false);

        Intent intent = new Intent(getContext(), MediaNotificationService.class);
        intent.setAction("UPDATE_PLAYBACK");
        intent.putExtra("isPlaying", isPlaying);
        getContext().startService(intent);

        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        try {
            getContext().unregisterReceiver(mediaActionReceiver);
        } catch (Exception e) {
            // ignore
        }
        super.handleOnDestroy();
    }
}
