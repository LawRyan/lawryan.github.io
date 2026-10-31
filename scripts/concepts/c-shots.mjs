// Screenshots for concept C (c-os). Serves dist/ on port 4302 itself and closes it afterwards.
// Usage: node scripts/concepts/c-shots.mjs <outDir> [desktop|mobile|all] [url-override]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { serve } from '../serve.mjs';

const out = process.argv[2] || '/tmp/c-shots';
const which = process.argv[3] || 'all';
const base = process.argv[4] || 'http://127.0.0.1:4302/concepts/c-os/';
mkdirSync(out, { recursive: true });
const server = base.startsWith('http://127.0.0.1:4302') ? await serve(4302) : null;
const browser = await chromium.launch();
const errors = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function page(w, h, q = '?still') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 760, isMobile: w < 760 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(`${w}: ${e.message}`));
  p.on('console', m => { if (m.type() === 'error') errors.push(`${w} console: ${m.text()}`); });
  await p.goto(base + q, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  return { ctx, p };
}

if (which === 'all' || which === 'desktop') {
  const { ctx, p } = await page(1440, 900);
  await sleep(1600);
  await p.screenshot({ path: `${out}/d1-lock.png` });
  await p.keyboard.press('Enter');
  await sleep(2600);
  await p.screenshot({ path: `${out}/d2-desktop.png` });
  await p.keyboard.press('F3');
  await sleep(1200);
  await p.screenshot({ path: `${out}/d3-overview.png` });
  await p.keyboard.press('Escape');
  await sleep(900);
  await p.keyboard.press('Control+k');
  await sleep(500);
  await p.keyboard.type('qual');
  await sleep(300);
  await p.screenshot({ path: `${out}/d4-command.png` });
  await p.keyboard.press('Escape');
  await p.keyboard.press('Control+ArrowRight');
  await sleep(450);
  await p.screenshot({ path: `${out}/d5a-midswitch.png` });
  await sleep(2600);
  await p.screenshot({ path: `${out}/d5-lios-analyst.png` });
  await p.click('#w-analyst [role=tab]:nth-child(3)');
  await sleep(1200);
  await p.screenshot({ path: `${out}/d6-analyst-investigation.png` });
  await p.click('.dock-item[data-app=health]');
  await sleep(1600);
  await p.screenshot({ path: `${out}/d7-health.png` });
  await p.click('.dock-item[data-app=markets]');
  await sleep(1600);
  await p.screenshot({ path: `${out}/d8-markets.png` });
  await p.keyboard.press('F3');
  await sleep(1200);
  await p.screenshot({ path: `${out}/d9-overview-lios.png` });
  await p.keyboard.press('Escape');
  await p.keyboard.press('Control+ArrowLeft');
  await sleep(1800);
  await p.evaluate(() => window.__os.openApp('career'));
  await sleep(1200);
  await p.screenshot({ path: `${out}/d10-career.png` });
  await ctx.close();
  for (const [w, h] of [[1280, 720], [1024, 768]]) {
    const { ctx: c2, p: p2 } = await page(w, h);
    await p2.keyboard.press('Enter'); await sleep(2600);
    await p2.screenshot({ path: `${out}/d-${w}-desktop.png` });
    await p2.keyboard.press('Control+ArrowRight'); await sleep(2800);
    await p2.screenshot({ path: `${out}/d-${w}-lios.png` });
    await c2.close();
  }
}

if (which === 'all' || which === 'mobile') {
  for (const [w, h] of [[390, 844], [360, 740], [430, 932]]) {
    const { ctx, p } = await page(w, h);
    await sleep(1400);
    await p.screenshot({ path: `${out}/m${w}-1-lock.png` });
    await p.click('#unlockBtn');
    await sleep(1800);
    await p.screenshot({ path: `${out}/m${w}-2-home.png` });
    await p.click('.m-icon[data-app=about]');
    await sleep(1200);
    await p.screenshot({ path: `${out}/m${w}-3-about.png` });
    await p.evaluate(() => window.__os.mClose());
    await sleep(900);
    await p.click('.dots button[data-page="1"]');
    await sleep(1600);
    await p.screenshot({ path: `${out}/m${w}-4-lios-home.png` });
    await p.click('.m-icon[data-app=analyst]');
    await sleep(1300);
    await p.screenshot({ path: `${out}/m${w}-5-analyst.png` });
    await p.evaluate(() => window.__os.mClose());
    await sleep(900);
    await p.click('.m-icon[data-app=health]');
    await sleep(1300);
    await p.screenshot({ path: `${out}/m${w}-6-health.png` });
    await p.evaluate(() => window.__os.mClose());
    await sleep(800);
    await p.click('#mSearch');
    await sleep(500);
    await p.keyboard.type('lead');
    await sleep(300);
    await p.screenshot({ path: `${out}/m${w}-7-search.png` });
    await p.keyboard.press('Enter');
    await sleep(1400);
    await p.screenshot({ path: `${out}/m${w}-8-career.png` });
    await ctx.close();
  }
}
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
server?.close();
