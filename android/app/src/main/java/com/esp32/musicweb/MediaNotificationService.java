package com.esp32.musicweb;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.IBinder;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Base64;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

public class MediaNotificationService extends Service {
    private static final String TAG = "MediaNotification";
    private static final String CHANNEL_ID = "flux_audio_media";
    private static final int NOTIFICATION_ID = 1001;

    public static final String ACTION_PLAY = "com.esp32.musicweb.ACTION_PLAY";
    public static final String ACTION_PAUSE = "com.esp32.musicweb.ACTION_PAUSE";
    public static final String ACTION_NEXT = "com.esp32.musicweb.ACTION_NEXT";
    public static final String ACTION_PREV = "com.esp32.musicweb.ACTION_PREV";
    public static final String ACTION_STOP = "com.esp32.musicweb.ACTION_STOP";

    private MediaSessionCompat mediaSession;
    private NotificationManager notificationManager;
    private boolean isPlaying = false;

    // Current metadata
    private String title = "FluxAudio";
    private String artist = "Unknown Artist";
    private String album = "FluxAudio";
    private Bitmap artwork = null;

    private BroadcastReceiver controlReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (action == null) return;

            Log.d(TAG, "Received action: " + action);

            switch (action) {
                case ACTION_PLAY:
                    isPlaying = true;
                    updateNotification();
                    sendEventToWebView("play");
                    break;
                case ACTION_PAUSE:
                    isPlaying = false;
                    updateNotification();
                    sendEventToWebView("pause");
                    break;
                case ACTION_NEXT:
                    sendEventToWebView("next");
                    break;
                case ACTION_PREV:
                    sendEventToWebView("previous");
                    break;
                case ACTION_STOP:
                    stopSelf();
                    break;
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Service created");

        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();
        initMediaSession();

        IntentFilter filter = new IntentFilter();
        filter.addAction(ACTION_PLAY);
        filter.addAction(ACTION_PAUSE);
        filter.addAction(ACTION_NEXT);
        filter.addAction(ACTION_PREV);
        filter.addAction(ACTION_STOP);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(controlReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(controlReceiver, filter);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();

            if ("UPDATE_METADATA".equals(action)) {
                title = intent.getStringExtra("title");
                artist = intent.getStringExtra("artist");
                album = intent.getStringExtra("album");

                String artworkBase64 = intent.getStringExtra("artwork");
                if (artworkBase64 != null && !artworkBase64.isEmpty()) {
                    try {
                        // Remove data URI prefix if present
                        if (artworkBase64.contains(",")) {
                            artworkBase64 = artworkBase64.substring(artworkBase64.indexOf(",") + 1);
                        }
                        byte[] decodedBytes = Base64.decode(artworkBase64, Base64.DEFAULT);
                        artwork = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to decode artwork", e);
                        artwork = null;
                    }
                }

                updateMediaSession();
                updateNotification();

            } else if ("UPDATE_PLAYBACK".equals(action)) {
                isPlaying = intent.getBooleanExtra("isPlaying", false);
                updatePlaybackState();
                updateNotification();

            } else if ("SHOW".equals(action)) {
                startForeground(NOTIFICATION_ID, buildNotification());

            } else if ("HIDE".equals(action)) {
                stopForeground(true);
                stopSelf();
            }
        }

        return START_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Media Playback",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Controls for media playback");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            notificationManager.createNotificationChannel(channel);
        }
    }

    private void initMediaSession() {
        mediaSession = new MediaSessionCompat(this, "FluxAudioSession");
        mediaSession.setActive(true);

        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                isPlaying = true;
                updateNotification();
                sendEventToWebView("play");
            }

            @Override
            public void onPause() {
                isPlaying = false;
                updateNotification();
                sendEventToWebView("pause");
            }

            @Override
            public void onSkipToNext() {
                sendEventToWebView("next");
            }

            @Override
            public void onSkipToPrevious() {
                sendEventToWebView("previous");
            }

            @Override
            public void onStop() {
                stopSelf();
            }
        });

        updatePlaybackState();
    }

    private void updateMediaSession() {
        MediaMetadataCompat.Builder builder = new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title != null ? title : "Unknown")
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist != null ? artist : "Unknown")
                .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, album != null ? album : "FluxAudio");

        if (artwork != null) {
            builder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, artwork);
        }

        mediaSession.setMetadata(builder.build());
    }

    private void updatePlaybackState() {
        PlaybackStateCompat.Builder stateBuilder = new PlaybackStateCompat.Builder()
                .setActions(
                        PlaybackStateCompat.ACTION_PLAY |
                        PlaybackStateCompat.ACTION_PAUSE |
                        PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                        PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                        PlaybackStateCompat.ACTION_PLAY_PAUSE
                )
                .setState(
                        isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                        PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN,
                        isPlaying ? 1.0f : 0f
                );

        mediaSession.setPlaybackState(stateBuilder.build());
    }

    private Notification buildNotification() {
        Intent mainIntent = new Intent(this, MainActivity.class);
        mainIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(this, 0, mainIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Create action intents
        PendingIntent prevIntent = PendingIntent.getBroadcast(this, 0,
                new Intent(ACTION_PREV), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent playPauseIntent = PendingIntent.getBroadcast(this, 1,
                new Intent(isPlaying ? ACTION_PAUSE : ACTION_PLAY),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent nextIntent = PendingIntent.getBroadcast(this, 2,
                new Intent(ACTION_NEXT), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentTitle(title != null ? title : "FluxAudio")
                .setContentText(artist != null ? artist : "Unknown Artist")
                .setSubText(album)
                .setContentIntent(contentIntent)
                .setDeleteIntent(PendingIntent.getBroadcast(this, 3,
                        new Intent(ACTION_STOP), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE))
                .addAction(android.R.drawable.ic_media_previous, "Previous", prevIntent)
                .addAction(isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                        isPlaying ? "Pause" : "Play", playPauseIntent)
                .addAction(android.R.drawable.ic_media_next, "Next", nextIntent)
                .setStyle(new MediaStyle()
                        .setMediaSession(mediaSession.getSessionToken())
                        .setShowActionsInCompactView(0, 1, 2))
                .setOngoing(isPlaying)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_TRANSPORT);

        if (artwork != null) {
            builder.setLargeIcon(artwork);
        }

        return builder.build();
    }

    private void updateNotification() {
        updatePlaybackState();
        notificationManager.notify(NOTIFICATION_ID, buildNotification());
    }

    private void sendEventToWebView(String action) {
        // Send event back to WebView via broadcast
        Intent intent = new Intent("com.esp32.musicweb.MEDIA_ACTION");
        intent.putExtra("action", action);
        sendBroadcast(intent);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            unregisterReceiver(controlReceiver);
        } catch (Exception e) {
            // ignore
        }
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
        }
    }
}
