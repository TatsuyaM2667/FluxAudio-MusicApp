import { useState, useEffect, useCallback } from 'react';
import { SongMeta } from '../types/music';
import { fetchSongs } from '../api';
import { useOffline } from './useOffline';
import { downloadManager } from '../services/DownloadManager';
import { platform } from '../utils/platform';
import { lyricsCache } from '../services/LyricsCache';

export function useSongs() {
    const [songs, setSongs] = useState<SongMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const isOffline = useOffline();
    const [refreshKey, setRefreshKey] = useState(0);

    const refresh = useCallback(() => {
        console.log('[useSongs] Manual refresh triggered');
        lyricsCache.clear(); // Clear in-memory lyrics cache on refresh
        setRefreshKey(prev => prev + 1);
    }, []);

    useEffect(() => {
        let isCancelled = false;

        const loadSongs = async () => {
            setLoading(true);
            console.log(`[useSongs] Starting load. isOffline=${isOffline}, isNative=${platform.isNative()}`);

            // If offline on native platform, try to load downloaded songs first
            if (isOffline && platform.isDownloadSupported()) {
                console.log('[useSongs] Offline mode detected, loading downloaded songs...');
                try {
                    // Ensure DownloadManager is fully initialized
                    await downloadManager.init();
                    console.log('[useSongs] DownloadManager initialized');

                    const downloadedSongs = downloadManager.getDownloadedSongs();
                    console.log(`[useSongs] Got ${downloadedSongs.length} downloaded songs from manager`);

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

                const list = rawList.filter((item: any) => !item.path.toLowerCase().endsWith('.mp4'));
                const initialSongs: SongMeta[] = list.map((item: any) => {
                    // fetchSongs() already maps data into { tags: { title, artist, picture, ... }, lrc, video, ... }
                    // Use tags if present (mapped data), otherwise fall back to flat fields (raw data)
                    const tags = item.tags || {};
                    const title = tags.title || item.title || item.path.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Unknown Title';
                    const artist = tags.artist || item.artist || 'Unknown Artist';
                    const album = tags.album || item.album;
                    const year = tags.year || item.year;
                    const genre = tags.genre || item.genre;
                    const duration = tags.duration || item.duration;
                    const rawPicture = tags.picture || item.cover;

                    let picture: any = undefined;
                    if (rawPicture) {
                        if (typeof rawPicture === 'string') {
                            picture = { format: 'url', data: rawPicture };
                        } else if (rawPicture.format || rawPicture.mime) {
                            picture = {
                                format: rawPicture.format || rawPicture.mime,
                                data: rawPicture.data
                            };
                        }
                    }

                    return {
                        path: item.path,
                        tags: { title, artist, album, year, genre, duration, picture },
                        loaded: !!title,
                        lrcPath: item.lrc || item.lrcPath || null,
                        videoPath: item.video || item.videoPath || undefined,
                        artistImage: item.artistImage,
                        date: item.date || tags.date || 0
                    };
                });

                setSongs(initialSongs);
                setLoading(false);

                // Sync lyrics cache: invalidate entries for removed songs or changed lrcPaths
                lyricsCache.syncWithSongList(
                    initialSongs.map(s => ({ path: s.path, lrcPath: s.lrcPath }))
                );

                // --- ID3タグの一括フェッチループを完全削除 ---
                // 全曲のMP3をダウンロードしてクライアントで解析する処理はフリーズの原因になるため廃止しました。
                // 今後は再生時にのみタグを取得する、またはサーバーサイドであらかじめタグを抽出したmusic_index.jsonを利用するアプローチになります。
                // ------------------------------------------

            } catch (err) {
                console.error("Failed to fetch song list", err);

                // Fallback to downloaded songs on native platform when network fails
                if (platform.isDownloadSupported()) {
                    try {
                        await downloadManager.init();
                        const downloadedSongs = downloadManager.getDownloadedSongs();
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
    }, [isOffline, refreshKey]); // Reload when offline status changes or manual refresh

    return { songs, loading, setSongs, refresh };
}
