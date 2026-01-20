import { useEffect, useState } from 'react';
import { API_BASE } from '../config';
import { SongMeta } from '../types/music';
import { getRecentlyPlayed, getTopSongs, getTopArtists, PlayRecord } from '../utils/playHistory';
import { SongCard } from './SongCard';
import { useAuth } from '../contexts/AuthContext';
import { IconLogout } from './Icons';

interface MyPageProps {
    songs: SongMeta[];
    onPlaySong: (song: SongMeta) => void;
    getAlbumArt: (picture?: any) => string | null;
    onArtistClick: (artist: string) => void;
}

export function MyPage({ songs, onPlaySong, getAlbumArt, onArtistClick }: MyPageProps) {
    const [history, setHistory] = useState<PlayRecord[]>([]);
    const [topSongsAll, setTopSongsAll] = useState<{ path: string, count: number }[]>([]);
    const [topSongsMonth, setTopSongsMonth] = useState<{ path: string, count: number }[]>([]);
    const [topArtists, setTopArtists] = useState<{ artist: string, count: number }[]>([]);

    useEffect(() => {
        setHistory(getRecentlyPlayed(10));
        setTopSongsAll(getTopSongs('all', 5));
        setTopSongsMonth(getTopSongs('month', 5));
        setTopArtists(getTopArtists('all', 5));
    }, [songs]); // Refresh when songs load (or trigger manual refresh?) - play history updates won't auto-trigger a re-render here unless we subscribe. For now, it updates on mount/songs change.

    const { logout } = useAuth();
    const getSongByPath = (path: string) => songs.find(s => s.path === path);

    return (
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32 md:pb-32 custom-scrollbar animate-fade-in">
            <div className="flex items-center justify-between mb-6 mt-4">
                <h2 className="text-2xl md:text-3xl font-bold text-black dark:text-white tracking-tight">マイページ</h2>
                <button
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition text-sm font-bold"
                >
                    <IconLogout size={16} /> ログアウト
                </button>
            </div>

            {/* Recently Played */}
            <section className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-black dark:text-white">再生履歴</h3>
                <div className="flex overflow-x-auto pb-4 gap-4 snap-x">
                    {history.length > 0 ? (
                        history.map((record, i) => {
                            const song = getSongByPath(record.path);
                            if (!song) return null;
                            return (
                                <div key={i} className="min-w-[160px] md:min-w-[200px] snap-start">
                                    <SongCard
                                        song={song}
                                        isCurrent={false}
                                        isPlaying={false}
                                        isFavorite={false} // Would need to look up favorite status to show correctly, pass favorite list if needed
                                        onToggleFavorite={(e) => { e.stopPropagation(); }} // Disable favorite toggle here or pass logic
                                        onClick={() => onPlaySong(song)}
                                        onPlayNext={() => { }}
                                        onAddToPlaylist={() => { }}
                                        onDelete={() => { }}
                                        getAlbumArt={getAlbumArt}
                                        onArtistClick={onArtistClick}
                                    />
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-gray-500">No play history yet.</div>
                    )}
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Songs (All Time) */}
                <section>
                    <h3 className="text-xl font-bold mb-4 text-black dark:text-white">よく聴く曲 (全期間)</h3>
                    <div className="space-y-2">
                        {topSongsAll.map((item, i) => {
                            const song = getSongByPath(item.path);
                            if (!song) return null;
                            const art = song.tags?.picture ? getAlbumArt(song.tags.picture) : null;

                            return (
                                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer" onClick={() => onPlaySong(song)}>
                                    <div className="w-8 text-center font-bold text-gray-500">{i + 1}</div>
                                    <div className="w-12 h-12 rounded overflow-hidden bg-gray-200">
                                        {art && <img src={art} alt="" className="w-full h-full object-cover" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate text-black dark:text-white">{song.tags?.title}</div>
                                        <div className="text-xs text-gray-500 truncate">{song.tags?.artist}</div>
                                    </div>
                                    <div className="text-xs font-bold text-indigo-500">{item.count} plays</div>
                                </div>
                            );
                        })}
                        {topSongsAll.length === 0 && <div className="text-gray-500">No data.</div>}
                    </div>
                </section>

                {/* Top Songs (Monthly) */}
                <section>
                    <h3 className="text-xl font-bold mb-4 text-black dark:text-white">よく聴く曲 (今月)</h3>
                    <div className="space-y-2">
                        {topSongsMonth.map((item, i) => {
                            const song = getSongByPath(item.path);
                            if (!song) return null;
                            const art = song.tags?.picture ? getAlbumArt(song.tags.picture) : null;

                            return (
                                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer" onClick={() => onPlaySong(song)}>
                                    <div className="w-8 text-center font-bold text-gray-500">{i + 1}</div>
                                    <div className="w-12 h-12 rounded overflow-hidden bg-gray-200">
                                        {art && <img src={art} alt="" className="w-full h-full object-cover" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate text-black dark:text-white">{song.tags?.title}</div>
                                        <div className="text-xs text-gray-500 truncate">{song.tags?.artist}</div>
                                    </div>
                                    <div className="text-xs font-bold text-green-500">{item.count} plays</div>
                                </div>
                            );
                        })}
                        {topSongsMonth.length === 0 && <div className="text-gray-500">No data.</div>}
                    </div>
                </section>

                {/* Top Artists */}
                <section>
                    <h3 className="text-xl font-bold mb-4 text-black dark:text-white">トップアーティスト</h3>
                    <div className="space-y-2">
                        {topArtists.map((item, i) => {
                            // Find artist image
                            const artistSong = songs.find(s => s.tags?.artist === item.artist && s.artistImage);
                            const artistImg = artistSong?.artistImage ? `${API_BASE}${artistSong.artistImage}` : null;

                            return (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer" onClick={() => onArtistClick(item.artist)}>
                                    <div className="w-8 text-center font-bold text-gray-500">{i + 1}</div>
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 shrink-0">
                                        {artistImg ? <img src={artistImg} className="w-full h-full object-cover" alt={item.artist} /> : null}
                                    </div>
                                    <div className="flex-1 font-medium text-black dark:text-white truncate">{item.artist}</div>
                                    <div className="text-xs font-bold text-purple-500">{item.count} plays</div>
                                </div>
                            );
                        })}
                        {topArtists.length === 0 && <div className="text-gray-500">No data.</div>}
                    </div>
                </section>
            </div>
        </div>
    );
}
