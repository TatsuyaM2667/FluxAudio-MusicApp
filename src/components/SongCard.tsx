import { useState, useRef, useEffect } from "react";
import { SongMeta } from "../types/music";
import { IconMusic, IconPlay, IconPause, IconHeart, IconHeartFilled, IconMoreHorizontal, IconInfo, IconListMusic, IconTrash, IconCloudDownload, IconCheck } from "./Icons";
import { useDownloads } from "../hooks/useDownloads";
import { downloadService } from "../services/DownloadService";
import { platform } from "../utils/platform";

type SongCardProps = {
    song: SongMeta;
    isCurrent: boolean;
    isPlaying: boolean;
    isFavorite: boolean;
    onToggleFavorite: (e: React.MouseEvent) => void;
    onClick: () => void;
    getAlbumArt: (picture?: any) => string | null;
    onArtistClick?: (artist: string) => void;
    onPlayNext?: (song: SongMeta) => void;
    onAddToPlaylist?: (song: SongMeta) => void;
    onDelete?: (song: SongMeta) => void;
};

export function SongCard({ song, isCurrent, isPlaying, isFavorite, onToggleFavorite, onClick, getAlbumArt, onArtistClick, onPlayNext, onAddToPlaylist, onDelete }: SongCardProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { isDownloaded } = useDownloads();
    const isNative = platform.isNative();
    const downloaded = isDownloaded(song.path);

    const art = song.tags?.picture ? getAlbumArt(song.tags.picture) : null;
    const fallbackTitle = song.path.split("/").pop()?.replace(/\.[^/.]+$/, "") || "Unknown Title";
    const title = song.tags?.title || fallbackTitle;
    const artist = song.tags?.artist || "Unknown Artist";

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (downloaded || isDownloading) return;
        setIsDownloading(true);
        try {
            await downloadService.downloadSong(song);
        } catch (err) {
            console.error('Download failed', err);
        } finally {
            setIsDownloading(false);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showMenu]);

    const handleArtistAction = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(false);
        if (onArtistClick) onArtistClick(artist);
    };

    return (
        <div
            onClick={onClick}
            className="group bg-[#181818] p-4 rounded-md hover:bg-[#282828] transition-all duration-300 cursor-pointer relative"
        >
            <div className="relative aspect-square mb-4 shadow-lg rounded-md overflow-hidden bg-[#333]">
                {art ? (
                    <img src={art} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 bg-[#282828]">
                        <IconMusic />
                    </div>
                )}

                {/* Downloaded Indicator (top-left) */}
                {isNative && downloaded && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white rounded-full p-1 shadow-md">
                        <IconCheck size={12} />
                    </div>
                )}

                {/* Download Button (top-left, shown when not downloaded) */}
                {isNative && !downloaded && (
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className={`absolute top-2 left-2 bg-black/50 backdrop-blur-md text-white rounded-full p-1.5 shadow-md transition-all opacity-0 group-hover:opacity-100 ${isDownloading ? 'cursor-not-allowed opacity-50' : 'hover:bg-black/70'
                            }`}
                    >
                        {isDownloading ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <IconCloudDownload size={14} />
                        )}
                    </button>
                )}

                {/* Play Button Overlay */}
                <div className={`absolute right-2 bottom-2 bg-green-500 text-black rounded-full p-3 shadow-xl transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ${isCurrent ? 'opacity-100 translate-y-0' : ''}`}>
                    {isCurrent && isPlaying ? <IconPause /> : <IconPlay />}
                </div>
            </div>

            <div className="flex justify-between items-start gap-2">
                <div className="flex-1 overflow-hidden">
                    <h3 className={`font-semibold text-base mb-1 truncate ${isCurrent ? 'text-green-500' : 'text-white'}`}>{title}</h3>
                    <p
                        className="text-sm text-gray-400 truncate hover:underline"
                        onClick={(e) => {
                            if (onArtistClick) {
                                e.stopPropagation();
                                onArtistClick(artist);
                            }
                        }}
                    >
                        {artist}
                    </p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                    {/* More Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                        className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition mb-1"
                    >
                        <IconMoreHorizontal size={20} />
                    </button>
                    {/* Favorite - moved slightly or kept same, but More button is primary for actions now? 
                        Let's keep Favorite visible as it's common.
                    */}
                    {/* 
                    <button
                        onClick={onToggleFavorite}
                        className={`text-gray-400 hover:text-white transition-transform hover:scale-110 ${isFavorite ? 'text-green-500' : ''}`}
                    >
                        {isFavorite ? <IconHeartFilled size={20} /> : <IconHeart size={20} />}
                    </button>
                    */}
                </div>
            </div>

            {/* Context Menu */}
            {showMenu && (
                <div
                    ref={menuRef}
                    className="absolute right-4 bottom-12 z-50 w-48 bg-[#222] border border-[#333] rounded-lg shadow-xl overflow-hidden animate-fade-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-[#333] transition text-left"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                            if (onPlayNext) onPlayNext(song);
                        }}
                    >
                        <IconPlay size={16} /> 次に再生
                    </button>
                    <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-[#333] transition text-left"
                        onClick={handleArtistAction}
                    >
                        <IconInfo size={16} /> アーティストへ
                    </button>
                    <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-[#333] transition text-left"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                            onToggleFavorite(e);
                        }}
                    >
                        {isFavorite ? <IconHeartFilled size={16} className="text-green-500" /> : <IconHeart size={16} />}
                        {isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
                    </button>
                    <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-[#333] transition text-left"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                            if (onAddToPlaylist) onAddToPlaylist(song);
                        }}
                    >
                        <IconListMusic size={16} /> プレイリストに追加
                    </button>
                    {isNative && (
                        <button
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-[#333] transition text-left ${downloaded ? 'text-green-400' : 'text-white'
                                }`}
                            disabled={isDownloading}
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (downloaded) {
                                    // Remove download
                                    await downloadService.deleteSong(song.path);
                                } else {
                                    // Download
                                    handleDownload(e);
                                }
                                setShowMenu(false);
                            }}
                        >
                            {downloaded ? (
                                <>
                                    <IconCheck size={16} /> ダウンロード済み
                                </>
                            ) : isDownloading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ダウンロード中...
                                </>
                            ) : (
                                <>
                                    <IconCloudDownload size={16} /> ダウンロード
                                </>
                            )}
                        </button>
                    )}
                    {onDelete && (
                        <button
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-[#333] transition text-left border-t border-white/10 mt-1"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(false);
                                if (window.confirm("本当に削除しますか？\nファイルも削除されます。")) {
                                    onDelete(song);
                                }
                            }}
                        >
                            <IconTrash size={16} /> 削除
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
