import { useState, useEffect, useRef } from 'react';
import { SongMeta } from '../types/music';
import { lyricsCache } from '../services/LyricsCache';
import { useOffline } from './useOffline';

export function useLyrics(
    current: SongMeta | null,
    queue?: SongMeta[],
) {
    const [currentLyrics, setCurrentLyrics] = useState<string | null>(null);
    const isOffline = useOffline();
    const prevPathRef = useRef<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadLyrics = async () => {
            if (!current) {
                setCurrentLyrics(null);
                prevPathRef.current = null;
                return;
            }

            // If same song, don't re-fetch
            if (prevPathRef.current === current.path) return;
            prevPathRef.current = current.path;

            // Instant return from memory cache
            const cached = lyricsCache.getSync(current.path);
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

            // Prefetch next songs' lyrics in the background
            if (queue && queue.length > 0) {
                // Prefetch up to 3 upcoming songs
                const prefetchTargets = queue
                    .slice(0, 3)
                    .filter(s => s.path !== current.path)
                    .map(s => ({ path: s.path, lrcPath: s.lrcPath }));

                if (prefetchTargets.length > 0) {
                    lyricsCache.prefetch(prefetchTargets, isOffline);
                }
            }
        };

        loadLyrics();

        return () => {
            cancelled = true;
        };
    }, [current, isOffline, queue]);

    return currentLyrics;
}
