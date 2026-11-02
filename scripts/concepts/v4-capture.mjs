// V4 prototype captures in real time. node scripts/concepts/v4-capture.mjs <outdir> [d|m...] [file]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const [out, which = 'dm', file] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const srv = file ? null : spawn('node', ['scripts/serve.mjs', '4332'], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
const url = file ? 'file://' + file : 'http://localhost:4332/concepts/v4/';
const b = await chromium.launch();
const VP = { d: [1440, 900, 1], m: [390, 844, 2] };
const SHOTS = process.env.ONLY ? JSON.parse(process.env.ONLY) : [
  ['01-hero-pile', 0, 'early'], ['02-hero', 0], ['03-hero-hover', 0, 'hover'], ['04-hero-leaving', 'y:0.45'],
  ['05-think-whole', 't:0.03'], ['06-think-understand', 't:0.27'], ['07-think-simplify', 't:0.52'], ['08-think-build', 't:0.76'], ['09-think-improve', 't:0.97'],
  ['10-work', '#work'], ['11-untangle', '#t-untangle'], ['12-rules', '#t-rules'], ['13-ask', '#t-ask'], ['14-ask-unusual', '#t-ask', 'q3'], ['15-door', '.door'],
  ['16-lios', '#workshop'], ['17-lios-analyst', '.lios-tabs'], ['18-lios-health', '.lios-tabs', 'health'], ['19-lios-principles', '.lios-pr'],
  ['20-beyond', '#beyond'], ['21-contents', '.contents'], ['22-cv', '#background'], ['23-close', '#contact'],
];
for (const t of which) {
  const [w, h, dpr] = VP[t], errs = [];
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(url);
  for (const [name, at, act] of SHOTS) {
    if (act === 'early') { await p.waitForTimeout(350); await p.screenshot({ path: `${out}/${t}-${name}.png` }); await p.waitForTimeout(2600); continue; }
    const y = await p.evaluate(at => {
      if (typeof at === 'number') return at;
      if (at.startsWith('y:')) return +at.slice(2) * innerHeight;
      if (at.startsWith('t:')) { const e = document.getElementById('think'); return e.offsetTop + e.parentElement.offsetTop * 0 + +at.slice(2) * (e.offsetHeight - innerHeight) + document.getElementById('thinking').offsetTop - e.offsetTop + e.offsetTop - e.offsetTop; }
      const el = document.querySelector(at); return el.getBoundingClientRect().top + scrollY - 70;
    }, at);
    await p.evaluate(y => scrollTo(0, y), y);
    if (act === 'hover') await p.mouse.move(w * .25, h * .7);
    if (act === 'q3') await p.click('#t-ask .qs button:nth-child(4)');
    if (act === 'health') await p.click('#lt-health');
    await p.waitForTimeout(String(at).startsWith('t:') ? 2200 : 1300);
    await p.screenshot({ path: `${out}/${t}-${name}.png` });
    if (act === 'hover') await p.mouse.move(-10, -10);
  }
  const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(t, 'overflow', over, errs.slice(0, 5)); await p.close();
}
await b.close(); srv?.kill();
