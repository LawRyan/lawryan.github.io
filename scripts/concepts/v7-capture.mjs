// V7 hero captures (software GL, real time). node scripts/concepts/v7-capture.mjs <outdir> [d|w|m|s...] [file]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const [out, which = 'dm', file] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const PORT = 4600 + Math.floor(Math.random() * 90);
const srv = file ? null : spawn('node', ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
const url = file ? 'file://' + file : `http://localhost:${PORT}/concepts/v7-hero/`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const VP = { d: [1440, 900, 1], w: [1920, 1080, 1], m: [390, 844, 2], s: [360, 740, 2] };
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const v of which) {
  const [w, h, dpr] = VP[v], errs = [];
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 300)));
  await p.goto(url);
  const shot = async n => { if (!ONLY || ONLY.includes(n)) await p.screenshot({ path: `${out}/${v}-${n}.png` }); };
  await p.waitForTimeout(1300); await shot('1-arriving');
  await p.waitForTimeout(3200); await shot('2-arrived');
  const cx = w * (v === 'm' || v === 's' ? .5 : .57), cy = h * (v === 'm' || v === 's' ? .33 : .47);
  await p.mouse.move(cx, cy); await p.mouse.down();
  for (let i = 0; i < 18; i++) { await p.mouse.move(cx + i * 7, cy + i * 2); await p.waitForTimeout(45); }
  await p.mouse.up(); await p.waitForTimeout(500); await shot('3-exploring');
  await p.evaluate(() => window.__lens.found('system')); await p.waitForTimeout(3400); await shot('4-found');
  for (const [f, n, wt] of [[.27, '5-structure', 3600], [.48, '6-insight', 4200], [.7, '7-creation', 4800], [.96, '8-exit', 3600]]) { await p.evaluate(f => window.__go(f), f); await p.waitForTimeout(wt); await shot(n); }
  await p.evaluate(() => scrollTo(0, document.getElementById('think').offsetTop - 120)); await p.waitForTimeout(1200); await shot('9-handover');
  const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(v, 'overflow', over, errs.slice(0, 4)); await p.close();
}
await b.close(); srv?.kill();
