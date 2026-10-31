// Packs a built concept (dist/concepts/<name>) into one self-contained HTML file: CSS, JS, fonts and screenshots inlined.
// Usage: node scripts/pack-concept.mjs <name> <out.html>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const [name, out] = process.argv.slice(2);
const dir = join('dist/concepts', name);
const MIME = { woff: 'font/woff', woff2: 'font/woff2', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml' };
const uri = f => `data:${MIME[f.split('.').pop()]};base64,${readFileSync(f).toString('base64')}`;
const local = p => p.startsWith('/') ? join('dist', p) : join(dir, p.replace(/^\.\//, ''));
const assets = s => s.replace(/(["'(])((?:\/|\.\/)?(?:fonts|lios-shots|img|assets)\/[^"')\s]+\.(?:woff2?|webp|png|jpg|svg))(?=["')])/g, (m, q, p) => existsSync(local(p)) ? q + uri(local(p)) : m);
let html = readFileSync(join(dir, 'index.html'), 'utf8');
html = html.replace(/<link rel="preload"[^>]*>\n?/g, '').replace(/ srcset="[^"]*"( sizes="[^"]*")?/g, '');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, f) => `<style>${assets(readFileSync(local(f), 'utf8'))}</style>`);
html = html.replace(/<script (type="module" )?src="([^"]+)"><\/script>/g, (m, t, f) => `<script ${t || ''}>${assets(readFileSync(local(f), 'utf8')).replace(/<\/script/g, '<\\/script')}</script>`);
html = assets(html);
writeFileSync(out, html);
console.log(out, (html.length / 1024).toFixed(0) + ' KB');
