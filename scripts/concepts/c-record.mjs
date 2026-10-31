// Records concept C motion: desktop (c-motion.mp4) and phone (c-mobile.mp4).
// Usage: node scripts/concepts/c-record.mjs <outDir>
import { chromium } from 'playwright';
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { serve } from '../serve.mjs';

const out = process.argv[2] || '/tmp/c-rec';
const base = 'http://127.0.0.1:4302/concepts/c-os/?still';
mkdirSync(out, { recursive: true });
const server = await serve(4302);
const browser = await chromium.launch();
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function glide(p, x0, y0, x1, y1, steps = 24, ms = 420) {
  await p.mouse.move(x0, y0);
  await p.mouse.down();
  for (let i = 1; i <= steps; i++) { const t = i / steps, e = 1 - Math.pow(1 - t, 2); await p.mouse.move(x0 + (x1 - x0) * e, y0 + (y1 - y0) * e); await sleep(ms / steps); }
  await p.mouse.up();
}
async function moveTo(p, sel, ms = 350) {
  const b = await p.locator(sel).first().boundingBox();
  if (!b) { console.log('missing', sel, await p.evaluate(() => JSON.stringify({ locked: __os.state.locked, ov: __os.state.overview, sp: __os.state.space, act: document.activeElement?.id }))); await p.screenshot({ path: out + '/fail.png' }); }
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: Math.max(6, Math.round(ms / 25)) });
  return b;
}
async function clickSel(p, sel, ms) { await moveTo(p, sel, ms); await sleep(120); await p.mouse.down(); await p.mouse.up(); }

async function record(name, viewport, script) {
  const dir = join(out, `raw-${name}`);
  rmSync(dir, { recursive: true, force: true });
  const ctx = await browser.newContext({ viewport, recordVideo: { dir, size: viewport }, hasTouch: viewport.width < 760 });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await script(p);
  await ctx.close();
  const webm = join(dir, readdirSync(dir).find(f => f.endsWith('.webm')));
  const mp4 = join(out, `${name}.mp4`);
  execFileSync('/usr/bin/ffmpeg', ['-y', '-loglevel', 'error', '-ss', '0.4', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-movflags', '+faststart', mp4]);
  console.log(mp4);
}

await record('c-motion', { width: 1440, height: 900 }, async p => {
  await p.mouse.move(720, 700);
  await sleep(2200);
  await glide(p, 720, 820, 720, 380, 22, 380);           // drag the lock screen up
  await sleep(600);
  if (await p.evaluate(() => __os.state.locked && !document.body.classList.contains('is-unlocking'))) { console.log('drag did not unlock; pressing Enter'); await p.keyboard.press('Enter'); }
  await p.waitForFunction(() => !__os.state.locked);
  await sleep(1800);
  await clickSel(p, '.dock-item[data-app=contact]', 500); // open a window from the dock
  await p.waitForFunction(() => !document.querySelector('#w-contact').hidden);
  await sleep(1100);
  const bar = await p.locator('#w-contact .win-bar').boundingBox();
  await glide(p, bar.x + 120, bar.y + 22, bar.x - 160, bar.y + 260, 16, 300); // throw it
  await sleep(1100);
  await p.keyboard.press('F3');                          // Overview
  await sleep(1700);
  await clickSel(p, '.ov-tile >> nth=1', 500);
  await sleep(1300);
  await clickSel(p, '.spaces button[data-space="1"]', 600); // into L//IOS
  await p.waitForFunction(() => !document.querySelector('#w-analyst').hidden);
  await sleep(1600);
  for (const n of [2, 4, 5]) { await clickSel(p, `#w-analyst [role=tab]:nth-child(${n})`, 380); await sleep(1250); }
  await clickSel(p, '.dock-item[data-app=health]', 600);
  await p.waitForFunction(() => !document.querySelector('#w-health').hidden);
  await sleep(1300);
  const scr = await p.locator('#w-health .track').boundingBox();
  for (let i = 0; i < 2; i++) { await glide(p, scr.x + scr.width * 0.8, scr.y + scr.height / 2, scr.x + scr.width * 0.15, scr.y + scr.height / 2, 14, 260); await sleep(1000); }
  await p.keyboard.press('Control+k');
  await sleep(500);
  for (const ch of 'semi') { await p.keyboard.type(ch); await sleep(90); }
  await sleep(500);
  await p.keyboard.press('Enter');
  await sleep(2200);
  await p.keyboard.press('Control+ArrowLeft');            // back to daylight
  await sleep(2600);
});

await record('c-mobile', { width: 390, height: 844 }, async p => {
  await sleep(1600);
  await glide(p, 195, 780, 195, 300, 18, 330);
  await sleep(500);
  if (await p.evaluate(() => __os.state.locked && !document.body.classList.contains('is-unlocking'))) { console.log('mobile drag did not unlock'); await p.click('#unlockBtn'); }
  await p.waitForFunction(() => !__os.state.locked);
  await sleep(900);
  await clickSel(p, '.m-icon[data-app=about]', 300);
  await sleep(1500);
  await glide(p, 195, 30, 195, 420, 14, 300);             // swipe down to close
  await sleep(1100);
  await clickSel(p, '.dots button[data-page="1"]', 300);
  await sleep(1700);
  await clickSel(p, '.m-icon[data-app=analyst]', 300);
  await sleep(1300);
  await clickSel(p, '#w-analyst [role=tab]:nth-child(4)', 300);
  await sleep(1200);
  await clickSel(p, '#w-analyst .win-back', 300);
  await sleep(1000);
  await clickSel(p, '.m-icon[data-app=health]', 300);
  await sleep(1300);
  const scr = await p.locator('#w-health .track').boundingBox();
  await glide(p, scr.x + scr.width * 0.85, scr.y + scr.height / 2, scr.x + scr.width * 0.1, scr.y + scr.height / 2, 12, 240);
  await sleep(1100);
  await clickSel(p, '#w-health .win-back', 300);
  await sleep(1000);
  await clickSel(p, '.dots button[data-page="0"]', 300);
  await sleep(1500);
});

await browser.close();
server.close();
