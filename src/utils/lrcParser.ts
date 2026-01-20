export type LrcLine = {
    time: number;
    text: string;
};

export function parseLrc(lrcContent: string): LrcLine[] {
    if (!lrcContent) return [];

    // Normalize newlines and trim BOM
    const lines = lrcContent.replace(/^\uFEFF/, '').split(/\r?\n/);
    // Regex: allow 1-3 digits for min, 1-2 chars for sec, optional dot/colon for ms
    // Some formats use [mm:ss:xx] or [mm:ss.xx]
    const regex = /^\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\](.*)/;
    const lrcLines: LrcLine[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        const match = trimmed.match(regex);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);

            // Milliseconds handling
            let milliseconds = 0;
            const msStr = match[3];
            if (msStr) {
                if (msStr.length === 2) {
                    milliseconds = parseInt(msStr, 10) / 100; // Centiseconds
                } else if (msStr.length === 3) {
                    milliseconds = parseInt(msStr, 10) / 1000; // Milliseconds
                } else {
                    milliseconds = parseInt(msStr, 10) / 10; // Deciseconds
                }
            }

            const time = minutes * 60 + seconds + milliseconds;
            const text = match[4].trim();

            if (!isNaN(time)) { // Allow empty text for instrumental parts
                lrcLines.push({ time, text });
            }
        }
    }

    return lrcLines;
}
