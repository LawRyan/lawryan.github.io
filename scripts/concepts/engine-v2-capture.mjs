// Intelligence Engine capture with a fixed clock (the page exposes window.__step(ms) when window.__manual is set).
// node scripts/concepts/a-capture.mjs shots <outdir> [d|m|s|l...]
// node scripts/concepts/a-capture.mjs video <out.mp4> [d|m] [seconds]
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
const [mode, out, which = 'dm', secs = '32'] = process.argv.slice(2);
const PORT = 4304;
const srv = spawn('node', ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const VP = { d: [1440, 900, 1], m: [390, 844, 2], s: [360, 740, 2], l: [430, 932, 2], v: [1280, 720, 1], p: [390, 844, 1.5] };
async function open(t) {
  const [w, h, dpr] = VP[t];
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
  await p.addInitScript(() => { window.__manual = true; });
  await p.goto(`http://localhost:${PORT}/concepts/engine-v2/`); await p.waitForFunction(() => window.__step, null, { timeout: 20000 });
  await p.waitForTimeout(400);
  return { p, errs, w, h };
}
const step = (p, n, ms = 33) => p.evaluate(([n, ms]) => { for (let i = 0; i < n; i++) window.__step(ms, i === n - 1); }, [n, ms]);
// scroll targets as [name, fraction of act1 | 'lead' | act2 fraction]
const TARGETS = process.env.ONLY ? JSON.parse(process.env.ONLY) : [['0-hero', 't', .02], ['0b-mid', 't', .135], ['1-matrix', 't', .24], ['1b-wave', 't', .34], ['1c-inside', 't', .42], ['1d-after', 't', .515], ['2a-mid', 't', .58], ['2-surface', 't', .7], ['3a-mid', 't', .81], ['3-series', 't', .93]];
const yFor = (p, kind, f) => p.evaluate(f => { const el = document.getElementById('track'); return el.offsetTop + f * (el.offsetHeight - innerHeight); }, f);
if (mode === 'shots') {
  mkdirSync(out, { recursive: true });
  for (const t of which) {
    const { p, errs } = await open(t);
    await step(p, 90); await p.waitForTimeout(3200);
    for (const [name, kind, f] of TARGETS) {
      await p.evaluate(y => scrollTo(0, y), await yFor(p, kind, f));
      await step(p, 70); await p.waitForTimeout(450); await p.screenshot({ path: `${out}/${t}-${name}.png`, timeout: 120000 });
    }
    console.log(t, errs.slice(0, 5)); await p.close();
  }
} else {
  const t = which[0] === 'm' ? 'p' : 'v', fps = 30, n = Math.round(+secs * fps);
  const dir = out + '.frames'; rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const { p, errs } = await open(t);
  // a scroll path: [time s, kind, fraction]
  const PATH = [[0, 't', 0], [4, 't', .02], [8, 't', .2], [9.5, 't', .22], [16, 't', .5], [17, 't', .52], [21, 't', .66], [23, 't', .74], [26.5, 't', .87], [30, 't', .95]];
  const ys = []; for (const [, k, f] of PATH) ys.push(await yFor(p, k, f));
  const scale = n / fps / PATH[PATH.length - 1][0];
  for (let i = 0; i < n; i++) {
    const s = i / fps / scale; let k = 0; while (k < PATH.length - 2 && s > PATH[k + 1][0]) k++;
    const u = Math.max(0, Math.min(1, (s - PATH[k][0]) / (PATH[k + 1][0] - PATH[k][0]))), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    const y = ys[k] + (ys[k + 1] - ys[k]) * e;
    await p.evaluate(y => scrollTo(0, y), y); await step(p, 1, 1000 / fps);
    await p.screenshot({ path: `${dir}/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 88 });
  }
  console.log(errs.slice(0, 5)); await p.close();
  execFileSync('/usr/bin/ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', `${dir}/f%04d.jpg`, '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', out]);
  rmSync(dir, { recursive: true, force: true }); console.log(out);
}
await b.close(); srv.kill();
