import { useMemo, useState } from 'react';
import { SongMeta, Playlist } from '../types/music';
import { IconLibrary, IconListMusic, IconStar, IconCloudDownload } from './Icons';
import { API_BASE } from '../config';
import { useDownloads } from '../hooks/useDownloads';
import { platform } from '../utils/platform';

type LibraryViewProps = {
    songs: SongMeta[];
    playlists: Playlist[];
    onAlbumClick: (artist: string, album: string) => void;
    onPlaylistClick: (id: string) => void;
    getAlbumArt: (picture?: any) => string | null;
    favoriteArtists?: string[];
    favoriteAlbums?: { artist: string, album: string }[];
    onArtistClick?: (artist: string) => void;
};

export function LibraryView({ songs, playlists, onAlbumClick, onPlaylistClick, getAlbumArt, favoriteArtists = [], favoriteAlbums = [], onArtistClick }: LibraryViewProps) {
    const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
    const albums = useMemo(() => {
        const albumMap = new Map<string, SongMeta>();
        songs.forEach(song => {
            if (song.tags?.album && song.tags.album !== "Unknown Album") {
                if (!albumMap.has(song.tags.album)) {
                    albumMap.set(song.tags.album, song);
                }
            }
        });
        return Array.from(albumMap.values());
    }, [songs]);

    const getPlaylistCover = (playlist: Playlist) => {
        const songPaths = playlist.songs.slice(0, 4);
        const arts = songPaths.map(path => {
            const song = songs.find(s => s.path === path);
            if (song?.tags?.picture) {
                return getAlbumArt(song.tags.picture);
            }
            return null;
        }).filter(art => art !== null);

        return arts;
    };

    const getArtistImage = (artistName: string) => {
        const song = songs.find(s => s.tags?.artist === artistName && s.artistImage);
        return song?.artistImage ? `${API_BASE}${song.artistImage}` : null;
    };

    const { isDownloaded } = useDownloads();
    const downloadedSongs = useMemo(() => songs.filter(s => isDownloaded(s.path)), [songs, isDownloaded]);

    return (
        <div className="p-4 md:p-8 animate-fade-in pb-32">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 rounded-full font-bold transition ${activeTab === 'all' ? 'bg-white text-black dark:bg-white dark:text-black' : 'bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-gray-400'}`}
                >
                    すべて
                </button>
                <button
                    onClick={() => setActiveTab('favorites')}
                    className={`px-4 py-2 rounded-full font-bold transition flex items-center gap-2 ${activeTab === 'favorites' ? 'bg-white text-black dark:bg-white dark:text-black' : 'bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-gray-400'}`}
                >
                    <IconStar size={16} /> お気に入り
                </button>
            </div>

            {activeTab === 'favorites' ? (
                <div className="space-y-12">
                    {/* Favorite Artists */}
                    <div>
                        <h2 className="text-2xl font-bold text-black dark:text-white tracking-tight mb-6">お気に入りアーティスト</h2>
                        {favoriteArtists.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {favoriteArtists.map(artist => {
                                    const artistImg = getArtistImage(artist);
                                    return (
                                        <div
                                            key={artist}
                                            className="flex flex-col items-center gap-3 cursor-pointer group"
                                            onClick={() => onArtistClick?.(artist)}
                                        >
                                            <div className="aspect-square w-full rounded-full overflow-hidden bg-gray-200 dark:bg-white/10 shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl relative">
                                                {artistImg ? (
                                                    <img src={artistImg} alt={artist} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl font-bold bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                                                        {artist[0]}
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
                                            </div>
                                            <div className="font-bold text-center truncate w-full">{artist}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-gray-500">お気に入りのアーティストはいません。</div>
                        )}
                    </div>

                    {/* Favorite Albums */}
                    <div>
                        <h2 className="text-2xl font-bold text-black dark:text-white tracking-tight mb-6">お気に入りアルバム</h2>
                        {favoriteAlbums.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {favoriteAlbums.map(fa => {
                                    // Find a song from this album to get art
                                    const albumSong = songs.find(s => s.tags?.artist === fa.artist && s.tags?.album === fa.album);
                                    const art = albumSong?.tags?.picture ? getAlbumArt(albumSong.tags.picture) : null;

                                    return (
                                        <div
                                            key={`${fa.artist}-${fa.album}`}
                                            className="flex flex-col gap-2 cursor-pointer group"
                                            onClick={() => onAlbumClick(fa.artist, fa.album)}
                                        >
                                            <div className="aspect-square w-full bg-gray-100 dark:bg-white/10 rounded-lg overflow-hidden shadow-md transition-all duration-300 group-hover:shadow-xl relative">
                                                {art ? (
                                                    <img src={art} alt={fa.album} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <IconLibrary size={48} className="text-gray-400" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                                            </div>
                                            <div>
                                                <div className="font-bold truncate text-sm">{fa.album}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{fa.artist}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-gray-500">お気に入りのアルバムはいません。</div>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {/* Playlists Section */}
                    {(playlists.length > 0 || (platform.isNative() && downloadedSongs.length > 0)) && (
                        <div className="mb-8">
                            <h2 className="text-2xl md:text-3xl font-bold text-black dark:text-white tracking-tight mb-6">プレイリスト</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                                {/* Downloaded Songs Card */}
                                {platform.isNative() && downloadedSongs.length > 0 && (
                                    <div
                                        className="flex flex-col gap-2 cursor-pointer group"
                                        onClick={() => onPlaylistClick('downloaded')}
                                    >
                                        <div className="aspect-square w-full bg-gradient-to-br from-green-500 to-emerald-700 rounded-lg overflow-hidden shadow-md transition-all duration-300 group-hover:shadow-xl relative p-4 flex flex-col justify-between text-white">
                                            <div className="flex justify-end">
                                                <IconCloudDownload size={32} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-xl">Downloaded</div>
                                                <div className="text-sm opacity-80">{downloadedSongs.length} songs</div>
                                            </div>
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
                                        </div>
                                        <div>
                                            <div className="font-bold truncate text-sm">ダウンロード済み</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">Device Storage</div>
                                        </div>
                                    </div>
                                )}

                                {playlists.map(playlist => {
                                    const covers = getPlaylistCover(playlist);
                                    return (
                                        <div
                                            key={playlist.id}
                                            className="flex flex-col gap-2 cursor-pointer group"
                                            onClick={() => onPlaylistClick(playlist.id)}
                                        >
                                            <div className="aspect-square w-full bg-gray-100 dark:bg-white/10 rounded-lg overflow-hidden shadow-md transition-all duration-300 group-hover:shadow-xl relative">
                                                {covers.length > 0 ? (
                                                    <div className="grid grid-cols-2 gap-0.5 w-full h-full p-0.5">
                                                        {[0, 1, 2, 3].map(i => (
                                                            <div key={i} className="bg-gray-200 dark:bg-gray-700">
                                                                {covers[i] ? (
                                                                    <img src={covers[i]!} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <IconListMusic size={24} className="text-gray-400" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <IconListMusic size={48} className="text-gray-400" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                                            </div>
                                            <div>
                                                <div className="font-bold truncate text-sm">{playlist.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{playlist.songs.length} songs</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Albums Section */}
                    <h2 className="text-2xl md:text-3xl font-bold text-black dark:text-white tracking-tight mb-6">アルバム</h2>
                    {albums.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                            {albums.map(albumSong => (
                                <div
                                    key={albumSong.tags?.album}
                                    className="flex flex-col gap-2 cursor-pointer group"
                                    onClick={() => onAlbumClick(albumSong.tags?.artist || 'Unknown', albumSong.tags?.album || 'Unknown')}
                                >
                                    <div className="aspect-square w-full bg-gray-100 dark:bg-white/10 rounded-lg overflow-hidden shadow-md transition-all duration-300 group-hover:shadow-xl relative">
                                        {albumSong.tags?.picture ? (
                                            <img src={getAlbumArt(albumSong.tags.picture) || ''} alt={albumSong.tags?.album} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <IconLibrary size={48} className="text-gray-400" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                                    </div>
                                    <div>
                                        <div className="font-bold truncate text-sm">{albumSong.tags?.album}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{albumSong.tags?.artist}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 py-10">
                            <p>No albums found in your library.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
