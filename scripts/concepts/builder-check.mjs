import { chromium } from 'playwright';
const f = 'file://' + process.argv[2];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [w, h, rm] of [[1440, 900, false], [360, 740, false], [390, 844, true]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, reducedMotion: rm ? 'reduce' : 'no-preference' });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(f); await p.waitForTimeout(3000);
  const r = await p.evaluate(() => ({ cls: document.documentElement.className, over: document.documentElement.scrollWidth - innerWidth, fonts: [...document.fonts].filter(x => x.status === 'loaded').map(x => x.family).join(','), noName: [...document.querySelectorAll('button,a')].filter(e => !e.textContent.trim() && !e.getAttribute('aria-label')).length }));
  console.log(w, rm ? 'reduced' : '', JSON.stringify(r), errs.slice(0, 3));
  await p.close();
}
await b.close();
