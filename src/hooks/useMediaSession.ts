import { useEffect, useRef, useCallback } from 'react';
import { SongMeta, Picture } from '../types/music';
import { Capacitor } from '@capacitor/core';
import MediaNotification from '../plugins/MediaNotification';

export function useMediaSession(
    current: SongMeta | null,
    isPlaying: boolean,
    duration: number,
    currentTime: number,
    performNext: () => void,
    performPrev: () => void,
    getAlbumArt: (picture?: Picture) => string | null,
    setIsPlaying: (playing: boolean) => void
) {
    const isNative = Capacitor.isNativePlatform();

    // Use Refs for handlers to keep them fresh
    const performNextRef = useRef(performNext);
    const performPrevRef = useRef(performPrev);
    const setIsPlayingRef = useRef(setIsPlaying);
    const isPlayingRef = useRef(isPlaying);

    useEffect(() => { performNextRef.current = performNext; }, [performNext]);
    useEffect(() => { performPrevRef.current = performPrev; }, [performPrev]);
    useEffect(() => { setIsPlayingRef.current = setIsPlaying; }, [setIsPlaying]);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

    // Handle events from native notification controls
    const handleMediaAction = useCallback((event: { action: string }) => {
        console.log("Media action from notification:", event.action);
        switch (event.action) {
            case 'play':
                setIsPlayingRef.current(true);
                break;
            case 'pause':
                setIsPlayingRef.current(false);
                break;
            case 'next':
                performNextRef.current();
                break;
            case 'previous':
                performPrevRef.current();
                break;
        }
    }, []);

    // Setup native listener
    useEffect(() => {
        if (!isNative) return;

        let listenerHandle: { remove: () => Promise<void> } | null = null;

        MediaNotification.addListener('mediaAction', handleMediaAction)
            .then(handle => {
                listenerHandle = handle;
            })
            .catch(e => console.error("Failed to add media action listener:", e));

        return () => {
            if (listenerHandle) {
                listenerHandle.remove().catch(() => { });
            }
        };
    }, [isNative, handleMediaAction]);

    // Show/hide notification when song starts/stops
    useEffect(() => {
        if (!isNative) return;

        if (current) {
            MediaNotification.show().catch(e => console.error("Failed to show notification:", e));
        } else {
            MediaNotification.hide().catch(e => console.error("Failed to hide notification:", e));
        }

        return () => {
            // Hide on cleanup (component unmount)
        };
    }, [current, isNative]);

    // Update metadata when song changes
    useEffect(() => {
        if (!current) return;

        const tags = current.tags || {};

        if (isNative) {
            // Get artwork as Base64
            let artwork: string | undefined = undefined;
            if (tags.picture) {
                const art = getAlbumArt(tags.picture);
                if (art) {
                    artwork = art;
                }
            }

            MediaNotification.updateMetadata({
                title: tags.title || 'Unknown Title',
                artist: tags.artist || 'Unknown Artist',
                album: tags.album || 'FluxAudio',
                artwork: artwork,
            }).catch(e => console.error("Failed to update metadata:", e));
        } else {
            // Web: Use standard MediaSession API
            if (!('mediaSession' in navigator)) return;

            const artworkList: MediaImage[] = [];
            if (tags.picture) {
                const art = getAlbumArt(tags.picture);
                if (art) {
                    artworkList.push({ src: art, sizes: '512x512', type: tags.picture.format || 'image/jpeg' });
                }
            }

            try {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: tags.title || 'FluxAudio Playing',
                    artist: tags.artist || 'Unknown Artist',
                    album: tags.album || 'FluxAudio',
                    artwork: artworkList
                });
            } catch (e) {
                console.error("MediaSession metadata error", e);
            }
        }
    }, [current, isNative, getAlbumArt]);

    // Update playback state
    useEffect(() => {
        if (!current) return;

        if (isNative) {
            MediaNotification.updatePlayback({ isPlaying })
                .catch(e => console.error("Failed to update playback:", e));
        } else {
            if ('mediaSession' in navigator) {
                try {
                    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
                    if (Number.isFinite(duration) && duration > 0 && Number.isFinite(currentTime)) {
                        navigator.mediaSession.setPositionState({
                            duration: duration,
                            playbackRate: isPlaying ? 1 : 0,
                            position: currentTime
                        });
                    }
                } catch (e) { /* ignore */ }
            }
        }
    }, [isPlaying, duration, currentTime, current, isNative]);

    // Web: Setup action handlers once
    useEffect(() => {
        if (isNative || !('mediaSession' in navigator)) return;

        const actionHandlers = [
            ['play', () => setIsPlayingRef.current(true)],
            ['pause', () => setIsPlayingRef.current(false)],
            ['previoustrack', () => performPrevRef.current()],
            ['nexttrack', () => performNextRef.current()],
        ] as const;

        for (const [action, handler] of actionHandlers) {
            try {
                navigator.mediaSession.setActionHandler(action, handler);
            } catch (e) { /* ignore */ }
        }
    }, [isNative]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isNative) {
                MediaNotification.hide().catch(() => { });
            }
        };
    }, [isNative]);
}
