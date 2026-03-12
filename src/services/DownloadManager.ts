/**
 * Unified Download Manager
 * 
 * Delegates to the appropriate download service based on platform:
 * - Native (Android/iOS via Capacitor) → DownloadService (filesystem)
 * - PWA/Web (Safari, Firefox, Chrome) → PwaDownloadService (IndexedDB)
 * 
 * All components should use this manager instead of directly accessing
 * individual services.
 */
import { SongMeta } from '../types/music';
import { platform } from '../utils/platform';
import { downloadService } from './DownloadService';
import { pwaDownloadService } from './PwaDownloadService';

type DownloadChangeListener = () => void;

class DownloadManager {
    private listeners: Set<DownloadChangeListener> = new Set();
    private serviceCleanup: (() => void) | null = null;

    private get service() {
        return platform.isNative() ? downloadService : pwaDownloadService;
    }

    async init(): Promise<void> {
        console.log(`[DownloadManager] Initializing for platform: ${platform.getPlatform()}, isNative: ${platform.isNative()}`);
        await this.service.init();

        // Forward listener from underlying service
        if (this.serviceCleanup) this.serviceCleanup();
        this.serviceCleanup = this.service.addListener(() => {
            this.notifyListeners();
        });
    }

    isDownloaded(path: string): boolean {
        return this.service.isDownloaded(path);
    }

    getDownloadedPaths(): string[] {
        return this.service.getDownloadedPaths();
    }

    getDownloadedSongs(): SongMeta[] {
        return this.service.getDownloadedSongs();
    }

    get progress() {
        return this.service.progress;
    }

    resetProgress() {
        this.service.resetProgress();
    }

    setTotalToDownload(count: number) {
        this.service.setTotalToDownload(count);
    }

    async getOfflineUrl(path: string): Promise<string | null> {
        return this.service.getOfflineUrl(path);
    }

    async getOfflineVideo(path: string): Promise<string | null> {
        if (typeof (this.service as any).getOfflineVideo === 'function') {
            return (this.service as any).getOfflineVideo(path);
        }
        return null;
    }

    async getOfflineLrc(path: string): Promise<string | null> {
        return this.service.getOfflineLrc(path);
    }

    async downloadSong(song: SongMeta, withVideo: boolean = false): Promise<void> {
        if (!this.isDownloadSupported()) {
            console.warn('[DownloadManager] Downloads not supported on this platform.');
            return;
        }
        return this.service.downloadSong(song, withVideo);
    }

    async deleteSong(path: string): Promise<void> {
        return this.service.deleteSong(path);
    }

    addListener(listener: DownloadChangeListener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners() {
        this.listeners.forEach(l => l());
    }

    /**
     * Check if downloads are supported on the current platform.
     * - Native: always supported (Capacitor Filesystem)
     * - PWA: supported if IndexedDB available (all modern browsers)
     */
    isDownloadSupported(): boolean {
        if (platform.isNative()) return true;
        return typeof indexedDB !== 'undefined';
    }

    /**
     * Check if the app is running as an installed PWA
     */
    isPwa(): boolean {
        if (platform.isNative()) return false;
        // Check for standalone mode (Add to Home Screen)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isIosStandalone = (navigator as any).standalone === true;
        return isStandalone || isIosStandalone;
    }

    /**
     * Get storage estimate (PWA only)
     */
    async getStorageEstimate(): Promise<{ used: number; quota: number } | null> {
        if (!platform.isNative() && navigator.storage?.estimate) {
            const estimate = await navigator.storage.estimate();
            return {
                used: estimate.usage || 0,
                quota: estimate.quota || 0
            };
        }
        return null;
    }

    /**
     * Request persistent storage to prevent eviction (PWA only)
     */
    async requestPersistentStorage(): Promise<boolean> {
        if (!platform.isNative() && navigator.storage?.persist) {
            return navigator.storage.persist();
        }
        return false;
    }
}

export const downloadManager = new DownloadManager();
