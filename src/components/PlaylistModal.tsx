import { Playlist, SongMeta } from '../types/music';
import { IconX, IconPlus, IconCheck, IconListMusic } from './Icons';

interface PlaylistModalProps {
    show: boolean;
    playlists: Playlist[];
    targetSong: SongMeta | null;
    newPlaylistName: string;
    setNewPlaylistName: (name: string) => void;
    onClose: () => void;
    onCreatePlaylist: (song: SongMeta | null) => void;
    onAddToPlaylist: (song: SongMeta, playlistName: string) => void;
}

export function PlaylistModal({
    show,
    playlists,
    targetSong,
    newPlaylistName,
    setNewPlaylistName,
    onClose,
    onCreatePlaylist,
    onAddToPlaylist
}: PlaylistModalProps) {
    if (!show) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-[#222] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-white/10"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-white">プレイリストに追加</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <IconX size={24} />
                    </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {/* Create New Playlist Input */}
                    <div className="p-2 mb-2">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                placeholder="新しいプレイリスト名"
                                className="flex-1 bg-[#333] text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                                onClick={() => onCreatePlaylist(targetSong)}
                                disabled={!newPlaylistName.trim()}
                                className="bg-indigo-600 disabled:opacity-50 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition"
                            >
                                <IconPlus size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Existing Playlists */}
                    <div className="space-y-1">
                        {playlists.map(pl => (
                            <button
                                key={pl.id}
                                onClick={() => targetSong && onAddToPlaylist(targetSong, pl.name)}
                                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/10 transition group text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-gradient-to-br from-gray-700 to-gray-600 w-10 h-10 rounded flex items-center justify-center">
                                        <IconListMusic size={20} className="text-white/70" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-white">{pl.name}</div>
                                        <div className="text-xs text-gray-400">{pl.songs.length} songs</div>
                                    </div>
                                </div>
                                {pl.songs.includes(targetSong?.path || "") && (
                                    <IconCheck size={20} className="text-green-500" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
