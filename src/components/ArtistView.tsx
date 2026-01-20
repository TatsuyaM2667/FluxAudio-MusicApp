import { useMemo } from 'react';
import { API_BASE } from '../config';
import { SongMeta, Picture } from '../types/music';
import { IconPlay, IconShuffle, IconChevronLeft, IconMusic, IconStar, IconStarFilled } from './Icons';

type ArtistViewProps = {
    artist: string;
    songs: SongMeta[];
    onBack: () => void;
    onPlaySong: (song: SongMeta) => void;
    getAlbumArt: (picture?: Picture) => string | null;
    onAlbumClick: (artist: string, album: string) => void;
    isFavoriteArtist?: boolean;
    onToggleFavoriteArtist?: (artist: string) => void;
};

export function ArtistView({ artist, songs, onBack, onPlaySong, getAlbumArt, onAlbumClick, isFavoriteArtist, onToggleFavoriteArtist }: ArtistViewProps) {
    // Filter songs by artist
    const artistSongs = useMemo(() => {
        return songs.filter(s => (s.tags?.artist || "Unknown Artist") === artist);
    }, [songs, artist]);

    // Group by Album
    const albums = useMemo(() => {
        const groups: Record<string, SongMeta[]> = {};
        artistSongs.forEach(song => {
            const album = song.tags?.album || "Unknown Album";
            if (!groups[album]) groups[album] = [];
            groups[album].push(song);
        });
        return groups;
    }, [artistSongs]);

    const handlePlayAll = () => {
        if (artistSongs.length > 0) onPlaySong(artistSongs[0]);
    };

    const handleShuffle = () => {
        if (artistSongs.length > 0) {
            const randomIdx = Math.floor(Math.random() * artistSongs.length);
            onPlaySong(artistSongs[randomIdx]);
            // Note: Actual shuffle state needs to be set in App.tsx, but starting playback is the first step
        }
    };

    // Get artist image (from first song with artistImage)
    const artistImage = useMemo(() => {
        const withImage = artistSongs.find(s => s.artistImage);
        return withImage?.artistImage ? `${API_BASE}${withImage.artistImage}` : null;
    }, [artistSongs]);

    // Get a representative image (first song with art)
    const heroArt = useMemo(() => {
        if (artistImage) return artistImage;
        const withArt = artistSongs.find(s => s.tags?.picture);
        return withArt?.tags?.picture ? getAlbumArt(withArt.tags.picture) : null;
    }, [artistSongs, getAlbumArt, artistImage]);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-black text-black dark:text-white overflow-y-auto custom-scrollbar animate-fade-in pb-32">

            {/* Header */}
            <div className="relative h-[50vh] shrink-0">
                <div className="absolute inset-0 bg-gradient-to-b from-gray-200 to-white dark:from-gray-900 dark:to-black">
                    {heroArt && (
                        <>
                            <img src={heroArt} alt={artist} className="w-full h-full object-cover opacity-20 dark:opacity-30" />
                            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-black to-transparent" />
                        </>
                    )}
                </div>

                <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 z-10">
                    <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
                        <button
                            onClick={onBack}
                            className="w-10 h-10 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center hover:scale-105 transition"
                        >
                            <IconChevronLeft />
                        </button>
                        {onToggleFavoriteArtist && (
                            <button
                                onClick={() => onToggleFavoriteArtist(artist)}
                                className={`w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center hover:scale-105 transition ${isFavoriteArtist
                                        ? 'bg-yellow-500 text-white'
                                        : 'bg-white/50 dark:bg-black/50 text-gray-700 dark:text-gray-300'
                                    }`}
                                title={isFavoriteArtist ? 'お気に入りから削除' : 'お気に入りに追加'}
                            >
                                {isFavoriteArtist ? <IconStarFilled size={20} /> : <IconStar size={20} />}
                            </button>
                        )}
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black tracking-tight drop-shadow-lg mb-4">{artist}</h1>
                    <div className="flex gap-4">
                        <button
                            onClick={handlePlayAll}
                            className="px-8 py-3 bg-red-500 text-white rounded-lg font-bold hover:scale-105 active:scale-95 transition shadow-lg flex items-center gap-2"
                        >
                            <IconPlay className="fill-current" size={20} /> Play
                        </button>
                        <button
                            onClick={handleShuffle}
                            className="px-8 py-3 bg-gray-200 dark:bg-gray-800 text-black dark:text-white rounded-lg font-bold hover:scale-105 active:scale-95 transition shadow-lg flex items-center gap-2"
                        >
                            <IconShuffle size={20} /> Shuffle
                        </button>
                    </div>
                </div>
            </div>

            {/* Albums List */}
            <div className="p-6 md:p-10 space-y-12">
                {Object.keys(albums).filter(name => name !== "Unknown Album").map(albumName => {
                    const albumSongs = albums[albumName];
                    const albumArt = albumSongs.find(s => s.tags?.picture)?.tags?.picture;
                    const artUrl = albumArt ? getAlbumArt(albumArt) : null;

                    return (
                        <div key={albumName}>
                            <div
                                className="flex items-end gap-4 mb-4 border-b border-gray-100 dark:border-white/10 pb-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg p-2 -m-2 transition"
                                onClick={() => onAlbumClick(artist, albumName)}
                            >
                                {artUrl ? (
                                    <img src={artUrl} className="w-16 h-16 rounded shadow-md object-cover" alt={albumName} />
                                ) : (
                                    <div className="w-16 h-16 rounded bg-gray-200 dark:bg-white/10 flex items-center justify-center">
                                        <IconMusic className="text-gray-400" />
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-xl md:text-2xl font-bold">{albumName}</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{albumSongs[0].tags?.year || ''} • {albumSongs.length} songs</p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                {albumSongs.map((song, idx) => (
                                    <div
                                        key={song.path}
                                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer group transition"
                                        onClick={() => onPlaySong(song)}
                                    >
                                        <span className="w-6 text-center text-gray-400 text-sm font-mono group-hover:hidden">{idx + 1}</span>
                                        <span className="w-6 text-center hidden group-hover:block"><IconPlay size={16} /></span>

                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{song.tags?.title || song.path.split('/').pop()}</div>
                                        </div>
                                        <div className="text-xs text-gray-400 font-mono">
                                            {Math.floor((song.tags?.duration || 0) / 60)}:{Math.floor((song.tags?.duration || 0) % 60).toString().padStart(2, '0')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
