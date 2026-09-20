/**
 * Lightweight CORS proxy for Instagram Graph + Telegram Bot API.
 * Run: node server/proxy.mjs
 * Default: http://127.0.0.1:8787
 */

import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

const PORT = Number(process.env.PROXY_PORT || 8787);

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, authorization, x-ig-token, x-tg-token, x-ig-host',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
  });
  res.end(data);
}

function proxyRequest(targetUrl, method, headers, body) {
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
        const chunks = [];
        upstream.on('data', (c) => chunks.push(c));
        upstream.on('end', () => {
          resolve({
            status: upstream.statusCode || 500,
            headers: upstream.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  try {
    const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks).toString('utf8');

    if (url.pathname === '/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    // /api/ig/<path>?query  — token via x-ig-token or access_token query
    if (url.pathname.startsWith('/api/ig/')) {
      const igPath = url.pathname.replace(/^\/api\/ig\//, '');
      const token = req.headers['x-ig-token'] || url.searchParams.get('access_token') || '';
      const igHost = req.headers['x-ig-host'] || 'facebook';
      const graphBase =
        igHost === 'instagram'
          ? 'https://graph.instagram.com/v21.0/'
          : 'https://graph.facebook.com/v21.0/';
      const target = new URL(`${graphBase}${igPath}`);
      url.searchParams.forEach((v, k) => {
        if (k !== 'access_token') target.searchParams.set(k, v);
      });
      if (token) target.searchParams.set('access_token', String(token));

      const upstream = await proxyRequest(
        target.toString(),
        req.method || 'GET',
        { 'content-type': req.headers['content-type'] || 'application/json' },
        rawBody || undefined,
      );
      res.writeHead(upstream.status, {
        'content-type': upstream.headers['content-type'] || 'application/json',
        'access-control-allow-origin': '*',
      });
      res.end(upstream.body);
      return;
    }

    // /api/tg/<method> — token via x-tg-token
    if (url.pathname.startsWith('/api/tg/')) {
      const methodName = url.pathname.replace(/^\/api\/tg\//, '');
      const token = req.headers['x-tg-token'] || '';
      if (!token) {
        sendJson(res, 400, { error: 'x-tg-token header required' });
        return;
      }
      const target = `https://api.telegram.org/bot${token}/${methodName}${url.search || ''}`;
      const upstream = await proxyRequest(
        target,
        req.method || 'GET',
        { 'content-type': req.headers['content-type'] || 'application/json' },
        rawBody || undefined,
      );
      res.writeHead(upstream.status, {
        'content-type': upstream.headers['content-type'] || 'application/json',
        'access-control-allow-origin': '*',
      });
      res.end(upstream.body);
      return;
    }

    sendJson(res, 404, { error: 'not found' });
  } catch (err) {
    sendJson(res, 500, { error: err instanceof Error ? err.message : 'proxy error' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[proxy] http://127.0.0.1:${PORT}  (IG /api/ig/*  TG /api/tg/*)`);
});
