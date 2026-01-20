import { useMemo } from 'react';
import { SongMeta, Picture } from '../types/music';
import { IconPlay, IconChevronLeft, IconMusic, IconStar, IconStarFilled } from '../components/Icons';

type AlbumViewProps = {
    artist: string;
    album: string;
    songs: SongMeta[];
    onBack: () => void;
    onPlaySong: (song: SongMeta) => void;
    getAlbumArt: (picture?: Picture) => string | null;
    isFavoriteAlbum?: boolean;
    onToggleFavoriteAlbum?: (artist: string, album: string) => void;
};

export function AlbumView({ artist, album, songs, onBack, onPlaySong, getAlbumArt, isFavoriteAlbum, onToggleFavoriteAlbum }: AlbumViewProps) {
    // Filter songs by artist and album
    const albumSongs = useMemo(() => {
        return songs.filter(s =>
            (s.tags?.artist || "Unknown Artist") === artist &&
            (s.tags?.album || "Unknown Album") === album
        );
    }, [songs, artist, album]);

    const albumArt = useMemo(() => {
        const withArt = albumSongs.find(s => s.tags?.picture);
        return withArt?.tags?.picture ? getAlbumArt(withArt.tags.picture) : null;
    }, [albumSongs, getAlbumArt]);

    const handlePlayAll = () => {
        if (albumSongs.length > 0) onPlaySong(albumSongs[0]);
    };

    const totalDuration = useMemo(() => {
        return albumSongs.reduce((acc, song) => acc + (song.tags?.duration || 0), 0);
    }, [albumSongs]);

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours} hr ${minutes} min`;
        }
        return `${minutes} min`;
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-black text-black dark:text-white overflow-y-auto custom-scrollbar animate-fade-in pb-32">
            {/* Header */}
            <div className="relative h-80 md:h-96 shrink-0">
                <div className="absolute inset-0 bg-gradient-to-b from-gray-200 to-white dark:from-gray-900 dark:to-black">
                    {albumArt && (
                        <>
                            <img src={albumArt} alt={album} className="w-full h-full object-cover opacity-30 blur-2xl dark:opacity-40" />
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
                        {onToggleFavoriteAlbum && (
                            <button
                                onClick={() => onToggleFavoriteAlbum(artist, album)}
                                className={`w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center hover:scale-105 transition ${isFavoriteAlbum
                                        ? 'bg-yellow-500 text-white'
                                        : 'bg-white/50 dark:bg-black/50 text-gray-700 dark:text-gray-300'
                                    }`}
                                title={isFavoriteAlbum ? 'お気に入りから削除' : 'お気に入りに追加'}
                            >
                                {isFavoriteAlbum ? <IconStarFilled size={20} /> : <IconStar size={20} />}
                            </button>
                        )}
                    </div>

                    <div className="flex items-end gap-6">
                        {albumArt ? (
                            <img src={albumArt} className="w-48 h-48 rounded-lg shadow-2xl object-cover" alt={album} />
                        ) : (
                            <div className="w-48 h-48 rounded-lg bg-gray-200 dark:bg-white/10 flex items-center justify-center shadow-2xl">
                                <IconMusic className="text-gray-400" size={64} />
                            </div>
                        )}

                        <div className="flex-1">
                            <p className="text-sm font-semibold uppercase tracking-wider mb-2 text-gray-600 dark:text-gray-400">Album</p>
                            <h1 className="text-4xl md:text-6xl font-black tracking-tight drop-shadow-lg mb-4">{album}</h1>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-semibold text-black dark:text-white">{artist}</span>
                                <span>•</span>
                                <span>{albumSongs[0]?.tags?.year || ''}</span>
                                <span>•</span>
                                <span>{albumSongs.length} songs</span>
                                <span>•</span>
                                <span>{formatDuration(totalDuration)}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handlePlayAll}
                        className="mt-6 px-8 py-3 bg-red-500 text-white rounded-lg font-bold hover:scale-105 active:scale-95 transition shadow-lg flex items-center gap-2 w-fit"
                    >
                        <IconPlay className="fill-current" size={20} /> Play
                    </button>
                </div>
            </div>

            {/* Track List */}
            <div className="p-6 md:p-10">
                <div className="space-y-1">
                    {albumSongs.map((song, idx) => (
                        <div
                            key={song.path}
                            className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer group transition"
                            onClick={() => onPlaySong(song)}
                        >
                            <span className="w-8 text-center text-gray-400 text-sm font-mono group-hover:hidden">{idx + 1}</span>
                            <span className="w-8 text-center hidden group-hover:block"><IconPlay size={16} /></span>

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
        </div>
    );
}
