// Renders the two social-share images (1200×630) into public/ with the site's own fonts.
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
import { writeFileSync, unlinkSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const s = await serve(4177); const b = await pw.chromium.launch();
const css = `@font-face{font-family:IS;src:url(/fonts/InstrumentSans-var.woff2);font-weight:400 700;font-stretch:75% 100%}
@font-face{font-family:ISe;src:url(/fonts/InstrumentSerif-Italic.woff2);font-style:italic}
@font-face{font-family:JB;src:url(/fonts/JetBrainsMono-Regular.woff2)}
body{margin:0;width:1200px;height:630px;background:#090c11;color:#e9eef5;font-family:IS;overflow:hidden;position:relative}
.p{position:absolute;inset:72px 80px;display:flex;flex-direction:column;justify-content:space-between}
.m{font-family:JB;font-size:20px;letter-spacing:.2em;color:#a4afbf}
h1{margin:0;font-weight:600;font-stretch:90%;letter-spacing:-.03em;line-height:.98;font-size:92px}
h1 i{font-family:ISe;color:#6fd3f2;font-weight:400}
.f{display:flex;justify-content:space-between;font-family:JB;font-size:20px;color:#6c7789}
svg{position:absolute;inset:0}`;
const lines = Array.from({ length: 22 }, (_, i) => { const y0 = 200 + i * 20, a = 6 + i * 1.6; let d = ''; for (let k = 0; k <= 60; k++) { const x = k * 20; const y = y0 - Math.sin(k / 6 + i * 0.7) * a * 0.6 - Math.exp(-((((k / 60) - 0.7) * 5) ** 2)) * a; d += (k ? 'L' : 'M') + x + ',' + y.toFixed(1); } return `<path d="${d}" fill="none" stroke="rgba(200,212,228,${0.04 + i * 0.012})"/>`; }).join('');
const pages = {
  home: `<svg width="1200" height="630">${lines}</svg><div class="p"><div class="m">RYAN LAW</div><h1>Turning complex data<br>into <i>intelligent</i> decisions.</h1><div class="f"><span>Capital Markets · Data &amp; Analytics · AI Innovation</span><span>lawryan.github.io</span></div></div>`,
  lios: `<svg width="1200" height="630">${lines}</svg><div class="p"><div class="m">ANALYST · MARKETS · HEALTH — AN INDEPENDENT PROJECT BY RYAN LAW</div><h1 style="font-size:190px;font-stretch:78%;letter-spacing:-.06em;background:linear-gradient(100deg,#e9eef5 20%,#b7a8ff 55%,#6fd3f2 90%);-webkit-background-clip:text;color:transparent">L//IOS</h1><div class="f"><span style="color:#e9eef5;font-family:IS;font-size:34px">An Operating System for Insight.</span><span>lawryan.github.io/lios</span></div></div>`,
};
for (const [k, html] of Object.entries(pages)) {
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  writeFileSync('dist/_og.html', `<!doctype html><meta charset="utf-8"><style>${css}</style>${html}`);
  await p.goto('http://127.0.0.1:4177/_og.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `public/og-${k}.png` }); await p.close();
}
unlinkSync('dist/_og.html'); await b.close(); s.close(); console.log('og images written');
