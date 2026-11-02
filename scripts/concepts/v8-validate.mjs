// V8 site validation. Prints facts only. node scripts/concepts/v8-validate.mjs <outdir>
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const out = process.argv[2], PORT = 5000 + Math.floor(Math.random() * 90);
const srv = spawn('node', ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
const url = `http://localhost:${PORT}/concepts/v8-site/`, GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const b = await chromium.launch({ args: GL }), res = {};
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }), errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(url); await p.waitForTimeout(3000);
  await p.keyboard.press('Tab'); res.firstTab = await p.evaluate(() => document.activeElement.className);
  res.a11y = await p.evaluate(() => ({ unnamed: [...document.querySelectorAll('button, a, [tabindex]')].filter(e => !(e.textContent.trim() || e.getAttribute('aria-label'))).length, h1: document.querySelectorAll('h1').length, imgsNoAlt: [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length, headingsOrder: [...document.querySelectorAll('h1,h2,h3')].map(h => h.tagName).slice(0, 12).join(' ') }));
  // break / build button
  await p.click('#break'); await p.waitForTimeout(1800); const b1 = await p.evaluate(() => window.__rooms.tower.st.build); await p.click('#break'); await p.waitForTimeout(3800); const b2 = await p.evaluate(() => window.__rooms.tower.st.build);
  res.breakButton = { afterBreak: +b1.toFixed(2), afterBuild: +b2.toFixed(2) };
  // city beats follow scroll
  const beats = [];
  for (const f of [.03, .36, .6, .97]) { await p.evaluate(f => { const e = document.getElementById('think-track'), s = e.closest('section'); scrollTo(0, s.offsetTop + f * (e.offsetHeight - innerHeight)); }, f); await p.waitForTimeout(2600); beats.push(await p.evaluate(() => [...document.querySelectorAll('#beats li')].findIndex(l => l.classList.contains('on')))); }
  res.cityBeats = beats;
  // tools: untangle finds the planted issues; a rule toggle changes the output; a question changes the answer
  await p.evaluate(() => document.getElementById('t-untangle').scrollIntoView()); await p.waitForTimeout(600);
  res.untangle = await p.evaluate(() => ({ summary: document.querySelector('.ut-sum').textContent.trim(), findings: document.querySelectorAll('.finds li').length }));
  const m0 = await p.evaluate(() => document.querySelector('.ri-meter').textContent); await p.click('.chips button[data-r="dup"]'); const m1 = await p.evaluate(() => document.querySelector('.ri-meter').textContent);
  res.ruleToggleChangesOutput = m0 !== m1;
  const a0 = await p.evaluate(() => document.querySelector('.ans').textContent); await p.click('.qs button[data-q="3"]'); await p.waitForTimeout(300); const a1 = await p.evaluate(() => document.querySelector('.ans').textContent);
  res.askAnswer = { changed: a0 !== a1, text: a1.slice(0, 90) };
  // L//IOS tabs by keyboard
  await p.focus('#lt-data'); await p.keyboard.press('ArrowRight'); res.liosArrowKey = await p.evaluate(() => document.activeElement.id + ' / panel shown: ' + [...document.querySelectorAll('.lp')].find(x => !x.hidden)?.id);
  // off screen (DOM chapters): no 3D rendering
  await p.evaluate(() => document.getElementById('beyond').scrollIntoView()); await p.waitForTimeout(800);
  res.framesRenderedOnBeyondIn1500ms = await p.evaluate(async () => { const a = window.__renders; await new Promise(r => setTimeout(r, 1500)); return window.__renders - a; });
  await p.evaluate(() => document.getElementById('contact').scrollIntoView()); await p.waitForTimeout(800);
  res.framesRenderedOnConnectIn1500ms = await p.evaluate(async () => { const a = window.__renders; await new Promise(r => setTimeout(r, 1500)); return window.__renders - a; });
  await p.click('#order'); await p.waitForTimeout(2900); res.orderButton = await p.evaluate(() => +window.__rooms.field.st.order.toFixed(2));
  res.errors = errs; await p.close();
}
res.overflow = {};
for (const [w, h] of [[1920, 1080], [1440, 900], [390, 844], [360, 740]]) { const p = await b.newPage({ viewport: { width: w, height: h } }); await p.goto(url); await p.waitForTimeout(1500); res.overflow[w] = await p.evaluate(async () => { let mx = 0; for (let y = 0; y < document.body.scrollHeight; y += innerHeight) { scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); mx = Math.max(mx, document.documentElement.scrollWidth - innerWidth); } return mx; }); await p.close(); }
{ const p = await b.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }), errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(url); await p.waitForTimeout(700);
  res.reducedMotion = { towerBuiltImmediately: await p.evaluate(() => window.__rooms.tower.st.build), errors: errs }; await p.close(); }
await b.close();
{ const b2 = await chromium.launch({ args: ['--disable-gpu', '--disable-webgl', '--disable-3d-apis'] }); const p = await b2.newPage({ viewport: { width: 1440, height: 900 } }), errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(url); await p.waitForTimeout(1000);
  res.noWebGL = { cls: await p.evaluate(() => document.documentElement.className), beatsVisible: await p.evaluate(() => [...document.querySelectorAll('#beats li')].filter(l => getComputedStyle(l).opacity === '1').length), errors: errs };
  await p.screenshot({ path: out + '/no-webgl.png', fullPage: false }); await b2.close(); }
{ const b3 = await chromium.launch(); const p = await b3.newPage(); await p.goto(url); await p.waitForTimeout(800); await p.pdf({ path: out + '/print.pdf' }); res.printPages = 'saved'; await b3.close(); }
console.log(JSON.stringify(res, null, 1)); srv.kill();
