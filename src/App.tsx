import { useEffect, useMemo, useState } from "react";
import { deleteSong } from "./api";
import { API_BASE } from "./config";
import { SongMeta } from "./types/music";
import { SplashScreen } from '@capacitor/splash-screen';
import { LocalNotifications } from '@capacitor/local-notifications';

// Hooks
import { useSongs } from "./hooks/useSongs";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { useFavorites } from "./hooks/useFavorites";
import { useFavoriteArtists } from "./hooks/useFavoriteArtists";
import { useFavoriteAlbums } from "./hooks/useFavoriteAlbums";
import { useNewSongNotifications } from "./hooks/useNewSongNotifications";
import { useTheme } from "./hooks/useTheme";
import { usePlaylists } from "./hooks/usePlaylists";
import { useNavigation } from "./hooks/useNavigation";
import { useLyrics } from "./hooks/useLyrics";
import { useMediaSession } from "./hooks/useMediaSession";
import { useAlbumArt } from "./hooks/useAlbumArt";
import { useOffline } from "./hooks/useOffline";
import { downloadService } from "./services/DownloadService";
import { platform } from "./utils/platform";

// Auth
import { useAuth } from "./contexts/AuthContext";
import { AuthPage } from "./pages/AuthPage";

// Components
import { SplashScreen as AnimatedSplash } from "./components/SplashScreen";
import { Sidebar } from "./components/Sidebar";
import { MobileNav } from "./components/MobileNav";
import { Player } from "./components/Player";
import { FullPlayer } from "./components/FullPlayer";
import { MainContent } from "./components/MainContent";
import { PlaylistModal } from "./components/PlaylistModal";
import { NotificationDropdown } from "./components/NotificationDropdown";
import { IconChevronLeft, IconBell, IconBellFilled } from "./components/Icons";

function App() {
  // Auth
  const { user, logout } = useAuth();
  const [showAuthPage, setShowAuthPage] = useState(false);

  useEffect(() => {
    if (user) {
      setShowAuthPage(false);
    }
  }, [user]);

  // Splash Screen Logic
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Hide native splash immediately & Request Permissions
  useEffect(() => {
    const initApp = async () => {
      try {
        await SplashScreen.hide();
      } catch (e) {
        console.warn("SplashScreen hide failed", e);
      }

      // Initialize DownloadService early on native platform
      if (platform.isNative()) {
        console.log('[App] Initializing DownloadService early...');
        try {
          await downloadService.init();
          console.log('[App] DownloadService initialized successfully');
        } catch (e) {
          console.error('[App] DownloadService init failed:', e);
        }
      }

      // Request Notification Permissions logic
      try {
        let permStatus = await LocalNotifications.checkPermissions();
        console.log("Initial Notification Permission Status:", permStatus);

        if (permStatus.display === 'prompt') {
          permStatus = await LocalNotifications.requestPermissions();
        }

        if (permStatus.display !== 'granted') {
          console.warn("Notification permission denied");
          // Optionally alert the user once per session or just log
          // alert("通知を表示するには、設定から通知権限を許可してください。");
        } else {
          console.log("Notification permission granted");

          // Simple test notification to confirm channel creation
          /*
          await LocalNotifications.schedule({
            notifications: [{
              title: "FluxAudio",
              body: "通知システムは正常です。",
              id: 999,
              schedule: { at: new Date(Date.now() + 1000) },
            }]
          });
          */
        }
      } catch (e) {
        console.error("Failed to check/request notification permissions:", e);
      }
    };

    initApp();

    // Minimum 2s wait
    const timer = setTimeout(() => {
      setMinTimePassed(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Custom Hooks
  const { songs, loading: songsLoading, setSongs } = useSongs();
  const isOffline = useOffline();


  // Audio Player Hook
  const {
    current,
    isPlaying,
    currentTime,
    duration,
    isShuffle,
    repeatMode,
    isVideoMode,
    nextUp,
    audioRef,
    setIsPlaying,
    setIsShuffle,
    setRepeatMode,
    setIsVideoMode,
    handlePlaySong,
    togglePlay,
    handleNext,
    handlePrev,
    handleSongEnd,
    handleTimeUpdate,
    handleLoadedMetadata,
    handlePlayNext,
    performNext,
    performPrev,
    handleError,
    shuffledSongs,
    history,
    playlistContext
  } = useAudioPlayer(songs);

  // Audio Src Resolution
  const [audioSrc, setAudioSrc] = useState<{ url: string | undefined, path: string | null }>({ url: undefined, path: null });

  useEffect(() => {
    const resolveSrc = async () => {
      if (!current) {
        setAudioSrc({ url: undefined, path: null });
        return;
      }

      // For native platform, prioritize downloaded songs to save mobile data
      if (platform.isNative()) {
        try {
          // Ensure DownloadService is initialized before checking
          await downloadService.init();

          const isDownloaded = downloadService.isDownloaded(current.path);
          console.log('[App resolveSrc] Song:', current.tags?.title, 'Downloaded:', isDownloaded);

          if (isDownloaded) {
            const localUrl = await downloadService.getOfflineUrl(current.path);
            if (localUrl) {
              console.log('[App resolveSrc] Using local file for:', current.tags?.title);
              setAudioSrc({ url: localUrl, path: current.path });
              return;
            }
          }
        } catch (e) {
          console.warn('[App resolveSrc] Error checking download:', e);
        }
      }

      // If offline and song is not downloaded, can't play
      if (isOffline) {
        console.warn('[App resolveSrc] Offline and song not downloaded:', current.tags?.title);
        setAudioSrc({ url: undefined, path: current.path });
        return;
      }

      // Stream from network
      console.log('[App resolveSrc] Streaming from network:', current.tags?.title);
      setAudioSrc({
        url: current.path.startsWith('http') ? current.path : `${API_BASE}${current.path}`,
        path: current.path
      });
    };
    resolveSrc();
  }, [current, isOffline]);

  // Calculate display queue for FullPlayer
  const displayQueue = useMemo(() => {
    if (!current) return nextUp;

    // Determine which list is active: playlistContext takes priority, then shuffle, then global songs
    const baseList = playlistContext || songs;
    const activeList = isShuffle ? shuffledSongs : baseList;

    console.log('[App v2] displayQueue calc. PlaylistCtx:', playlistContext?.length, 'Shuffle:', isShuffle, 'BaseList:', baseList.length);

    if (!activeList || activeList.length === 0) return nextUp;

    // Find current position by path to ensure match
    const currentIndex = activeList.findIndex(s => s.path === current.path);

    // If not found, return empty or nextUp
    if (currentIndex === -1) {
      // Fallback: if playing a song not in main list (e.g. search result), 
      // we can't determine "next" unless we know the context.
      return nextUp;
    }

    // Get next 50 songs (looping logic omitted for simplicity)
    const subsequentSongs = activeList.slice(currentIndex + 1, currentIndex + 51);

    return [...nextUp, ...subsequentSongs];
  }, [current, isShuffle, shuffledSongs, songs, nextUp, playlistContext]);

  const { favorites, toggleFavorite } = useFavorites();
  const { toggleFavoriteArtist, isFavoriteArtist, getFavoriteArtistNames } = useFavoriteArtists();
  const { favoriteAlbums, toggleFavoriteAlbum, isFavoriteAlbum } = useFavoriteAlbums();

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications
  } = useNewSongNotifications(songs, getFavoriteArtistNames(), favoriteAlbums);

  const [showNotifications, setShowNotifications] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const {
    playlists,
    loading: playlistsLoading,
    showPlaylistModal,
    targetSongForPlaylist,
    newPlaylistName,
    setNewPlaylistName,
    handleAddToPlaylist,
    handleCreatePlaylist,
    openPlaylistModal,
    closePlaylistModal
  } = usePlaylists();

  // Check conditions for Splash
  useEffect(() => {
    if (!minTimePassed) return;
    if (songsLoading) return;
    if (playlistsLoading) return;

    // Check if metadata for the first 3 songs is loaded
    const checkCount = Math.min(songs.length, 3);
    if (checkCount > 0) {
      const firstFewLoaded = songs.slice(0, checkCount).every(s => s.loaded);
      if (!firstFewLoaded) return;
    }

    setIsReady(true);
  }, [minTimePassed, songsLoading, playlistsLoading, songs]);

  const {
    view,
    setView,
    searchQuery,
    setSearchQuery,
    selectedArtist,
    selectedAlbum,
    showFullPlayer,
    setShowFullPlayer,
    handleArtistClick,
    handleAlbumClick
  } = useNavigation();

  const currentLyrics = useLyrics(current);
  const getAlbumArt = useAlbumArt();

  // Media Session Integration
  useMediaSession(
    current,
    isPlaying,
    duration,
    currentTime,
    performNext,
    performPrev,
    getAlbumArt,
    setIsPlaying
  );

  // Theme color update for FullPlayer
  useEffect(() => {
    if (!showFullPlayer) {
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff');
    }
  }, [showFullPlayer, theme]);

  // Playback Control Effect
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (current) {
      if (isPlaying) {
        // Only play if the audioSrc matches the current song
        if (audioSrc.path === current.path && audioSrc.url) {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.log("Playback prevented:", error);
            });
          }
        }
      } else {
        audio.pause();
      }
    }
  }, [current, isPlaying, audioSrc, audioRef]);

  // Delete Song Handler
  const handleDeleteSong = async (song: typeof songs[0]) => {
    const success = await deleteSong(song.path);
    if (success) {
      setSongs(prev => prev.filter(s => s.path !== song.path));
      if (current?.path === song.path) {
        performNext();
      }
    } else {
      alert("削除に失敗しました");
    }
  };

  // Filtering Logic
  const getFilteredSongs = () => {
    let result = songs;

    if (view === 'favorites') {
      result = result.filter(s => favorites.includes(s.path));
    }

    // 検索は検索ビューでのみ行うので、ここでは検索フィルタリングしない
    return result;
  };

  const displaySongs = getFilteredSongs();
  const bgImage = current?.tags?.picture ? getAlbumArt(current.tags.picture) : null;

  return (
    <div className="flex h-screen w-full bg-gray-50 dark:bg-black text-black dark:text-white overflow-hidden font-sans select-none relative transition-colors duration-300 safe-area-all">
      {/* Animated Splash Screen */}
      {showSplash && (
        <AnimatedSplash
          finishLoading={isReady}
          onAnimationComplete={() => setShowSplash(false)}
        />
      )}

      <audio
        ref={audioRef}
        muted={isVideoMode}
        src={audioSrc.url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          // ビデオモード時はオーディオの終了を無視（ビデオが終わったら次に進む）
          if (!isVideoMode) {
            handleSongEnd();
          }
        }}
        onError={handleError}
        preload="auto"
        className="fixed bottom-0 left-0 w-px h-px opacity-0 pointer-events-none"
      />

      {bgImage && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out opacity-10 dark:opacity-20 blur-3xl scale-110" style={{ backgroundImage: `url(${bgImage})` }} />
          <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-3xl" />
        </div>
      )}

      {/* Main Layout - Use CSS visibility instead of unmounting to preserve scroll position */}
      <div className={`contents ${showFullPlayer ? 'invisible pointer-events-none' : ''}`} style={{ display: showFullPlayer ? 'none' : 'contents' }}>
        <Sidebar view={view} onViewChange={setView} />

        <main className="flex-1 flex flex-col relative z-10 h-full overflow-hidden">
          {/* Header */}
          {view !== 'artist' && view !== 'album' && view !== 'mypage' && !view.startsWith('playlist-') && (
            <header className="h-16 flex items-center justify-between px-4 md:px-8 z-20 bg-gradient-to-b from-white/90 to-transparent dark:from-black/80 dark:to-transparent sticky top-0 shrink-0">
              <div className="flex gap-2">
                <button onClick={() => setView('home')} className="w-8 h-8 rounded-full bg-black/10 dark:bg-black/50 flex items-center justify-center text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-black/20 dark:hover:text-white transition">
                  <IconChevronLeft />
                </button>
              </div>
              <div className="flex items-center gap-4 relative">
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition text-gray-600 dark:text-gray-300 relative"
                  >
                    {unreadCount > 0 ? <IconBellFilled /> : <IconBell />}
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-black"></span>
                    )}
                  </button>

                  {showNotifications && (
                    <NotificationDropdown
                      notifications={notifications}
                      markAsRead={markAsRead}
                      markAllAsRead={markAllAsRead}
                      clearNotifications={clearNotifications}
                      onClose={() => setShowNotifications(false)}
                      onPlaySong={(path) => {
                        const song = songs.find(s => s.path === path);
                        if (song) handlePlaySong(song);
                      }}
                    />
                  )}
                </div>

                <button onClick={toggleTheme} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition">
                  {theme === 'dark' ? '🌙' : '☀️'}
                </button>
                {user ? (
                  <div className="relative group">
                    <button className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                      {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                    </button>
                    <div className="absolute right-0 top-10 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-[160px] hidden group-hover:block z-50">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium truncate">{user.displayName || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                        ログアウト
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAuthPage(true)}
                    className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-full hover:from-purple-500 hover:to-pink-500 transition"
                  >
                    ログイン
                  </button>
                )}
              </div>
            </header>
          )}

          {/* Auth Page Modal */}
          {showAuthPage && (
            <div className="fixed inset-0 z-50">
              <AuthPage onClose={() => setShowAuthPage(false)} />
            </div>
          )}

          <MainContent
            view={view}
            selectedArtist={selectedArtist}
            selectedAlbum={selectedAlbum}
            songs={songs}
            playlists={playlists}
            favorites={favorites}
            searchQuery={searchQuery}
            loading={songsLoading}
            displaySongs={displaySongs}
            current={current}
            isPlaying={isPlaying}
            onPlaySong={handlePlaySong}
            onArtistClick={handleArtistClick}
            onAlbumClick={handleAlbumClick}
            onPlaylistClick={(id: string) => setView(`playlist-${id}`)}
            onToggleFavorite={toggleFavorite}
            onPlayNext={handlePlayNext}
            onAddToPlaylist={openPlaylistModal}
            onDelete={handleDeleteSong}
            getAlbumArt={getAlbumArt}
            setView={setView}
            setSearchQuery={setSearchQuery}
            setSelectedAlbum={(album: string | null) => {
              if (selectedArtist && album) {
                handleAlbumClick(selectedArtist, album);
              }
            }}
            isFavoriteArtist={isFavoriteArtist}
            onToggleFavoriteArtist={toggleFavoriteArtist}
            isFavoriteAlbum={isFavoriteAlbum}
            onToggleFavoriteAlbum={toggleFavoriteAlbum}
            favoriteArtists={getFavoriteArtistNames()}
            favoriteAlbums={favoriteAlbums}

          />
        </main>

        <MobileNav view={view} onViewChange={setView} />

        {current && (
          <Player
            current={current}
            isPlaying={isPlaying}
            togglePlay={togglePlay}
            onNext={handleNext}
            getAlbumArt={getAlbumArt}
            onOpenFullPlayer={() => setShowFullPlayer(true)}
          />
        )}
      </div>

      {current && (
        <div
          className={`fixed inset-0 z-[100] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${showFullPlayer
            ? 'opacity-100 translate-y-0 pointer-events-auto visible'
            : 'opacity-0 translate-y-20 pointer-events-none invisible'
            }`}
          style={{ transform: showFullPlayer ? 'translateY(0)' : 'translateY(100%)' }}
        >
          <FullPlayer
            current={current}
            isPlaying={isPlaying}
            togglePlay={togglePlay}
            onNext={handleNext}
            onPrev={handlePrev}
            currentTime={currentTime}
            duration={duration}
            onTimeChange={(time: number) => {
              if (audioRef.current) audioRef.current.currentTime = time;
            }}
            onClose={() => setShowFullPlayer(false)}
            getAlbumArt={getAlbumArt}
            isFavorite={current ? favorites.includes(current.path) : false}
            toggleFavorite={() => current && toggleFavorite(current.path)}
            rawLrc={currentLyrics}
            isShuffle={isShuffle}
            toggleShuffle={() => setIsShuffle(!isShuffle)}
            repeatMode={repeatMode}
            toggleRepeat={() => {
              setRepeatMode((prev: 'off' | 'all' | 'one') =>
                prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'
              );
            }}
            queue={displayQueue}
            history={history}
            onQueueItemClick={(song: SongMeta) => handlePlaySong(song)}
            onArtistClick={handleArtistClick}
            onVideoModeChange={(isVideo: boolean) => setIsVideoMode(isVideo)}
            onVideoEnd={handleSongEnd}
          />
        </div>
      )
      }

      <PlaylistModal
        show={showPlaylistModal}
        playlists={playlists}
        targetSong={targetSongForPlaylist}
        newPlaylistName={newPlaylistName}
        setNewPlaylistName={setNewPlaylistName}
        onClose={closePlaylistModal}
        onCreatePlaylist={handleCreatePlaylist}
        onAddToPlaylist={handleAddToPlaylist}
      />
    </div >
  );
}

export default App;