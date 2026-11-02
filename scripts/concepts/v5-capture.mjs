// node scripts/concepts/v5-capture.mjs <concept dir name> <outdir> [d|m...]  — screenshots each phase in real time
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const [name, out, which = 'dm'] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const PORT = 4340 + Math.floor(Math.random() * 50);
const srv = spawn('node', ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
const b = await chromium.launch();
const STEPS = process.env.STEPS ? JSON.parse(process.env.STEPS) : [[0, 2500], [1, 1500], [1, 5000], [2, 2500], [2, 6000], [3, 5000]];
for (const t of which) {
  const [w, h, dpr] = t === 'd' ? [1440, 900, 1] : [390, 844, 2], errs = [];
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(`http://localhost:${PORT}/concepts/${name}/`); await p.waitForTimeout(600);
  let k = 0, cur = -1;
  for (const [ph, ms] of STEPS) {
    if (ph !== cur) { await p.evaluate(ph => window.__go(ph), ph); cur = ph; await p.waitForTimeout(ms); }
    else await p.waitForTimeout(ms - (STEPS[k - 1]?.[1] || 0));
    await p.screenshot({ path: `${out}/${t}-${String(k++).padStart(2, '0')}-p${ph}.png` });
  }
  if (t === 'm') { await p.evaluate(() => scrollTo(0, 2000)); await p.waitForTimeout(400); await p.screenshot({ path: `${out}/${t}-${String(k++).padStart(2, '0')}-scrolled.png` }); }
  console.log(t, errs.slice(0, 5)); await p.close();
}
await b.close(); srv.kill();
