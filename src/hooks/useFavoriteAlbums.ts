import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToUserData, updateUserData } from '../services/userDataService';

export interface FavoriteAlbum {
    artist: string;
    album: string;
    addedAt: number;
}

export function useFavoriteAlbums() {
    const { user } = useAuth();
    const [favoriteAlbums, setFavoriteAlbums] = useState<FavoriteAlbum[]>(() => {
        const saved = localStorage.getItem('favoriteAlbums');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('favoriteAlbums', JSON.stringify(favoriteAlbums));
    }, [favoriteAlbums]);

    // Sync from Firestore
    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToUserData(user.uid, (data) => {
            if (data?.favoriteAlbums) {
                setFavoriteAlbums(data.favoriteAlbums);
            }
        });
        return unsubscribe;
    }, [user]);

    const toggleFavoriteAlbum = useCallback(async (artist: string, album: string) => {
        const isFavorite = favoriteAlbums.some(a => a.artist === artist && a.album === album);
        let newAlbums;

        if (isFavorite) {
            newAlbums = favoriteAlbums.filter(a => !(a.artist === artist && a.album === album));
        } else {
            newAlbums = [...favoriteAlbums, { artist, album, addedAt: Date.now() }];
        }

        setFavoriteAlbums(newAlbums);

        if (user) {
            try {
                await updateUserData(user.uid, { favoriteAlbums: newAlbums });
            } catch (e) {
                console.error("Failed to sync album favorites", e);
            }
        }
    }, [favoriteAlbums, user]);

    const isFavoriteAlbum = useCallback((artist: string, album: string) => {
        return favoriteAlbums.some(a => a.artist === artist && a.album === album);
    }, [favoriteAlbums]);

    return {
        favoriteAlbums,
        toggleFavoriteAlbum,
        isFavoriteAlbum
    };
}
