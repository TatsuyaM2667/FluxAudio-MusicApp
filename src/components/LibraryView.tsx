import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { SongMeta, Playlist } from '../types/music';
import { IconLibrary, IconListMusic, IconStar, IconCloudDownload } from './Icons';
import { API_BASE } from '../config';
import { useDownloads } from '../hooks/useDownloads';
import { platform } from '../utils/platform';
import { splitArtists } from '../utils/searchUtils';

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
    const [visibleArtistCount, setVisibleArtistCount] = useState(40);
    const [visibleAlbumCount, setVisibleAlbumCount] = useState(40);
    const artistObserver = useRef<IntersectionObserver | null>(null);
    const albumObserver = useRef<IntersectionObserver | null>(null);

    const lastArtistElementRef = useCallback((node: HTMLDivElement | null) => {
        if (artistObserver.current) artistObserver.current.disconnect();
        artistObserver.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                setVisibleArtistCount(prev => prev + 40);
            }
        }, { rootMargin: '400px' });
        if (node) artistObserver.current.observe(node);
    }, []);

    const lastAlbumElementRef = useCallback((node: HTMLDivElement | null) => {
        if (albumObserver.current) albumObserver.current.disconnect();
        albumObserver.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                setVisibleAlbumCount(prev => prev + 40);
            }
        }, { rootMargin: '400px' });
        if (node) albumObserver.current.observe(node);
    }, []);

    useEffect(() => {
        setVisibleArtistCount(40);
        setVisibleAlbumCount(40);
    }, [activeTab]);

    useEffect(() => {
        return () => {
            artistObserver.current?.disconnect();
            albumObserver.current?.disconnect();
        };
    }, []);

    const songByPath = useMemo(() => {
        const map = new Map<string, SongMeta>();
        songs.forEach(song => map.set(song.path, song));
        return map;
    }, [songs]);

    const artists = useMemo(() => {
        const artistMap = new Map<string, { name: string; image: string | null }>();

        songs.forEach(song => {
            splitArtists(song.tags?.artist).forEach(name => {
                if (!artistMap.has(name)) {
                    artistMap.set(name, { name, image: null });
                }

                const entry = artistMap.get(name);
                if (entry && !entry.image && song.artistImage) {
                    entry.image = `${API_BASE}${song.artistImage}`;
                }
            });
        });

        return Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    }, [songs]);

    const artistImageByName = useMemo(() => {
        const map = new Map<string, string | null>();
        artists.forEach(artist => map.set(artist.name, artist.image));
        return map;
    }, [artists]);

    const albums = useMemo(() => {
        const albumMap = new Map<string, SongMeta>();
        songs.forEach(song => {
            if (song.tags?.album && song.tags.album !== 'Unknown Album') {
                const key = `${song.tags?.artist || 'Unknown Artist'}\u0000${song.tags.album}`;
                if (!albumMap.has(key)) {
                    albumMap.set(key, song);
                }
            }
        });
        return Array.from(albumMap.values());
    }, [songs]);

    const getPlaylistCover = useCallback((playlist: Playlist) => {
        return playlist.songs.slice(0, 4).map(path => {
            const song = songByPath.get(path);
            return song?.tags?.picture ? getAlbumArt(song.tags.picture) : null;
        }).filter((art): art is string => art !== null);
    }, [getAlbumArt, songByPath]);

    const getArtistImage = useCallback((artistName: string) => artistImageByName.get(artistName) || null, [artistImageByName]);

    const { isDownloaded } = useDownloads();
    const downloadedSongs = useMemo(() => songs.filter(s => isDownloaded(s.path)), [songs, isDownloaded]);

    const renderArtistCard = (artist: string, artistImg: string | null = getArtistImage(artist)) => (
        <div
            key={artist}
            className="flex flex-col items-center gap-3 cursor-pointer group min-w-0"
            onClick={() => onArtistClick?.(artist)}
        >
            <div className="aspect-square w-full rounded-full overflow-hidden bg-gray-200 dark:bg-white/10 shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl relative">
                {artistImg ? (
                    <img src={artistImg} alt={artist} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                        {artist[0] || '?'}
                    </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
            </div>
            <div className="font-bold text-center truncate w-full text-black dark:text-white">{artist}</div>
        </div>
    );

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
                    <div>
                        <h2 className="text-2xl font-bold text-black dark:text-white tracking-tight mb-6">お気に入りアーティスト</h2>
                        {favoriteArtists.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {favoriteArtists.map(artist => renderArtistCard(artist))}
                            </div>
                        ) : (
                            <div className="text-gray-500">お気に入りのアーティストはいません。</div>
                        )}
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-black dark:text-white tracking-tight mb-6">お気に入りアルバム</h2>
                        {favoriteAlbums.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {favoriteAlbums.map(fa => {
                                    const albumSong = albums.find(s => s.tags?.artist === fa.artist && s.tags?.album === fa.album);
                                    const art = albumSong?.tags?.picture ? getAlbumArt(albumSong.tags.picture) : null;

                                    return (
                                        <div
                                            key={`${fa.artist}-${fa.album}`}
                                            className="flex flex-col gap-2 cursor-pointer group min-w-0"
                                            onClick={() => onAlbumClick(fa.artist, fa.album)}
                                        >
                                            <div className="aspect-square w-full bg-gray-100 dark:bg-white/10 rounded-lg overflow-hidden shadow-md transition-all duration-300 group-hover:shadow-xl relative">
                                                {art ? (
                                                    <img src={art} alt={fa.album} className="w-full h-full object-cover" loading="lazy" decoding="async" />
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
                            <div className="text-gray-500">お気に入りのアルバムはありません。</div>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {(playlists.length > 0 || (platform.isDownloadSupported() && downloadedSongs.length > 0)) && (
                        <div className="mb-8">
                            <h2 className="text-2xl md:text-3xl font-bold text-black dark:text-white tracking-tight mb-6">プレイリスト</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                                {platform.isDownloadSupported() && downloadedSongs.length > 0 && (
                                    <div
                                        className="flex flex-col gap-2 cursor-pointer group min-w-0"
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
                                            className="flex flex-col gap-2 cursor-pointer group min-w-0"
                                            onClick={() => onPlaylistClick(playlist.id)}
                                        >
                                            <div className="aspect-square w-full bg-gray-100 dark:bg-white/10 rounded-lg overflow-hidden shadow-md transition-all duration-300 group-hover:shadow-xl relative">
                                                {covers.length > 0 ? (
                                                    <div className="grid grid-cols-2 gap-0.5 w-full h-full p-0.5">
                                                        {[0, 1, 2, 3].map(i => (
                                                            <div key={i} className="bg-gray-200 dark:bg-gray-700">
                                                                {covers[i] ? (
                                                                    <img src={covers[i]} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
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

                    <h2 className="text-2xl md:text-3xl font-bold text-black dark:text-white tracking-tight mb-6">アーティスト</h2>
                    {artists.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 mb-12">
                            {artists.slice(0, visibleArtistCount).map(artist => renderArtistCard(artist.name, artist.image))}
                            {visibleArtistCount < artists.length && (
                                <div ref={lastArtistElementRef} className="col-span-full h-10 w-full"></div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 py-10">
                            <p>No artists found in your library.</p>
                        </div>
                    )}

                    <h2 className="text-2xl md:text-3xl font-bold text-black dark:text-white tracking-tight mb-6">アルバム</h2>
                    {albums.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                            {albums.slice(0, visibleAlbumCount).map(albumSong => (
                                <div
                                    key={`${albumSong.tags?.artist || 'Unknown Artist'}-${albumSong.tags?.album}`}
                                    className="flex flex-col gap-2 cursor-pointer group min-w-0"
                                    onClick={() => onAlbumClick(albumSong.tags?.artist || 'Unknown', albumSong.tags?.album || 'Unknown')}
                                >
                                    <div className="aspect-square w-full bg-gray-100 dark:bg-white/10 rounded-lg overflow-hidden shadow-md transition-all duration-300 group-hover:shadow-xl relative">
                                        {albumSong.tags?.picture ? (
                                            <img src={getAlbumArt(albumSong.tags.picture) || ''} alt={albumSong.tags?.album} className="w-full h-full object-cover" loading="lazy" decoding="async" />
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
                            {visibleAlbumCount < albums.length && (
                                <div ref={lastAlbumElementRef} className="col-span-full h-10 w-full"></div>
                            )}
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
