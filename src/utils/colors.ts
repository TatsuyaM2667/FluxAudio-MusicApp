
// Color cache: avoids re-creating Image + Canvas for the same album art
const colorCache = new Map<string, string>();

function componentToHex(c: number): string {
    const hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r: number, g: number, b: number): string {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export async function getDominantColor(imageUrl: string): Promise<string> {
    // Return cached result instantly
    const cached = colorCache.get(imageUrl);
    if (cached) return cached;

    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                colorCache.set(imageUrl, "#000000");
                return resolve("#000000");
            }

            canvas.width = 1;
            canvas.height = 1;
            ctx.drawImage(img, 0, 0, 1, 1);

            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            const hex = rgbToHex(r, g, b);
            colorCache.set(imageUrl, hex);
            resolve(hex);
        };
        img.onerror = () => {
            colorCache.set(imageUrl, "#000000");
            resolve("#000000");
        };
    });
}
