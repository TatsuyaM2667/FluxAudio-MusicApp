import { useState, useEffect, useCallback } from 'react';
import { SongMeta } from '../types/music';

interface NewSongNotification {
    id: string;
    songPath: string;
    songTitle: string;
    artist: string;
    album?: string;
    date: number;
    read: boolean;
}

const NOTIFICATION_STORAGE_KEY = 'newSongNotifications';
const LAST_CHECK_KEY = 'lastNewSongCheck';

export function useNewSongNotifications(
    songs: SongMeta[],
    favoriteArtists: string[],
    favoriteAlbums: { artist: string; album: string }[]
) {
    const [notifications, setNotifications] = useState<NewSongNotification[]>(() => {
        const saved = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });

    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
        setUnreadCount(notifications.filter(n => !n.read).length);
    }, [notifications]);

    // Check for new songs from favorite artists/albums
    const checkNewSongs = useCallback(() => {
        const lastCheck = parseInt(localStorage.getItem(LAST_CHECK_KEY) || '0');
        const now = Date.now();

        // Find songs added since last check
        const newSongs = songs.filter(song => {
            // Check if song has a date and it's after last check
            if (!song.date || song.date <= lastCheck) return false;

            const artist = song.tags?.artist;
            const album = song.tags?.album;

            // Check if artist is in favorites
            if (artist && favoriteArtists.includes(artist)) return true;

            // Check if album is in favorites
            if (artist && album) {
                return favoriteAlbums.some(fa => fa.artist === artist && fa.album === album);
            }

            return false;
        });

        if (newSongs.length > 0) {
            const newNotifications: NewSongNotification[] = newSongs.map(song => ({
                id: `${song.path}-${Date.now()}`,
                songPath: song.path,
                songTitle: song.tags?.title || song.path.split('/').pop() || 'Unknown',
                artist: song.tags?.artist || 'Unknown Artist',
                album: song.tags?.album,
                date: song.date || Date.now(),
                read: false
            }));

            setNotifications(prev => [...newNotifications, ...prev].slice(0, 100)); // Keep max 100 notifications

            // Show browser notification if supported
            if ('Notification' in window && Notification.permission === 'granted') {
                newSongs.forEach(song => {
                    new Notification('新曲追加!', {
                        body: `${song.tags?.artist}: ${song.tags?.title}`,
                        icon: '/icon-192x192.png',
                        tag: song.path
                    });
                });
            }
        }

        localStorage.setItem(LAST_CHECK_KEY, now.toString());
    }, [songs, favoriteArtists, favoriteAlbums]);

    // Request notification permission
    const requestNotificationPermission = useCallback(async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }, []);

    // Mark notification as read
    const markAsRead = useCallback((id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    }, []);

    // Mark all as read
    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    // Clear all notifications
    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    // Check for new songs periodically
    useEffect(() => {
        if (songs.length > 0 && (favoriteArtists.length > 0 || favoriteAlbums.length > 0)) {
            checkNewSongs();
        }
    }, [songs, favoriteArtists, favoriteAlbums, checkNewSongs]);

    return {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        requestNotificationPermission,
        checkNewSongs
    };
}
