import { useCallback } from 'react';
import { Picture } from '../types/music';
import { API_BASE } from '../config';

// キャッシュ: 同じPictureオブジェクトからの再生成を防ぐ
const artCache = new WeakMap<Picture, string>();

export function useAlbumArt() {
    const getAlbumArt = useCallback((picture?: Picture) => {
        if (!picture) return null;
        
        // すでに生成済みのBlob URLがあれば即座に返す
        if (artCache.has(picture)) {
            return artCache.get(picture)!;
        }

        try {
            if (typeof picture.data === 'string') {
                // URL形式のカバーアート（サーバーから提供されるURL）
                if (picture.format === 'url') {
                    const url = picture.data.startsWith('http') || picture.data.startsWith('data:')
                        ? picture.data
                        : `${API_BASE}${picture.data.startsWith('/') ? picture.data : '/' + picture.data}`;
                    artCache.set(picture, url);
                    return url;
                }
                // data: URI形式
                if (picture.data.startsWith('data:')) {
                    artCache.set(picture, picture.data);
                    return picture.data;
                }
                // Base64文字列 (JPEGのBase64は /9j/ で始まるため startsWith('/') だと誤判定される)
                const result = `data:${picture.format || 'image/jpeg'};base64,${picture.data}`;
                artCache.set(picture, result);
                return result;
            }
            
            // ループでの巨大文字列結合を廃止し、Blob URLを使用（超高速）
            const bytes = new Uint8Array(picture.data as number[]);
            const blob = new Blob([bytes], { type: picture.format || 'image/jpeg' });
            const url = URL.createObjectURL(blob);
            
            artCache.set(picture, url);
            return url;
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
