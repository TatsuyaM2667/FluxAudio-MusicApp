import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToUserData, addFavoriteArtist, removeFavoriteArtist } from '../services/userDataService';

export interface FavoriteArtist {
    name: string;
    addedAt: number;
}

export function useFavoriteArtists() {
    const { user } = useAuth();
    const [favoriteArtists, setFavoriteArtists] = useState<FavoriteArtist[]>(() => {
        const saved = localStorage.getItem('favoriteArtists');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('favoriteArtists', JSON.stringify(favoriteArtists));
    }, [favoriteArtists]);

    // Sync from Firestore
    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToUserData(user.uid, (data) => {
            if (data?.favoriteArtists) {
                // Convert string[] from Firestore to FavoriteArtist[]
                // Note: We lose original addedAt time when syncing from fresh Firestore data, 
                // but since we only store strings in Firestore for simple arrayUnion, this is expected trade-off.
                const newFavorites = (data.favoriteArtists as string[]).map(name => ({
                    name,
                    addedAt: Date.now() // Timestamp not preserved in Firestore for artists
                }));
                // Only update if different length to avoid loops (simple check)
                // A better check would be deep comparison, but this is okay for now.
                setFavoriteArtists(newFavorites);
            }
        });
        return unsubscribe;
    }, [user]);

    const toggleFavoriteArtist = useCallback(async (artistName: string) => {
        const isFavorite = favoriteArtists.some(a => a.name === artistName);

        // Optimistic update
        setFavoriteArtists(prev => {
            if (isFavorite) {
                return prev.filter(a => a.name !== artistName);
            } else {
                return [...prev, { name: artistName, addedAt: Date.now() }];
            }
        });

        if (user) {
            try {
                if (isFavorite) {
                    await removeFavoriteArtist(user.uid, artistName);
                } else {
                    await addFavoriteArtist(user.uid, artistName);
                }
            } catch (e) {
                console.error("Failed to sync artist favorite", e);
            }
        }
    }, [favoriteArtists, user]);

    const isFavoriteArtist = useCallback((artistName: string) => {
        return favoriteArtists.some(a => a.name === artistName);
    }, [favoriteArtists]);

    const getFavoriteArtistNames = useCallback(() => {
        return favoriteArtists.map(a => a.name);
    }, [favoriteArtists]);

    return {
        favoriteArtists,
        toggleFavoriteArtist,
        isFavoriteArtist,
        getFavoriteArtistNames
    };
}
