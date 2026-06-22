import { fetchMetadataBlob } from '../api';
import { Tags } from '../types/music';

// Cache to prevent multiple requests for the same song
const tagCache = new Map<string, Tags | null>();

export async function fetchLazyId3Tags(path: string): Promise<Tags | null> {
    if (tagCache.has(path)) {
        return tagCache.get(path) || null;
    }

    try {
        const blob = await fetchMetadataBlob(path);
        
        return new Promise((resolve) => {
            if (!(window as any).jsmediatags) {
                console.warn("jsmediatags is not loaded");
                resolve(null);
                return;
            }

            (window as any).jsmediatags.read(blob, {
                onSuccess: (tag: any) => {
                    const t = tag.tags;
                    const parsedTags: Tags = {
                        title: t.title,
                        artist: t.artist,
                        album: t.album,
                        year: t.year,
                        genre: t.genre,
                        picture: t.picture ? {
                            format: t.picture.format,
                            data: t.picture.data
                        } : undefined
                    };
                    tagCache.set(path, parsedTags);
                    resolve(parsedTags);
                },
                onError: (error: any) => {
                    console.warn(`[ID3] Failed to parse tags for ${path}:`, error);
                    tagCache.set(path, null);
                    resolve(null);
                }
            });
        });
    } catch (e) {
        console.error(`[ID3] Failed to fetch blob for ${path}:`, e);
        tagCache.set(path, null);
        return null;
    }
}
