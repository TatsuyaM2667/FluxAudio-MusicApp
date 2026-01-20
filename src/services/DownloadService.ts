import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { SongMeta } from '../types/music';
import { API_BASE } from '../config';

const DOWNLOAD_INDEX_FILE = 'downloaded_index.json';
const AUDIO_DIR = 'audio';

export interface DownloadedEntry {
    originalPath: string; // Remote path e.g. "music/Album/Song.mp3"
    localAudioPath: string; // Local filename e.g. "timestamp-song.mp3"
    localLrcPath?: string | null;
    localCoverPath?: string | null;
    tags?: any; // Store partial tags for offline reconstruction
    artistImage?: string;
    downloadedAt: number;
}

type DownloadChangeListener = () => void;

class DownloadService {
    private downloadedMap: Map<string, DownloadedEntry> = new Map();
    private initialized = false;
    private initPromise: Promise<void> | null = null;
    private listeners: Set<DownloadChangeListener> = new Set();

    // Progress Tracking
    private _downloadingCount = 0;
    private _totalToDownload = 0;

    constructor() {
        // Don't auto-init in constructor to avoid issues
        // Init will be called explicitly when needed
    }

    async init(): Promise<void> {
        // If already initialized, return immediately
        if (this.initialized) {
            console.log('[DownloadService] Already initialized, map size:', this.downloadedMap.size);
            return;
        }

        // If initialization is in progress, wait for it
        if (this.initPromise) {
            console.log('[DownloadService] Waiting for existing init promise...');
            return this.initPromise;
        }

        console.log('[DownloadService] Starting initialization...');

        this.initPromise = (async () => {
            try {
                // Create audio directory if not exists
                try {
                    await Filesystem.mkdir({
                        path: AUDIO_DIR,
                        directory: Directory.Data,
                        recursive: true
                    });
                    console.log('[DownloadService] Audio directory ready');
                } catch (mkdirErr: any) {
                    // Directory might already exist, which is fine
                    if (!mkdirErr?.message?.includes('exists')) {
                        console.warn('[DownloadService] mkdir warning:', mkdirErr);
                    }
                }

                // Try to read existing index
                try {
                    console.log('[DownloadService] Reading index file...');
                    const ret = await Filesystem.readFile({
                        path: DOWNLOAD_INDEX_FILE,
                        directory: Directory.Data,
                        encoding: Encoding.UTF8
                    });

                    const dataStr = ret.data as string;
                    console.log('[DownloadService] Index file content length:', dataStr?.length || 0);

                    if (dataStr && dataStr.length > 0) {
                        const data = JSON.parse(dataStr);
                        if (Array.isArray(data)) {
                            data.forEach((entry: DownloadedEntry) => {
                                this.downloadedMap.set(entry.originalPath, entry);
                            });
                            console.log(`[DownloadService] ✅ Loaded ${this.downloadedMap.size} songs from index`);
                        } else {
                            console.warn('[DownloadService] Index data is not an array:', typeof data);
                        }
                    }
                } catch (readErr: any) {
                    console.warn("[DownloadService] No existing index found or read error:", readErr?.message || readErr);
                }
            } catch (e) {
                console.error("[DownloadService] Init failed:", e);
            } finally {
                this.initialized = true;
                // Don't reset initPromise here to prevent race conditions
                console.log('[DownloadService] Initialization complete. Songs loaded:', this.downloadedMap.size);
            }
        })();

        return this.initPromise;
    }

    async saveIndex(): Promise<void> {
        try {
            const dataToSave = Array.from(this.downloadedMap.values());
            const jsonData = JSON.stringify(dataToSave);
            console.log(`[DownloadService] Saving index with ${dataToSave.length} songs (${jsonData.length} bytes)`);

            await Filesystem.writeFile({
                path: DOWNLOAD_INDEX_FILE,
                data: jsonData,
                directory: Directory.Data,
                encoding: Encoding.UTF8
            });

            console.log('[DownloadService] ✅ Index saved successfully');
        } catch (e) {
            console.error("[DownloadService] ❌ Failed to save index:", e);
        }
    }

    isDownloaded(path: string): boolean {
        return this.downloadedMap.has(path);
    }

    getDownloadedPaths(): string[] {
        return Array.from(this.downloadedMap.keys());
    }

    getDownloadedSongs(): SongMeta[] {
        return Array.from(this.downloadedMap.values()).map(entry => {
            return {
                path: entry.originalPath,
                tags: entry.tags || { title: entry.originalPath.split('/').pop() },
                loaded: true,
                lrcPath: entry.localLrcPath ? `offline:${entry.localLrcPath}` : null, // Handle offline LRC properly if needed, but for now just indicator
                artistImage: entry.artistImage
            };
        });
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

    private notifyListeners() {
        this.listeners.forEach(l => l());
    }

    async getOfflineUrl(path: string): Promise<string | null> {
        const entry = this.downloadedMap.get(path);
        if (!entry) return null;

        const ret = await Filesystem.getUri({
            path: `${AUDIO_DIR}/${entry.localAudioPath}`,
            directory: Directory.Data
        });

        return Capacitor.convertFileSrc(ret.uri);
    }

    async getOfflineLrc(path: string): Promise<string | null> {
        const entry = this.downloadedMap.get(path);
        if (!entry || !entry.localLrcPath) return null;

        try {
            const ret = await Filesystem.readFile({
                path: `${AUDIO_DIR}/${entry.localLrcPath}`,
                directory: Directory.Data,
                encoding: Encoding.UTF8
            });
            return ret.data as string;
        } catch (e) {
            console.warn('Failed to read local LRC', e);
            return null;
        }
    }

    private async downloadFile(url: string, filename: string): Promise<string> {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}`);
        const blob = await response.blob();
        const base64 = await this.blobToBase64(blob);

        await Filesystem.writeFile({
            path: `${AUDIO_DIR}/${filename}`,
            data: base64,
            directory: Directory.Data
        });

        return filename;
    }

    private blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onload = () => {
                const result = reader.result as string;
                // remove "data:*/*;base64," prefix
                resolve(result.split(',')[1]);
            };
            reader.readAsDataURL(blob);
        });
    }

    async downloadSong(song: SongMeta): Promise<void> {
        if (!this.initialized) await this.init();
        if (this.isDownloaded(song.path)) return; // Already downloaded

        // Progress management is usually handled by the caller incrementing total,
        // but simple "one by one" logic can just be tracked here?
        // Actually, let's just use a simple counter for active downloads
        this._downloadingCount++;
        if (this._totalToDownload === 0) this._totalToDownload = 1; // Default
        this.notifyListeners();

        try {

            const timestamp = Date.now();
            // sanitize path for filename
            const safeName = song.path.split('/').pop()?.replace(/[^a-zA-Z0-9.-]/g, '_') || `song_${timestamp}`;

            const audioUrl = song.path.startsWith('http') ? song.path : `${API_BASE}${song.path}`;
            const audioFilename = `${timestamp}_${safeName}`;

            await this.downloadFile(audioUrl, audioFilename);

            let lrcFilename: string | null = null;
            if (song.lrcPath) {
                const lrcUrl = song.lrcPath.startsWith('http') ? song.lrcPath : `${API_BASE}${song.lrcPath}`;
                try {
                    lrcFilename = `${timestamp}_${safeName}.lrc`;
                    // Lrc is text, fetch as text then write
                    const lrcRes = await fetch(lrcUrl);
                    if (lrcRes.ok) {
                        const lrcText = await lrcRes.text();
                        await Filesystem.writeFile({
                            path: `${AUDIO_DIR}/${lrcFilename}`,
                            data: lrcText,
                            directory: Directory.Data,
                            encoding: Encoding.UTF8
                        });
                    } else {
                        lrcFilename = null;
                    }
                } catch (e) {
                    console.warn("Failed to download LRC", e);
                    lrcFilename = null;
                }
            }

            const entry: DownloadedEntry = {
                originalPath: song.path,
                localAudioPath: audioFilename,
                localLrcPath: lrcFilename,
                tags: song.tags,
                artistImage: song.artistImage,
                downloadedAt: timestamp
            };

            this.downloadedMap.set(song.path, entry);
            await this.saveIndex();
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
        const entry = this.downloadedMap.get(path);
        if (!entry) return;

        try {
            await Filesystem.deleteFile({
                path: `${AUDIO_DIR}/${entry.localAudioPath}`,
                directory: Directory.Data
            });
            if (entry.localLrcPath) {
                await Filesystem.deleteFile({
                    path: `${AUDIO_DIR}/${entry.localLrcPath}`,
                    directory: Directory.Data
                });
            }
        } catch (e) {
            console.warn("Failed to delete files", e);
        }

        this.downloadedMap.delete(path);
        await this.saveIndex();
        this.notifyListeners();
    }
    setTotalToDownload(count: number) {
        this._totalToDownload = count;
        this._downloadingCount = count;
        this.notifyListeners();
    }
}

export const downloadService = new DownloadService();
