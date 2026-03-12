import { Capacitor } from '@capacitor/core';

/**
 * Platform detection utilities
 */
export const platform = {
    /**
     * Check if running on native platform (Android/iOS)
     */
    isNative: () => Capacitor.isNativePlatform(),

    /**
     * Check if running on web
     */
    isWeb: () => !Capacitor.isNativePlatform(),

    /**
     * Check if running on Android
     */
    isAndroid: () => Capacitor.getPlatform() === 'android',

    /**
     * Check if running on iOS
     */
    isIOS: () => Capacitor.getPlatform() === 'ios',

    /**
     * Get current platform name
     */
    getPlatform: () => Capacitor.getPlatform(),

    /**
     * Check if running as an installed PWA (Add to Home Screen)
     */
    isPwa: (): boolean => {
        if (Capacitor.isNativePlatform()) return false;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isIosStandalone = (navigator as any).standalone === true;
        return isStandalone || isIosStandalone;
    },

    /**
     * Check if downloads are supported on the current platform.
     * Native: always. Web/PWA: if IndexedDB is available.
     */
    isDownloadSupported: (): boolean => {
        if (Capacitor.isNativePlatform()) return true;
        return typeof indexedDB !== 'undefined';
    },
};

export default platform;
