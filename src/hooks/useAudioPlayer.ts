import { useState, useEffect, useRef, useCallback } from 'react';
import { SongMeta } from '../types/music';
import { addPlay } from '../utils/playHistory';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToUserData, addToHistory } from '../services/userDataService';

export function useAudioPlayer(songs: SongMeta[]) {
    const { user } = useAuth();

    const [current, setCurrent] = useState<SongMeta | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isShuffle, setIsShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
    const [isVideoMode, setIsVideoMode] = useState(false);
    const [shuffledSongs, setShuffledSongs] = useState<SongMeta[]>([]);
    const [nextUp, setNextUp] = useState<SongMeta[]>([]);
    const [history, setHistory] = useState<SongMeta[]>([]); // Session history

    const audioRef = useRef<HTMLAudioElement>(null);
    const songsRef = useRef(songs);
    const currentRef = useRef(current);
    const isShuffleRef = useRef(isShuffle);
    const repeatModeRef = useRef(repeatMode);
    const nextUpRef = useRef(nextUp);
    const isPlayingRef = useRef(isPlaying);

    // Sync refs with state
    useEffect(() => { songsRef.current = songs; }, [songs]);
    useEffect(() => { currentRef.current = current; }, [current]);
    useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);
    useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
    useEffect(() => { nextUpRef.current = nextUp; }, [nextUp]);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

    // Firestore Sync: History
    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToUserData(user.uid, (data) => {
            if (data?.history) {
                // Map history paths back to songs
                // Assuming history is stored as { path, playedAt }[] and desc sorted?
                // userDataService adds to top arrays, so data.history[0] is latest.
                const historySongs = data.history.map((h: any) => {
                    return songs.find(s => s.path === h.path);
                }).filter((s: any): s is SongMeta => !!s);

                setHistory(historySongs);
            }
        });
        return unsubscribe;
    }, [user, songs]);

    // Track plays and update session history
    useEffect(() => {
        if (current) {
            // Local Logic (including offline fallback)
            addPlay(current);
            setHistory(prev => {
                const newHistory = [current, ...prev].slice(0, 50);
                return newHistory;
            });

            // Firestore Logic
            if (user) {
                addToHistory(user.uid, current.path).catch(err => {
                    console.error("Failed to add to history", err);
                });
            }
        }
    }, [current, user]);

    // Update shuffled songs when shuffle mode changes
    useEffect(() => {
        if (isShuffle) {
            setShuffledSongs([...songs].sort(() => 0.5 - Math.random()));
        } else {
            setShuffledSongs([]);
        }
    }, [isShuffle, songs.length]);

    const handlePlaySong = useCallback((song: SongMeta) => {
        setCurrent(song);
        setIsPlaying(true);
    }, []);

    const togglePlay = useCallback((e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (audioRef.current) {
            if (isPlaying) audioRef.current.pause();
            else audioRef.current.play();
            setIsPlaying(!isPlaying);
        }
    }, [isPlaying]);

    const performNext = useCallback(() => {
        // 1. Check Priority Queue (Next Up)
        if (nextUpRef.current.length > 0) {
            const nextSong = nextUpRef.current[0];
            setNextUp(prev => prev.slice(1));
            handlePlaySong(nextSong);
            return;
        }

        const safeSongs = songsRef.current;
        const safeCurrent = currentRef.current;
        const safeShuffle = isShuffleRef.current;

        if (!safeCurrent) return;
        if (safeSongs.length === 0) {
            console.warn("performNext: No songs available");
            return;
        }

        let targetList = safeShuffle ? shuffledSongs : safeSongs;
        if (safeShuffle && targetList.length === 0) targetList = safeSongs;

        const currentIndex = targetList.findIndex(s => s.path === safeCurrent.path);

        // If current song not found in list, fallback to first song or do nothing
        if (currentIndex === -1) {
            console.warn("performNext: Current song not found in list, playing first song.");
            setCurrent(targetList[0]);
            setIsPlaying(true);
            return;
        }

        const nextIndex = (currentIndex + 1) % targetList.length;
        console.log(`performNext: Switching to index ${nextIndex} / ${targetList.length}`);

        setCurrent(targetList[nextIndex]);
        setIsPlaying(true);
    }, [shuffledSongs, handlePlaySong]);

    // Track consecutive errors to prevent infinite skip loop
    const errorCountRef = useRef(0);
    const lastErrorTimeRef = useRef(0);

    const handleError = useCallback(() => {
        const now = Date.now();

        // Reset error count if more than 3 seconds since last error
        if (now - lastErrorTimeRef.current > 3000) {
            errorCountRef.current = 0;
        }

        errorCountRef.current++;
        lastErrorTimeRef.current = now;

        console.warn(`Audio error occurred (${errorCountRef.current}/5), skipping to next song.`);

        // Stop after 5 consecutive errors to prevent infinite loop
        if (errorCountRef.current >= 5) {
            console.error("Too many consecutive errors, stopping playback.");
            setIsPlaying(false);
            errorCountRef.current = 0;
            return;
        }

        performNext();
    }, [performNext]);

    const performPrev = useCallback(() => {
        const safeSongs = songsRef.current;
        const safeCurrent = currentRef.current;
        const safeShuffle = isShuffleRef.current;

        if (!safeCurrent) return;
        if (safeSongs.length === 0) return;

        if (audioRef.current && audioRef.current.currentTime > 3) {
            audioRef.current.currentTime = 0;
            return;
        }

        let targetList = safeShuffle ? shuffledSongs : safeSongs;
        if (safeShuffle && targetList.length === 0) targetList = safeSongs;

        const currentIndex = targetList.findIndex(s => s.path === safeCurrent.path);

        // If current song not found, play last song
        if (currentIndex === -1) {
            console.warn("performPrev: Current song not found, playing last song.");
            setCurrent(targetList[targetList.length - 1]);
            setIsPlaying(true);
            return;
        }

        const prevIndex = (currentIndex - 1 + targetList.length) % targetList.length;
        setCurrent(targetList[prevIndex]);
        setIsPlaying(true);
    }, [shuffledSongs]);

    const handleNext = useCallback((e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        performNext();
    }, [performNext]);

    const handlePrev = useCallback((e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        performPrev();
    }, [performPrev]);

    const handleSongEnd = useCallback(() => {
        if (repeatMode === 'one') {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
            }
        } else {
            performNext();
        }
    }, [repeatMode, performNext]);

    const handleTimeUpdate = useCallback(() => {
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
    }, []);

    const handleLoadedMetadata = useCallback(() => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
            if (isPlaying) {
                audioRef.current.play().catch(e => console.log("Auto-play error", e));
            }
        }
    }, [isPlaying]);

    const handlePlayNext = useCallback((song: SongMeta) => {
        setNextUp(prev => [song, ...prev]);
    }, []);

    return {
        // State
        current,
        isPlaying,
        currentTime,
        duration,
        isShuffle,
        repeatMode,
        isVideoMode,

        nextUp,
        audioRef,

        // Setters
        setCurrent,
        setIsPlaying,
        setIsShuffle,
        setRepeatMode,
        setIsVideoMode,

        // Handlers
        handlePlaySong,
        togglePlay,
        handleNext,
        handlePrev,
        handleSongEnd,
        handleTimeUpdate,
        handleLoadedMetadata,
        handlePlayNext,
        performNext,
        performPrev,
        handleError,

        // Data
        shuffledSongs,
        history
    };
}
