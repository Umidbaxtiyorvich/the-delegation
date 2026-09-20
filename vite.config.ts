import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import http from 'node:http';
import https from 'node:https';
import path from 'path';
import type { Connect, Plugin } from 'vite';
import { defineConfig, loadEnv } from 'vite';

function proxyUpstream(
  targetUrl: string,
  method: string,
  headers: Record<string, string>,
  body?: Buffer,
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    const lib = url.protocol === 'http:' ? http : https;
    const req = lib.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers,
      },
      (upstream) => {
        const chunks: Buffer[] = [];
        upstream.on('data', (c) => chunks.push(c));
        upstream.on('end', () => {
          resolve({
            status: upstream.statusCode || 500,
            headers: upstream.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    req.on('error', reject);
    if (body && body.length) req.write(body);
    req.end();
  });
}

function readBody(req: Connect.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** Dev/preview CORS proxy for Instagram Graph + Telegram Bot API. */
function socialApiProxyPlugin(): Plugin {
  const handler: Connect.NextHandleFunction = async (req, res, next) => {
    const rawUrl = req.url || '';
    if (!rawUrl.startsWith('/api/ig/') && !rawUrl.startsWith('/api/tg/')) {
      next();
      return;
    }

    try {
      const url = new URL(rawUrl, 'http://127.0.0.1');
      const method = (req.method || 'GET').toUpperCase();
      const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(req);

      if (url.pathname.startsWith('/api/ig/')) {
        const igPath = url.pathname.replace(/^\/api\/ig\//, '');
        const token =
          (req.headers['x-ig-token'] as string) || url.searchParams.get('access_token') || '';
        const igHost = (req.headers['x-ig-host'] as string) || 'facebook';
        const graphBase =
          igHost === 'instagram'
            ? 'https://graph.instagram.com/v21.0/'
            : 'https://graph.facebook.com/v21.0/';
        const target = new URL(`${graphBase}${igPath}`);
        url.searchParams.forEach((v, k) => {
          if (k !== 'access_token') target.searchParams.set(k, v);
        });
        if (token) target.searchParams.set('access_token', token);

        const upstream = await proxyUpstream(
          target.toString(),
          method,
          {
            'content-type': (req.headers['content-type'] as string) || 'application/json',
          },
          body,
        );
        res.statusCode = upstream.status;
        res.setHeader('access-control-allow-origin', '*');
        res.setHeader(
          'content-type',
          (upstream.headers['content-type'] as string) || 'application/json',
        );
        res.end(upstream.body);
        return;
      }

      if (url.pathname.startsWith('/api/tg/')) {
        const methodName = url.pathname.replace(/^\/api\/tg\//, '');
        const token = (req.headers['x-tg-token'] as string) || '';
        if (!token) {
          res.statusCode = 400;
          res.setHeader('content-type', 'application/json');
          res.setHeader('access-control-allow-origin', '*');
          res.end(JSON.stringify({ error: 'x-tg-token header required' }));
          return;
        }
        const target = `https://api.telegram.org/bot${token}/${methodName}${url.search || ''}`;
        const upstream = await proxyUpstream(
          target,
          method,
          {
            'content-type': (req.headers['content-type'] as string) || 'application/json',
          },
          body,
        );
        res.statusCode = upstream.status;
        res.setHeader('access-control-allow-origin', '*');
        res.setHeader(
          'content-type',
          (upstream.headers['content-type'] as string) || 'application/json',
        );
        res.end(upstream.body);
        return;
      }

      next();
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.setHeader('access-control-allow-origin', '*');
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'proxy error' }));
    }
  };

  const corsPreflight: Connect.NextHandleFunction = (req, res, next) => {
    if (
      req.method === 'OPTIONS' &&
      (req.url?.startsWith('/api/ig/') || req.url?.startsWith('/api/tg/'))
    ) {
      res.statusCode = 204;
      res.setHeader('access-control-allow-origin', '*');
      res.setHeader('access-control-allow-headers', 'content-type, authorization, x-ig-token, x-tg-token, x-ig-host');
      res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
      res.end();
      return;
    }
    next();
  };

  return {
    name: 'social-api-proxy',
    configureServer(server) {
      server.middlewares.use(corsPreflight);
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(corsPreflight);
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // GitHub Pages deploy uchun API key'ni build'dan olib tashlash
  const isProduction = mode === 'production';

  return {
    // Local: http://localhost:3000/  |  GitHub Pages build: set VITE_BASE=/the-delegation/
    base: process.env.VITE_BASE || (isProduction ? '/the-delegation/' : '/'),
    plugins: [react(), tailwindcss(), socialApiProxyPlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
      'process.env.OPENAI_API_KEY': JSON.stringify(isProduction ? '' : env.OPENAI_API_KEY || ''),
      'process.env.OPENAI_BASE_URL': JSON.stringify(env.OPENAI_BASE_URL || 'https://api.openai.com/v1'),
      'process.env.OPENAI_MODEL': JSON.stringify(env.OPENAI_MODEL || 'gpt-4o-mini'),
      'process.env.OPENAI_EMBED_MODEL': JSON.stringify(env.OPENAI_EMBED_MODEL || 'text-embedding-3-small'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
