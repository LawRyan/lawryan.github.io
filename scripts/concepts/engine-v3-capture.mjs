// Intelligence Engine v3 capture, with a fixed clock (window.__step) and scripted interactions.
// node scripts/concepts/engine-v3-capture.mjs shots <outdir> [d|m|s|l...]
// node scripts/concepts/engine-v3-capture.mjs video <out.mp4> [d|m] [seconds]
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
const [mode, out, which = 'dm', secs = '36'] = process.argv.slice(2);
const PORT = 4305;
const srv = spawn('node', ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const VP = { d: [1440, 900, 1], m: [390, 844, 2], s: [360, 740, 2], l: [430, 932, 2], v: [1280, 720, 1], p: [390, 844, 1.5] };
async function open(t) {
  const [w, h, dpr] = VP[t];
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
  await p.addInitScript(() => { window.__manual = true; });
  await p.goto(`http://localhost:${PORT}/concepts/engine-v3/`); await p.waitForFunction(() => window.__step, null, { timeout: 20000 });
  return { p, errs, w, h };
}
const step = (p, n, ms = 33) => p.evaluate(([n, ms]) => { for (let i = 0; i < n; i++) window.__step(ms, i === n - 1); }, [n, ms]);
const yFor = (p, f) => p.evaluate(f => { const el = document.getElementById('track'); return el.offsetTop + f * (el.offsetHeight - innerHeight); }, f);
const SHOTS = process.env.ONLY ? JSON.parse(process.env.ONLY) : [
  ['1-hero', .02], ['2-alignment', .1], ['3-validation', .236], ['4-exceptions', .29], ['4b-exception-detail', .36, 'inspect'],
  ['5-completed', .445], ['6a-to-segments', .495], ['6b-segments', .545], ['6c-to-surface', .6], ['6d-surface', .66], ['6e-to-chart', .73],
  ['7-revenue', .86, 'hover'], ['8-anomaly', .86, 'anomaly'], ['7b-segment', .86, 'segment'],
];
if (mode === 'shots') {
  mkdirSync(out, { recursive: true });
  for (const t of which) {
    const { p, errs, w, h } = await open(t);
    await step(p, 90); await p.waitForTimeout(3200);
    for (const [name, f, act] of SHOTS) {
      await p.evaluate(y => scrollTo(0, y), await yFor(p, f));
      await step(p, 70);
      if (act === 'inspect') { await p.click('#inspect', { force: true }).catch(() => {}); await step(p, 2); }
      if (act === 'hover') { await p.evaluate(([x, y]) => window.__mouse(x, y), [w * (t === 'd' ? .52 : .55), h * (t === 'd' ? .55 : .62)]); await step(p, 3); }
      if (act === 'anomaly') { await p.evaluate(() => window.__mouse(-50, -50)); await step(p, 2); await p.click('#anom-btn', { force: true }).catch(() => {}); await step(p, 2); }
      if (act === 'segment') { await p.click('#anom-btn', { force: true }).catch(() => {}); await p.click('[data-s="2"]', { force: true }).catch(() => {}); await step(p, 3); }
      await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${t}-${name}.png`, timeout: 120000 });
      if (act === 'inspect') { await p.click('#x-close', { force: true }).catch(() => {}); }
      if (act === 'segment') { await p.click('[data-s="2"]', { force: true }).catch(() => {}); }
    }
    console.log(t, errs.slice(0, 5)); await p.close();
  }
} else {
  const t = which[0] === 'm' ? 'p' : 'v', fps = 30, n = Math.round(+secs * fps);
  const dir = out + '.frames'; rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const { p, errs, w, h } = await open(t);
  // the scroll path [seconds, track progress] with the hero idling first, the validation run slowed down, a hover on the chart
  const PATH = [[0, 0], [4, .02], [6.5, .14], [16, .46], [18.5, .52], [20, .56], [22.5, .635], [24, .69], [27, .78], [36, .8]];
  const ys = []; for (const [, f] of PATH) ys.push(await yFor(p, f));
  const scale = n / fps / PATH[PATH.length - 1][0];
  for (let i = 0; i < n; i++) {
    const s = i / fps / scale; let k = 0; while (k < PATH.length - 2 && s > PATH[k + 1][0]) k++;
    const u = Math.max(0, Math.min(1, (s - PATH[k][0]) / (PATH[k + 1][0] - PATH[k][0]))), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    await p.evaluate(y => scrollTo(0, y), ys[k] + (ys[k + 1] - ys[k]) * e);
    if (s > 28) { const hx = .2 + (s - 28) / 8 * .6; await p.evaluate(([x, y]) => window.__mouse(x, y), [w * hx, h * .55]); }
    await step(p, 1, 1000 / fps);
    await p.screenshot({ path: `${dir}/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 88, timeout: 120000 });
  }
  console.log(errs.slice(0, 5)); await p.close();
  execFileSync('/usr/bin/ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', `${dir}/f%04d.jpg`, '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '21', out]);
  rmSync(dir, { recursive: true, force: true }); console.log(out);
}
await b.close(); srv.kill();
