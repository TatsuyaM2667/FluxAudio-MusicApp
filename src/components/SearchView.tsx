import { useMemo } from 'react';
import { SongMeta } from '../types/music';
import { IconMusic, IconInfo, IconLibrary } from './Icons';

type SearchViewProps = {
    query: string;
    songs: SongMeta[];
    onPlaySong: (song: SongMeta) => void;
    onArtistClick: (artist: string) => void;
    onAlbumClick: (artist: string, album: string) => void;
    getAlbumArt: (picture?: any) => string | null;
};

export function SearchView({ query, songs, onPlaySong, onArtistClick, onAlbumClick, getAlbumArt }: SearchViewProps) {
    const results = useMemo(() => {
        if (!query.trim()) {
            return { songs: [], artists: [], albums: [] };
        }

        const q = query.toLowerCase();

        // Filter Songs
        const filteredSongs = songs.filter(s =>
            s.tags?.title?.toLowerCase().includes(q) ||
            s.tags?.artist?.toLowerCase().includes(q) ||
            s.tags?.album?.toLowerCase().includes(q)
        );

        // Filter Artists
        const artistMap = new Map<string, SongMeta>();
        songs.forEach(s => {
            if (s.tags?.artist && !artistMap.has(s.tags.artist)) {
                artistMap.set(s.tags.artist, s);
            }
        });
        const filteredArtists = [...artistMap.values()].filter(s =>
            s.tags?.artist?.toLowerCase().includes(q)
        );

        // Filter Albums
        const albumMap = new Map<string, SongMeta>();
        songs.forEach(s => {
            if (s.tags?.album && s.tags.album !== "Unknown Album" && !albumMap.has(s.tags.album)) {
                albumMap.set(s.tags.album, s);
            }
        });
        const filteredAlbums = [...albumMap.values()].filter(s =>
            s.tags?.album?.toLowerCase().includes(q)
        );

        return { songs: filteredSongs, artists: filteredArtists, albums: filteredAlbums };
    }, [query, songs]);

    const hasResults = results.songs.length > 0 || results.artists.length > 0 || results.albums.length > 0;

    return (
        <div className="p-4 md:p-8 animate-fade-in">
            {!hasResults && query.trim() && (
                <div className="text-center text-gray-400 py-10">
                    <p>No results found for "{query}"</p>
                </div>
            )}

            {hasResults && (
                <div className="space-y-10">
                    {/* Artists Section */}
                    {results.artists.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-bold mb-4">Artists</h2>
                            <div className="flex flex-col gap-2">
                                {results.artists.slice(0, 5).map(artistSong => (
                                    <div
                                        key={artistSong.tags?.artist}
                                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer transition group"
                                        onClick={() => onArtistClick(artistSong.tags?.artist || 'Unknown')}
                                    >
                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-white/10 shrink-0 flex items-center justify-center">
                                            {artistSong.artistImage ? (
                                                <img src={artistSong.artistImage} alt={artistSong.tags?.artist} className="w-full h-full object-cover" />
                                            ) : (
                                                <IconInfo className="text-gray-400" />
                                            )}
                                        </div>
                                        <div className="font-bold truncate">{artistSong.tags?.artist}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Albums Section */}
                    {results.albums.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-bold mb-4">Albums</h2>
                            <div className="flex flex-col gap-2">
                                {results.albums.slice(0, 8).map(albumSong => (
                                    <div
                                        key={albumSong.tags?.album}
                                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer transition group"
                                        onClick={() => onAlbumClick(albumSong.tags?.artist || 'Unknown', albumSong.tags?.album || 'Unknown')}
                                    >
                                        <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-200 dark:bg-white/10 shrink-0 flex items-center justify-center">
                                            {albumSong.tags?.picture ? (
                                                <img src={getAlbumArt(albumSong.tags.picture) || ''} alt={albumSong.tags?.album} className="w-full h-full object-cover" />
                                            ) : (
                                                <IconLibrary className="text-gray-400" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold truncate">{albumSong.tags?.album}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{albumSong.tags?.artist}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Songs Section */}
                    {results.songs.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-bold mb-4">Songs</h2>
                            <div className="flex flex-col gap-1">
                                {results.songs.slice(0, 15).map(song => (
                                    <div
                                        key={song.path}
                                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer transition group"
                                        onClick={() => onPlaySong(song)}
                                    >
                                        <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-200 dark:bg-white/10 shrink-0 flex items-center justify-center">
                                            {song.tags?.picture ? (
                                                <img src={getAlbumArt(song.tags.picture) || ''} alt={song.tags?.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <IconMusic className="text-gray-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{song.tags?.title}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{song.tags?.artist}</div>
                                        </div>
                                        <div className="hidden sm:block text-xs text-gray-400 font-mono">
                                            {Math.floor((song.tags?.duration || 0) / 60)}:{Math.floor((song.tags?.duration || 0) % 60).toString().padStart(2, '0')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
