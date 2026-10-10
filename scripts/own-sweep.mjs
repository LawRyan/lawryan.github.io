// Uploads every CSV in a folder to the Lab and clicks through all five steps, every question and finding.
// Usage: node scripts/own-sweep.mjs <folder> [width=390] [name-filter]   (build first; corpus from scripts/own-corpus.py)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
const [D, W] = [process.argv[2], +(process.argv[3] || 390)];
const only = process.argv[4];
const srv = spawn('node', ['scripts/serve.mjs', '4190'], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 900));
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: W, height: 900 }, reducedMotion: 'reduce', ...(W < 500 ? { isMobile: true, hasTouch: true } : {}) });
const BAD = /\bNaN\b|undefined|Infinity|\[object Object\]/;
let failed = 0;
for (const f of readdirSync(D).sort()) {
  if (only && !f.includes(only)) continue;
  const p = await ctx.newPage(); const errs = []; const probs = [];
  p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
  const t0 = Date.now(); let steps = 0;
  try {
    await p.goto('http://localhost:4190/?nointro'); await p.locator('#lab').scrollIntoViewIfNeeded(); await p.click('.own-link');
    await p.setInputFiles('.own-drop input[type=file]', { name: f, mimeType: 'text/csv', buffer: readFileSync(`${D}/${f}`) });
    const which = await Promise.race([p.waitForSelector('.und-done', { timeout: 30000 }).then(() => 'ok'), p.waitForSelector('.own-error', { timeout: 30000 }).then(() => 'err')]);
    if (which === 'err') { console.log(`${f}: message “${await p.locator('.own-error').innerText()}”`); await p.close(); continue; }
    const check = async (where) => {
      const txt = await p.locator('.alab-body').innerText(); if (BAD.test(txt)) probs.push(`${where}: “${txt.match(new RegExp(`.{0,50}(${BAD.source}).{0,30}`))?.[0]}”`);
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (ov > 1) probs.push(`${where}: page overflows ${ov}px`);
      steps++;
    };
    await check('understand');
    await p.locator('.alab-steps button', { hasText: 'Dashboard' }).click(); await check('dashboard');
    const bars = await p.locator('.own-dbar:not(.other)').count();
    for (let k = 0; k < Math.min(bars, 3); k++) {
      await p.locator('.alab-steps button', { hasText: 'Dashboard' }).click();
      await p.locator('.own-dbar:not(.other)').nth(k).click(); await p.waitForSelector('.st-inv'); await check(`bar ${k}`);
    }
    await p.locator('.alab-steps button', { hasText: 'Dashboard' }).click();
    const side = await p.locator('.own-side .flist button:not([disabled])').count();
    for (let k = 0; k < side; k++) {
      await p.locator('.alab-steps button', { hasText: 'Dashboard' }).click();
      await p.locator('.own-side .flist button:not([disabled])').nth(k).click(); await p.waitForSelector('.st-inv'); await check(`insight ${k}`);
    }
    await p.locator('.alab-steps button', { hasText: 'Ask' }).click();
    const qn = await p.locator('.qchips button').count();
    for (let k = 0; k < qn; k++) {
      await p.locator('.alab-steps button', { hasText: 'Ask' }).click();
      await p.locator('.qchips button').nth(k).click(); await check(`ask ${k}`);
      const rec = p.getByRole('button', { name: /Investigate the records/ });
      if (await rec.count()) { await rec.click(); await p.waitForSelector('.st-inv'); await check(`ask ${k} records`);
        const next = p.locator('.tbl-foot button', { hasText: 'Next' }); if (await next.isEnabled().catch(() => false)) { await next.click(); await check(`ask ${k} page 2`); } }
    }
    await p.locator('.alab-steps button', { hasText: 'Investigate' }).click(); await check('pick');
    const fn = await p.locator('.st-pick .pick-list button').count();
    for (let k = 0; k < Math.min(fn, 8); k++) {
      await p.locator('.alab-steps button', { hasText: 'Investigate' }).click();
      await p.locator('.st-pick .pick-list button').nth(k).click(); await p.waitForSelector('.st-inv'); await check(`finding ${k}`);
    }
    if (fn) { const sel = p.locator('.inv-pick select'); const opts = await sel.locator('option').count(); if (opts > 1) { await sel.selectOption({ index: opts - 1 }); await check('select'); } }
    await p.locator('.alab-steps button', { hasText: 'Understand' }).click();
    const det = p.locator('.own-coldetails summary'); if (await det.count()) { await det.click(); await check('columns'); }
  } catch (e) { probs.push('EXCEPTION ' + e.message.split('\n')[0]); }
  const bad = [...errs, ...probs];
  if (bad.length) failed++;
  console.log(`${f}: ${steps} views, ${((Date.now() - t0) / 1000).toFixed(1)}s${bad.length ? '\n  !! ' + bad.slice(0, 6).join('\n  !! ') : ''}`);
  await p.close();
}
console.log(`\n${failed} files with UI problems at ${W}px`);
await b.close(); srv.kill();
