import { useState, useEffect, useCallback } from 'react';
import { Playlist, SongMeta } from '../types/music';
import { getPlaylists, savePlaylists } from '../api';

export function usePlaylists() {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const [targetSongForPlaylist, setTargetSongForPlaylist] = useState<SongMeta | null>(null);
    const [newPlaylistName, setNewPlaylistName] = useState("");

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getPlaylists()
            .then(setPlaylists)
            .finally(() => setLoading(false));
    }, []);

    const handleAddToPlaylist = useCallback((song: SongMeta, playlistName: string) => {
        setPlaylists(prev => {
            const updatedPlaylists = prev.map(p =>
                p.name === playlistName
                    ? { ...p, songs: [...p.songs, song.path] }
                    : p
            );
            savePlaylists(updatedPlaylists);
            return updatedPlaylists;
        });
        setShowPlaylistModal(false);
        setTargetSongForPlaylist(null);
    }, []);

    const handleCreatePlaylist = useCallback((song: SongMeta | null) => {
        if (newPlaylistName.trim() === "") return;

        setPlaylists(prev => {
            const newPlaylist: Playlist = {
                id: Date.now().toString(),
                name: newPlaylistName,
                songs: song ? [song.path] : []
            };
            const updatedPlaylists = [...prev, newPlaylist];
            savePlaylists(updatedPlaylists);
            return updatedPlaylists;
        });
        setNewPlaylistName("");
        setShowPlaylistModal(false);
        setTargetSongForPlaylist(null);
    }, [newPlaylistName]);

    const openPlaylistModal = useCallback((song: SongMeta) => {
        setTargetSongForPlaylist(song);
        setShowPlaylistModal(true);
    }, []);

    const closePlaylistModal = useCallback(() => {
        setShowPlaylistModal(false);
        setTargetSongForPlaylist(null);
    }, []);

    return {
        playlists,
        loading,
        showPlaylistModal,
        targetSongForPlaylist,
        newPlaylistName,
        setNewPlaylistName,
        handleAddToPlaylist,
        handleCreatePlaylist,
        openPlaylistModal,
        closePlaylistModal
    };
}
