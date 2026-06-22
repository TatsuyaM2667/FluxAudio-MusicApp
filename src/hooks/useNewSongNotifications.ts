import { useEffect, useCallback, useMemo } from 'react';
import { SongMeta } from '../types/music';
import { useAppNotifications } from '../contexts/NotificationContext';
import { splitArtists } from '../utils/searchUtils';

const LAST_CHECK_KEY = 'lastNewSongCheck';

export function useNewSongNotifications(
    songs: SongMeta[],
    favoriteArtists: string[],
    favoriteAlbums: { artist: string; album: string }[]
) {
    const { addNotification } = useAppNotifications();
    const favoriteArtistSet = useMemo(() => new Set(favoriteArtists), [favoriteArtists]);
    const favoriteAlbumSet = useMemo(() => {
        const set = new Set<string>();
        favoriteAlbums.forEach(album => set.add(`${album.artist}\u0000${album.album}`));
        return set;
    }, [favoriteAlbums]);

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
            if (artist) {
                if (splitArtists(artist).some(name => favoriteArtistSet.has(name))) return true;
            }

            // Check if album is in favorites
            if (artist && album) {
                return favoriteAlbumSet.has(`${artist}\u0000${album}`);
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
    }, [songs, favoriteArtistSet, favoriteAlbumSet, addNotification]);

    // Check for new songs periodically
    useEffect(() => {
        if (songs.length > 0 && (favoriteArtistSet.size > 0 || favoriteAlbumSet.size > 0)) {
            checkNewSongs();
        }
    }, [songs, favoriteArtistSet, favoriteAlbumSet, checkNewSongs]);

    return null;
}
