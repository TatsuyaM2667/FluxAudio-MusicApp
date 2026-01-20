import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToUserData, addFavorite, removeFavorite } from '../services/userDataService';

export function useFavorites() {
    const { user } = useAuth();
    const [favorites, setFavorites] = useState<string[]>(() => {
        const saved = localStorage.getItem('favorites');
        return saved ? JSON.parse(saved) : [];
    });

    // Sync to localStorage
    useEffect(() => {
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }, [favorites]);

    // Sync from Firestore (Subscribe)
    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToUserData(user.uid, (data) => {
            if (data?.favorites) {
                setFavorites(data.favorites);
            }
        });
        return unsubscribe;
    }, [user]);

    const toggleFavorite = useCallback(async (path: string) => {
        const isFavorite = favorites.includes(path);

        // Optimistic update
        setFavorites(prev =>
            prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
        );

        if (user) {
            try {
                if (isFavorite) {
                    await removeFavorite(user.uid, path);
                } else {
                    await addFavorite(user.uid, path);
                }
            } catch (error) {
                console.error("Error updating favorite:", error);
                // Ideally revert optimistic update here on error
            }
        }
    }, [favorites, user]);

    return { favorites, toggleFavorite };
}
