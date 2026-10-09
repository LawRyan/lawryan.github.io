// Independent checks: recompute every insight figure straight from raw records
// (not via the engine's helpers) and compare with what the engine reports.
import { DATASETS, MONTHS, generate, insights, summarize, applyFilters, Filters, MeasureKey, Rec } from './engine';

let failures = 0, checks = 0;
const ok = (cond: boolean, msg: string) => { checks++; if (!cond) { failures++; console.error('FAIL', msg); } };
const close = (a: number, b: number, tol: number, msg: string) => ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const val = (r: Rec, k: MeasureKey) => (k === 'count' ? 1 : r[k]);
const nums = (s: string) => (s.match(/-?\d+(\.\d+)?/g) || []).map(Number);

for (const def of DATASETS) {
  const a1 = generate(def), a2 = generate(def);
  ok(JSON.stringify(a1) === JSON.stringify(a2), `${def.id} deterministic`);
  ok(new Set(a1.map(r => r.id)).size === a1.length, `${def.id} unique ids`);
  for (const months of [6, 12, 24]) for (const measure of ['primary', 'secondary', 'count'] as MeasureKey[]) for (const regions of [[], [def.regions[0]], def.regions.slice(1)]) {
    const f: Filters = { months, measure, regions };
    const tag = `${def.id} ${months}M ${measure} [${regions.join(',')}]`;
    const end = MONTHS.length - 1, start = end - months + 1;
    const inView = a1.filter(r => r.month >= start && r.month <= end && (!regions.length || regions.includes(r.region)));
    ok(applyFilters(a1, f).length === inView.length, `${tag} filter count`);
    const total = inView.reduce((s, r) => s + val(r, measure), 0);
    const sm = summarize(a1, def, f);
    close(sm.total, total, 0.01, `${tag} total`);
    const cell = (c: string, m: number) => inView.filter(r => r.category === c && r.month === m).reduce((s, r) => s + val(r, measure), 0);
    for (const ins of insights(a1, def, f)) {
      if (ins.kind === 'leader') {
        const chg = def.categories.map(c => ({ c, v: (cell(c, end) - cell(c, start)) / cell(c, start) * 100 })).sort((p, q) => q.v - p.v);
        ok(ins.text.startsWith(chg[0].c), `${tag} leader name`);
        const [p1, gap] = nums(ins.text.replace(chg[0].c, '').replace(chg[1].c, ''));
        close(p1, Math.abs(chg[0].v), 0.051, `${tag} leader pct`);
        close(gap, chg[0].v - chg[1].v, 0.051, `${tag} leader gap`);
      }
      if (ins.kind === 'momentum') {
        const tot = (m0: number, m1: number) => inView.filter(r => r.month >= m0 && r.month <= m1).reduce((s, r) => s + val(r, measure), 0);
        const exp = (tot(end - 2, end) - tot(end - 5, end - 3)) / tot(end - 5, end - 3) * 100;
        const got = Number(ins.text.match(/is ([+-]\d+\.\d)%/)![1]);
        close(got, exp, 0.051, `${tag} momentum`);
      }
      if (ins.kind === 'anomaly') {
        const c = ins.focus.category!, m = ins.focus.month!;
        const xs = Array.from({ length: months }, (_, i) => cell(c, start + i));
        const mu = xs.reduce((s, x) => s + x, 0) / xs.length;
        const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mu) ** 2, 0) / xs.length);
        const z = (cell(c, m) - mu) / sd;
        ok(Math.abs(z) >= 2, `${tag} anomaly over threshold`);
        const zTxt = Number(ins.text.match(/, (\d+\.\d) standard/)![1]);
        close(zTxt, Math.abs(z), 0.051, `${tag} anomaly z`);
      }
      if (ins.kind === 'concentration') {
        const by = new Map<string, number>();
        inView.forEach(r => by.set(r.entity, (by.get(r.entity) || 0) + val(r, measure)));
        const ranked = [...by.values()].sort((p, q) => q - p);
        const top5 = ranked.slice(0, 5).reduce((s, x) => s + x, 0) / total * 100;
        close(Number(ins.title.match(/(\d+\.\d)%/)![1]), top5, 0.051, `${tag} top5 share`);
      }
    }
  }
}
// The headline example on the page should show a real anomaly in default view
const d0 = DATASETS[0];
const ins0 = insights(generate(d0), d0, { months: 12, measure: 'primary', regions: [] });
console.log(ins0.map(i => `- ${i.text}`).join('\n'));
console.log(`${checks} checks, ${failures} failures`);
if (failures) process.exit(1);
