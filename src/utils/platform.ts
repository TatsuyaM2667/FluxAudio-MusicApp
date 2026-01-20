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
};

export default platform;
