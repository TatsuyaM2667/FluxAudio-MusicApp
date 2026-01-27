import { useMemo } from 'react';
import { SongMeta, Playlist } from '../types/music';
import { SongCard } from './SongCard';
import { IconChevronLeft, IconCloudDownload, IconCheck } from './Icons';
import { platform } from '../utils/platform';
import { downloadService } from '../services/DownloadService';
import { useDownloads } from '../hooks/useDownloads';
import { useState } from 'react';

interface PlaylistViewProps {
    playlist: Playlist;
    songs: SongMeta[];
    onBack: () => void;
    onPlaySong: (song: SongMeta, context?: SongMeta[]) => void;
    getAlbumArt: (picture?: any) => string | null;
    onArtistClick: (artist: string) => void;
    favorites: string[];
    onToggleFavorite: (path: string) => void;
    onPlayNext: (song: SongMeta) => void;
    onAddToPlaylist: (song: SongMeta) => void;
    onDelete: (song: SongMeta) => void;
}

export function PlaylistView({
    playlist,
    songs,
    onBack,
    onPlaySong,
    getAlbumArt,
    onArtistClick,
    favorites,
    onToggleFavorite,
    onPlayNext,
    onAddToPlaylist,
    onDelete
}: PlaylistViewProps) {
    const playlistSongs = useMemo(() => {
        return playlist.songs
            .map(path => songs.find(s => s.path === path))
            .filter(s => s !== undefined) as SongMeta[];
    }, [playlist.songs, songs]);

    const playlistCover = useMemo(() => {
        const firstFourSongs = playlistSongs.slice(0, 4);
        return firstFourSongs.map(song => {
            if (song.tags?.picture) {
                return getAlbumArt(song.tags.picture);
            }
            return null;
        });
    }, [playlistSongs, getAlbumArt]);

    const { isDownloaded } = useDownloads();
    const [downloading, setDownloading] = useState(false);

    const playlistDownloadedCount = playlistSongs.filter(s => isDownloaded(s.path)).length;
    const isAllDownloaded = playlistSongs.length > 0 && playlistDownloadedCount === playlistSongs.length;

    const handleDownloadAll = async () => {
        if (downloading) return;
        setDownloading(true);
        // Sequential download to avoid overwhelming
        for (const song of playlistSongs) {
            await downloadService.downloadSong(song);
        }
        setDownloading(false);
    };

    return (
        <div className="flex-1 overflow-y-auto pb-32 custom-scrollbar">
            {/* Header */}
            <div className="relative">
                <div className="absolute top-4 left-4 z-20">
                    <button
                        onClick={onBack}
                        className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 transition"
                    >
                        <IconChevronLeft />
                    </button>
                </div>

                <div className="h-80 bg-gradient-to-b from-purple-600 to-purple-900 dark:from-purple-800 dark:to-black flex items-end p-8">
                    <div className="flex items-end gap-6 w-full">
                        {/* Playlist Cover */}
                        <div className="w-48 h-48 rounded-lg shadow-2xl bg-gray-800 overflow-hidden shrink-0">
                            {playlistCover.some(c => c !== null) ? (
                                <div className="grid grid-cols-2 gap-0.5 w-full h-full p-0.5">
                                    {[0, 1, 2, 3].map(i => (
                                        <div key={i} className="bg-gray-700">
                                            {playlistCover[i] ? (
                                                <img src={playlistCover[i]!} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600"></div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600">
                                    <span className="text-6xl opacity-50">🎵</span>
                                </div>
                            )}
                        </div>

                        {/* Playlist Info */}
                        <div className="flex-1 pb-4">
                            <div className="text-xs font-semibold uppercase tracking-wider mb-2">プレイリスト</div>
                            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">{playlist.name}</h1>
                            <div className="text-sm opacity-80 mb-4">
                                {playlistSongs.length} {playlistSongs.length === 1 ? 'song' : 'songs'}
                                {platform.isNative() && (
                                    <span className="ml-2 opacity-70">
                                        • {playlistDownloadedCount} downloaded
                                    </span>
                                )}
                            </div>

                            {platform.isNative() && (
                                <button
                                    onClick={handleDownloadAll}
                                    disabled={isAllDownloaded || downloading}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition
                                        ${isAllDownloaded
                                            ? 'bg-green-500/20 text-green-300 cursor-default'
                                            : 'bg-white/10 hover:bg-white/20 text-white'
                                        }
                                        ${downloading ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                                >
                                    {isAllDownloaded ? (
                                        <>
                                            <IconCheck size={18} />
                                            <span>Downloaded</span>
                                        </>
                                    ) : downloading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Downloading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <IconCloudDownload size={18} />
                                            <span>Download All</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Song List */}
            <div className="px-4 md:px-8 pt-6">
                {playlistSongs.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                        {playlistSongs.map(song => (
                            <SongCard
                                key={song.path}
                                song={song}
                                isCurrent={false}
                                isPlaying={false}
                                isFavorite={favorites.includes(song.path)}
                                onToggleFavorite={(e) => { e.stopPropagation(); onToggleFavorite(song.path); }}
                                onClick={() => {
                                    console.log('[PlaylistView] Clicked:', song.tags?.title, 'Playlist songs:', playlistSongs.length);
                                    onPlaySong(song, playlistSongs);
                                }}
                                onPlayNext={() => onPlayNext(song)}
                                onAddToPlaylist={() => onAddToPlaylist(song)}
                                onDelete={onDelete}
                                getAlbumArt={getAlbumArt}
                                onArtistClick={onArtistClick}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-gray-400 py-20">
                        <p>このプレイリストには曲がありません</p>
                    </div>
                )}
            </div>
        </div>
    );
}
