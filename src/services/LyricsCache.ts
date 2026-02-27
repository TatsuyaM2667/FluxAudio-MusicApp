import { fetchLyrics } from '../api';
import { downloadService } from './DownloadService';

/**
 * LyricsCache — In-memory + persistent cache for lyrics (.lrc) content.
 * 
 * Eliminates repeated network fetches for already-viewed lyrics
 * and supports prefetching next songs' lyrics for instant display.
 */
class LyricsCacheService {
    // In-memory cache: songPath -> lrc text (or null if no lyrics)
    private cache = new Map<string, string | null>();

    // Track in-flight fetches to avoid duplicate requests
    private inflight = new Map<string, Promise<string | null>>();

    // IndexedDB store name for persistent lyrics cache
    private readonly DB_NAME = 'music-db';
    private readonly STORE_NAME = 'lyrics_cache';
    private readonly DB_VERSION = 2; // Bump version to add new store
    private db: IDBDatabase | null = null;

    /**
     * Open IndexedDB, upgrading schema if needed to include lyrics_cache store.
     */
    private async openDB(): Promise<IDBDatabase> {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = (e.target as IDBOpenDBRequest).result;
                // Keep existing 'metadata' store
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'path' });
                }
                // Create lyrics cache store
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME, { keyPath: 'path' });
                }
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(request.result);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get lyrics from persistent (IndexedDB) cache.
     */
    private async getFromDB(path: string): Promise<string | null | undefined> {
        try {
            const db = await this.openDB();
            return new Promise((resolve) => {
                const tx = db.transaction(this.STORE_NAME, 'readonly');
                const store = tx.objectStore(this.STORE_NAME);
                const request = store.get(path);
                request.onsuccess = () => {
                    const result = request.result;
                    if (result) {
                        resolve(result.lrc); // string | null
                    } else {
                        resolve(undefined); // Not in DB
                    }
                };
                request.onerror = () => resolve(undefined);
            });
        } catch {
            return undefined;
        }
    }

    /**
     * Save lyrics to persistent (IndexedDB) cache.
     */
    private async saveToDB(path: string, lrc: string | null): Promise<void> {
        try {
            const db = await this.openDB();
            return new Promise((resolve) => {
                const tx = db.transaction(this.STORE_NAME, 'readwrite');
                const store = tx.objectStore(this.STORE_NAME);
                store.put({ path, lrc, cachedAt: Date.now() });
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch {
            // Silently fail — cache is optional
        }
    }

    /**
     * Get lyrics for a song. Checks caches in order:
     *   1. In-memory cache (instant)
     *   2. IndexedDB cache (fast, ~1-5ms)
     *   3. Offline local file (for downloaded songs)
     *   4. Network fetch (slow)
     * 
     * Returns the cached/fetched lrc string, or null if none.
     */
    async get(
        songPath: string,
        lrcPath?: string | null,
        isOffline = false,
    ): Promise<string | null> {
        // 1. In-memory cache (instant return)
        if (this.cache.has(songPath)) {
            return this.cache.get(songPath)!;
        }

        // 2. Check if there's already an in-flight request for this song
        if (this.inflight.has(songPath)) {
            return this.inflight.get(songPath)!;
        }

        // Create a single promise for this fetch and store it
        const fetchPromise = this.fetchAndCache(songPath, lrcPath, isOffline);
        this.inflight.set(songPath, fetchPromise);

        try {
            const result = await fetchPromise;
            return result;
        } finally {
            this.inflight.delete(songPath);
        }
    }

    private async fetchAndCache(
        songPath: string,
        lrcPath?: string | null,
        isOffline = false,
    ): Promise<string | null> {
        // 2. IndexedDB cache
        const dbResult = await this.getFromDB(songPath);
        if (dbResult !== undefined) {
            this.cache.set(songPath, dbResult);
            return dbResult;
        }

        // 3. Offline local file (downloaded songs)
        if (downloadService.isDownloaded(songPath)) {
            try {
                const localLrc = await downloadService.getOfflineLrc(songPath);
                if (localLrc) {
                    this.cache.set(songPath, localLrc);
                    // Save to IndexedDB for faster access next time
                    this.saveToDB(songPath, localLrc);
                    return localLrc;
                }
            } catch {
                // Fall through to network
            }
        }

        // 4. If offline and nothing found locally, give up
        if (isOffline) {
            this.cache.set(songPath, null);
            return null;
        }

        // 5. Network fetch
        try {
            const lrc = await fetchLyrics(songPath, lrcPath);
            this.cache.set(songPath, lrc);
            // Persist to IndexedDB
            this.saveToDB(songPath, lrc);
            return lrc;
        } catch {
            return null;
        }
    }

    /**
     * Prefetch lyrics for one or more songs in the background.
     * Does not return the result — just populates the cache.
     */
    prefetch(songs: Array<{ path: string; lrcPath?: string | null }>, isOffline = false): void {
        for (const song of songs) {
            // Skip if already cached or in-flight
            if (this.cache.has(song.path) || this.inflight.has(song.path)) continue;
            // Fire-and-forget
            this.get(song.path, song.lrcPath, isOffline).catch(() => { });
        }
    }

    /**
     * Clear the in-memory cache (e.g., on logout or memory pressure).
     */
    clear(): void {
        this.cache.clear();
        this.inflight.clear();
    }

    /** Check if lyrics are already in memory cache */
    has(songPath: string): boolean {
        return this.cache.has(songPath);
    }

    /** Get lyrics synchronously from memory cache only (returns undefined if not cached) */
    getSync(songPath: string): string | null | undefined {
        return this.cache.get(songPath);
    }
}

export const lyricsCache = new LyricsCacheService();
