import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

// Desabilita rejeição estrita de certificados TLS não confiáveis/auto-assinados de servidores IPTV
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
      // Extrai e sanitiza IP do cliente
      let rawIp = req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      if (typeof rawIp === 'string' && rawIp.includes(',')) {
        rawIp = rawIp.split(',')[0].trim();
      }
      // Painéis Xtream Codes / IPTV crasham (500) ou bloqueiam (403) com endereços IPv6 em X-Forwarded-For
      const isIpv4 = typeof rawIp === 'string' && /^(\d{1,3}\.){3}\d{1,3}$/.test(rawIp.trim());
      const clientIp = isIpv4 ? rawIp.trim() : '';

      // Provedores IPTV / CDN utilizam Cloudflare para bloquear User-Agents de navegadores comuns em streams ao vivo.
      // O User-Agent 'IPTVSmartersPro' é universalmente aceito pelas CDNs e balanceadores de carga IPTV.
      const isMediaTarget = target.includes('/live/') || target.includes('/movie/') || target.includes('/series/') || target.includes('.m3u8') || target.includes('.ts');
      const defaultUserAgent = isMediaTarget
        ? 'IPTVSmartersPro'
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

      const upstreamHeaders = {
        'User-Agent': defaultUserAgent,
        'Accept': '*/*', // Aceita streams de vídeo, m3u8, ts, json sem disparar HTTP 406
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Connection': 'keep-alive'
      };

      if (clientIp) {
        upstreamHeaders['X-Forwarded-For'] = clientIp;
        upstreamHeaders['X-Real-IP'] = clientIp;
      }

      if (req.headers.range) {
        upstreamHeaders['Range'] = req.headers.range;
      }

      let upstreamRes;
      try {
        upstreamRes = await fetch(target, {
          method: req.method === 'HEAD' ? 'HEAD' : 'GET',
          headers: upstreamHeaders,
          redirect: 'follow',
          signal: AbortSignal.timeout(25000)
        });
      } catch (fetchErr) {
        // Se a chamada falhou com UA padrão, tenta com o alternativo
        upstreamHeaders['User-Agent'] = upstreamHeaders['User-Agent'] === 'IPTVSmartersPro'
          ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
          : 'IPTVSmartersPro';
        upstreamRes = await fetch(target, {
          method: req.method === 'HEAD' ? 'HEAD' : 'GET',
          headers: upstreamHeaders,
          redirect: 'follow',
          signal: AbortSignal.timeout(25000)
        });
      }

      // Se o servidor IPTV respondeu 403 Forbidden para o User-Agent Chrome, tenta novamente como IPTVSmartersPro
      if (upstreamRes.status === 403 && upstreamHeaders['User-Agent'] !== 'IPTVSmartersPro') {
        upstreamHeaders['User-Agent'] = 'IPTVSmartersPro';
        try {
          const retryRes = await fetch(target, {
            method: req.method === 'HEAD' ? 'HEAD' : 'GET',
            headers: upstreamHeaders,
            redirect: 'follow',
            signal: AbortSignal.timeout(25000)
          });
          if (retryRes.ok || retryRes.status < 400) {
            upstreamRes = retryRes;
          }
        } catch (_) {}
      }

      const rawContentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
      const isM3u8 = target.includes('.m3u8') || rawContentType.includes('mpegurl') || rawContentType.includes('application/x-mpegURL');

      // Se for manifesto HLS (.m3u8), reescreve links absolutos e relativos para o proxy seguro HTTPS
      // resolvendo os caminhos contra a URL final de redirecionamento do balanceador de carga da CDN (ex: lb16.ohovepi35.online)
      if (isM3u8 && upstreamRes.status === 200) {
        const text = await upstreamRes.text();
        const proto = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host || 'tvplay.loja-am.top';
        const proxyPrefix = `${proto}://${host}/api/proxy?url=`;

        const finalUrlObj = new URL(upstreamRes.url || target);
        const finalOrigin = finalUrlObj.origin;
        const finalPath = finalUrlObj.pathname;
        const finalDir = finalPath.substring(0, finalPath.lastIndexOf('/') + 1);
        const finalBase = finalOrigin + finalDir;

        const lines = text.split(/\r?\n/);
        const rewrittenLines = lines.map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;

          // Se for chave de criptografia HLS (#EXT-X-KEY)
          if (trimmed.startsWith('#EXT-X-KEY:') && trimmed.includes('URI=')) {
            return line.replace(/URI="([^"]+)"/, (_, uri) => {
              let fullUri = uri;
              if (!fullUri.startsWith('http://') && !fullUri.startsWith('https://')) {
                fullUri = fullUri.startsWith('/') ? (finalOrigin + fullUri) : (finalBase + fullUri);
              }
              return `URI="${proxyPrefix}${encodeURIComponent(fullUri)}"`;
            });
          }

          // Se for outra tag ou comentário HLS
          if (trimmed.startsWith('#')) {
            return line;
          }

          // É segmento .ts, fMP4 ou sub-playlist m3u8
          let fullUrl = trimmed;
          if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
            fullUrl = fullUrl.startsWith('/') ? (finalOrigin + fullUrl) : (finalBase + fullUrl);
          }

          return `${proxyPrefix}${encodeURIComponent(fullUrl)}`;
        });

        res.writeHead(200, {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
          'Cache-Control': 'no-cache'
        });
        res.end(rewrittenLines.join('\n'));
        return;
      }

      let contentType = rawContentType;
      if (target.includes('.mp4')) {
        contentType = 'video/mp4';
      } else if (target.includes('.ts')) {
        contentType = 'video/mp2t';
      } else if (target.includes('.m3u8')) {
        contentType = 'application/vnd.apple.mpegurl';
      }

      const contentLength = upstreamRes.headers.get('content-length');
      const acceptRanges = upstreamRes.headers.get('accept-ranges');
      const contentRange = upstreamRes.headers.get('content-range');

      const headers = {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
        'Cache-Control': 'no-cache'
      };

      // Não repassa Content-Length se a resposta tiver sido descompactada (evita mismatch de tamanho em listagens)
      if (contentLength && !upstreamRes.headers.get('content-encoding')) headers['Content-Length'] = contentLength;
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
