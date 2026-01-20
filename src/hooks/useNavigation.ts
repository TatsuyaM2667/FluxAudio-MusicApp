import { useState, useCallback } from 'react';

export function useNavigation() {
    const [view, setViewRaw] = useState('home');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
    const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
    const [showFullPlayer, setShowFullPlayer] = useState(false);

    // ビュー切り替え時に検索クエリをクリア（検索ビューへの移動時を除く）
    const setView = useCallback((newView: string) => {
        setViewRaw(newView);
        if (newView !== 'search') {
            setSearchQuery('');
        }
    }, []);

    const handleArtistClick = useCallback((artist: string) => {
        setSelectedArtist(artist);
        setSelectedAlbum(null);
        setViewRaw('artist');
        setSearchQuery('');
    }, []);

    const handleAlbumClick = useCallback((artist: string, album: string) => {
        setSelectedArtist(artist);
        setSelectedAlbum(album);
        setViewRaw('album');
        setSearchQuery('');
    }, []);

    return {
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
    };
}
