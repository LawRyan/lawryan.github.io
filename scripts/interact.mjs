// Interaction checks: lab filters, drill-down, dataset switch, experience tabs, mobile menu, L//IOS tabs, links.
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const srv = await serve(4175);
const base = 'http://127.0.0.1:4175';
const b = await pw.chromium.launch();
const errs = [];
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto(base + '/?nointro', { waitUntil: 'networkidle' });
const rowsText = () => p.locator('.records-head .mono').innerText();
const kpiRecords = async () => (await p.locator('.kpi').nth(2).locator('.v').innerText()).replace(/,/g, '');
ok((await rowsText()).startsWith((await kpiRecords()).replace(/\B(?=(\d{3})+(?!\d))/g, ',')), 'records table count = KPI count');
await p.locator('.ins').first().click();
const crumb = await p.locator('.crumb').first().innerText();
ok((await p.locator('.ins').first().innerText()).startsWith(crumb), `leader insight drills into ${crumb}`);
const cats = await p.locator('.tbl tbody td:nth-child(3)').allInnerTexts();
ok(cats.length > 0 && cats.every(c => c.includes(crumb)), 'every visible row matches the drill-down');
await p.locator('.ins.t-watch').click();
ok(await p.locator('.crumb').count() === 2, 'anomaly insight sets desk + month');
await p.locator('.ins.t-watch summary').click();
ok(await p.locator('.ins.t-watch dl').isVisible(), 'working expands');
await p.getByRole('button', { name: '24M' }).click();
ok((await p.locator('.kpi').nth(1).locator('.v').innerText()) === '—', '24M has no prior period');
await p.getByRole('button', { name: 'EMEA' }).click();
const r1 = await kpiRecords();
await p.getByRole('button', { name: 'All', exact: true }).first().click();
ok(Number(r1) < Number(await kpiRecords()), 'region filter narrows records');
await p.getByRole('button', { name: 'Sector Flows' }).click();
ok((await p.locator('.legend button').allInnerTexts()).some(t => t.includes('Nuclear')), 'dataset switch updates series');
ok(await p.locator('.ins').count() >= 4, 'sector flows produces insights');
await p.getByRole('button', { name: 'Next' }).click();
ok((await p.locator('.tbl-foot span').first().innerText()).startsWith('Page 2'), 'pagination works');
await p.locator('#tab-assoc').click();
ok((await p.locator('#xp-panel h3').innerText()) === 'Associate', 'experience tab switches');
await p.locator('#tab-assoc').press('ArrowDown');
ok((await p.locator('#xp-panel h3').innerText()).includes('Banking'), 'experience arrow keys');
await p.getByRole('button', { name: 'Earlier' }).click();
ok(await p.locator('.proj').count() === 3, 'project filter (Earlier = 3)');
// mobile menu
const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await m.goto(base + '/?nointro', { waitUntil: 'networkidle' });
await m.locator('.nav-toggle').tap();
await m.waitForTimeout(400);
ok(await m.locator('.nav-links a', { hasText: 'Experience' }).isVisible(), 'mobile menu opens');
await m.screenshot({ path: 'shots/m4-mobile-menu.jpg', type: 'jpeg', quality: 80 });
await m.locator('.nav-links a', { hasText: 'Experience' }).tap();
await m.waitForTimeout(900);
ok(!(await m.evaluate(() => document.documentElement.classList.contains('nav-open'))), 'mobile menu closes on navigate');
// L//IOS deep link
await p.goto(base + '/lios/#health', { waitUntil: 'networkidle' });
await p.waitForTimeout(300);
ok((await p.locator('.eco-info h3').innerText()) === 'L//IOS Health', 'deep link /lios/#health selects Health');
await p.locator('#eco-data').click();
ok((await p.locator('.eco-info h3').innerText()) === 'L//IOS Data Intelligence', 'L//IOS tab switch');
ok(errs.length === 0, `no console errors on new pages ${errs.slice(0, 3).join(' | ')}`);
// direct navigation + refresh + legacy + 404 (legacy pages load old third-party CDNs; not checked)
for (const [u, code] of [['/lios/', 200], ['/lios', 200], ['/starter/index.html', 200], ['/to-do-app/to-do-app.html', 200], ['/timer/index.html', 200], ['/line.html', 200], ['/nope', 404]]) {
  const r = await p.goto(base + u); ok(r.status() === code, `${u} → ${r.status()}`);
}
await b.close(); srv.close();
console.log(fails ? `${fails} failed` : 'all passed'); process.exit(fails ? 1 : 0);
