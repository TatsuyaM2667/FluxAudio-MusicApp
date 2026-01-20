export type Picture = {
    format: string;
    data: number[] | string;
};

export type Tags = {
    title?: string;
    artist?: string;
    album?: string;
    picture?: Picture;
    year?: string;
    genre?: string;
    duration?: number;
};

export type SongMeta = {
    path: string;
    tags: Tags | null;
    loaded: boolean;
    lrcPath?: string | null;
    videoPath?: string;
    artistImage?: string;
    date?: number;
};

// ESP32 JSON format (if rich metadata is provided)
export type SongMetadataJson = {
    path: string;
    title?: string;
    artist?: string;
    album?: string;
    year?: string;
    genre?: string;
    duration?: number;
    cover?: string | { mime?: string; format?: string; data: string } | null;
    lrc?: string | null;
    video?: string;
    artistImage?: string; // URL or path to artist image (webp, avif, png, jpg, etc.)
    date?: number;
};

export type Playlist = {
    id: string;
    name: string;
    songs: string[]; // Paths
    createdAt?: number;
};
