import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const out = process.argv[2];
const srv = spawn('node', ['scripts/serve.mjs', '4196'], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 900));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [w, h, t] of [[1440, 900, 'd'], [390, 844, 'm']]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: t === 'm' ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => /error|warn/.test(m.type()) && errs.push(m.text().slice(0, 200)));
  await p.goto('http://localhost:4196/next/'); 
  await p.waitForTimeout(600); await p.screenshot({ path: `${out}/${t}-a0.png` });
  await p.waitForTimeout(1800); await p.screenshot({ path: `${out}/${t}-a1.png` });
  await p.mouse.move(w * .62, h * .45); await p.waitForTimeout(2200); await p.screenshot({ path: `${out}/${t}-a2.png` });
  const secs = await p.evaluate(() => [...document.querySelectorAll('[data-scene]')].map(s => [s.offsetTop, s.offsetHeight]));
  for (const [i, [top, hh]] of secs.entries()) { await p.evaluate(y => scrollTo(0, y), top + hh / 2 - h / 2); await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${t}-s${i}.png` }); }
  // a transition midway
  await p.evaluate(([a, b]) => scrollTo(0, (a + b) / 2), [secs[0][0] + secs[0][1] / 2, secs[1][0] + secs[1][1] / 2].map(v => v - h / 2)); await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/${t}-mid.png` });
  console.log(t, errs.slice(0, 5));
  await p.close();
}
await b.close(); srv.kill();
