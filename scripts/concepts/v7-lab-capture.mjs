// node scripts/concepts/v7-lab-capture.mjs <outdir> <t1,t2,t3> [d|m|w|s...]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const [out, ts = 't1,t2,t3', which = 'dm', name = 'v7-lab'] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const PORT = 4500 + Math.floor(Math.random() * 90);
const srv = spawn('node', ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const VP = { d: [1440, 900, 1], w: [1920, 1080, 1], m: [390, 844, 2], s: [360, 740, 2] };
for (const t of ts.split(',')) for (const v of which) {
  const [w, h, dpr] = VP[v], errs = [];
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 300)));
  await p.goto(`http://localhost:${PORT}/concepts/${name}/?t=${t}`);
  await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/${t}-${v}-1-arrival.png` });
  await p.waitForTimeout(3000);
  const cx = w * .55, cy = h * .42; await p.mouse.move(cx, cy); await p.mouse.down();
  for (let i = 0; i < 20; i++) { await p.mouse.move(cx + i * 6, cy + i * 1.5); await p.waitForTimeout(50); }
  await p.mouse.up(); await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${t}-${v}-2-explore.png` });
  await p.evaluate(() => window.__state('found')); await p.waitForTimeout(3300); await p.screenshot({ path: `${out}/${t}-${v}-3-found.png` });
  await p.evaluate(() => window.__state('insight')); await p.waitForTimeout(3300); await p.screenshot({ path: `${out}/${t}-${v}-4-insight.png` });
  await p.evaluate(() => window.__state('creation')); await p.waitForTimeout(4200); await p.screenshot({ path: `${out}/${t}-${v}-5-creation.png` });
  console.log(t, v, errs.slice(0, 4)); await p.close();
}
await b.close(); srv.kill();
