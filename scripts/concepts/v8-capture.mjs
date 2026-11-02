// node scripts/concepts/v8-capture.mjs <outdir> <a|b|c> [d|m]  — real-time captures of each concept's states
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const [out, c, which = 'd'] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const PORT = 4800 + Math.floor(Math.random() * 90);
const srv = spawn('node', ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const STATES = { a: [['chaos', 'set', 0], ['half', 'set', .5], ['built', 'set', 1], ['disturbed', 'poke', 1]], b: [['map', 'set', [0, 0]], ['descent', 'set', [1, 0]], ['street', 'set', [2, .55]], ['anomaly', 'set', [3, 1]]], c: [['field', 'set', 0], ['touched', 'touch', 0], ['ordered', 'set', 1], ['ordered-touched', 'touch', 1]] };
for (const v of which) {
  const [w, h, dpr] = v === 'd' ? [1440, 900, 1] : [390, 844, 2], errs = [];
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
  await p.goto(`http://localhost:${PORT}/concepts/v8-${c}/`); await p.waitForTimeout(2500);
  let k = 0;
  for (const [n, act, arg] of STATES[c]) {
    if (act === 'set') await p.evaluate(a => Array.isArray(a) ? window.__set(...a) : window.__set(a), arg);
    if (act === 'poke') { await p.evaluate(() => window.__set(1)); for (let i = 0; i < 6; i++) { await p.mouse.move(w * (v === 'd' ? .6 : .5) + i * 10, h * (v === 'd' ? .45 : .35)); await p.waitForTimeout(80); } }
    if (act === 'touch') { await p.evaluate(o => window.__set(o), arg); await p.evaluate(([x, y]) => window.__touch(x, y), [w * (v === 'd' ? .63 : .5), h * (v === 'd' ? .4 : .32)]); await p.waitForTimeout(500); await p.evaluate(([x, y]) => window.__touch(x, y), [w * (v === 'd' ? .68 : .55), h * (v === 'd' ? .55 : .4)]); }
    await p.waitForTimeout(act === 'poke' ? 300 : 1400);
    await p.screenshot({ path: `${out}/${c}-${v}-${k++}-${n}.png` });
  }
  console.log(c, v, errs.slice(0, 3)); await p.close();
}
await b.close(); srv.kill();
