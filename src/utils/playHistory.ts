import { SongMeta } from "../types/music";

export interface PlayRecord {
    path: string;
    timestamp: number;
    title: string;
    artist: string;
    album?: string;
}

const STORAGE_KEY = 'play_history';
const MAX_HISTORY = 10000; // Limit history size

export function addPlay(song: SongMeta) {
    if (!song) return;

    // Don't record if played less than 10 seconds ago (debounce)
    const history = getPlayHistory();
    if (history.length > 0) {
        const last = history[0];
        if (last.path === song.path && (Date.now() - last.timestamp < 10000)) {
            return;
        }
    }

    const record: PlayRecord = {
        path: song.path,
        timestamp: Date.now(),
        title: song.tags?.title || 'Unknown Title',
        artist: song.tags?.artist || 'Unknown Artist',
        album: song.tags?.album
    };

    const newHistory = [record, ...history].slice(0, MAX_HISTORY);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (e) {
        console.error("Failed to save play history", e);
        // If quota exceeded, maybe trim more?
        if (newHistory.length > 100) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory.slice(0, 100)));
        }
    }
}

export function getPlayHistory(): PlayRecord[] {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.warn("Failed to parse play history", e);
        return [];
    }
}

export function getRecentlyPlayed(limit: number = 20): PlayRecord[] {
    return getPlayHistory().slice(0, limit);
}

export function getTopSongs(period: 'all' | 'month' = 'all', limit: number = 20): { path: string, title: string, artist: string, count: number }[] {
    const history = getPlayHistory();
    const now = Date.now();
    const oneMonthMs = 30 * 24 * 60 * 60 * 1000;

    const filtered = period === 'month'
        ? history.filter(r => (now - r.timestamp) < oneMonthMs)
        : history;

    const counts: Record<string, { count: number, title: string, artist: string }> = {};

    filtered.forEach(r => {
        if (!counts[r.path]) {
            counts[r.path] = { count: 0, title: r.title, artist: r.artist };
        }
        counts[r.path].count++;
    });

    return Object.entries(counts)
        .map(([path, data]) => ({ path, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}

export function getTopArtists(period: 'all' | 'month' = 'all', limit: number = 20): { artist: string, count: number }[] {
    const history = getPlayHistory();
    const now = Date.now();
    const oneMonthMs = 30 * 24 * 60 * 60 * 1000;

    const filtered = period === 'month'
        ? history.filter(r => (now - r.timestamp) < oneMonthMs)
        : history;

    const counts: Record<string, number> = {};

    filtered.forEach(r => {
        const artist = r.artist || 'Unknown Artist';
        counts[artist] = (counts[artist] || 0) + 1;
    });

    return Object.entries(counts)
        .map(([artist, count]) => ({ artist, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}
