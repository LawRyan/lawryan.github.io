// Visual review: serves dist/, captures desktop + mobile screenshots, reports console errors and overflow.
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const tag = process.argv[2] || 'shot';
const only = process.argv[3]; // optional: comma list of shot names
mkdirSync('shots', { recursive: true });
const srv = await serve(4173);
const browser = await pw.chromium.launch();
const base = 'http://127.0.0.1:4173';
const views = { desktop: { width: 1440, height: 900, deviceScaleFactor: 1 }, mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } };
const jobs = [
  ['home', '/?nointro'], ['lios', '/lios/'],
];
for (const [vname, vp] of Object.entries(views)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
  for (const [name, path] of jobs) {
    if (only && !only.split(',').includes(name)) continue;
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `shots/${tag}-${name}-${vname}-top.jpg`, quality: 82, type: 'jpeg' });
    // scroll through so reveal animations settle, then capture full page
    const h = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 450) { await page.mouse.wheel(0, 450); await page.waitForTimeout(70); }
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(800);
    await page.screenshot({ path: `shots/${tag}-${name}-${vname}-full.jpg`, fullPage: true, quality: 72, type: 'jpeg' });
    const over = await page.evaluate(() => { const w = document.documentElement.clientWidth; return [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > w + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('.tbl-wrap,.hero-canvas'); }).slice(0, 6).map(e => `${e.tagName}.${e.className}`.slice(0, 80)); });
    console.log(`${vname} ${name}: errors=${errs.length} ${errs.slice(0, 3).join(' | ')} overflow=${JSON.stringify(over)} height=${h}`);
    await page.close();
  }
  await ctx.close();
}
// intro frame (desktop), mid-animation
if (!only || only.includes('intro')) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + '/'); await page.waitForTimeout(700);
  await page.screenshot({ path: `shots/${tag}-intro-desktop.jpg`, quality: 82, type: 'jpeg' });
  await ctx.close();
}
await browser.close(); srv.close();
