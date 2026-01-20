import { useState, useEffect } from 'react';
import { downloadService } from '../services/DownloadService';

export function useDownloads() {
    const [downloadedPaths, setDownloadedPaths] = useState<Set<string>>(new Set(downloadService.getDownloadedPaths()));
    const [progress, setProgress] = useState(downloadService.progress);

    useEffect(() => {
        // Ensure service is initialized
        downloadService.init().then(() => {
            setDownloadedPaths(new Set(downloadService.getDownloadedPaths()));
            setProgress(downloadService.progress);
        });

        const update = () => {
            setDownloadedPaths(new Set(downloadService.getDownloadedPaths()));
            setProgress(downloadService.progress);
        };

        const cleanup = downloadService.addListener(update);
        return () => { cleanup(); };
    }, []);

    const isDownloaded = (path: string) => downloadedPaths.has(path);

    return { downloadedPaths, isDownloaded, progress };
}
