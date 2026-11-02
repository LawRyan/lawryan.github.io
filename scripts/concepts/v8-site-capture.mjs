// node scripts/concepts/v8-site-capture.mjs <outdir> [d|m|w|s...] [file]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const [out, which = 'dm', file] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const PORT = 4900 + Math.floor(Math.random() * 90);
const srv = file ? null : spawn('node', ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
const url = file ? 'file://' + file : `http://localhost:${PORT}/concepts/v8-site/`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const VP = { d: [1440, 900, 1], w: [1920, 1080, 1], m: [390, 844, 2], s: [360, 740, 2] };
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const SHOTS = [['01-hero', 'top:0', 5500], ['02-hero-breaking', 'sec:.x-hero:.55', 2500], ['03-think-step-back', 'track:.03', 3000], ['04-think-close', 'track:.36', 3500], ['05-think-signal', 'track:.6', 3500], ['06-think-anomaly', 'track:.97', 3800],
  ['07-work', 'el:#work', 1200], ['08-untangle', 'el:#t-untangle', 1200], ['09-ask', 'el:#t-ask', 1600], ['10-lios', 'el:#workshop', 1200], ['11-lios-screens', 'el:.lios-tabs', 1600], ['12-beyond', 'el:#beyond', 1200], ['13-cv', 'el:#background', 1000], ['14-connect', 'el:#contact', 3500], ['15-connect-touched', 'touch', 1800]];
for (const v of which) {
  const [w, h, dpr] = VP[v], errs = [];
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
  await p.goto(url);
  for (const [n, at, wait] of SHOTS) {
    if (at === 'touch') { for (let i = 0; i < 4; i++) { await p.mouse.move(w * (v === 'd' || v === 'w' ? .7 : .5) + i * 30, h * .4 + i * 20); await p.waitForTimeout(300); } }
    else await p.evaluate(at => { const [k, a, b2] = at.split(':'); let y = 0;
      if (k === 'top') y = 0; else if (k === 'sec') { const e = document.querySelector(a); y = e.offsetTop + +b2 * e.offsetHeight; }
      else if (k === 'track') { const e = document.getElementById('think-track'), s = e.closest('section'); y = s.offsetTop + +a * (e.offsetHeight - innerHeight); }
      else y = document.querySelector(a).getBoundingClientRect().top + scrollY - 70;
      scrollTo(0, y); }, at);
    await p.waitForTimeout(wait);
    if (!ONLY || ONLY.includes(n)) await p.screenshot({ path: `${out}/${v}-${n}.png` });
  }
  const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(v, 'overflow', over, errs.slice(0, 4)); await p.close();
}
await b.close(); srv?.kill();
