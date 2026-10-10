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
@font-face{font-family:GM;src:url(/fonts/GeistMono-700.woff);font-weight:700}
body{margin:0;width:1200px;height:630px;background:#090c11;color:#e9eef5;font-family:IS;overflow:hidden;position:relative}
.p{position:absolute;inset:60px 80px 165px;display:flex;flex-direction:column;justify-content:space-between}
.m{font-family:JB;font-size:20px;letter-spacing:.2em;color:#a4afbf}
h1{margin:0;font-weight:600;font-stretch:90%;letter-spacing:-.03em;line-height:.98;font-size:80px}
h1 i{font-family:ISe;color:#6fd3f2;font-weight:400}
.f{display:flex;justify-content:space-between;font-family:JB;font-size:20px;color:#6c7789}
svg{position:absolute;inset:0}.p{z-index:1}`;
// Five drifting series like the live hero, one of them caught as an outlier at the detector.
const series = (accent) => {
  const out = [];
  for (let i = 0; i < 5; i++) {
    const depth = i / 4, base = 500 + depth * 100, amp = 9 + depth * 10, alpha = 0.16 + depth * 0.2;
    let d = '';
    for (let k = 0; k <= 134; k++) {
      const x = k * 9;
      let v = Math.sin(k / 9 + i * 1.7) * 1.1 + Math.sin(k / 3.7 + i) * 0.45 + Math.sin(k / 21 + i * 2.3) * 0.9;
      if (i === 2) v += 3.2 * Math.exp(-((k - 93) ** 2) / 2.2);
      d += (k ? 'L' : 'M') + x + ',' + (base - v * amp * 0.5).toFixed(1);
    }
    out.push(`<path d="${d}" fill="none" stroke="rgba(200,212,228,${alpha})" stroke-width="1.2"/>`);
  }
  const cx = 93 * 9, cy = 500 + 0.5 * 100 - (3.2 + Math.sin(93 / 9 + 3.4) * 1.1 + Math.sin(93 / 3.7 + 2) * 0.45 + Math.sin(93 / 21 + 4.6) * 0.9) * 14 * 0.5;
  out.push(`<rect x="${cx}" y="470" width="1" height="160" fill="rgba(${accent},0.14)"/>`);
  out.push(`<circle cx="${cx}" cy="${cy.toFixed(1)}" r="3" fill="rgb(${accent})"/><circle cx="${cx}" cy="${cy.toFixed(1)}" r="13" fill="none" stroke="rgba(${accent},0.6)" stroke-width="1.2"/>`);
  out.push(`<text x="${cx + 18}" y="${(cy - 14).toFixed(1)}" font-family="JB" font-size="15" fill="rgba(${accent},0.9)">outlier · z 3.4</text>`);
  return out.join('');
};
const glow = (a, b) => `<div style="position:absolute;inset:0;background:radial-gradient(520px 420px at 8% 0%, rgba(${a},0.20), transparent 70%),radial-gradient(560px 460px at 100% 60%, rgba(${b},0.14), transparent 70%)"></div>`;
const pages = {
  home: `${glow('111,211,242', '183,168,255')}<svg width="1200" height="630">${series('111,211,242')}</svg><div class="p"><div class="m">RYAN LAW</div><div><h1>Turning complex data<br>into <i>intelligent</i> decisions.</h1><div style="margin-top:18px;font-size:26px;color:#c9d2de">Vice President, Client Intelligence · RBC Capital Markets</div></div><div class="f"><span>Capital Markets · Data &amp; Analytics · AI Innovation · <span style="font-family:GM;color:#e9eef5">L<span style="color:#6fd3f2">//</span>IOS</span></span><span>lawryan.github.io</span></div></div>`,
  lios: `${glow('183,168,255', '111,211,242')}<svg width="1200" height="630">${series('183,168,255')}</svg><div class="p"><div class="m">ANALYST · MARKETS · HEALTH — AN INDEPENDENT PROJECT BY RYAN LAW</div><h1 style="font-family:GM;font-weight:700;font-size:150px;line-height:1;letter-spacing:.01em;color:#e9eef5">L<span style="color:#6fd3f2">//</span>IOS</h1><div class="f"><span style="color:#e9eef5;font-family:IS;font-size:34px">An Operating System for Insight.</span><span>lawryan.github.io/lios</span></div></div>`,
};
for (const [k, html] of Object.entries(pages)) {
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  writeFileSync('dist/_og.html', `<!doctype html><meta charset="utf-8"><style>${css}</style>${html}`);
  await p.goto('http://127.0.0.1:4177/_og.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `public/og-${k}.png` }); await p.close();
}
unlinkSync('dist/_og.html'); await b.close(); s.close(); console.log('og images written');
