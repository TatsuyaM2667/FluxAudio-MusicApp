/**
 * PWA Download Service
 * Uses IndexedDB to store audio files as Blobs for offline playback
 * when running as a PWA (Safari, Firefox, Chrome "Add to Home Screen").
 */
import { SongMeta } from '../types/music';
import { API_BASE } from '../config';

const DB_NAME = 'fluxaudio-downloads';
const DB_VERSION = 1;
const AUDIO_STORE = 'audio_files';
const INDEX_STORE = 'download_index';
const LRC_STORE = 'lrc_files';

export interface PwaDownloadedEntry {
    originalPath: string;
    mimeType: string;
    tags?: any;
    artistImage?: string;
    lrcPath?: string | null;
    videoPath?: string | null;
    downloadedAt: number;
}

type DownloadChangeListener = () => void;

class PwaDownloadService {
    private downloadedMap: Map<string, PwaDownloadedEntry> = new Map();
    private initialized = false;
    private initPromise: Promise<void> | null = null;
    private listeners: Set<DownloadChangeListener> = new Set();
    private db: IDBDatabase | null = null;

    // Progress Tracking
    private _downloadingCount = 0;
    private _totalToDownload = 0;

    private openDB(): Promise<IDBDatabase> {
        if (this.db) return Promise.resolve(this.db);

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = (e.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(AUDIO_STORE)) {
                    db.createObjectStore(AUDIO_STORE); // key = originalPath
                }
                if (!db.objectStoreNames.contains(INDEX_STORE)) {
                    db.createObjectStore(INDEX_STORE, { keyPath: 'originalPath' });
                }
                if (!db.objectStoreNames.contains(LRC_STORE)) {
                    db.createObjectStore(LRC_STORE); // key = originalPath
                }
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(request.result);
            };

            request.onerror = () => reject(request.error);
        });
    }

    async init(): Promise<void> {
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;

        console.log('[PwaDownloadService] Starting initialization...');

        this.initPromise = (async () => {
            try {
                const db = await this.openDB();

                // Load index from IndexedDB
                const entries = await new Promise<PwaDownloadedEntry[]>((resolve, reject) => {
                    const tx = db.transaction(INDEX_STORE, 'readonly');
                    const store = tx.objectStore(INDEX_STORE);
                    const request = store.getAll();
                    request.onsuccess = () => resolve(request.result || []);
                    request.onerror = () => reject(request.error);
                });

                entries.forEach(entry => {
                    this.downloadedMap.set(entry.originalPath, entry);
                });

                console.log(`[PwaDownloadService] ✅ Loaded ${this.downloadedMap.size} songs from IndexedDB`);
            } catch (e) {
                console.error('[PwaDownloadService] Init failed:', e);
            } finally {
                this.initialized = true;
                console.log('[PwaDownloadService] Initialization complete.');
            }
        })();

        return this.initPromise;
    }

    isDownloaded(path: string): boolean {
        return this.downloadedMap.has(path);
    }

    getDownloadedPaths(): string[] {
        return Array.from(this.downloadedMap.keys());
    }

    getDownloadedSongs(): SongMeta[] {
        return Array.from(this.downloadedMap.values()).map(entry => ({
            path: entry.originalPath,
            tags: entry.tags || { title: entry.originalPath.split('/').pop() },
            loaded: true,
            lrcPath: entry.lrcPath || null,
            videoPath: entry.videoPath || undefined,
            artistImage: entry.artistImage
        }));
    }

    addListener(listener: DownloadChangeListener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    get progress() {
        return {
            remaining: this._downloadingCount,
            total: this._totalToDownload
        };
    }

    resetProgress() {
        this._downloadingCount = 0;
        this._totalToDownload = 0;
        this.notifyListeners();
    }

    setTotalToDownload(count: number) {
        this._totalToDownload = count;
        this._downloadingCount = count;
        this.notifyListeners();
    }

    private notifyListeners() {
        this.listeners.forEach(l => l());
    }

    async getOfflineUrl(path: string): Promise<string | null> {
        const entry = this.downloadedMap.get(path);
        if (!entry) return null;

        // If Service Worker is active and controlling the page, use the intercepted URL
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            return `/__offline_audio__/${encodeURIComponent(path)}`;
        }

        // Fallback: use Object URL (may cause memory issues or instability on iOS, but works if SW is not ready)
        try {
            const cache = await caches.open('fluxaudio-media-v1');
            const res = await cache.match(`/__offline_audio__/${encodeURIComponent(path)}`);
            if (res) {
                const blob = await res.blob();
                return URL.createObjectURL(blob);
            }
            
            // Backward compatibility with older IndexedDB stored songs
            const db = await this.openDB();
            const blobDB = await new Promise<Blob | undefined>((resolve, reject) => {
                const tx = db.transaction(AUDIO_STORE, 'readonly');
                const store = tx.objectStore(AUDIO_STORE);
                const request = store.get(path);
                request.onsuccess = () => resolve(request.result as Blob | undefined);
                request.onerror = () => reject(request.error);
            });

            if (!blobDB) return null;
            return URL.createObjectURL(blobDB);
        } catch (e) {
            console.error('[PwaDownloadService] getOfflineUrl failed:', e);
            return null;
        }
    }

    async getOfflineVideo(path: string): Promise<string | null> {
        const entry = this.downloadedMap.get(path);
        if (!entry || !entry.videoPath) return null;

        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            return `/__offline_video__/${encodeURIComponent(entry.videoPath)}`;
        }

        try {
            const cache = await caches.open('fluxaudio-media-v1');
            const res = await cache.match(`/__offline_video__/${encodeURIComponent(entry.videoPath)}`);
            if (res) {
                const blob = await res.blob();
                return URL.createObjectURL(blob);
            }
        } catch (e) {
            console.error('[PwaDownloadService] getOfflineVideo failed:', e);
        }
        return null;
    }

    async getOfflineLrc(path: string): Promise<string | null> {
        const entry = this.downloadedMap.get(path);
        if (!entry || !entry.lrcPath) return null;

        try {
            const cache = await caches.open('fluxaudio-media-v1');
            const res = await cache.match(`/__offline_lrc__/${encodeURIComponent(path)}`);
            if (res) return await res.text();

            // Backward compatibility
            const db = await this.openDB();
            const lrcText = await new Promise<string | undefined>((resolve, reject) => {
                const tx = db.transaction(LRC_STORE, 'readonly');
                const store = tx.objectStore(LRC_STORE);
                const request = store.get(path);
                request.onsuccess = () => resolve(request.result as string | undefined);
                request.onerror = () => reject(request.error);
            });

            return lrcText || null;
        } catch (e) {
            console.warn('[PwaDownloadService] getOfflineLrc failed:', e);
            return null;
        }
    }

    async downloadSong(song: SongMeta, withVideo: boolean = false): Promise<void> {
        if (!this.initialized) await this.init();
        if (this.isDownloaded(song.path)) return;

        this._downloadingCount++;
        if (this._totalToDownload === 0) this._totalToDownload = 1;
        this.notifyListeners();

        try {
            const db = await this.openDB();

            // Use Cache API instead of IndexedDB for storing Binary
            const MEDIA_CACHE = 'fluxaudio-media-v1';
            const cache = await caches.open(MEDIA_CACHE);

            // Download audio as Response and cache it
            const audioUrl = song.path.startsWith('http') ? song.path : `${API_BASE}${song.path}`;
            const audioRes = await fetch(audioUrl);
            if (!audioRes.ok) throw new Error(`Failed to fetch audio: ${audioRes.status}`);
            
            await cache.put(`/__offline_audio__/${encodeURIComponent(song.path)}`, audioRes.clone());
            const audioBlob = await audioRes.blob(); // needed for mimeType

            // Download LRC if available
            let hasLrc = false;
            if (song.lrcPath) {
                const lrcUrl = song.lrcPath.startsWith('http') ? song.lrcPath : `${API_BASE}${song.lrcPath}`;
                try {
                    const lrcRes = await fetch(lrcUrl);
                    if (lrcRes.ok) {
                        await cache.put(`/__offline_lrc__/${encodeURIComponent(song.path)}`, lrcRes.clone());
                        hasLrc = true;
                    }
                } catch (e) {
                    console.warn('[PwaDownloadService] LRC download failed:', e);
                }
            }

            let hasVideo = false;
            if (withVideo && song.videoPath) {
                const videoUrl = song.videoPath.startsWith('http') ? song.videoPath : `${API_BASE}${song.videoPath}`;
                try {
                    const videoRes = await fetch(videoUrl);
                    if (videoRes.ok) {
                        await cache.put(`/__offline_video__/${encodeURIComponent(song.videoPath)}`, videoRes.clone());
                        hasVideo = true;
                    }
                } catch (e) {
                    console.warn('[PwaDownloadService] Video download failed:', e);
                }
            }

            // Store index entry
            const entry: PwaDownloadedEntry = {
                originalPath: song.path,
                mimeType: audioBlob.type || 'audio/mpeg',
                tags: song.tags,
                artistImage: song.artistImage,
                lrcPath: hasLrc ? song.lrcPath : null,
                videoPath: hasVideo ? song.videoPath : null,
                downloadedAt: Date.now()
            };

            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(INDEX_STORE, 'readwrite');
                const store = tx.objectStore(INDEX_STORE);
                const request = store.put(entry);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            this.downloadedMap.set(song.path, entry);
            console.log(`[PwaDownloadService] ✅ Downloaded: ${song.tags?.title || song.path}`);

        } finally {
            this._downloadingCount--;
            if (this._downloadingCount === 0) {
                this._totalToDownload = 0;
            }
            this.notifyListeners();
        }
    }

    async deleteSong(path: string): Promise<void> {
        if (!this.initialized) await this.init();
        if (!this.downloadedMap.has(path)) return;

        try {
            const db = await this.openDB();

            // Delete audio cache
            const cache = await caches.open('fluxaudio-media-v1');
            await cache.delete(`/__offline_audio__/${encodeURIComponent(path)}`);
            await cache.delete(`/__offline_lrc__/${encodeURIComponent(path)}`);
            if (this.downloadedMap.get(path)?.videoPath) {
                await cache.delete(`/__offline_video__/${encodeURIComponent(this.downloadedMap.get(path)!.videoPath!)}`);
            }

            // Backward compat delete
            try {
                await new Promise<void>((resolve, reject) => {
                    const tx = db.transaction(AUDIO_STORE, 'readwrite');
                    const store = tx.objectStore(AUDIO_STORE);
                    const request = store.delete(path);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            } catch(e) {}

            try {
                await new Promise<void>((resolve, reject) => {
                    const tx = db.transaction(LRC_STORE, 'readwrite');
                    const store = tx.objectStore(LRC_STORE);
                    const request = store.delete(path);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            } catch (e) {}

            // Delete index entry
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(INDEX_STORE, 'readwrite');
                const store = tx.objectStore(INDEX_STORE);
                const request = store.delete(path);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            this.downloadedMap.delete(path);
            this.notifyListeners();
            console.log(`[PwaDownloadService] 🗑️ Deleted: ${path}`);
        } catch (e) {
            console.error('[PwaDownloadService] Delete failed:', e);
        }
    }

    /** Get storage usage estimate */
    async getStorageEstimate(): Promise<{ used: number; quota: number } | null> {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            return {
                used: estimate.usage || 0,
                quota: estimate.quota || 0
            };
        }
        return null;
    }

    /** Request persistent storage (prevents browser from evicting data) */
    async requestPersistentStorage(): Promise<boolean> {
        if (navigator.storage && navigator.storage.persist) {
            const granted = await navigator.storage.persist();
            console.log(`[PwaDownloadService] Persistent storage ${granted ? 'granted' : 'denied'}`);
            return granted;
        }
        return false;
    }
}

export const pwaDownloadService = new PwaDownloadService();
