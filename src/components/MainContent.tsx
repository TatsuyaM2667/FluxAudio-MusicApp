import { SongMeta, Playlist } from '../types/music';
import { ArtistView } from './ArtistView';
import { AlbumView } from '../pages/AlbumView';
import { SearchView } from './SearchView';
import { LibraryView } from './LibraryView';
import { MyPage } from './MyPage';
import { PlaylistView } from './PlaylistView';
import { SongCard } from './SongCard';
import { IconHeartFilled, IconListMusic, IconSearch, IconCloudDownload, IconCheck } from './Icons';
import { getPageTitle } from '../hooks/useAlbumArt';
import { platform } from '../utils/platform';
import { downloadService } from '../services/DownloadService';
import { useDownloads } from '../hooks/useDownloads';
import { useState } from 'react';
import { useOffline } from '../hooks/useOffline';

interface MainContentProps {
    view: string;
    selectedArtist: string | null;
    selectedAlbum: string | null;
    songs: SongMeta[];
    playlists: Playlist[];
    favorites: string[];
    searchQuery: string;
    loading: boolean;
    displaySongs: SongMeta[];

    onPlaySong: (song: SongMeta) => void;
    onArtistClick: (artist: string) => void;
    onAlbumClick: (artist: string, album: string) => void;
    onPlaylistClick: (id: string) => void;
    onToggleFavorite: (path: string) => void;
    onPlayNext: (song: SongMeta) => void;
    onAddToPlaylist: (song: SongMeta) => void;
    onDelete: (song: SongMeta) => void;
    getAlbumArt: (picture?: any) => string | null;
    setView: (view: string) => void;
    setSearchQuery: (query: string) => void;
    setSelectedAlbum: (album: string | null) => void;
    current: SongMeta | null;
    isPlaying: boolean;
    isFavoriteArtist?: (artist: string) => boolean;
    favoriteArtists?: string[];
    onToggleFavoriteArtist?: (artist: string) => void;
    isFavoriteAlbum?: (artist: string, album: string) => boolean;
    favoriteAlbums?: { artist: string, album: string }[];
    onToggleFavoriteAlbum?: (artist: string, album: string) => void;
}

export function MainContent({
    view,
    selectedArtist,
    selectedAlbum,
    songs,
    playlists,
    favorites,
    searchQuery,
    loading,
    displaySongs,
    onPlaySong,
    onArtistClick,
    onAlbumClick,
    onPlaylistClick,
    onToggleFavorite,
    onPlayNext,
    onAddToPlaylist,
    onDelete,
    getAlbumArt,
    setView,
    setSearchQuery,
    setSelectedAlbum,
    current,
    isPlaying,
    isFavoriteArtist,
    favoriteArtists,
    onToggleFavoriteArtist,
    isFavoriteAlbum,
    favoriteAlbums,
    onToggleFavoriteAlbum
}: MainContentProps) {
    const { isDownloaded, progress } = useDownloads();
    const [downloading, setDownloading] = useState(false);
    const isOffline = useOffline();

    const handleDownloadAll = async (targetSongs: SongMeta[]) => {
        if (downloading) return;
        setDownloading(true);
        downloadService.setTotalToDownload(targetSongs.length);
        for (const song of targetSongs) {
            await downloadService.downloadSong(song);
        }
        setDownloading(false);
        downloadService.setTotalToDownload(0);
    };

    // Artist View
    if (view === 'artist' && selectedArtist) {
        return (
            <ArtistView
                artist={selectedArtist}
                songs={songs}
                onBack={() => setView('home')}
                onPlaySong={onPlaySong}
                getAlbumArt={getAlbumArt}
                onAlbumClick={onAlbumClick}
                isFavoriteArtist={isFavoriteArtist ? isFavoriteArtist(selectedArtist) : false}
                onToggleFavoriteArtist={onToggleFavoriteArtist}
            />
        );
    }

    // Album View
    if (view === 'album' && selectedArtist && selectedAlbum) {
        return (
            <AlbumView
                artist={selectedArtist}
                album={selectedAlbum}
                songs={songs}
                onBack={() => {
                    setView('artist');
                    setSelectedAlbum(null);
                }}
                onPlaySong={onPlaySong}
                getAlbumArt={getAlbumArt}
                isFavoriteAlbum={isFavoriteAlbum ? isFavoriteAlbum(selectedArtist, selectedAlbum) : false}
                onToggleFavoriteAlbum={onToggleFavoriteAlbum}
            />
        );
    }

    // Playlist View
    if (view.startsWith('playlist-')) {
        const playlistId = view.replace('playlist-', '');

        let playlist = playlists.find(p => p.id === playlistId);

        // Special case for 'downloaded'
        if (playlistId === 'downloaded') {
            // We need to filter songs that are downloaded
            // Note: isDownloaded is available from useDownloads hook at top of component
            const downloadedPaths = songs.filter(s => isDownloaded(s.path)).map(s => s.path);
            playlist = {
                id: 'downloaded',
                name: 'ダウンロード済み',
                songs: downloadedPaths,
                createdAt: Date.now()
            };
        }

        if (playlist) {
            return (
                <PlaylistView
                    playlist={playlist}
                    songs={songs}
                    onBack={() => setView('library')}
                    onPlaySong={onPlaySong}
                    getAlbumArt={getAlbumArt}
                    onArtistClick={onArtistClick}
                    favorites={favorites}
                    onToggleFavorite={onToggleFavorite}
                    onPlayNext={onPlayNext}
                    onAddToPlaylist={onAddToPlaylist}
                    onDelete={onDelete}
                />
            );
        }
    }

    // Default scrollable content view
    return (
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32 md:pb-32 custom-scrollbar">
            <div className="mt-4 mb-8">
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl md:text-3xl font-bold text-black dark:text-white tracking-tight">
                            {isOffline && view === 'home' ? 'ダウンロード済み' : getPageTitle(view)}
                        </h2>
                        {view === 'favorites' && platform.isNative() && displaySongs.length > 0 && (
                            (() => {
                                const downloadedCount = displaySongs.filter(s => isDownloaded(s.path)).length;
                                const isAll = downloadedCount === displaySongs.length;

                                return (
                                    <button
                                        onClick={() => handleDownloadAll(displaySongs)}
                                        disabled={isAll || downloading}
                                        className={`
                                            ml-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition
                                            ${isAll
                                                ? 'bg-green-500/20 text-green-600 dark:text-green-400 cursor-default'
                                                : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white'
                                            }
                                            ${downloading ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        {isAll ? <IconCheck size={14} /> : downloading ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <IconCloudDownload size={14} />}
                                        {isAll ? 'Downloaded' : downloading ? `Downloading... ${progress.remaining}/${progress.total}` : 'Download All'}
                                    </button>
                                );
                            })()
                        )}
                    </div>

                    {view === 'search' && (
                        <div className="relative w-full max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <IconSearch size={18} className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="w-full bg-gray-100 dark:bg-[#1c1c1e] text-black dark:text-white border-none rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-green-500 transition-all placeholder-gray-500"
                                placeholder="Artists, songs, or albums"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                    </div>
                ) : view === 'search' ? (
                    <SearchView
                        query={searchQuery}
                        songs={songs}
                        onPlaySong={onPlaySong}
                        onArtistClick={onArtistClick}
                        onAlbumClick={onAlbumClick}
                        getAlbumArt={getAlbumArt}
                    />
                ) : view === 'library' ? (
                    <LibraryView
                        songs={songs}
                        playlists={playlists}
                        onAlbumClick={onAlbumClick}
                        onPlaylistClick={onPlaylistClick}
                        getAlbumArt={getAlbumArt}
                        favoriteArtists={favoriteArtists}
                        favoriteAlbums={favoriteAlbums}
                        onArtistClick={onArtistClick}
                    />
                ) : view === 'mypage' ? (
                    <MyPage
                        songs={songs}
                        onPlaySong={onPlaySong}
                        getAlbumArt={getAlbumArt}
                        onArtistClick={onArtistClick}
                    />
                ) : (
                    <>
                        {displaySongs.length === 0 && (
                            <div className="text-center text-gray-400 py-10">
                                {isOffline ? (
                                    <>
                                        <div className="text-4xl mb-4">📴</div>
                                        <p className="mb-2 text-lg font-medium text-white">オフラインです</p>
                                        <p className="text-sm mb-4">ダウンロード済みの曲がありません</p>
                                        <p className="text-xs text-gray-500">
                                            プレイリストから曲をダウンロードすると、<br />
                                            オフラインでも再生できます
                                        </p>
                                    </>
                                ) : (
                                    <p>No songs found.</p>
                                )}
                            </div>
                        )}

                        {/* Grid Layout with Special Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4 auto-rows-fr">
                            {/* Special Cards only on Home & No Search */}
                            {view === 'home' && !searchQuery && (
                                <>
                                    {/* Liked Songs Card */}
                                    <div
                                        onClick={() => setView('favorites')}
                                        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 p-4 text-white shadow-xl cursor-pointer hover:scale-[1.02] transition-transform active:scale-[0.98] flex flex-col justify-between h-40 md:h-48"
                                    >
                                        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/20 blur-3xl rounded-full pointer-events-none" />
                                        <div className="relative z-10 flex items-start justify-between">
                                            <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg">
                                                <IconHeartFilled size={20} className="text-white" />
                                            </div>
                                            <span className="text-2xl font-bold opacity-20">{favorites.length}</span>
                                        </div>
                                        <div className="relative z-10">
                                            <h3 className="text-lg md:text-xl font-bold leading-tight">お気に入り</h3>
                                            <p className="text-white/70 text-xs mt-1">Favorites</p>
                                        </div>
                                    </div>

                                    {/* New Arrivals Card */}
                                    <div
                                        onClick={() => setView('new_arrivals')}
                                        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-4 text-white shadow-xl cursor-pointer hover:scale-[1.02] transition-transform active:scale-[0.98] flex flex-col justify-between h-40 md:h-48"
                                    >
                                        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-white/20 blur-3xl rounded-full pointer-events-none" />
                                        <div className="relative z-10 flex items-start justify-between">
                                            <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg">
                                                <IconListMusic size={20} className="text-white" />
                                            </div>
                                            <div className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-bold uppercase tracking-wider">New</div>
                                        </div>
                                        <div className="relative z-10">
                                            <h3 className="text-lg md:text-xl font-bold leading-tight">新着ソング</h3>
                                            <p className="text-white/70 text-xs mt-1">New Arrivals</p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Song Cards */}
                            {/* Song Cards */}
                            {(view === 'new_arrivals'
                                ? (isOffline
                                    ? songs.filter(s => isDownloaded(s.path)).sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, 10)
                                    : [...songs].sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, 10))
                                : (isOffline && view === 'home'
                                    ? displaySongs.filter(s => isDownloaded(s.path))
                                    : displaySongs)
                            ).map((song) => (
                                <SongCard
                                    key={song.path}
                                    song={song}
                                    isCurrent={current?.path === song.path}
                                    isPlaying={isPlaying}
                                    isFavorite={favorites.includes(song.path)}
                                    onToggleFavorite={(e) => { e.stopPropagation(); onToggleFavorite(song.path); }}
                                    onClick={() => onPlaySong(song)}
                                    onPlayNext={() => onPlayNext(song)}
                                    onAddToPlaylist={() => onAddToPlaylist(song)}
                                    onDelete={onDelete}
                                    getAlbumArt={getAlbumArt}
                                    onArtistClick={onArtistClick}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
