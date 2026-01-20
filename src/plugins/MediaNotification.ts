import { registerPlugin } from '@capacitor/core';

export interface MediaNotificationPlugin {
    show(): Promise<void>;
    hide(): Promise<void>;
    updateMetadata(options: {
        title?: string;
        artist?: string;
        album?: string;
        artwork?: string;
    }): Promise<void>;
    updatePlayback(options: { isPlaying: boolean }): Promise<void>;
    addListener(
        eventName: 'mediaAction',
        listenerFunc: (event: { action: string }) => void
    ): Promise<{ remove: () => Promise<void> }>;
}

const MediaNotification = registerPlugin<MediaNotificationPlugin>('MediaNotification');

export default MediaNotification;
