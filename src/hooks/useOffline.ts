import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';

export function useOffline() {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
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
    }, []);

    return isOffline;
}
