// Screenshots of every /next/ scene: node scripts/next-shots.mjs <outdir> [d|m|s|l…] (desktop, 390, 360, 430)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const out = process.argv[2], only = process.argv[3] || 'dm';
const srv = spawn('node', ['scripts/serve.mjs', '4197'], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 900));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const VP = { d: [1440, 900, 1], m: [390, 844, 2], s: [360, 740, 2], l: [430, 932, 2] };
for (const t of only) {
  const [w, h, dpr] = VP[t];
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => /error|warn/.test(m.type()) && errs.push(m.text().slice(0, 200)));
  await p.goto('http://localhost:4197/next/'); await p.waitForTimeout(3500); await p.screenshot({ path: `${out}/${t}-0.png` });
  const secs = await p.evaluate(() => [...document.querySelectorAll('[data-scene]')].map(s => [s.offsetTop, s.offsetHeight]));
  const shots = [];
  for (const [i, [top, hh]] of secs.entries()) if (i) shots.push([String(i), top + hh / 2 - h / 2]);
  const [ct, ch] = secs[6]; shots.push(['6a', ct + ch * .3 - h / 2], ['6c', ct + ch * .72 - h / 2]);
  const sc = await p.evaluate(() => { const e = document.getElementById('showcase'); return e.getBoundingClientRect().top + scrollY; });
  const [lt] = secs[7]; shots.push(['7a', lt + 10], ['7b', sc - 40]);
  for (const [n, y] of shots) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(n === '6a' || n === '6c' ? 2500 : 2200); await p.screenshot({ path: `${out}/${t}-${n}.png` }); }
  console.log(t, errs.slice(0, 5));
  await p.close();
}
await b.close(); srv.kill();
