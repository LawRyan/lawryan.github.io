// V7 validation: keyboard, discovery by turning, reduced motion, no-WebGL, accessibility basics, frame timing. Prints facts only.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const PORT = 4700 + Math.floor(Math.random() * 90);
const srv = spawn('node', ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
const url = `http://localhost:${PORT}/concepts/v7-hero/`;
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const b = await chromium.launch({ args: GL });
const res = {};
{ // keyboard: focus the instrument, turn it with arrow keys, the gauge responds
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url); await p.waitForTimeout(3500);
  await p.keyboard.press('Tab'); const first = await p.evaluate(() => document.activeElement.className || document.activeElement.tagName);
  await p.focus('#gl'); const y0 = await p.evaluate(() => window.__lens.cur.yaw);
  for (let i = 0; i < 8; i++) { await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(120); }
  await p.waitForTimeout(600); const y1 = await p.evaluate(() => window.__lens.cur.yaw);
  res.keyboard = { firstTab: first, yawBefore: +y0.toFixed(3), yawAfter: +y1.toFixed(3), turned: Math.abs(y1 - y0) > .1 };
  // discovery by turning: rotate toward the answer in small steps and see whether "found by you" fires
  const found = await p.evaluate(async () => { const L = window.__lens; for (let k = 0; k < 160 && L.S.found === 0; k++) { const step = L.DATA ? .03 : 0; L.cur.yaw += step; await new Promise(r => setTimeout(r, 40)); } return { found: L.S.found > 0, by: L.foundBy }; });
  res.discoverByTurning = found;
  // frame timing over 3 s (software GL here: an upper bound, not a device measurement)
  const t = await p.evaluate(async () => { const ts = []; let l = performance.now(); await new Promise(r => { const f = n => { ts.push(n - l); l = n; ts.length < 120 ? requestAnimationFrame(f) : r(); }; requestAnimationFrame(f); }); ts.sort((a, b) => a - b); return { median: +ts[60].toFixed(1), p95: +ts[114].toFixed(1) }; });
  res.frameMsSoftwareGL = t;
  res.a11y = await p.evaluate(() => ({ unnamedControls: [...document.querySelectorAll('button, a, [tabindex]')].filter(e => !(e.textContent.trim() || e.getAttribute('aria-label'))).length, h1: document.querySelectorAll('h1').length, canvasLabel: !!document.getElementById('gl').getAttribute('aria-label'), overflow: document.documentElement.scrollWidth - innerWidth }));
  // offscreen: the loop stops rendering when the hero is out of view
  await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(800);
  res.offscreenPaused = await p.evaluate(async () => { const before = window.__renders; await new Promise(r => setTimeout(r, 1500)); return { framesRenderedIn1500ms: window.__renders - before }; });
  res.errors = errs; await p.close();
}
{ // reduced motion: no intro, story reachable by scroll and buttons
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url); await p.waitForTimeout(800);
  const s = await p.evaluate(() => ({ arrive: window.__lens.S.arrive, rm: document.documentElement.classList.contains('rm') }));
  await p.click('.progress li:nth-child(3) button'); await p.waitForTimeout(900);
  const b3 = await p.evaluate(() => [...document.querySelectorAll('.beat')].findIndex(e => e.classList.contains('on')));
  res.reducedMotion = { ...s, beatAfterInsightButton: b3, errors: errs }; await p.close();
}
await b.close();
{ // no WebGL at all
  const b2 = await chromium.launch({ args: ['--disable-gpu', '--disable-webgl', '--disable-3d-apis'] });
  const p = await b2.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url); await p.waitForTimeout(1200);
  res.noWebGL = await p.evaluate(() => ({ cls: document.documentElement.className, beatVisible: getComputedStyle(document.querySelector('.beat')).visibility })); res.noWebGL.errors = errs;
  await p.screenshot({ path: process.argv[2] + '/no-webgl.png' }); await b2.close();
}
console.log(JSON.stringify(res, null, 1)); srv.kill();
