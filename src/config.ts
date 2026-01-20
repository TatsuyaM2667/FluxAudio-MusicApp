
export const APP_TITLE = import.meta.env.VITE_APP_TITLE ?? "FluxAudio";
export const DEBUG = import.meta.env.VITE_DEBUG === "true";

// Default backup URL from environment variable
export const BACKUP_URL = import.meta.env.VITE_API_BASE || "";

const normalizeUrl = (url: string) => {
    return url.replace(/\/list\/?$/, "").replace(/\/$/, "");
};

const getStoredUrl = () => {
    // 1. LocalStorage (設定画面から手動入力したURLを最優先)
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem("esp32_api_url");
        if (stored) {
            return normalizeUrl(stored);
        }
    }

    // 2. 環境変数
    const envUrl = import.meta.env.VITE_API_BASE;
    if (envUrl) {
        return normalizeUrl(envUrl);
    }

    // 3. Fallback - should not happen if .env is set correctly
    console.warn("No API URL configured. Please set VITE_API_BASE in .env");
    return "";
};

export const API_BASE = getStoredUrl();

export const updateApiUrl = (url: string) => {
    localStorage.setItem("esp32_api_url", normalizeUrl(url));
    window.location.reload();
};