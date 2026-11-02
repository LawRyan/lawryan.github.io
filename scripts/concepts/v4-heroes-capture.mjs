// node scripts/concepts/v4-heroes-capture.mjs <outdir>
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const srv = spawn('node', ['scripts/serve.mjs', '4331'], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
const b = await chromium.launch();
const shot = async (p, name) => p.screenshot({ path: `${out}/${name}.png` });
const scrollF = (p, f) => p.evaluate(f => { const t = document.getElementById('track'); scrollTo(0, t.offsetTop + f * (t.offsetHeight - innerHeight)); }, f);
for (const [vw, vh, tag] of [[1440, 900, 'd'], [390, 844, 'm']]) {
  const errs = [];
  const open = async f => { const p = await b.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: tag === 'm' ? 2 : 1 }); p.on('pageerror', e => errs.push(f + ': ' + e.message)); await p.goto(`http://localhost:4331/concepts/v4-heroes/${f}`); return p; };
  let p = await open('a-rearrange.html');
  if (tag === 'd') { await p.waitForTimeout(450); await shot(p, `a-${tag}-1`); }
  await p.waitForTimeout(3600); await shot(p, `a-${tag}-2`);
  if (tag === 'd') { await p.mouse.move(vw * .3, vh * .62); await p.waitForTimeout(600); await shot(p, `a-${tag}-3`); }
  await p.close();
  p = await open('b-blueprint.html'); await p.waitForTimeout(2500);
  for (const [f, n] of (tag === 'd' ? [[0, 1], [.24, 2], [.52, 3], [1, 4]] : [[.24, 2], [1, 4]])) { await scrollF(p, f); await p.waitForTimeout(1600); await shot(p, `b-${tag}-${n}`); }
  await p.close();
  p = await open('c-pieces.html');
  if (tag === 'd') { await p.waitForTimeout(700); await shot(p, `c-${tag}-1`); }
  await p.waitForTimeout(3600); await shot(p, `c-${tag}-2`);
  await p.close();
  p = await open('d-one-line.html'); await p.waitForTimeout(3200);
  for (const [f, n] of (tag === 'd' ? [[0, 1], [.35, 2], [1, 3]] : [[0, 1], [1, 3]])) { await scrollF(p, f); await p.waitForTimeout(1800); await shot(p, `d-${tag}-${n}`); }
  await p.close();
  console.log(tag, errs);
}
await b.close(); srv.kill();
