import { useState, useEffect } from 'react';
import { SongMeta } from '../types/music';
import { lyricsCache } from '../services/LyricsCache';
import { useOffline } from './useOffline';

export function useLyrics(
    current: SongMeta | null,
    queue?: SongMeta[],
) {
    const [currentLyrics, setCurrentLyrics] = useState<string | null>(null);
    const isOffline = useOffline();

    useEffect(() => {
        let cancelled = false;

        const loadLyrics = async () => {
            if (!current) {
                setCurrentLyrics(null);
                return;
            }

            // Instant return from memory cache (validates lrcPath)
            const cached = lyricsCache.getSync(current.path, current.lrcPath);
            if (cached !== undefined) {
                setCurrentLyrics(cached);
            } else {
                // Show null while loading (avoids flash of old lyrics)
                setCurrentLyrics(null);
            }

            // Fetch (will be instant if already cached, otherwise network)
            const lrc = await lyricsCache.get(
                current.path,
                current.lrcPath,
                isOffline,
            );

            if (!cancelled) {
                setCurrentLyrics(lrc);
            }
        };

        loadLyrics();

        return () => {
            cancelled = true;
        };
    }, [current?.path, current?.lrcPath, isOffline]);

    useEffect(() => {
        if (!current || !queue || queue.length === 0) return;

        const prefetchTargets = queue
            .slice(0, 3)
            .filter(s => s.path !== current.path)
            .map(s => ({ path: s.path, lrcPath: s.lrcPath }));

        if (prefetchTargets.length > 0) {
            lyricsCache.prefetch(prefetchTargets, isOffline);
        }
    }, [current?.path, isOffline, queue]);

    return currentLyrics;
}
