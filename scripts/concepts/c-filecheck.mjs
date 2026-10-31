// Verifies the packed single-file build works from file:// (desktop + phone).
import { chromium } from 'playwright';
const [file, shotDir] = process.argv.slice(2);
const b = await chromium.launch();
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const p = await (await b.newContext({ viewport: vp })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('requestfailed', r => errs.push('failed ' + r.url().slice(0, 80)));
  await p.goto('file://' + file + '?still');
  await p.evaluate(() => document.fonts.ready);
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => !__os.state.locked);
  await p.evaluate(() => __os.openApp('analyst'));
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => ({
    fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family),
    img: [...document.querySelectorAll('#w-analyst .shot-img')].map(i => i.naturalWidth),
  }));
  console.log(vp.width, JSON.stringify(r), errs.join('; ') || 'no errors');
  await p.screenshot({ path: `${shotDir}/file-${vp.width}.png` });
}
await b.close();
