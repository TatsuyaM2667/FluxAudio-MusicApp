import React from "react";
import { SongMeta } from "../types/music";
import { IconPlay, IconPause, IconSkipForward, IconMusic } from "./Icons";

export function Player({
  current,
  isPlaying,
  togglePlay,
  onNext,
  getAlbumArt,
  onOpenFullPlayer
}: {
  current: SongMeta;
  isPlaying: boolean;
  togglePlay: (e: React.MouseEvent) => void;
  onNext?: (e: React.MouseEvent) => void;
  getAlbumArt: (picture?: any) => string | null;
  onOpenFullPlayer: () => void;
}) {
  const art = getAlbumArt(current.tags?.picture); // consistency: use function result
  const title = current.tags?.title || current.path.split("/").pop()?.replace(/\.[^/.]+$/, "") || "Unknown Title";
  const artist = current.tags?.artist || "Unknown Artist";

  return (
    <div
      onClick={onOpenFullPlayer}
      // Added 'bottom-32 md:bottom-0' to sit above MobileNav on mobile (which has large safe area padding), at bottom on desktop
      className="fixed bottom-32 md:bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-xl border-t border-gray-200 dark:border-white/5 cursor-pointer hover:bg-gray-100/90 dark:hover:bg-[#2c2c2e]/95 transition-colors group shadow-2xl safe-area-left safe-area-right"
    >
      <div className="flex items-center justify-between px-4 py-3 h-16 max-w-screen-2xl mx-auto">

        {/* Track Info */}
        <div className="flex items-center gap-3 overflow-hidden flex-1">
          <div className="relative shadow-lg shrink-0 rounded-md overflow-hidden">
            {art ? (
              <img src={art} alt={title} className="h-11 w-11 object-cover" />
            ) : (
              <div className="h-11 w-11 bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <IconMusic size={24} />
              </div>
            )}
          </div>
          <div className="flex flex-col overflow-hidden justify-center min-w-0">
            <span className="text-base font-bold text-gray-900 dark:text-white truncate pr-2">{title}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{artist}</span>
          </div>
        </div>

        {/* Mini Controls */}
        <div className="flex items-center gap-4 pl-4 shrink-0">
          <button
            onClick={togglePlay}
            className="text-black dark:text-white p-2 hover:scale-110 transition focus:outline-none"
          >
            {isPlaying ? <IconPause size={28} /> : <IconPlay size={28} />}
          </button>
          {onNext && (
            <button
              onClick={onNext}
              className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white p-2 transition focus:outline-none md:block hidden"
            >
              <IconSkipForward size={28} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
