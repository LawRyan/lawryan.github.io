// Packs dist/next into one self-contained HTML file (JS, CSS and fonts inlined) for previews and reviews.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const out = process.argv[2] || 'dist/next-standalone.html';
let html = readFileSync('dist/next/index.html', 'utf8');
const js = html.match(/<script type="module" src="([^"]+)"><\/script>/)[1];
const css = html.match(/<link rel="stylesheet" href="([^"]+)">/)[1];
let cssText = readFileSync('dist' + css, 'utf8').replace(/url\((['"]?)\/fonts\/([^'")]+)\1\)/g, (m, q, f) => `url(data:font/woff;base64,${readFileSync('dist/fonts/' + f).toString('base64')})`);
const jsText = readFileSync('dist' + js, 'utf8');
html = html.replace(/<link rel="preload"[^>]+>\n?/, '').replace(`<link rel="stylesheet" href="${css}">`, () => `<style>${cssText}</style>`)
  .replace(`<script type="module" src="${js}"></script>`, () => `<script type="module">${jsText.replace(/<\/script/g, '<\\/script')}</script>`)
  .replace(/href="\/favicon.svg"/, 'href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E"');
// screenshots: drop srcset (the 720px versions are inlined) and embed each image once per use
html = html.replace(/ srcset="[^"]*" sizes="[^"]*"/g, '');
const cache = {};
html = html.replace(/src="(\/lios-shots\/[^"]+\.webp)"/g, (m, f) => `src="${cache[f] ||= 'data:image/webp;base64,' + readFileSync('dist' + f).toString('base64')}"`);
writeFileSync(out, html);
console.log(out, (html.length / 1024).toFixed(0) + ' KB');
