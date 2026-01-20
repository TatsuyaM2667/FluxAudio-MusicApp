import { API_BASE } from "./config";
import { SongMetadataJson, Playlist } from "./types/music";
import { downloadService } from './services/DownloadService';
import { platform } from './utils/platform';

// Retry helper function
async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt}/${maxRetries} failed:`, error);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError || new Error("Failed after retries");
}

// ==============================
// Playlists
// ==============================
export async function getPlaylists(): Promise<Playlist[]> {
  try {
    const res = await fetch(`${API_BASE}/playlists`);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.warn("Failed to fetch playlists", e);
    return [];
  }
}

export async function savePlaylists(playlists: Playlist[]): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/playlists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(playlists)
    });
    return res.ok;
  } catch (e) {
    console.error("Failed to save playlists", e);
    return false;
  }
}

export async function deleteSong(path: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/delete?path=${encodeURIComponent(path)}`, {
      method: "DELETE"
    });
    return res.ok;
  } catch (e) {
    console.error("Failed to delete song", e);
    return false;
  }
}

// ==============================
// Song List (music_index.json)
// ==============================
export async function fetchSongs(): Promise<SongMetadataJson[]> {
  // 1. localStorage Cache (Only if online, otherwise we want fresh offline data or force check)
  // Actually, let's skip cache if we suspect we are offline to force fallback check, or relying on standard fetch
  const cached = localStorage.getItem("music_index_cache_v2");
  if (cached && navigator.onLine) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    } catch { }
  }


  // 2. Fetch from Worker or Fallback
  try {
    return await fetchWithRetry(async () => {
      const ts = new Date().getTime();
      const res = await fetch(`${API_BASE}/list?_t=${ts}`, {
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch songs`);

      const data = await res.json();

      // Map raw flat JSON to SongMeta structure
      const mappedData = Array.isArray(data) ? data.map((item: any) => ({
        path: item.path,
        // Construct tags object from flat fields or existing tags if available
        tags: {
          title: item.title || (item.tags && item.tags.title),
          artist: item.artist || (item.tags && item.tags.artist),
          album: item.album || (item.tags && item.tags.album) || "Unknown Album",
          picture: item.cover || (item.tags && item.tags.picture) || null,
          year: item.year || (item.tags && item.tags.year),
          genre: item.genre || (item.tags && item.tags.genre),
          duration: item.duration || (item.tags && item.tags.duration)
        },
        lrc: item.lrc || null,
        video: item.video || null,
        artistImage: item.artistImage || null
      })) : [];

      // Clean up old caches
      try {
        localStorage.removeItem("music_index_cache");
        localStorage.removeItem("music_index_cache_v2");
      } catch (e) {
        console.warn("Failed to clear cache", e);
      }

      // Sort
      return mappedData.sort((a: any, b: any) => {
        const artistA = (a.tags.artist || "").toLowerCase();
        const artistB = (b.tags.artist || "").toLowerCase();
        if (artistA < artistB) return -1;
        if (artistA > artistB) return 1;

        const albumA = (a.tags.album || "").toLowerCase();
        const albumB = (b.tags.album || "").toLowerCase();
        if (albumA < albumB) return -1;
        if (albumA > albumB) return 1;

        const titleA = (a.tags.title || a.path).toLowerCase();
        const titleB = (b.tags.title || b.path).toLowerCase();
        if (titleA < titleB) return -1;
        if (titleA > titleB) return 1;

        return 0;
      });

    }, 3, 5000);
  } catch (e) {
    console.warn("Failed to fetch songs from server, trying offline storage...", e);
    if (platform.isNative()) {
      // Initialize service just in case
      try {
        await downloadService.init();
        const downloaded = downloadService.getDownloadedSongs();
        if (downloaded.length > 0) {
          console.log("Loaded songs from offline storage:", downloaded.length);
          // Map internal SongMeta back to JSON structure expected by app
          return downloaded.map(d => ({
            path: d.path,
            title: d.tags?.title,
            artist: d.tags?.artist,
            album: d.tags?.album,
            cover: d.tags?.picture,
            lrc: d.lrcPath?.replace('offline:', ''),
            artistImage: d.artistImage
          })) as unknown as SongMetadataJson[];
        }
      } catch (err) {
        console.warn("Failed to load offline songs", err);
      }
    }
    // If we are truly offline (or server is down) and have no local songs, we must return empty array
    // instead of throwing, so the UI can at least render the empty state / offline message
    // rather than crashing or infinite loading.
    return [];
  }
}

// ==============================
// Lyrics
// ==============================
export async function fetchLyrics(_path: string, lrcPath?: string | null): Promise<string | null> {
  try {
    if (lrcPath) {
      return await fetchWithRetry(async () => {
        const res = await fetch(`${API_BASE}${lrcPath}`, {
          headers: {
            "ngrok-skip-browser-warning": "true"
          }
        });

        if (!res.ok) return null;
        return await res.text();
      }, 2, 1000);
    }

    return null;

  } catch (e) {
    console.error("Failed to fetch lyrics after retries", e);
    return null;
  }
}

// ==============================
// Fetch MP3 / MP4 / Cover
// ==============================
export async function fetchMetadataBlob(path: string): Promise<Blob> {
  return fetchWithRetry(async () => {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

    const res = await fetch(url, {
      headers: {
        "ngrok-skip-browser-warning": "true"
      }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.blob();
  }, 3, 2000);
}
