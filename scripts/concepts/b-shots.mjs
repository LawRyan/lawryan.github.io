// Concept B screenshots: node scripts/concepts/b-shots.mjs <outDir> [width] [height] [url] [only]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [out = '/tmp/b-shots', w = '1440', h = '900', url = 'http://127.0.0.1:4301/concepts/b-editorial/', only] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const W = +w, H = +h, mobile = W < 700;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile, reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(3000);
const pos = (sel, p, pinned = true) => page.evaluate(([sel, p, pinned]) => {
  const el = document.querySelector(sel); const r = el.getBoundingClientRect();
  const top = r.top + scrollY;
  return pinned ? top + p * (el.offsetHeight - innerHeight) : top + p * innerHeight;
}, [sel, p, pinned]);
const shots = [
  ['01-cover', null, 0],
  ['02-recon-a', '#recon', .02], ['02-recon-b', '#recon', .3], ['02-recon-c', '#recon', .58], ['02-recon-d', '#recon', .78], ['02-recon-e', '#recon', 1],
  ['03-fig-kyc', '.fig--kyc', 0, false], ['03-fig-clients', '.fig--clients', 0, false], ['03-fig-rules', '.fig--rules', .1, false], ['03-fig-reports', '.fig--reports', 0, false],
  ['04-leadership', '#leadership', 0, false],
  ['05-career-a', '#career', .05], ['05-career-b', '#career', .5], ['05-career-c', '#career', 1],
  ['06-lios-a', '.reveal', .02], ['06-lios-b', '.reveal', .14], ['06-lios-c', '.reveal', .3], ['06-lios-d', '.reveal', .52], ['06-lios-e', '.reveal', 1],
  ['06-lios-analyst', '#analyst', 0, false], ['06-lios-analyst-2', '#analyst', 1, false], ['06-lios-markets', '#markets', 0, false], ['06-lios-health', '#health', 0, false], ['06-lios-end', '.lios__end', -.3, false],
  ['07-contact', 'END'],
];
for (const [name, sel, p, pinned] of shots) {
  if (only && !name.includes(only)) continue;
  let y = 0;
  if (sel === 'END') y = await page.evaluate(() => document.documentElement.scrollHeight);
  else if (sel) y = await pos(sel, p, pinned !== false);
  await page.evaluate(y => scrollTo(0, y), y);
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${out}/${name}.png` });
}
if (!only || only === 'contents') {
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(600);
  await page.keyboard.press('Tab'); // skip link
  await page.click('.folio'); await page.waitForTimeout(900);
  if (!mobile) await page.hover('.contents__list li:nth-child(2) a');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/08-contents.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(700);
  console.log('dialog open after Esc:', await page.evaluate(() => document.querySelector('#contents').open), 'focus:', await page.evaluate(() => document.activeElement.className));
}
console.log('errors:', errs.length ? errs : 'none');
await browser.close();
