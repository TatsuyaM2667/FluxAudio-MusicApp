import { useState, useEffect } from 'react';
import { SongMeta } from '../types/music';
import { fetchSongs, fetchMetadataBlob } from '../api';
import { getCachedMetadata, cacheMetadata } from '../utils/db';
import { useOffline } from './useOffline';
import { downloadService } from '../services/DownloadService';
import { platform } from '../utils/platform';

export function useSongs() {
    const [songs, setSongs] = useState<SongMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const isOffline = useOffline();

    useEffect(() => {
        let isCancelled = false;

        const loadSongs = async () => {
            setLoading(true);
            console.log(`[useSongs] Starting load. isOffline=${isOffline}, isNative=${platform.isNative()}`);

            // If offline on native platform, try to load downloaded songs first
            if (isOffline && platform.isNative()) {
                console.log('[useSongs] Offline mode detected, loading downloaded songs...');
                try {
                    // Ensure DownloadService is fully initialized
                    await downloadService.init();
                    console.log('[useSongs] DownloadService initialized');

                    const downloadedSongs = downloadService.getDownloadedSongs();
                    console.log(`[useSongs] Got ${downloadedSongs.length} downloaded songs from service`);

                    if (downloadedSongs.length > 0) {
                        console.log(`[useSongs] ✅ Offline mode: Loading ${downloadedSongs.length} downloaded songs`);
                        setSongs(downloadedSongs);
                        setLoading(false);
                        return; // Don't try to fetch from network
                    } else {
                        console.log('[useSongs] No downloaded songs found in offline mode');
                    }
                } catch (e) {
                    console.error('[useSongs] ❌ Failed to load downloaded songs:', e);
                }
            }

            try {
                const rawList = await fetchSongs();
                if (isCancelled) return;

                const list = rawList.filter(item => !item.path.toLowerCase().endsWith('.mp4'));
                const initialSongs: SongMeta[] = list.map(item => ({
                    path: item.path,
                    tags: {
                        title: item.title || item.path.split('/').pop() || 'Unknown Title',
                        artist: item.artist || 'Unknown Artist',
                        album: item.album,
                        year: item.year,
                        genre: item.genre,
                        duration: item.duration,
                        picture: item.cover ? (
                            typeof item.cover === 'string' ? {
                                format: 'url',
                                data: item.cover
                            } : {
                                format: (item.cover as any).format || (item.cover as any).mime,
                                data: (item.cover as any).data
                            }
                        ) : undefined
                    },
                    loaded: !!item.title,
                    lrcPath: item.lrc,
                    videoPath: item.video,
                    artistImage: item.artistImage
                }));

                setSongs(initialSongs);
                setLoading(false);

                // Fetch metadata for songs that don't have it yet
                for (const song of initialSongs) {
                    if (isCancelled) break;
                    if (song.loaded) continue;
                    if (song.tags?.title && song.tags?.title !== 'Unknown Title' && (song.tags?.picture as any)?.format === 'url') {
                        continue;
                    }

                    try {
                        const cached = await getCachedMetadata(song.path);
                        if (isCancelled) break;

                        if (cached) {
                            setSongs(prev => prev.map(s => s.path === song.path ? { ...s, tags: cached.tags, loaded: true } : s));
                            continue;
                        }

                        await new Promise(r => setTimeout(r, 50));
                        if (isCancelled) break;

                        const blob = await fetchMetadataBlob(song.path);
                        if (isCancelled) break;

                        await new Promise<void>(resolve => {
                            (window as any).jsmediatags.read(blob, {
                                onSuccess: (tag: any) => {
                                    if (isCancelled) { resolve(); return; }
                                    const tags = tag.tags;
                                    cacheMetadata({ path: song.path, tags }).catch(() => { });
                                    setSongs(prev => prev.map(s => s.path === song.path ? { ...s, tags, loaded: true } : s));
                                    resolve();
                                },
                                onError: () => {
                                    if (isCancelled) { resolve(); return; }
                                    setSongs(prev => prev.map(s => s.path === song.path ? { ...s, loaded: true } : s));
                                    resolve();
                                }
                            });
                        });
                    } catch (e) {
                        if (isCancelled) break;
                        setSongs(prev => prev.map(s => s.path === song.path ? { ...s, loaded: true } : s));
                    }
                }

            } catch (err) {
                console.error("Failed to fetch song list", err);

                // Fallback to downloaded songs on native platform when network fails
                if (platform.isNative()) {
                    try {
                        await downloadService.init();
                        const downloadedSongs = downloadService.getDownloadedSongs();
                        if (downloadedSongs.length > 0) {
                            console.log(`[useSongs] Network error fallback: Loading ${downloadedSongs.length} downloaded songs`);
                            setSongs(downloadedSongs);
                        }
                    } catch (e) {
                        console.warn('[useSongs] Failed to load downloaded songs as fallback', e);
                    }
                }

                setLoading(false);
            }
        };

        loadSongs();

        // Removed focus listener to prevent metadata from resetting
        // Users can manually refresh if needed

        return () => {
            isCancelled = true;
        };
    }, [isOffline]); // Reload when offline status changes

    return { songs, loading, setSongs };
}
