// Checks every phone app sheet for horizontal overflow at 360/390/430. Usage: node scripts/concepts/c-overflow.mjs <outDir>
import { chromium } from 'playwright';
import { serve } from '../serve.mjs';
const s = await serve(4302);
const b = await chromium.launch();
for (const w of [360, 390, 430]) {
  const p = await (await b.newContext({ viewport: { width: w, height: 760 }, hasTouch: true, isMobile: true })).newPage();
  await p.goto('http://127.0.0.1:4302/concepts/c-os/?still');
  await p.click('#unlockBtn'); await p.waitForFunction(() => !__os.state.locked);
  for (const id of ['analyst', 'markets', 'health', 'career', 'results', 'about', 'contact']) {
    await p.evaluate(id => __os.openApp(id), id); await p.waitForTimeout(700);
    const o = await p.evaluate(id => { const el = document.getElementById('w-' + id); return [el.scrollWidth, el.clientWidth, el.querySelector('.win-body').scrollWidth]; }, id);
    if (o[0] > o[1] + 1 || o[2] > w + 1) console.log('overflow', w, id, o);
    if (id === 'analyst' && w === 360) await p.screenshot({ path: process.argv[2] + '/mobile-360-5-analyst.png' });
    await p.evaluate(() => __os.mClose()); await p.waitForTimeout(500);
  }
}
console.log('checked'); await b.close(); s.close();
