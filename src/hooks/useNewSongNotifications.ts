import { useEffect, useCallback } from 'react';
import { SongMeta } from '../types/music';
import { useAppNotifications } from '../contexts/NotificationContext';

const LAST_CHECK_KEY = 'lastNewSongCheck';

export function useNewSongNotifications(
    songs: SongMeta[],
    favoriteArtists: string[],
    favoriteAlbums: { artist: string; album: string }[]
) {
    const { addNotification } = useAppNotifications();

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
            newSongs.forEach(song => {
                const artist = song.tags?.artist || 'Unknown Artist';
                const title = song.tags?.title || song.path.split('/').pop() || 'Unknown';
                addNotification({
                    title: '新曲追加',
                    message: `${artist} の 「${title}」 が追加されました`,
                    type: 'new_song',
                    actionPath: song.path,
                    actionLabel: "再生"
                });
            });
        }

        localStorage.setItem(LAST_CHECK_KEY, now.toString());
    }, [songs, favoriteArtists, favoriteAlbums, addNotification]);

    // Check for new songs periodically
    useEffect(() => {
        if (songs.length > 0 && (favoriteArtists.length > 0 || favoriteAlbums.length > 0)) {
            checkNewSongs();
        }
    }, [songs, favoriteArtists, favoriteAlbums, checkNewSongs]);

    return null;
}
