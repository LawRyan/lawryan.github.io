// V6 hero captures in real time (software GL). node scripts/concepts/v6-capture.mjs <outdir> [d|m|s...]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const [out, which = 'dm', file] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const PORT = 4400 + Math.floor(Math.random() * 90);
const srv = file ? null : spawn('node', ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
const url = file ? 'file://' + file : `http://localhost:${PORT}/concepts/${process.env.NAME || 'v6-hero'}/`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const VP = { d: [1440, 900, 1], m: [390, 844, 2], s: [360, 740, 2] };
for (const t of which) {
  const [w, h, dpr] = VP[t], errs = [];
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 300)));
  await p.goto(url); await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}/${t}-00-arrive.png` });
  await p.waitForTimeout(3500); await p.screenshot({ path: `${out}/${t}-01-complexity.png` });
  // a visitor turns the cloud: a slow drag across the canvas
  const cx = w * (t === 'd' ? .64 : .5), cy = h * (t === 'd' ? .45 : .32);
  await p.mouse.move(cx, cy); await p.mouse.down();
  for (let i = 0; i < 24; i++) { await p.mouse.move(cx + i * 7, cy + i * 2.2); await p.waitForTimeout(60); }
  await p.mouse.up(); await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/${t}-02-turning.png` });
  await p.evaluate(() => window.__found('system')); await p.waitForTimeout(3200);
  await p.screenshot({ path: `${out}/${t}-03-found.png` });
  const at = async (f, name, wait = 3600) => { await p.evaluate(f => { const tr = document.getElementById('track'); scrollTo(0, tr.offsetTop + f * (tr.offsetHeight - innerHeight)); }, f); await p.waitForTimeout(wait); await p.screenshot({ path: `${out}/${t}-${name}.png` }); };
  await at(.36, '04-structure'); await at(.6, '05-insight', 4500); await at(.9, '06-creation', 5000);
  const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(t, 'overflow', over, errs.slice(0, 5)); await p.close();
}
await b.close(); srv?.kill();
