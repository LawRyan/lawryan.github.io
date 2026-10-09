// Screenshot matrix: every page at 1920 / 1440 / 768 / 390 / 360.
// Usage: node scripts/matrix.mjs <tag>   → shots/<tag>/<page>-<width>-{top,full}.jpg + overflow report
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { serve } from './serve.mjs';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const tag = process.argv[2] || 'matrix';
const dir = `shots/${tag}`; mkdirSync(dir, { recursive: true });
const widths = [[1920, 1080, 1], [1440, 900, 1], [768, 1024, 2], [390, 844, 2], [360, 780, 2]];
const pages = [['home', '/?nointro'], ['lios', '/lios/']];
const srv = await serve(4190); const b = await pw.chromium.launch();
for (const [w, h, dpr] of widths) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: w < 800, hasTouch: w < 800 });
  for (const [name, path] of pages) {
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await p.goto('http://127.0.0.1:4190' + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(700);
    await p.screenshot({ path: `${dir}/${name}-${w}-top.jpg`, type: 'jpeg', quality: 80 });
    const H = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < H; y += 500) { await p.mouse.wheel(0, 500); await p.waitForTimeout(40); }
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(600);
    await p.screenshot({ path: `${dir}/${name}-${w}-full.jpg`, type: 'jpeg', quality: 68, fullPage: true });
    const over = await p.evaluate(() => { const vw = document.documentElement.clientWidth; return [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > vw + 1 && !e.closest('.tbl-wrap,canvas,.hero-canvas,[data-allow-overflow]') && getComputedStyle(e).position !== 'fixed'; }).slice(0, 5).map(e => (e.tagName + '.' + (e.className?.baseVal ?? e.className)).slice(0, 70)); });
    const smallTargets = w < 800 ? await p.evaluate(() => [...document.querySelectorAll('a,button')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 32) && !e.closest('.tbl-wrap'); }).length) : 0;
    console.log(`${String(w).padStart(4)} ${name.padEnd(5)} h=${H} errors=${errs.length} overflow=${JSON.stringify(over)}${w < 800 ? ` small-targets=${smallTargets}` : ''}`);
    await p.close();
  }
  await ctx.close();
}
await b.close(); srv.close();
