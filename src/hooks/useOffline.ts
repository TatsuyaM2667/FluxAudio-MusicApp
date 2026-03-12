import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';
import { platform } from '../utils/platform';

export function useOffline() {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        if (platform.isNative()) {
            // Native: use Capacitor Network plugin
            const checkStatus = async () => {
                try {
                    const status = await Network.getStatus();
                    setIsOffline(!status.connected);
                } catch (e) {
                    console.warn("Network status check failed", e);
                }
            };

            checkStatus();

            let handle: any;
            const setupListener = async () => {
                try {
                    handle = await Network.addListener('networkStatusChange', status => {
                        setIsOffline(!status.connected);
                    });
                } catch (e) {
                    console.warn("Network listener failed", e);
                }
            };
            setupListener();

            return () => {
                if (handle) handle.remove();
            };
        } else {
            // Web/PWA: use standard browser APIs
            setIsOffline(!navigator.onLine);

            const handleOnline = () => setIsOffline(false);
            const handleOffline = () => setIsOffline(true);

            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);

            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }
    }, []);

    return isOffline;
}
