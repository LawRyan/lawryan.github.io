// Keyboard-only and reduced-motion walk-through of concept C (packed file).
import { chromium } from 'playwright';
const [file, shotDir] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + file + '?still');
const act = () => p.evaluate(() => { const a = document.activeElement; return `${a.tagName}#${a.id}.${a.className}`.slice(0, 70) + ' "' + (a.getAttribute('aria-label') || a.textContent).trim().slice(0, 30) + '"'; });
await p.keyboard.press('Tab'); console.log('tab1', await act());
await p.keyboard.press('Enter'); await p.waitForTimeout(300);
console.log('skip ->', await act(), await p.evaluate(() => __os.state.locked));
await p.keyboard.press('F3'); await p.waitForTimeout(200); console.log('F3 ->', await act());
await p.keyboard.press('ArrowRight'); console.log('arrow ->', await act());
await p.keyboard.press('Enter'); await p.waitForTimeout(200); console.log('pick ->', await act(), await p.evaluate(() => __os.state.overview));
await p.keyboard.press('/'); await p.keyboard.type('health'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
console.log('cmd health ->', await act(), await p.evaluate(() => __os.state.space));
for (let i = 0; i < 4; i++) await p.keyboard.press('Tab');
console.log('tab x4 ->', await act());
await p.screenshot({ path: shotDir + '/a11y-focus.png' });
await p.keyboard.press('Control+ArrowLeft'); await p.waitForTimeout(200);
console.log('ctrl-left space', await p.evaluate(() => __os.state.space));
await p.keyboard.press('Control+k'); await p.keyboard.press('Escape'); console.log('esc cmd ->', await act(), await p.evaluate(() => __os.state.cmd));
await p.click('#goBtn'); await p.keyboard.press('ArrowDown'); console.log('menu ->', await act()); await p.keyboard.press('Escape'); console.log('menu esc ->', await act());
// dead link check
const links = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')));
console.log('links', [...new Set(links)].join(' '));
console.log(errs.join('; ') || 'no errors');
await b.close();
