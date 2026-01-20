import { useCallback } from 'react';
import { Picture } from '../types/music';

export function useAlbumArt() {
    const getAlbumArt = useCallback((picture?: Picture) => {
        if (!picture) return null;
        try {
            if (typeof picture.data === 'string') {
                if (picture.data.startsWith('data:')) return picture.data;
                return `data:${picture.format};base64,${picture.data}`;
            }
            // Safe conversion for large arrays to avoid Maximum call stack size exceeded
            const bytes = new Uint8Array(picture.data as number[]);
            let binary = '';
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64 = window.btoa(binary);
            return `data:${picture.format};base64,${base64}`;
        } catch (e) {
            console.error("Failed to generate album art", e);
            return null;
        }
    }, []);

    return getAlbumArt;
}

export function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

export function getPageTitle(view: string) {
    if (view === 'search') return 'Search';
    if (view === 'favorites') return 'Liked Songs';
    if (view === 'library') return 'Your Library';
    if (view === 'mypage') return 'My Page';
    return getGreeting();
}
