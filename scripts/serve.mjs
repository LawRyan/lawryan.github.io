// Minimal static server for dist/ (mirrors GitHub Pages: dir → index.html, unknown → 404.html)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const root = 'dist';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.JPG': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain', '.pdf': 'application/pdf', '.xml': 'application/xml', '.webp': 'image/webp' };
export function serve(port = 4173) {
  return new Promise(res => {
    const s = createServer(async (req, rsp) => {
      let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
      let f = join(root, p);
      try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); const b = await readFile(f); rsp.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' }); rsp.end(b); }
      catch { const b = await readFile(join(root, '404.html')); rsp.writeHead(404, { 'content-type': types['.html'] }); rsp.end(b); }
    }).listen(port, '127.0.0.1', () => res(s));
  });
}
if (process.argv[1].endsWith('serve.mjs')) { await serve(Number(process.argv[2]) || 4173); console.log('http://127.0.0.1:' + (process.argv[2] || 4173)); }
