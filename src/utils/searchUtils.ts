/**
 * Normalize a string for fuzzy search:
 * - lowercases
 * - converts katakana to hiragana
 * - converts full-width alphanumerics to half-width
 */
export function normalizeForSearch(str: string): string {
    return str
        .toLowerCase()
        // Katakana to Hiragana (U+30A0-30FF → U+3040-309F)
        .replace(/[\u30a1-\u30f6]/g, (ch) =>
            String.fromCharCode(ch.charCodeAt(0) - 0x60)
        )
        // Full-width alphanumerics to half-width
        .replace(/[\uff01-\uff5e]/g, (ch) =>
            String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
        )
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Check if a string matches a query with fuzzy matching
 * (case-insensitive, katakana/hiragana agnostic, full/half-width agnostic)
 */
export function fuzzyMatch(text: string | undefined | null, query: string): boolean {
    if (!text) return false;
    return normalizeForSearch(text).includes(query);
}

/**
 * Split an artist string by common delimiters (comma, slash, etc.)
 * and return individual artist names (trimmed).
 * Returns the original as a single-element array if no delimiters found.
 */
export function splitArtists(artist: string | undefined | null): string[] {
    if (!artist) return ['Unknown Artist'];
    // Split by comma, full-width comma, slash, ampersand, "feat.", "ft."
    const parts = artist
        .split(/[,、\/＆&]|(?:\s+(?:feat\.?|ft\.?|x)\s+)/i)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    return parts.length > 0 ? parts : [artist];
}

/**
 * Check if a song belongs to a specific artist,
 * considering comma-separated artist names.
 */
export function songBelongsToArtist(songArtist: string | undefined | null, targetArtist: string): boolean {
    const artists = splitArtists(songArtist);
    return artists.some(a => a === targetArtist);
}
