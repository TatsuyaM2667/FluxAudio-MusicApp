/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
    MUSIC_BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

// Global CORS Middleware
app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'HEAD', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['*'],
    exposeHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length']
}));

// /list endpoint - Always serve fresh from R2
app.get('/list', async (c) => {
    try {
        const obj = await c.env.MUSIC_BUCKET.get('music_index.json');
        if (!obj) {
            return c.json([], 200, {
                'Cache-Control': 'no-cache, must-revalidate'
            });
        }
        
        const headers = new Headers();
        obj.writeHttpMetadata(headers);
        headers.set('etag', obj.httpEtag);
        headers.set('Cache-Control', 'no-cache, must-revalidate');
        headers.set('Content-Type', 'application/json');

        return new Response(obj.body, { headers });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// /playlists endpoint
app.get('/playlists', async (c) => {
    try {
        const obj = await c.env.MUSIC_BUCKET.get('playlists.json');
        return new Response(obj ? obj.body : '[]', {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

app.post('/playlists', async (c) => {
    try {
        const body = await c.req.text();
        await c.env.MUSIC_BUCKET.put('playlists.json', body);
        return c.text('OK');
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// Delete endpoint
app.delete('/delete', async (c) => {
    try {
        const path = c.req.query('path');
        if (!path) return c.text('Missing path parameter', 400);

        let key = path.startsWith('/') ? path.slice(1) : path;
        if (key.startsWith('music/')) {
            key = key.replace('music/', '');
        }

        await c.env.MUSIC_BUCKET.delete(decodeURIComponent(key));
        return c.text('Deleted successfully');
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// Static file serving with Range request support
app.get('/*', async (c) => {
    let path = c.req.path;
    let key = path.slice(1);
    
    if (key.startsWith('music/')) {
        key = key.replace('music/', '');
    }
    key = decodeURIComponent(key);

    if (!key) {
        return c.text('Bad request', 400);
    }

    try {
        const rangeHeader = c.req.header('Range');
        let getOptions: R2GetOptions = {};
        let parsedRange: any = null;

        if (rangeHeader) {
            const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
            if (match) {
                const start = match[1] ? parseInt(match[1], 10) : undefined;
                const end = match[2] ? parseInt(match[2], 10) : undefined;

                if (start !== undefined && end !== undefined) {
                    parsedRange = { offset: start, length: end - start + 1 };
                } else if (start !== undefined) {
                    parsedRange = { offset: start };
                } else if (end !== undefined) {
                    parsedRange = { suffix: end };
                }

                if (parsedRange) {
                    getOptions = { range: parsedRange };
                }
            }
        }

        const object = await c.env.MUSIC_BUCKET.get(key, Object.keys(getOptions).length > 0 ? getOptions : undefined);

        if (!object) {
            return c.json({
                error: 'Not found',
                key: key,
                originalPath: path,
                hint: 'Check if the file exists in R2 bucket with this exact key'
            }, 404);
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('Accept-Ranges', 'bytes');

        // Cache settings
        if (key.endsWith('.lrc')) {
            headers.set('Cache-Control', 'public, max-age=300, must-revalidate');
            headers.set('Content-Type', 'text/plain; charset=utf-8');
        } else if (key.match(/\.(mp3|mp4|m4a|flac|wav|ogg)$/i)) {
            headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
            headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
        }

        // Handle Range response
        if (parsedRange && object.range) {
            const { offset, length } = object.range as any;
            const end = offset + length - 1;
            headers.set('Content-Range', `bytes ${offset}-${end}/${object.size}`);
            headers.set('Content-Length', String(length));
            return new Response(object.body, { status: 206, headers });
        } else {
            headers.set('Content-Length', String(object.size));
            return new Response(object.body, { status: 200, headers });
        }

    } catch (e: any) {
        console.error(`[Error] Failed to fetch "${key}":`, e);
        return c.json({
            error: 'Internal error',
            message: e.message || e.toString(),
            key: key
        }, 500);
    }
});

export default app;
