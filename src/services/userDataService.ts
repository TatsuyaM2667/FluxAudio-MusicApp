import { db } from '../firebase';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    collection,
    getDocs,
    deleteDoc,
    Timestamp,
    onSnapshot
} from 'firebase/firestore';
import { Playlist } from '../types/music';

// ==============================
// User Document Management
// ==============================

export function subscribeToUserData(userId: string, callback: (data: any) => void) {
    const userRef = doc(db, 'users', userId);
    return onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data());
        }
    });
}

export async function getUserData(userId: string) {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    return userDoc.exists() ? userDoc.data() : null;
}

export async function updateUserData(userId: string, data: Partial<{
    displayName: string;
    favorites: string[];
    favoriteArtists: string[];
    favoriteAlbums: any[];
    history: any[];
}>) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, data);
}

// ==============================
// Favorites (Songs)
// ==============================

export async function getFavorites(userId: string): Promise<string[]> {
    const userData = await getUserData(userId);
    return userData?.favorites || [];
}

export async function addFavorite(userId: string, songPath: string) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        favorites: arrayUnion(songPath)
    });
}

export async function removeFavorite(userId: string, songPath: string) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        favorites: arrayRemove(songPath)
    });
}

// ==============================
// Favorite Artists
// ==============================

export async function addFavoriteArtist(userId: string, artist: string) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        favoriteArtists: arrayUnion(artist)
    });
}

export async function removeFavoriteArtist(userId: string, artist: string) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        favoriteArtists: arrayRemove(artist)
    });
}

// ==============================
// Playlists (subcollection)
// ==============================

export async function getPlaylists(userId: string): Promise<Playlist[]> {
    const playlistsRef = collection(db, 'users', userId, 'playlists');
    const snapshot = await getDocs(playlistsRef);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Playlist[];
}

export async function createPlaylist(userId: string, name: string): Promise<string> {
    const playlistsRef = collection(db, 'users', userId, 'playlists');
    const newPlaylistRef = doc(playlistsRef);

    await setDoc(newPlaylistRef, {
        name,
        songs: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    });

    return newPlaylistRef.id;
}

export async function updatePlaylist(userId: string, playlistId: string, data: Partial<{
    name: string;
    songs: string[];
}>) {
    const playlistRef = doc(db, 'users', userId, 'playlists', playlistId);
    await updateDoc(playlistRef, {
        ...data,
        updatedAt: Timestamp.now()
    });
}

export async function deletePlaylist(userId: string, playlistId: string) {
    const playlistRef = doc(db, 'users', userId, 'playlists', playlistId);
    await deleteDoc(playlistRef);
}

export async function addSongToPlaylist(userId: string, playlistId: string, songPath: string) {
    const playlistRef = doc(db, 'users', userId, 'playlists', playlistId);
    await updateDoc(playlistRef, {
        songs: arrayUnion(songPath),
        updatedAt: Timestamp.now()
    });
}

export async function removeSongFromPlaylist(userId: string, playlistId: string, songPath: string) {
    const playlistRef = doc(db, 'users', userId, 'playlists', playlistId);
    await updateDoc(playlistRef, {
        songs: arrayRemove(songPath),
        updatedAt: Timestamp.now()
    });
}

// ==============================
// Play History
// ==============================

export async function addToHistory(userId: string, songPath: string) {
    const userRef = doc(db, 'users', userId);
    const userData = await getUserData(userId);

    // Keep last 100 history items
    const currentHistory = userData?.history || [];
    const newHistory = [
        { path: songPath, playedAt: new Date().toISOString() },
        ...currentHistory.filter((h: any) => h.path !== songPath)
    ].slice(0, 100);

    await updateDoc(userRef, { history: newHistory });
}

export async function getHistory(userId: string): Promise<{ path: string; playedAt: string }[]> {
    const userData = await getUserData(userId);
    return userData?.history || [];
}

export async function clearHistory(userId: string) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { history: [] });
}
