/**
 * Shared static file server for the QA suites.
 *
 * Serves _site/ at the SAME base path the real deployment uses
 * (/ssdeol/ on github.io, / on a custom domain). Serving at the wrong base is
 * exactly what made the live site render unstyled, so the harness must mirror
 * it rather than flattening to /.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Starts the server.
 * @param {string} siteDir  the built site (e.g. _site)
 * @param {string} basePath e.g. "/ssdeol/"
 * @returns {Promise<{ url: string, close: () => Promise<void> }>}
 */
export async function serve(siteDir, basePath = '/', port = 0) {
  const prefix = basePath.endsWith('/') ? basePath : `${basePath}/`;

  const server = createServer(async (req, res) => {
    try {
      let url = decodeURIComponent(req.url.split('?')[0]);

      // Strip the base path so the file lookup matches the built layout.
      if (url.startsWith(prefix)) url = url.slice(prefix.length - 1);
      else if (url !== prefix.slice(0, -1)) {
        res.writeHead(404, { 'content-type': MIME['.html'] });
        return res.end(await readFile(join(siteDir, '404.html')).catch(() => 'Not found'));
      }

      let file = join(siteDir, normalize(url).replace(/^([/\\])+/, ''));
      if (existsSync(file) && (await stat(file)).isDirectory()) file = join(file, 'index.html');
      if (!existsSync(file)) {
        res.writeHead(404, { 'content-type': MIME['.html'] });
        return res.end(await readFile(join(siteDir, '404.html')).catch(() => 'Not found'));
      }
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(await readFile(file));
    } catch {
      res.writeHead(500).end('server error');
    }
  });

  const chosen = port || 8100 + Math.floor(Math.random() * 90);
  await new Promise((r) => server.listen(chosen, r));

  return {
    url: `http://localhost:${chosen}${prefix}`,
    close: () => new Promise((r) => server.close(r)),
  };
}

export const BASE_PATH = process.env.SITE_BASE_PATH ?? '/ssdeol/';