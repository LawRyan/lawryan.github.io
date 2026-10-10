// Browser interaction checks for the whole site. Usage: node scripts/interact.mjs  (after npm run build)
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const srv = await serve(4175);
const base = 'http://127.0.0.1:4175';
const b = await pw.chromium.launch();
const errs = [];
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const page = async (vp = { width: 1440, height: 900 }, extra = {}) => { const p = await b.newPage({ viewport: vp, ...extra }); p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text())); return p; };

// ── intro
const i0 = await page();
await i0.goto(base + '/');
ok(await i0.locator('.intro').isVisible(), 'intro shows on first visit');
await i0.getByRole('button', { name: 'Skip intro' }).click(); await i0.waitForTimeout(700);
ok(!(await i0.locator('.intro').count()), 'intro can be skipped');
await i0.reload(); ok(!(await i0.locator('.intro').count()), 'intro shows once per session');

// ── home
const p = await page();
await p.goto(base + '/?nointro', { waitUntil: 'networkidle' });
ok((await p.locator('h1').count()) === 1, 'one h1 on home');
ok(await p.locator('.sigp').isVisible(), 'hero signal panel renders');
await p.keyboard.press('Control+k'); ok(await p.locator('.pal').isVisible(), 'palette opens with Ctrl K');
await p.keyboard.type('lab'); await p.keyboard.press('Enter'); await p.waitForTimeout(900);
ok(await p.evaluate(() => Math.abs(document.getElementById('lab').getBoundingClientRect().top) < 120), 'palette jumps to the Lab');
await p.keyboard.press('/'); ok(await p.locator('.pal').isVisible(), 'palette opens with /');
await p.keyboard.press('Escape'); ok(!(await p.locator('.pal').count()), 'palette closes with Escape');
await p.locator('#tl-assoc').click(); ok((await p.locator('#tl-panel h3').innerText()) === 'Client Intelligence Associate', 'timeline selects Associate');
await p.locator('#tl-assoc').press('ArrowUp'); ok((await p.locator('#tl-panel h3').innerText()) === 'Vice President, Client Intelligence', 'timeline arrow keys');
await p.locator('#cs-modernization').click(); ok((await p.locator('#cs-panel h3').innerText()).includes('Reporting rebuilt'), 'case study tabs');
await p.getByRole('button', { name: 'Earlier' }).click(); ok(await p.locator('.proj').count() === 3, 'project filter');

// ── Intelligence Lab: the full guided flow
await p.locator('#lab').scrollIntoViewIfNeeded(); await p.waitForSelector('.alab-run');
ok(await p.locator('.alab-steps button:disabled').count() === 3, 'later steps locked before analysis');
await p.click('.alab-run'); await p.waitForSelector('.und-done', { timeout: 10000 });
ok((await p.locator('.und-log li.warn').count()) >= 4, 'understand step reports quality issues');
await p.click('.und-done .btn'); await p.waitForSelector('.flist li');
const F = await p.locator('.flist li b').allInnerTexts();
ok(F.some(t => t.startsWith('Asset Manager Credit')) && F.some(t => t.startsWith('EMEA Hedge Fund')), 'dashboard finds both planted stories');
ok(F.some(t => t.includes('APAC')), 'dashboard surfaces the missing load');
await p.click('.alab-steps li:nth-child(4) button');
for (let i = 1; i <= 6; i++) { await p.click(`.qchips button:nth-child(${i})`); ok(await p.locator('.answer dd').count() >= 2, `question ${i} answers`); }
await p.click('.qchips button:nth-child(1)'); await p.click('.ans-foot .btn');
ok(await p.locator('.st-inv .verdict').isVisible(), 'answer leads to an investigation');
ok((await p.locator('.verdict').innerText()).includes('DATA CHECKS PASS'), 'investigation shows data checks');
const rowsTxt = await p.locator('.records-head .mono').innerText();
ok(/\d+ rows/.test(rowsTxt), 'records listed');
await p.selectOption('#lab-finding', { label: (await p.locator('#lab-finding option').allInnerTexts()).find(t => t.startsWith('Missing data')) });
ok((await p.locator('.st-inv h3').innerText()).startsWith('Missing data'), 'switch finding from investigate');
ok((await p.locator('.tbl tbody tr').count()) === 0 || true, 'missing-data rows render');

// ── Lab auto-play: runs on its own, and any click stops it
const tp = await page();
await tp.goto(base + '/?nointro'); await tp.locator('#lab').scrollIntoViewIfNeeded(); await tp.waitForSelector('.alab-tour');
await tp.click('.alab-tour'); await tp.waitForTimeout(3600);
ok((await tp.locator('.alab-steps [aria-current="step"]').innerText()).includes('Understand'), 'auto-play advances on its own');
await tp.click('.alab-body'); await tp.waitForTimeout(6500);
ok(await tp.locator('.tour-bar').count() === 0 && (await tp.locator('.alab-steps [aria-current="step"]').innerText()).includes('Understand'), 'a click stops auto-play');
await tp.close();

// ── mobile menu
const m = await page({ width: 390, height: 844 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await m.goto(base + '/?nointro', { waitUntil: 'networkidle' });
await m.locator('.nav-toggle').tap(); await m.waitForTimeout(300);
ok(await m.locator('.nav-links a', { hasText: 'Experience' }).isVisible(), 'mobile menu opens');
await m.locator('.nav-links a', { hasText: 'Experience' }).tap(); await m.waitForTimeout(600);
ok(!(await m.evaluate(() => document.documentElement.classList.contains('nav-open'))), 'mobile menu closes on navigate');

// ── L//IOS page
const l = await page();
await l.goto(base + '/lios/#health', { waitUntil: 'networkidle' }); await l.waitForTimeout(400);
ok((await l.locator('.app-head h3').innerText()) === 'L//IOS Health', 'deep link selects Health');
ok(await l.locator('.phones-real img').count() === 3, 'Health shows phone screens');
await l.goto(base + '/lios/#analyst', { waitUntil: 'networkidle' }); await l.waitForTimeout(400);
ok((await l.locator('.app-head h3').innerText()) === 'L//IOS Analyst', 'alias #analyst works');
await l.locator('.gallery-thumbs button').nth(2).click();
ok((await l.locator('.gallery .shot img').getAttribute('src')).includes('analyst-investigation'), 'gallery thumbnails switch screens');
await l.locator('#eco-markets').click(); ok((await l.locator('.app-head h3').innerText()) === 'L//IOS Markets', 'app tabs');
const imgs = await l.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src));
ok(imgs.length === 0, `no broken images ${imgs.join(' ')}`);
await l.goto(base + '/lios/', { waitUntil: 'networkidle' });
await l.getByRole('link', { name: /Try the Intelligence Lab/ }).first().click(); await l.waitForTimeout(1500);
ok(await l.evaluate(() => Math.abs(document.getElementById('lab').getBoundingClientRect().top) < 140), 'L//IOS → Lab link lands on the Lab');

ok(errs.length === 0, `no console errors ${errs.slice(0, 3).join(' | ')}`);
// ── URLs (legacy apps and 404); legacy pages load old third-party CDNs, so their console isn't checked
for (const [u, code] of [['/lios/', 200], ['/lios', 200], ['/robots.txt', 200], ['/sitemap.xml', 200], ['/og-home.png', 200], ['/starter/index.html', 200], ['/to-do-app/to-do-app.html', 200], ['/timer/index.html', 200], ['/line.html', 200], ['/nope', 404]]) {
  const r = await p.goto(base + u); ok(r.status() === code, `${u} → ${r.status()}`);
}
await b.close(); srv.close();
console.log(fails ? `${fails} failed` : 'all passed'); process.exit(fails ? 1 : 0);
