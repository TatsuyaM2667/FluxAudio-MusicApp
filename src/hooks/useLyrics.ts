import { useState, useEffect } from 'react';
import { SongMeta } from '../types/music';
import { fetchLyrics } from '../api';
import { downloadService } from '../services/DownloadService';
import { useOffline } from './useOffline';

export function useLyrics(current: SongMeta | null) {
    const [currentLyrics, setCurrentLyrics] = useState<string | null>(null);
    const isOffline = useOffline();

    useEffect(() => {
        const loadLyrics = async () => {
            if (!current) {
                setCurrentLyrics(null);
                return;
            }

            // Check offline first if downloaded
            if (downloadService.isDownloaded(current.path)) {
                const localLrc = await downloadService.getOfflineLrc(current.path);
                if (localLrc) {
                    setCurrentLyrics(localLrc);
                    return;
                }
            }

            if (isOffline) {
                // If offline and not found in local, return null
                setCurrentLyrics(null);
                return;
            }

            const lrcPath = current.lrcPath;
            fetchLyrics(current.path, lrcPath).then(lrc => setCurrentLyrics(lrc));
        };
        loadLyrics();
    }, [current, isOffline]);

    return currentLyrics;
}
