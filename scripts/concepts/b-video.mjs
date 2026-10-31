// Concept B motion capture: node scripts/concepts/b-video.mjs <desktop|mobile> <out.mp4> [url]
import { chromium } from 'playwright';
import { mkdtempSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const [mode = 'desktop', out = '/tmp/b.mp4', url = 'http://127.0.0.1:4301/concepts/b-editorial/'] = process.argv.slice(2);
const mobile = mode === 'mobile';
const size = mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const dir = mkdtempSync(join(tmpdir(), 'bvid-'));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: size, isMobile: mobile, hasTouch: mobile, recordVideo: { dir, size } });
const page = await ctx.newPage();
const t0 = Date.now(); const T = l => console.log(l, ((Date.now() - t0) / 1000).toFixed(1));
await page.goto(url, { waitUntil: 'load' });
const lead = (Date.now() - t0) / 1000;
// smooth scroll helper inside the page (eased, time based)
const glide = (to, ms) => page.evaluate(([to, ms]) => new Promise(res => {
  const from = scrollY, t0 = performance.now();
  const e = t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const step = now => { const t = Math.min(1, (now - t0) / ms); scrollTo(0, from + (to - from) * e(t)); t < 1 ? requestAnimationFrame(step) : res(); };
  requestAnimationFrame(step);
}), [to, ms]);
const at = (sel, p = 0) => page.evaluate(([sel, p]) => { const el = document.querySelector(sel); return el.getBoundingClientRect().top + scrollY + p * (el.offsetHeight - innerHeight); }, [sel, p]);
const jump = async y => { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(350); };

await page.waitForTimeout(2600); // the cover entrance
if (!mobile) {
  for (let i = 0; i <= 12; i++) { await page.mouse.move(150 + i * 100, 420); await page.waitForTimeout(50); }
  for (let i = 12; i >= 3; i--) { await page.mouse.move(150 + i * 100, 420); await page.waitForTimeout(60); }
  await page.mouse.move(1430, 880); await page.waitForTimeout(500);
  await glide(await at('#recon', 0), 1200);
  await glide(await at('#recon', 1), 6500); T('recon');
  await page.waitForTimeout(800);
  await jump(await at('#career', 0));
  await glide(await at('#career', 1), 4200);
  await jump(await at('.reveal', 0));
  await page.waitForTimeout(500);
  await glide(await at('.reveal', 1), 7000); T('reveal');
  await glide(await at('#analyst') + 380, 1400);
  await page.click('#analyst .viewer__tabs li:nth-child(5) button'); await page.waitForTimeout(1400);
} else {
  await glide(await at('#recon', 0), 900);
  await glide(await at('#recon', 1), 4000);
  await page.waitForTimeout(500);
  await jump(await at('.reveal', 0));
  await glide(await at('.reveal', 1), 4200);
  await page.waitForTimeout(600);
}
const video = page.video();
await ctx.close(); await browser.close();
const webm = await video.path();
execFileSync('/usr/bin/ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.max(0, lead - .1)), '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'medium', '-movflags', '+faststart', '-r', '30', out]);
console.log(out, execFileSync('/usr/bin/ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString().trim() + 's');
