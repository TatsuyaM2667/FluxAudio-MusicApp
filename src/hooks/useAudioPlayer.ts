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
    const [playlistContext, setPlaylistContext] = useState<SongMeta[] | null>(null); // Playlist context for ordered playback

    const audioRef = useRef<HTMLAudioElement>(null);
    const songsRef = useRef(songs);
    const currentRef = useRef(current);
    const isShuffleRef = useRef(isShuffle);
    const repeatModeRef = useRef(repeatMode);
    const nextUpRef = useRef(nextUp);
    const isPlayingRef = useRef(isPlaying);
    const isVideoModeRef = useRef(isVideoMode);
    const playlistContextRef = useRef(playlistContext);
    const shuffledSongsRef = useRef(shuffledSongs);

    // Sync refs with state
    useEffect(() => { songsRef.current = songs; }, [songs]);
    useEffect(() => { currentRef.current = current; }, [current]);
    useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);
    useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
    useEffect(() => { nextUpRef.current = nextUp; }, [nextUp]);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
    useEffect(() => { isVideoModeRef.current = isVideoMode; }, [isVideoMode]);
    useEffect(() => { playlistContextRef.current = playlistContext; }, [playlistContext]);
    useEffect(() => { shuffledSongsRef.current = shuffledSongs; }, [shuffledSongs]);

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
            // If we have a context, shuffle that instead of all songs
            const baseList = playlistContext || songs;
            setShuffledSongs([...baseList].sort(() => 0.5 - Math.random()));
        } else {
            setShuffledSongs([]);
        }
    }, [isShuffle, songs.length, playlistContext]); // Added playlistContext dependency

    const handlePlaySong = useCallback((song: SongMeta, context?: SongMeta[]) => {
        console.log('[handlePlaySong v2] Playing:', song.tags?.title, 'Context:', context?.length || 'none');
        setCurrent(song);
        setIsPlaying(true);

        // Update context if provided, otherwise clear it (return to global context) unless explicitly keeping
        // Usually clicking a song in a list implies that list is the new context
        if (context) {
            console.log('[handlePlaySong] Setting playlist context with', context.length, 'songs');
            setPlaylistContext(context);
            // If shuffle is on, we need to reshuffle this new context immediately?
            // The useEffect will handle it if playlistContext changes
        } else {
            setPlaylistContext(null);
        }
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
            // Just play the song, don't change context
            setCurrent(nextSong);
            setIsPlaying(true);
            return;
        }

        const safeSongs = songsRef.current;
        const safeCurrent = currentRef.current;
        const safeShuffle = isShuffleRef.current;
        const safeContext = playlistContextRef.current; // Get current context
        const safeShuffledSongs = shuffledSongsRef.current; // Use ref to avoid stale closure

        console.log('[performNext] Context:', safeContext?.length || 'none', 'Shuffle:', safeShuffle, 'ShuffledLen:', safeShuffledSongs?.length);

        if (!safeCurrent) return;

        // Determine the source list: Context > Global Songs
        const baseList = safeContext || safeSongs;

        if (baseList.length === 0) {
            console.warn("performNext: No songs available");
            return;
        }

        // Use shuffled list only if shuffle is on and we have a valid shuffled list
        let targetList = (safeShuffle && safeShuffledSongs.length > 0) ? safeShuffledSongs : baseList;

        const currentIndex = targetList.findIndex(s => s.path === safeCurrent.path);
        console.log('[performNext] Current index:', currentIndex, 'in list of', targetList.length, 'Playlist tracks:', baseList.map(s => s.tags?.title).slice(0, 5));

        // If current song not found in list, fallback to first song
        if (currentIndex === -1) {
            console.warn("performNext: Current song not found in list, playing first song.");
            setCurrent(targetList[0]);
            setIsPlaying(true);
            return;
        }

        const nextIndex = (currentIndex + 1) % targetList.length;
        console.log(`[performNext] Switching to index ${nextIndex} / ${targetList.length}:`, targetList[nextIndex]?.tags?.title);

        setCurrent(targetList[nextIndex]);
        setIsPlaying(true);
    }, []); // Remove dependencies since we use refs for everything

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
        const safeContext = playlistContextRef.current;
        const safeShuffledSongs = shuffledSongsRef.current;

        if (!safeCurrent) return;

        const baseList = safeContext || safeSongs;
        if (baseList.length === 0) return;

        if (audioRef.current && audioRef.current.currentTime > 3) {
            audioRef.current.currentTime = 0;
            return;
        }

        // Use shuffled list only if shuffle is on and we have a valid shuffled list
        let targetList = (safeShuffle && safeShuffledSongs.length > 0) ? safeShuffledSongs : baseList;

        const currentIndex = targetList.findIndex(s => s.path === safeCurrent.path);

        // If current song not found, play last song
        if (currentIndex === -1) {
            console.warn("performPrev: Current song not found, playing last song.");
            setCurrent(targetList[targetList.length - 1]);
            setIsPlaying(true);
            return;
        }

        const prevIndex = (currentIndex - 1 + targetList.length) % targetList.length;
        console.log(`[performPrev] Switching to index ${prevIndex} / ${targetList.length}:`, targetList[prevIndex]?.tags?.title);
        setCurrent(targetList[prevIndex]);
        setIsPlaying(true);
    }, []); // Remove dependencies since we use refs for everything

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
            // Don't auto-play audio when in video mode — video handles playback
            if (isPlaying && !isVideoModeRef.current) {
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
        history,
        playlistContext
    };
}
