import { useState, useEffect, useRef } from "react";
import { SongMeta } from "../types/music";
import {
    IconPlay, IconPause, IconSkipBack, IconSkipForward,
    IconMusic, IconChevronDown, IconHeart, IconHeartFilled,
    IconShuffle, IconRepeat, IconInfo,
    IconQuote, IconListMusic, IconAirplay, IconMoreHorizontal
} from "./Icons";
import { LyricsView } from "./LyricsView";
import { getDominantColor } from "../utils/colors";
import { motion, AnimatePresence, PanInfo, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { API_BASE } from "../config";

type FullPlayerProps = {
    current: SongMeta;
    isPlaying: boolean;
    togglePlay: () => void;
    onNext: () => void;
    onPrev: () => void;
    currentTime: number;
    duration: number;
    onTimeChange: (time: number) => void;
    getAlbumArt: (picture?: any) => string | null;
    onClose: () => void;
    isFavorite: boolean;
    toggleFavorite: () => void;
    rawLrc: string | null;
    isShuffle: boolean;
    toggleShuffle: () => void;
    repeatMode: 'off' | 'all' | 'one';
    toggleRepeat: () => void;
    queue: SongMeta[];
    history?: SongMeta[];
    onQueueItemClick: (song: SongMeta) => void;
    onArtistClick: (artist: string) => void;
    onVideoModeChange?: (isVideo: boolean) => void;
    onVideoEnd?: () => void;
};

export function FullPlayer({
    current,
    isPlaying,
    togglePlay,
    onNext,
    onPrev,
    currentTime,
    duration,
    onTimeChange,
    getAlbumArt,
    onClose,
    isFavorite,
    toggleFavorite,
    rawLrc,
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    queue,
    history = [],
    onQueueItemClick,
    onArtistClick,
    onVideoModeChange,
    onVideoEnd
}: FullPlayerProps) {
    const [bgColor, setBgColor] = useState<string>("#1a1a1a");
    const [showInfo, setShowInfo] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [lyricsStyle, setLyricsStyle] = useState<'default' | 'handwriting' | 'typing'>('default');

    // View Mode: 'art', 'lyrics', 'queue', 'video'
    const [viewMode, setViewMode] = useState<'art' | 'lyrics' | 'queue' | 'video'>('art');
    const mobileVideoRef = useRef<HTMLVideoElement>(null);
    const desktopVideoRef = useRef<HTMLVideoElement>(null);

    // Sync video mode with parent (mute main audio)
    useEffect(() => {
        if (onVideoModeChange) onVideoModeChange(viewMode === 'video');
    }, [viewMode, onVideoModeChange]);

    // Reset video mode on unmount
    useEffect(() => {
        return () => { if (onVideoModeChange) onVideoModeChange(false); };
    }, [onVideoModeChange]);

    // When song changes, always reset viewMode to 'art'
    // This ensures the next song doesn't auto-play as a music video
    const prevPathRef = useRef(current.path);
    useEffect(() => {
        if (prevPathRef.current !== current.path) {
            prevPathRef.current = current.path;
            if (viewMode === 'video') {
                setViewMode('art');
            }
        }
    }, [current.path]);

    // Sync video playback state with app's isPlaying state
    useEffect(() => {
        if (viewMode === 'video') {
            [mobileVideoRef.current, desktopVideoRef.current].forEach(video => {
                if (video) {
                    if (isPlaying) {
                        video.play().catch(() => { });
                    } else {
                        video.pause();
                    }
                }
            });
        } else {
            // If not in video mode, ensure videos are paused to prevent background playback
            [mobileVideoRef.current, desktopVideoRef.current].forEach(video => {
                if (video) video.pause();
            });
        }
    }, [isPlaying, viewMode]);

    // Framer Motion values for interactive drag
    const y = useMotionValue(0);
    const x = useMotionValue(0);
    const opacity = useTransform(y, [0, 300], [1, 0.4]);
    const scale = useTransform(y, [0, 300], [1, 0.9]);
    const rotateX = useTransform(y, [0, 500], [0, 15]);
    const rotateZ = useTransform(x, [-250, 250], [-15, 15]);
    const controls = useAnimation();

    // Auto-scroll to Up Next when queue view opens
    const mobileQueueRef = useRef<HTMLHeadingElement>(null);
    const desktopQueueRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        if (viewMode === 'queue' && history.length > 0) {
            // Small delay to ensure render
            setTimeout(() => {
                mobileQueueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                desktopQueueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [viewMode, history.length]);

    const art = current.tags?.picture ? getAlbumArt(current.tags.picture) : null;
    const title = current.tags?.title || current.path.split("/").pop()?.replace(/\.[^/.]+$/, "") || "Unknown Title";
    const artist = current.tags?.artist || "Unknown Artist";
    const album = current.tags?.album || "Unknown Album";

    // Dynamic color extraction
    useEffect(() => {
        let isMounted = true;

        const updateTheme = (color: string) => {
            if (!isMounted) return;
            setBgColor(color);
            // Update meta theme-color immediately
            const metaTheme = document.querySelector('meta[name="theme-color"]');
            if (metaTheme) metaTheme.setAttribute('content', color);
        };

        if (art) {
            getDominantColor(art).then(updateTheme);
        } else {
            updateTheme("#1a1a1a");
        }
        return () => {
            isMounted = false;
        };
    }, [art, current.path]);

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Video check
    const hasVideo = !!current.videoPath;
    const handleVideoToggle = () => {
        if (hasVideo) {
            setViewMode(prev => prev === 'video' ? 'art' : 'video');
        }
    };

    // Smooth Drag to close
    const handleDragEnd = (_: any, info: PanInfo) => {
        const yThreshold = 100;
        const yVelocityThreshold = 500; // Increased threshold for a more deliberate swipe

        if (info.offset.y > yThreshold || info.velocity.y > yVelocityThreshold) {
            // Animate out with velocity
            controls.start({
                y: "100%",
                transition: { type: "spring", stiffness: 400, damping: 40, mass: 0.8 }
            }).then(onClose);
        } else {
            // Snap back to center
            controls.start({
                y: 0,
                x: 0,
                rotateZ: 0, // Reset rotation
                transition: { type: "spring", stiffness: 400, damping: 40, mass: 0.8 }
            });
        }
    };

    // Menu Action Handlers
    const handleArtistAction = () => {
        setShowMenu(false);
        onClose(); // Close player first? Or keep it open but navigate background?
        // Usually, navigating to artist page implies leaving the player view or minimizing it.
        // Let's minimize it (close full player).
        onClose();
        onArtistClick(artist);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: "100%" }}
                animate={controls}
                exit={{ y: "100%", transition: { type: "spring", stiffness: 400, damping: 50 } }}
                transition={{ type: "spring", stiffness: 350, damping: 40, mass: 0.9 }}
                style={{
                    y,
                    x,
                    opacity,
                    scale,
                    rotateX,
                    rotateZ,
                    background: `linear-gradient(to bottom, ${bgColor}, #000000)`
                }}
                drag
                dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
                dragElastic={{ top: 0.05, bottom: 0.5, left: 0.5, right: 0.5 }}
                onDragEnd={handleDragEnd}
                className="fixed inset-0 z-[60] flex flex-col text-white overflow-hidden font-sans touch-none"
            >
                {/* Blurred Background Art */}
                {art && (
                    <div
                        className="absolute inset-0 z-[-1] opacity-30 select-none pointer-events-none"
                        style={{
                            backgroundImage: `url(${art})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            filter: 'blur(30px) saturate(1.8)',
                            transform: 'scale(1.2)'
                        }}
                    />
                )}

                {/* --- Menu Modal --- */}
                {showMenu && (
                    <div
                        className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center animate-fade-in"
                        onPointerDown={(e) => e.stopPropagation()} // Prevent drag propagation
                        onClick={() => setShowMenu(false)}
                    >
                        <div
                            className="bg-[#1c1c1e] w-full md:w-80 rounded-t-2xl md:rounded-2xl p-4 space-y-2 mb-safe-bottom md:mb-0 shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-4 p-4 border-b border-white/10 mb-2">
                                {art ? <img src={art} className="w-12 h-12 rounded" /> : <div className="w-12 h-12 bg-white/10 rounded" />}
                                <div className="min-w-0">
                                    <h3 className="font-bold truncate text-white">{title}</h3>
                                    <p className="text-sm text-gray-400 truncate">{artist}</p>
                                </div>
                            </div>

                            <button className="w-full text-left p-4 hover:bg-white/10 rounded-xl transition font-medium flex items-center gap-3" onClick={handleArtistAction}>
                                <IconInfo size={20} /> Go to Artist
                            </button>
                            <button className="w-full text-left p-4 hover:bg-white/10 rounded-xl transition font-medium flex items-center gap-3" onClick={() => { setShowMenu(false); }}>
                                <IconListMusic size={20} /> Add to Playlist
                            </button>

                            <button className="w-full py-4 text-center font-bold text-red-500 mt-2 hover:bg-white/5 rounded-xl" onClick={() => setShowMenu(false)}>Cancel</button>
                        </div>
                    </div>
                )}

                {/* --- Info Details Modal --- */}
                {showInfo && (
                    <div
                        className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setShowInfo(false)}
                    >
                        <div className="bg-white/10 border border-white/20 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                            <h3 className="text-xl font-bold border-b border-white/10 pb-2">Track Details</h3>
                            <div className="space-y-2 text-sm text-white/90">
                                <p><span className="text-white/50 w-16 inline-block">Title:</span> {title}</p>
                                <p><span className="text-white/50 w-16 inline-block">Artist:</span> {artist}</p>
                                <p><span className="text-white/50 w-16 inline-block">Album:</span> {album}</p>
                                <p><span className="text-white/50 w-16 inline-block">Year:</span> {current.tags?.year || '-'}</p>
                                <p><span className="text-white/50 w-16 inline-block">Genre:</span> {current.tags?.genre || '-'}</p>
                                <p><span className="text-white/50 w-16 inline-block">Format:</span> {current.path.split('.').pop()?.toUpperCase()}</p>
                            </div>
                            <button className="w-full py-2 bg-white text-black font-bold rounded-lg mt-4" onClick={() => setShowInfo(false)}>Close</button>
                        </div>
                    </div>
                )}

                {/* ... Mobile view is already handled ... */}

                {/* --- Mobile View --- */}
                <div className="md:hidden flex flex-col h-full relative">

                    {/* Header (Chevrons & Title) */}
                    <div className="px-6 py-4 pt-safe-top shrink-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/30 to-transparent">
                        <button
                            onClick={onClose}
                            className="p-2 text-white/60 hover:text-white rounded-full bg-white/10 active:scale-90 transition"
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <IconChevronDown size={24} />
                        </button>

                        {/* Fixed Top Title/Artist */}
                        <div className="flex-1 text-center mx-4 min-w-0">
                            <div className="w-8 h-1 bg-white/30 rounded-full mx-auto mb-2" />
                            <div className="font-bold truncate text-sm leading-tight">{title}</div>
                            <div className="text-xs text-white/60 truncate leading-tight">{artist}</div>
                        </div>

                        <button
                            onClick={() => setShowMenu(true)}
                            className="p-2 text-white/60 hover:text-white rounded-full bg-white/10 active:scale-90 transition"
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <IconMoreHorizontal size={24} />
                        </button>
                    </div>

                    {/* Mobile Main Content */}
                    <div className="flex-1 overflow-hidden relative flex flex-col justify-center">
                        {viewMode === 'video' && current.videoPath ? (
                            <div className="w-full aspect-video bg-black flex items-center justify-center z-50 shadow-2xl">
                                <video
                                    ref={mobileVideoRef}
                                    key={`mobile-video-${current.path}`}
                                    src={`${API_BASE}${current.videoPath}`}
                                    className="w-full h-full object-contain"
                                    playsInline
                                    autoPlay={isPlaying}
                                    onClick={togglePlay}
                                    onEnded={() => {
                                        if (onVideoEnd) onVideoEnd();
                                    }}
                                    onError={(e) => {
                                        console.error("Video failed to load", e);
                                        setViewMode('art');
                                    }}
                                />
                            </div>
                        ) : viewMode === 'art' ? (
                            // Large Artwork Mode
                            <div className="w-full px-8 pb-8 flex items-center justify-center">
                                <div className="w-full aspect-square shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden relative bg-white/5">
                                    {art ? <img src={art} alt={title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><IconMusic size={80} opacity={0.5} /></div>}
                                </div>
                            </div>
                        ) : (
                            // Scrollable Content
                            <div
                                className="absolute inset-0 overflow-y-auto custom-scrollbar px-6 py-4"
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                {viewMode === 'lyrics' ? (
                                    <>
                                        <div className="absolute top-0 right-6 flex gap-2 p-2 bg-black/20 rounded-b-lg z-20">
                                            <button onClick={() => setLyricsStyle('default')} className={`px-2 py-1 text-xs rounded ${lyricsStyle === 'default' ? 'bg-white/30' : 'bg-white/10'}`}>Default</button>
                                            <button onClick={() => setLyricsStyle('handwriting')} className={`px-2 py-1 text-xs rounded ${lyricsStyle === 'handwriting' ? 'bg-white/30' : 'bg-white/10'}`}>Handwriting</button>
                                            <button onClick={() => setLyricsStyle('typing')} className={`px-2 py-1 text-xs rounded ${lyricsStyle === 'typing' ? 'bg-white/30' : 'bg-white/10'}`}>Typing</button>
                                        </div>
                                        <LyricsView rawLrc={rawLrc} currentTime={currentTime} scrollable={true} onLineClick={onTimeChange} style={lyricsStyle} />
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        {/* History */}
                                        {history.length > 0 && (
                                            <>
                                                <h3 className="text-sm font-bold uppercase tracking-widest text-white/50 mb-4 sticky top-0 bg-transparent backdrop-blur-md py-2 z-10">History</h3>
                                                {history.map((song, idx) => (
                                                    <div
                                                        key={`hist-${idx}`}
                                                        className="flex items-center gap-4 p-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition cursor-pointer group opacity-60"
                                                        onClick={() => onQueueItemClick(song)}
                                                    >
                                                        <div className="w-10 h-10 rounded overflow-hidden bg-white/10 shrink-0 relative">
                                                            {song.tags?.picture ? (
                                                                <img src={getAlbumArt(song.tags.picture) || ''} alt="" className="w-full h-full object-cover grayscale" />
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full"><IconMusic size={16} /></div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0 text-left">
                                                            <div className="font-medium truncate text-white/90">{song.tags?.title || song.path.split('/').pop()?.replace(/\.[^/.]+$/, "")}</div>
                                                            <div className="text-xs text-white/50 truncate">{song.tags?.artist || "Unknown Artist"}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className="h-4 border-b border-white/10 mb-4"></div>
                                            </>
                                        )}

                                        <h3 ref={mobileQueueRef} className="text-sm font-bold uppercase tracking-widest text-white/50 mb-4 sticky top-0 bg-transparent backdrop-blur-md py-2 z-10">Up Next</h3>
                                        {queue.length > 0 ? queue.map((song, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-4 p-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition cursor-pointer group"
                                                onClick={() => onQueueItemClick(song)}
                                            >
                                                <div className="w-10 h-10 rounded overflow-hidden bg-white/10 shrink-0 relative">
                                                    {song.tags?.picture ? (
                                                        <img src={getAlbumArt(song.tags.picture) || ''} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full"><IconMusic size={16} /></div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 text-left">
                                                    <div className="font-medium truncate text-white/90">{song.tags?.title || song.path.split('/').pop()?.replace(/\.[^/.]+$/, "")}</div>
                                                    <div className="text-xs text-white/50 truncate">{song.tags?.artist || "Unknown Artist"}</div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="text-white/40 text-center py-10">No upcoming songs</div>
                                        )}
                                        <div className="h-24"></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Track Info (Artist/Fave Row) */}
                    <div className="px-8 mb-6 mt-2 shrink-0 flex items-center justify-between" onPointerDown={e => e.stopPropagation()}>
                        <div className="min-w-0">
                            <div className="text-2xl font-bold truncate leading-tight">{title}</div>
                            <div
                                className="text-lg text-white/60 truncate cursor-pointer hover:underline"
                                onClick={() => handleArtistAction()}
                            >{artist}</div>
                        </div>
                        <button onClick={toggleFavorite} className={`p-2 transition ${isFavorite ? 'text-red-500' : 'text-white/40'}`}>
                            {isFavorite ? <IconHeartFilled size={28} /> : <IconHeart size={28} />}
                        </button>
                    </div>

                    {/* Mobile Controls (Bottom Fixed) */}
                    <div
                        className="shrink-0 bg-transparent pt-0 pb-safe px-6 z-30"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        {/* Seekbar */}
                        <div className="mb-6 group w-full">
                            <input
                                type="range"
                                min={0}
                                max={duration || 100}
                                value={currentTime}
                                onChange={(e) => onTimeChange(Number(e.target.value))}
                                className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:scale-100 transition-all"
                                style={{
                                    background: `linear-gradient(to right, white ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255,255,255,0.2) 0)`
                                }}
                            />
                            <div className="flex justify-between text-[10px] items-center font-medium text-white/50 mt-1 font-mono">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Main Transport Controls */}
                        <div className="flex items-center justify-between gap-4 mb-8">
                            <button onClick={toggleShuffle} className={`${isShuffle ? 'text-green-400' : 'text-white/60'}`}><IconShuffle size={20} /></button>
                            <button onClick={onPrev} className="text-white active:scale-95"><IconSkipBack size={32} className="fill-current" /></button>
                            <button onClick={togglePlay} className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-lg active:scale-95">
                                {isPlaying ? <IconPause size={40} className="fill-current" /> : <IconPlay size={40} className="ml-1 fill-current" />}
                            </button>
                            <button onClick={onNext} className="text-white active:scale-95"><IconSkipForward size={32} className="fill-current" /></button>
                            <button
                                onClick={toggleRepeat}
                                className={`relative ${repeatMode !== 'off' ? 'text-green-400' : 'text-white/60'}`}
                            >
                                <IconRepeat size={20} />
                                {repeatMode === 'one' && <span className="absolute -top-1 -right-1 text-[8px] font-black">1</span>}
                            </button>
                        </div>

                        {/* Bottom Utility Buttons */}
                        <div className="flex items-center justify-center gap-12 pb-8">
                            <button
                                className={`p-2 transition ${viewMode === 'lyrics' ? 'text-white bg-white/10 rounded-lg' : 'text-white/40'}`}
                                onClick={() => setViewMode(prev => prev === 'lyrics' ? 'art' : 'lyrics')}
                            >
                                <IconQuote size={24} />
                            </button>
                            <button
                                className={`p-2 transition ${viewMode === 'video' ? 'text-white bg-white/10 rounded-lg' : (hasVideo ? 'text-white/80' : 'text-white/20')}`}
                                onClick={handleVideoToggle}
                                disabled={!hasVideo}
                            >
                                <IconAirplay size={24} />
                            </button>
                            <button
                                className={`p-2 transition ${viewMode === 'queue' ? 'text-white bg-white/10 rounded-lg' : 'text-white/40'}`}
                                onClick={() => setViewMode(prev => prev === 'queue' ? 'art' : 'queue')}
                            >
                                <IconListMusic size={24} />
                            </button>
                        </div>
                    </div>
                </div>


                {/* --- Desktop View --- */}
                <div className="hidden md:flex h-full w-full max-w-screen-2xl mx-auto p-8 lg:p-12 items-center gap-12 lg:gap-24 relative select-text" onPointerDown={(e) => e.stopPropagation()}>
                    <button onClick={onClose} className="absolute top-8 right-8 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/80 transition">
                        <IconChevronDown size={28} />
                    </button>

                    {/* Desktop: Menu Button */}
                    <button onClick={() => setShowMenu(true)} className="absolute top-8 right-24 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/80 transition">
                        <IconMoreHorizontal size={28} />
                    </button>

                    <div className="w-1/2 h-full flex flex-col justify-center items-center lg:items-end">
                        <div
                            key={`art-desktop-${current.path}`}
                            className="aspect-square w-full max-w-[500px] shadow-[0_30px_60px_rgba(0,0,0,0.5)] rounded-lg overflow-hidden relative cursor-pointer group"
                            onClick={() => hasVideo ? setViewMode('video') : setShowInfo(true)}
                        >
                            {viewMode === 'video' && current.videoPath ? (
                                <video
                                    ref={desktopVideoRef}
                                    key={`desktop-video-${current.path}`}
                                    src={`${API_BASE}${current.videoPath}`}
                                    className="w-full h-full object-cover cursor-pointer"
                                    autoPlay={isPlaying}
                                    onClick={togglePlay}
                                    onEnded={() => {
                                        if (onVideoEnd) onVideoEnd();
                                    }}
                                    onError={(e) => {
                                        console.error("Video failed to load", e);
                                        setViewMode('art');
                                    }}
                                />
                            ) : (
                                art ? <img src={art} alt={title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/10 flex items-center justify-center"><IconMusic size={100} opacity={0.2} /></div>
                            )}

                            {/* Hover Overlay */}
                            {viewMode !== 'video' && (
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                    {hasVideo ? <IconAirplay size={48} className="text-white" /> : <IconInfo size={48} className="text-white" />}
                                    <span className="absolute bottom-4 text-sm font-bold tracking-widest text-white/80">{hasVideo ? 'PLAY VIDEO' : 'DETAILS'}</span>
                                </div>
                            )}
                        </div>

                        <div className="w-full max-w-[500px] mt-8 text-center lg:text-left flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0" key={`info-desktop-${current.path}`}>
                                <h1 className="text-3xl lg:text-4xl font-bold truncate leading-tight cursor-pointer hover:underline" onClick={() => setShowInfo(true)}>{title}</h1>
                                <p
                                    className="text-xl lg:text-2xl text-white/60 mt-2 truncate cursor-pointer hover:text-white transition hover:underline"
                                    onClick={() => handleArtistAction()}
                                >{artist}</p>
                            </div>
                            <button onClick={toggleFavorite} className={`shrink-0 p-2 transition ${isFavorite ? 'text-red-500' : 'text-white/40 hover:text-white'}`}>
                                {isFavorite ? <IconHeartFilled size={32} /> : <IconHeart size={32} />}
                            </button>
                        </div>

                        {/* Desktop Controls */}
                        <div className="w-full max-w-[500px] mt-8">
                            <input
                                type="range"
                                min={0}
                                max={duration || 100}
                                value={currentTime}
                                onChange={(e) => onTimeChange(Number(e.target.value))}
                                className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:scale-150 transition-all"
                                style={{
                                    background: `linear-gradient(to right, white ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255,255,255,0.1) 0)`
                                }}
                            />
                            <div className="flex justify-between text-xs font-mono text-white/40 mt-1">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                            {/* Buttons */}
                            <div className="flex items-center justify-between mt-6 px-4">
                                <button onClick={toggleShuffle} className={`${isShuffle ? 'text-green-400 scale-110' : 'text-white/40 hover:text-white'} transition`}><IconShuffle size={24} /></button>
                                <button onClick={onPrev} className="text-white hover:opacity-70 active:scale-95 transition"><IconSkipBack size={36} className="fill-current" /></button>
                                <button onClick={togglePlay} className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-2xl">
                                    {isPlaying ? <IconPause size={36} className="fill-current" /> : <IconPlay size={36} className="ml-1 fill-current" />}
                                </button>
                                <button onClick={onNext} className="text-white hover:opacity-70 active:scale-95 transition"><IconSkipForward size={36} className="fill-current" /></button>
                                <button onClick={toggleRepeat} className={`relative ${repeatMode !== 'off' ? 'text-green-400 scale-110' : 'text-white/40 hover:text-white'} transition`}>
                                    <IconRepeat size={24} />
                                    {repeatMode === 'one' && <span className="absolute -top-2 -right-2 text-[10px] font-black bg-black/50 px-1 rounded-full">1</span>}
                                </button>
                            </div>
                            {/* View Toggle Buttons */}
                            <div className="flex items-center justify-center gap-12 mt-10">
                                <button
                                    className={`p-2 transition hover:scale-110 ${viewMode === 'lyrics' ? 'text-white bg-white/10 rounded-lg' : 'text-white/40 hover:text-white'}`}
                                    onClick={() => setViewMode(prev => prev === 'lyrics' ? 'art' : 'lyrics')}
                                >
                                    <IconQuote size={24} />
                                </button>
                                <button
                                    className={`p-2 transition hover:scale-110 ${viewMode === 'video' ? 'text-white bg-white/10 rounded-lg' : (hasVideo ? 'text-white/80 hover:text-white' : 'text-white/20')}`}
                                    onClick={handleVideoToggle}
                                    disabled={!hasVideo}
                                >
                                    <IconAirplay size={24} />
                                </button>
                                <button
                                    className={`p-2 transition hover:scale-110 ${viewMode === 'queue' ? 'text-white bg-white/10 rounded-lg' : 'text-white/40 hover:text-white'}`}
                                    onClick={() => setViewMode(prev => prev === 'queue' ? 'art' : 'queue')}
                                >
                                    <IconListMusic size={24} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="w-1/2 h-full overflow-hidden mask-linear-fade relative">
                        {/* Desktop Lyrics/Queue */}
                        <div className="h-full overflow-y-auto custom-scrollbar pr-4 py-20">
                            {viewMode === 'lyrics' || viewMode === 'art' || viewMode === 'video' ? (
                                <>
                                    <div className="absolute top-8 right-40 flex gap-2 p-2 bg-black/20 rounded-lg z-20">
                                        <button onClick={() => setLyricsStyle('default')} className={`px-2 py-1 text-xs rounded ${lyricsStyle === 'default' ? 'bg-white/30' : 'bg-white/10'}`}>Default</button>
                                        <button onClick={() => setLyricsStyle('handwriting')} className={`px-2 py-1 text-xs rounded ${lyricsStyle === 'handwriting' ? 'bg-white/30' : 'bg-white/10'}`}>Handwriting</button>
                                        <button onClick={() => setLyricsStyle('typing')} className={`px-2 py-1 text-xs rounded ${lyricsStyle === 'typing' ? 'bg-white/30' : 'bg-white/10'}`}>Typing</button>
                                    </div>
                                    <LyricsView rawLrc={rawLrc} currentTime={currentTime} scrollable={true} onLineClick={onTimeChange} style={lyricsStyle} />
                                </>
                            ) : (
                                <div className="space-y-4 px-4">
                                    {/* History Desktop */}
                                    {history.length > 0 && (
                                        <>
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-white/50 mb-6 sticky top-0 bg-transparent backdrop-blur-md py-4 z-10 border-b border-white/10">History</h3>
                                            {history.map((song, idx) => (
                                                <div
                                                    key={`hist-desk-${idx}`}
                                                    className="flex items-center gap-6 p-4 rounded-xl hover:bg-white/10 active:bg-white/20 transition cursor-pointer group border border-transparent hover:border-white/5 opacity-50 hover:opacity-100"
                                                    onClick={() => onQueueItemClick(song)}
                                                >
                                                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/10 shrink-0 relative shadow-lg">
                                                        {song.tags?.picture ? (
                                                            <img src={getAlbumArt(song.tags.picture) || ''} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition" />
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full"><IconMusic size={24} /></div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <div className="text-lg font-bold truncate text-white mb-1 group-hover:underline">{song.tags?.title || song.path.split('/').pop()?.replace(/\.[^/.]+$/, "")}</div>
                                                        <div className="text-sm text-white/60 truncate">{song.tags?.artist || "Unknown Artist"}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="py-2 flex items-center justify-center">
                                                <div className="w-2 h-2 bg-white/20 rounded-full"></div>
                                            </div>
                                        </>
                                    )}

                                    <h3 ref={desktopQueueRef} className="text-sm font-bold uppercase tracking-widest text-white/50 mb-6 sticky top-0 bg-transparent backdrop-blur-md py-4 z-10 border-b border-white/10">Up Next</h3>
                                    {queue.length > 0 ? queue.map((song, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-6 p-4 rounded-xl hover:bg-white/10 active:bg-white/20 transition cursor-pointer group border border-transparent hover:border-white/5"
                                            onClick={() => onQueueItemClick(song)}
                                        >
                                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/10 shrink-0 relative shadow-lg">
                                                {song.tags?.picture ? (
                                                    <img src={getAlbumArt(song.tags.picture) || ''} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full"><IconMusic size={24} /></div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <div className="text-lg font-bold truncate text-white mb-1 group-hover:underline">{song.tags?.title || song.path.split('/').pop()?.replace(/\.[^/.]+$/, "")}</div>
                                                <div className="text-sm text-white/60 truncate">{song.tags?.artist || "Unknown Artist"}</div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-white/40 text-center py-20 text-lg">No songs in queue</div>
                                    )}
                                    <div className="h-24"></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </motion.div>
        </AnimatePresence>
    );
}
