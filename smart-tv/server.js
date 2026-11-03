import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const PORT = parseInt(process.env.PORT || '80', 10);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

const server = http.createServer(async (req, res) => {
  // CORS universal para Smart TVs e navegadores
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // 1. PROXY ENDPOINT (/api/proxy?url=...)
  if (parsedUrl.pathname === '/api/proxy') {
    const target = parsedUrl.searchParams.get('url');
    if (!target) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing url parameter');
      return;
    }

    try {
      const clientIp = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      const upstreamHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': '*/*', // Aceita streams de vídeo, m3u8, ts, json sem disparar HTTP 406
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'X-Forwarded-For': String(clientIp || ''),
        'X-Real-IP': String(clientIp || '')
      };

      if (req.headers.range) {
        upstreamHeaders['Range'] = req.headers.range;
      }

      const upstreamRes = await fetch(target, {
        method: req.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: upstreamHeaders,
        redirect: 'follow'
      });

      const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
      const contentLength = upstreamRes.headers.get('content-length');
      const acceptRanges = upstreamRes.headers.get('accept-ranges');
      const contentRange = upstreamRes.headers.get('content-range');

      const headers = {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
        'Cache-Control': 'no-cache'
      };

      if (contentLength) headers['Content-Length'] = contentLength;
      if (acceptRanges) headers['Accept-Ranges'] = acceptRanges;
      if (contentRange) headers['Content-Range'] = contentRange;

      res.writeHead(upstreamRes.status, headers);

      if (upstreamRes.body && req.method !== 'HEAD') {
        const reader = upstreamRes.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
    } catch (err) {
      console.error(`[Proxy Error] Falha ao consultar ${target}:`, err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Proxy failed', message: err.message }));
      } else {
        res.end();
      }
    }
    return;
  }

  // 2. ARQUIVOS ESTÁTICOS DO CLIENTE (dist/)
  let requestedPath = path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(DIST, requestedPath);

  // Fallback SPA para index.html se não for arquivo físico existente
  if (requestedPath === '/' || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const isHtml = ext === '.html';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File Not Found');
      return;
    }

    const acceptEncoding = req.headers['accept-encoding'] || '';
    const shouldGzip = !isHtml && (contentType.includes('text') || contentType.includes('javascript') || contentType.includes('json'));

    if (shouldGzip && acceptEncoding.includes('gzip')) {
      zlib.gzip(data, (gzipErr, compressed) => {
        if (gzipErr) {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        } else {
          res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Encoding': 'gzip',
            'Cache-Control': 'public, max-age=31536000, immutable'
          });
          res.end(compressed);
        }
      });
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=31536000'
      });
      res.end(data);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Zyveron Smart TV Server running on port ${PORT}`);
});
