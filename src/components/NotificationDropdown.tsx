import { useRef, useEffect } from "react";
import { IconBell, IconMusic } from "./Icons";
import { useNewSongNotifications } from "../hooks/useNewSongNotifications";

interface NotificationDropdownProps {
    notifications: ReturnType<typeof useNewSongNotifications>['notifications'];
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
    onClose: () => void;
    onPlaySong: (path: string) => void;
}

export function NotificationDropdown({
    notifications,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    onClose,
    onPlaySong
}: NotificationDropdownProps) {
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose]);

    return (
        <div
            ref={dropdownRef}
            className="absolute right-0 top-12 w-80 md:w-96 bg-white dark:bg-[#1c1c1e] rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden animate-fade-in"
        >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-lg text-black dark:text-white flex items-center gap-2">
                    <IconBell className="text-pink-500" /> Notifications
                </h3>
                <div className="flex gap-2">
                    {notifications.length > 0 && (
                        <button
                            onClick={clearNotifications}
                            className="text-xs text-gray-400 hover:text-red-500 transition"
                        >
                            Clear All
                        </button>
                    )}
                    <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-500 hover:text-blue-600 font-medium transition"
                    >
                        Mark all read
                    </button>
                </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <p className="text-sm">No new notifications</p>
                    </div>
                ) : (
                    notifications.map((n) => (
                        <div
                            key={n.id}
                            className={`p-4 border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition flex gap-3 cursor-pointer ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                            onClick={() => {
                                markAsRead(n.id);
                                onPlaySong(n.songPath);
                                onClose();
                            }}
                        >
                            <div className="w-12 h-12 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                                <IconMusic className="text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-xs font-bold text-pink-500 uppercase">New Song</p>
                                    <span className="text-[10px] text-gray-400">{new Date(n.date).toLocaleDateString()}</span>
                                </div>
                                <p className="font-medium text-black dark:text-white truncate">{n.songTitle}</p>
                                <p className="text-xs text-gray-500 truncate">{n.artist} • {n.album}</p>
                            </div>
                            {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0"></div>}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
