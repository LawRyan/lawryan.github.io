// Concept A capture with a fixed clock (the page exposes window.__step(ms) when window.__manual is set).
// node scripts/concepts/a-capture.mjs shots <outdir> [d|m|s|l...]
// node scripts/concepts/a-capture.mjs video <out.mp4> [d|m] [seconds]
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
const [mode, out, which = 'dm', secs = '32'] = process.argv.slice(2);
const PORT = 4300;
const srv = spawn('node', ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const VP = { d: [1440, 900, 1], m: [390, 844, 2], s: [360, 740, 2], l: [430, 932, 2], v: [1280, 720, 1], p: [390, 844, 1.5] };
async function open(t) {
  const [w, h, dpr] = VP[t];
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
  await p.addInitScript(() => { window.__manual = true; });
  await p.goto(`http://localhost:${PORT}/concepts/a-monolith/`); await p.waitForFunction(() => window.__step, null, { timeout: 20000 });
  await p.waitForTimeout(400);
  return { p, errs, w, h };
}
const step = (p, n, ms = 33) => p.evaluate(([n, ms]) => { for (let i = 0; i < n; i++) window.__step(ms, i === n - 1); }, [n, ms]);
// scroll targets as [name, fraction of act1 | 'lead' | act2 fraction]
const TARGETS = process.env.ONLY ? JSON.parse(process.env.ONLY) : [['0-hero', 'a1', .02], ['1-layers', 'a1', .25], ['2-checked', 'a1', .43], ['2b-checked', 'a1', .5], ['3-automated', 'a1', .63], ['4-career', 'a1', .78], ['4b-career', 'a1', .95], ['5-leadership', 'lead', 0], ['6-closed', 'a2', .06], ['6b-split', 'a2', .22], ['6c-room', 'a2', .45], ['6d-markets', 'a2', .68], ['6e-health', 'a2', .9], ['7-contact', 'contact', 0]];
const yFor = (p, kind, f) => p.evaluate(([kind, f]) => {
  const el = kind === 'a1' ? document.getElementById('act1') : kind === 'a2' ? document.getElementById('lios') : document.getElementById(kind === 'lead' ? 'leadership' : 'contact');
  return el.offsetTop + (kind.startsWith('a') ? f * (el.offsetHeight - innerHeight) : 0);
}, [kind, f]);
if (mode === 'shots') {
  mkdirSync(out, { recursive: true });
  for (const t of which) {
    const { p, errs } = await open(t);
    await step(p, 90);
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
  const PATH = [[0, 'a1', 0], [3.5, 'a1', 0], [6, 'a1', .25], [8.5, 'a1', .27], [11, 'a1', .52], [13, 'a1', .55], [15, 'a1', .64], [16.5, 'a1', .66], [21, 'a1', .97], [22, 'a2', .04], [24, 'a2', .1], [27.5, 'a2', .38], [29, 'a2', .48], [31, 'a2', .66], [33, 'a2', .9], [35, 'a2', .92]];
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
