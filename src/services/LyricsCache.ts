import { fetchLyrics } from '../api';
import { downloadService } from './DownloadService';

/**
 * LyricsCache — In-memory + persistent cache for lyrics (.lrc) content.
 * 
 * Supports cache invalidation when lrcPath changes (file updated/deleted).
 * Stores lrcPath alongside cached data to detect changes.
 */
class LyricsCacheService {
    // In-memory cache: songPath -> { lrc, lrcPath }
    private cache = new Map<string, { lrc: string | null; lrcPath: string | null }>();

    // Track in-flight fetches to avoid duplicate requests
    private inflight = new Map<string, Promise<string | null>>();

    // IndexedDB store name for persistent lyrics cache
    private readonly DB_NAME = 'music-db';
    private readonly STORE_NAME = 'lyrics_cache';
    private readonly DB_VERSION = 2;
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
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'path' });
                }
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
     * Returns the stored entry or undefined if not found.
     */
    private async getFromDB(path: string): Promise<{ lrc: string | null; lrcPath: string | null } | undefined> {
        try {
            const db = await this.openDB();
            return new Promise((resolve) => {
                const tx = db.transaction(this.STORE_NAME, 'readonly');
                const store = tx.objectStore(this.STORE_NAME);
                const request = store.get(path);
                request.onsuccess = () => {
                    const result = request.result;
                    if (result) {
                        resolve({ lrc: result.lrc, lrcPath: result.lrcPath ?? null });
                    } else {
                        resolve(undefined);
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
    private async saveToDB(path: string, lrc: string | null, lrcPath: string | null): Promise<void> {
        try {
            const db = await this.openDB();
            return new Promise((resolve) => {
                const tx = db.transaction(this.STORE_NAME, 'readwrite');
                const store = tx.objectStore(this.STORE_NAME);
                store.put({ path, lrc, lrcPath, cachedAt: Date.now() });
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch {
            // Silently fail — cache is optional
        }
    }

    /**
     * Delete a specific entry from IndexedDB cache.
     */
    private async deleteFromDB(path: string): Promise<void> {
        try {
            const db = await this.openDB();
            return new Promise((resolve) => {
                const tx = db.transaction(this.STORE_NAME, 'readwrite');
                const store = tx.objectStore(this.STORE_NAME);
                store.delete(path);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch {
            // Silently fail
        }
    }

    /**
     * Get lyrics for a song. Checks caches in order:
     *   1. In-memory cache (instant) — only if lrcPath matches
     *   2. IndexedDB cache (fast) — only if lrcPath matches
     *   3. Offline local file (for downloaded songs)
     *   4. Network fetch (slow)
     * 
     * If lrcPath has changed since last cache, invalidates and re-fetches.
     */
    async get(
        songPath: string,
        lrcPath?: string | null,
        isOffline = false,
    ): Promise<string | null> {
        const normalizedLrcPath = lrcPath ?? null;

        // 1. In-memory cache (instant return) — validate lrcPath
        if (this.cache.has(songPath)) {
            const entry = this.cache.get(songPath)!;
            if (entry.lrcPath === normalizedLrcPath) {
                return entry.lrc;
            }
            // lrcPath changed → invalidate
            console.log(`[LyricsCache] lrcPath changed for ${songPath}, invalidating cache`);
            this.cache.delete(songPath);
            this.deleteFromDB(songPath);
        }

        // 2. Check if there's already an in-flight request for this song
        if (this.inflight.has(songPath)) {
            return this.inflight.get(songPath)!;
        }

        // Create a single promise for this fetch and store it
        const fetchPromise = this.fetchAndCache(songPath, normalizedLrcPath, isOffline);
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
        lrcPath: string | null,
        isOffline: boolean,
    ): Promise<string | null> {
        // 2. IndexedDB cache — validate lrcPath matches
        const dbEntry = await this.getFromDB(songPath);
        if (dbEntry !== undefined) {
            if (dbEntry.lrcPath === lrcPath) {
                // Cache hit with matching lrcPath
                this.cache.set(songPath, dbEntry);
                return dbEntry.lrc;
            }
            // lrcPath changed → remove stale entry
            console.log(`[LyricsCache] DB lrcPath mismatch for ${songPath}, re-fetching`);
            this.deleteFromDB(songPath);
        }

        // 3. Handle no-lyrics case early
        if (!lrcPath) {
            const entry = { lrc: null, lrcPath: null };
            this.cache.set(songPath, entry);
            this.saveToDB(songPath, null, null);
            return null;
        }

        // 4. Offline local file (downloaded songs)
        if (downloadService.isDownloaded(songPath)) {
            try {
                const localLrc = await downloadService.getOfflineLrc(songPath);
                if (localLrc) {
                    const entry = { lrc: localLrc, lrcPath };
                    this.cache.set(songPath, entry);
                    this.saveToDB(songPath, localLrc, lrcPath);
                    return localLrc;
                }
            } catch {
                // Fall through to network
            }
        }

        // 5. If offline and nothing found locally, give up
        if (isOffline) {
            const entry = { lrc: null, lrcPath };
            this.cache.set(songPath, entry);
            return null;
        }

        // 6. Network fetch
        try {
            const lrc = await fetchLyrics(songPath, lrcPath);
            const entry = { lrc, lrcPath };
            this.cache.set(songPath, entry);
            this.saveToDB(songPath, lrc, lrcPath);
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
            const normalizedLrcPath = song.lrcPath ?? null;

            // Skip if already correctly cached or in-flight
            if (this.inflight.has(song.path)) continue;
            if (this.cache.has(song.path)) {
                const entry = this.cache.get(song.path)!;
                if (entry.lrcPath === normalizedLrcPath) continue;
                // lrcPath changed, re-fetch
            }

            // Fire-and-forget
            this.get(song.path, song.lrcPath, isOffline).catch(() => { });
        }
    }

    /**
     * Invalidate cache entries for songs that are no longer in the song list,
     * or whose lrcPath has changed. Call this after fetching a fresh song list.
     */
    syncWithSongList(songs: Array<{ path: string; lrcPath?: string | null }>): void {
        const songMap = new Map(songs.map(s => [s.path, s.lrcPath ?? null]));

        // Invalidate memory cache entries for removed songs or changed lrcPaths
        for (const [path, entry] of this.cache) {
            if (!songMap.has(path)) {
                // Song no longer exists → remove cache
                console.log(`[LyricsCache] Song removed: ${path}, clearing cache`);
                this.cache.delete(path);
                this.deleteFromDB(path);
            } else {
                const newLrcPath = songMap.get(path)!;
                if (entry.lrcPath !== newLrcPath) {
                    // lrcPath changed → invalidate
                    console.log(`[LyricsCache] lrcPath updated for ${path}, clearing cache`);
                    this.cache.delete(path);
                    this.deleteFromDB(path);
                }
            }
        }
    }

    /**
     * Invalidate cache for a specific song.
     */
    invalidate(songPath: string): void {
        this.cache.delete(songPath);
        this.inflight.delete(songPath);
        this.deleteFromDB(songPath);
    }

    /**
     * Clear all in-memory cache (e.g., on logout or memory pressure).
     */
    clear(): void {
        this.cache.clear();
        this.inflight.clear();
    }

    /**
     * Clear all cache including IndexedDB.
     */
    async clearAll(): Promise<void> {
        this.cache.clear();
        this.inflight.clear();
        try {
            const db = await this.openDB();
            return new Promise((resolve) => {
                const tx = db.transaction(this.STORE_NAME, 'readwrite');
                const store = tx.objectStore(this.STORE_NAME);
                store.clear();
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch {
            // Silently fail
        }
    }

    /** Check if lyrics are in memory cache with valid lrcPath */
    has(songPath: string, lrcPath?: string | null): boolean {
        if (!this.cache.has(songPath)) return false;
        const entry = this.cache.get(songPath)!;
        return entry.lrcPath === (lrcPath ?? null);
    }

    /** Get lyrics synchronously from memory cache only (returns undefined if not cached or stale) */
    getSync(songPath: string, lrcPath?: string | null): string | null | undefined {
        const entry = this.cache.get(songPath);
        if (!entry) return undefined;
        if (entry.lrcPath !== (lrcPath ?? null)) return undefined; // Stale
        return entry.lrc;
    }
}

export const lyricsCache = new LyricsCacheService();
