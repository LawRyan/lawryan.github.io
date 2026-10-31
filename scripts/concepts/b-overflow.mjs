import { chromium } from 'playwright';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await c.newPage();
await p.goto('http://127.0.0.1:4301/concepts/b-editorial/'); await p.waitForTimeout(2500);
console.log(await p.evaluate(() => {
  const out = [`sw=${document.documentElement.scrollWidth} iw=${innerWidth} ih=${innerHeight} vv=${visualViewport.width}`];
  for (const e of document.querySelectorAll('body *')) { const r = e.getBoundingClientRect(); if (r.right > 600 && getComputedStyle(e).position !== 'fixed') out.push(e.tagName + '.' + e.className + ' ' + Math.round(r.right)); }
  return out.slice(0, 25).join('\n');
}));
await b.close();
