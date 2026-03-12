import { useState, useEffect, useCallback } from 'react';
import { downloadManager } from '../services/DownloadManager';

export function useDownloads() {
    // Start with empty set, will be populated after init
    const [downloadedPaths, setDownloadedPaths] = useState<Set<string>>(new Set());
    const [progress, setProgress] = useState(downloadManager.progress);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        let isMounted = true;

        // Ensure service is initialized before reading state
        const initAndSync = async () => {
            try {
                await downloadManager.init();
                if (isMounted) {
                    const paths = downloadManager.getDownloadedPaths();
                    console.log('[useDownloads] Initialized with', paths.length, 'downloaded songs');
                    setDownloadedPaths(new Set(paths));
                    setProgress(downloadManager.progress);
                    setIsReady(true);
                }
            } catch (e) {
                console.error('[useDownloads] Init failed:', e);
                if (isMounted) setIsReady(true); // Still mark ready to prevent infinite loading
            }
        };

        initAndSync();

        const update = () => {
            if (isMounted) {
                const paths = downloadManager.getDownloadedPaths();
                console.log('[useDownloads] Update triggered, paths:', paths.length);
                setDownloadedPaths(new Set(paths));
                setProgress(downloadManager.progress);
            }
        };

        const cleanup = downloadManager.addListener(update);

        return () => {
            isMounted = false;
            cleanup();
        };
    }, []);

    const isDownloaded = useCallback((path: string) => downloadedPaths.has(path), [downloadedPaths]);

    return { downloadedPaths, isDownloaded, progress, isReady };
}
