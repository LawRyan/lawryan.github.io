/**
 * Intelligence Lab engine.
 *
 * Everything here is deterministic: synthetic records come from a seeded
 * generator, and every insight is a rule-based calculation over those records.
 * No AI model is involved, and nothing is pre-written. Each insight carries the
 * numbers it was computed from so the UI can show its working.
 */

export type MeasureKey = 'primary' | 'secondary' | 'count';

export interface DatasetDef {
  id: string;
  name: string;
  blurb: string;
  categoryLabel: string; // e.g. "Desk"
  regionLabel: string;
  entityLabel: string; // e.g. "Client"
  categories: string[];
  regions: string[];
  measures: { key: MeasureKey; label: string; unit: 'mm' | 'k' | 'n' }[];
  seed: number;
  /** per-category monthly drift (multiplicative) and base level */
  profile: Record<string, { base: number; drift: number; season: number }>;
  /** injected events: category, month index, multiplier — these create real anomalies in the data */
  events: { category: string; month: number; mult: number }[];
}

export interface Rec {
  id: string;
  month: number; // index into MONTHS
  category: string;
  region: string;
  entity: string;
  primary: number; // e.g. notional $mm
  secondary: number; // e.g. revenue $k
}

/** 24 months: Oct 2024 → Sep 2026 */
export const MONTHS: string[] = (() => {
  const out: string[] = [];
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let y = 2024, m = 9;
  for (let i = 0; i < 24; i++) {
    out.push(`${names[m]} ${y}`);
    m++;
    if (m === 12) { m = 0; y++; }
  }
  return out;
})();

export const DATASETS: DatasetDef[] = [
  {
    id: 'client-activity',
    name: 'Client Activity',
    blurb: 'Synthetic client flow across four trading desks and three regions.',
    categoryLabel: 'Desk',
    regionLabel: 'Region',
    entityLabel: 'Client',
    categories: ['Rates', 'Credit', 'FX', 'Equities'],
    regions: ['Americas', 'EMEA', 'APAC'],
    measures: [
      { key: 'primary', label: 'Notional', unit: 'mm' },
      { key: 'secondary', label: 'Revenue', unit: 'k' },
      { key: 'count', label: 'Tickets', unit: 'n' },
    ],
    seed: 20260108,
    profile: {
      Rates: { base: 62, drift: 0.004, season: 0.06 },
      Credit: { base: 48, drift: 0.016, season: 0.05 },
      FX: { base: 70, drift: -0.003, season: 0.08 },
      Equities: { base: 40, drift: 0.009, season: 0.1 },
    },
    events: [
      { category: 'FX', month: 17, mult: 1.9 },
      { category: 'Credit', month: 21, mult: 0.55 },
    ],
  },
  {
    id: 'sector-flows',
    name: 'Sector Flows',
    blurb: 'Synthetic fund-flow observations across six technology themes.',
    categoryLabel: 'Sector',
    regionLabel: 'Market',
    entityLabel: 'Fund',
    categories: ['AI Infrastructure', 'Semiconductors', 'Nuclear Energy', 'Robotics', 'Cybersecurity', 'Large-cap Tech'],
    regions: ['North America', 'Europe', 'Asia'],
    measures: [
      { key: 'primary', label: 'Net inflow', unit: 'mm' },
      { key: 'secondary', label: 'Fees', unit: 'k' },
      { key: 'count', label: 'Observations', unit: 'n' },
    ],
    seed: 7741,
    profile: {
      'AI Infrastructure': { base: 38, drift: 0.024, season: 0.05 },
      Semiconductors: { base: 44, drift: 0.012, season: 0.09 },
      'Nuclear Energy': { base: 16, drift: 0.03, season: 0.04 },
      Robotics: { base: 18, drift: 0.008, season: 0.07 },
      Cybersecurity: { base: 26, drift: 0.005, season: 0.05 },
      'Large-cap Tech': { base: 64, drift: 0.002, season: 0.06 },
    },
    events: [
      { category: 'Semiconductors', month: 14, mult: 0.5 },
      { category: 'Nuclear Energy', month: 20, mult: 2.1 },
    ],
  },
];

/** mulberry32 — small, fast, deterministic */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

export function generate(def: DatasetDef): Rec[] {
  const r = rng(def.seed);
  const recs: Rec[] = [];
  const entities = Array.from({ length: 40 }, (_, i) => `${def.entityLabel} ${String.fromCharCode(65 + (i % 26))}${String(i + 1).padStart(2, '0')}`);
  const regionWeight = [0.5, 0.3, 0.2];
  let n = 0;
  for (let m = 0; m < MONTHS.length; m++) {
    for (const cat of def.categories) {
      const p = def.profile[cat];
      const ev = def.events.find(e => e.category === cat && e.month === m);
      const level = p.base * Math.pow(1 + p.drift, m) * (1 + p.season * Math.sin((m / 12) * Math.PI * 2 + cat.length)) * (ev ? ev.mult : 1);
      def.regions.forEach((reg, ri) => {
        const tickets = 5 + Math.floor(r() * 5); // 5–9 records per cell
        const cellTarget = level * regionWeight[ri] * 10; // $mm across the cell
        for (let k = 0; k < tickets; k++) {
          const share = (0.6 + r() * 0.8) / tickets;
          const primary = round(cellTarget * share, 2);
          const margin = 0.8 + r() * 0.9; // $k per $mm
          recs.push({
            id: `${def.id.slice(0, 2).toUpperCase()}-${String(++n).padStart(5, '0')}`,
            month: m,
            category: cat,
            region: reg,
            entity: entities[Math.floor(r() * entities.length)],
            primary,
            secondary: round(primary * margin, 2),
          });
        }
      });
    }
  }
  return recs;
}

export const value = (rec: Rec, key: MeasureKey) => (key === 'count' ? 1 : rec[key]);

export interface Filters {
  months: number; // window length ending at last month: 6, 12, 24
  regions: string[]; // empty = all
  measure: MeasureKey;
}

export function windowRange(f: Filters): [number, number] {
  const end = MONTHS.length - 1;
  return [end - f.months + 1, end];
}

export function applyFilters(recs: Rec[], f: Filters): Rec[] {
  const [a, b] = windowRange(f);
  return recs.filter(r => r.month >= a && r.month <= b && (f.regions.length === 0 || f.regions.includes(r.region)));
}

/** series[category][monthIndex - start] = total */
export function seriesByCategory(recs: Rec[], def: DatasetDef, f: Filters) {
  const [a, b] = windowRange(f);
  const len = b - a + 1;
  const out: Record<string, number[]> = {};
  for (const c of def.categories) out[c] = new Array(len).fill(0);
  for (const r of recs) out[r.category][r.month - a] += value(r, f.measure);
  for (const c of def.categories) out[c] = out[c].map(v => round(v, 2));
  return out;
}

export function totalsByCategory(recs: Rec[], def: DatasetDef, key: MeasureKey) {
  const t: Record<string, number> = {};
  for (const c of def.categories) t[c] = 0;
  for (const r of recs) t[r.category] += value(r, key);
  for (const c of def.categories) t[c] = round(t[c], 2);
  return t;
}

export const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
export const mean = (xs: number[]) => sum(xs) / xs.length;
export const stdev = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(sum(xs.map(x => (x - m) ** 2)) / xs.length);
};
export const pct = (from: number, to: number) => ((to - from) / from) * 100;

export function fmt(n: number, unit: 'mm' | 'k' | 'n') {
  if (unit === 'n') return Math.round(n).toLocaleString('en-US');
  if (unit === 'mm') return n >= 1000 ? `$${(n / 1000).toFixed(2)}bn` : `$${n.toFixed(1)}mm`;
  return n >= 1000 ? `$${(n / 1000).toFixed(2)}mm` : `$${n.toFixed(0)}k`;
}
export const fmtPct = (n: number, dp = 1) => `${n >= 0 ? '+' : ''}${n.toFixed(dp)}%`;

export type InsightKind = 'leader' | 'laggard' | 'anomaly' | 'momentum' | 'concentration';

export interface Insight {
  kind: InsightKind;
  tone: 'up' | 'down' | 'watch' | 'neutral';
  title: string;
  text: string;
  /** the working: label/value lines shown under "How this was calculated" */
  working: { label: string; value: string }[];
  /** what to drill into when clicked */
  focus: { category?: string; month?: number; entity?: string };
}

export interface Summary {
  total: number;
  prior: number | null; // same-length window immediately before, if it exists
  change: number | null;
  records: number;
  anomalies: number;
}

export function summarize(all: Rec[], def: DatasetDef, f: Filters): Summary {
  const cur = applyFilters(all, f);
  const total = round(sum(cur.map(r => value(r, f.measure))), 2);
  const [a] = windowRange(f);
  let prior: number | null = null;
  if (a - f.months >= 0) {
    const p = all.filter(r => r.month >= a - f.months && r.month < a && (f.regions.length === 0 || f.regions.includes(r.region)));
    prior = round(sum(p.map(r => value(r, f.measure))), 2);
  }
  return {
    total,
    prior,
    change: prior ? pct(prior, total) : null,
    records: cur.length,
    anomalies: findAnomalies(cur, def, f).length,
  };
}

export const Z_THRESHOLD = 2;

export function findAnomalies(cur: Rec[], def: DatasetDef, f: Filters) {
  const s = seriesByCategory(cur, def, f);
  const [a] = windowRange(f);
  const out: { category: string; month: number; value: number; avg: number; z: number }[] = [];
  if (f.months < 6) return out;
  for (const c of def.categories) {
    const xs = s[c];
    const m = mean(xs), sd = stdev(xs);
    if (sd === 0) continue;
    xs.forEach((x, i) => {
      const z = (x - m) / sd;
      if (Math.abs(z) >= Z_THRESHOLD) out.push({ category: c, month: a + i, value: x, avg: m, z });
    });
  }
  return out.sort((p, q) => Math.abs(q.z) - Math.abs(p.z));
}

export function insights(all: Rec[], def: DatasetDef, f: Filters): Insight[] {
  const cur = applyFilters(all, f);
  if (cur.length === 0) return [];
  const unit = def.measures.find(m => m.key === f.measure)!.unit;
  const mLabel = def.measures.find(m => m.key === f.measure)!.label.toLowerCase();
  const s = seriesByCategory(cur, def, f);
  const [a, b] = windowRange(f);
  const out: Insight[] = [];

  // 1 & 2 — change from first to last month of the window, per category
  const changes = def.categories
    .map(c => ({ c, first: s[c][0], last: s[c][s[c].length - 1] }))
    .filter(x => x.first > 0)
    .map(x => ({ ...x, chg: pct(x.first, x.last) }))
    .sort((p, q) => q.chg - p.chg);

  if (changes.length >= 2) {
    const top = changes[0], next = changes[1];
    const gap = top.chg - next.chg;
    out.push({
      kind: 'leader',
      tone: top.chg >= 0 ? 'up' : 'down',
      title: `${top.c} leads the period`,
      text: `${top.c} ${top.chg >= 0 ? 'increased' : 'decreased'} ${Math.abs(top.chg).toFixed(1)}% over the selected period, outperforming ${next.c} by ${gap.toFixed(1)} percentage points.`,
      working: [
        { label: `${top.c}, ${MONTHS[a]}`, value: fmt(top.first, unit) },
        { label: `${top.c}, ${MONTHS[b]}`, value: fmt(top.last, unit) },
        { label: `${top.c} change`, value: fmtPct(top.chg) },
        { label: `${next.c} change (${fmt(next.first, unit)} → ${fmt(next.last, unit)})`, value: fmtPct(next.chg) },
        { label: 'Gap', value: `${gap.toFixed(1)} pp` },
      ],
      focus: { category: top.c },
    });
    const low = changes[changes.length - 1];
    out.push({
      kind: 'laggard',
      tone: low.chg < 0 ? 'down' : 'neutral',
      title: `${low.c} trails`,
      text: `${low.c} ${low.chg >= 0 ? 'grew only' : 'fell'} ${Math.abs(low.chg).toFixed(1)}% from ${MONTHS[a]} to ${MONTHS[b]}, the weakest ${def.categoryLabel.toLowerCase()} in this view.`,
      working: [
        { label: `${low.c}, ${MONTHS[a]}`, value: fmt(low.first, unit) },
        { label: `${low.c}, ${MONTHS[b]}`, value: fmt(low.last, unit) },
        { label: 'Change', value: fmtPct(low.chg) },
      ],
      focus: { category: low.c },
    });
  }

  // 3 — largest statistical outlier
  const an = findAnomalies(cur, def, f);
  if (an.length) {
    const x = an[0];
    out.push({
      kind: 'anomaly',
      tone: 'watch',
      title: `Unusual month for ${x.category}`,
      text: `${x.category} ${mLabel} in ${MONTHS[x.month]} was ${fmt(x.value, unit)}, ${Math.abs(x.z).toFixed(1)} standard deviations ${x.z > 0 ? 'above' : 'below'} its average for the period (${fmt(x.avg, unit)}).`,
      working: [
        { label: 'Value', value: fmt(x.value, unit) },
        { label: 'Period average', value: fmt(x.avg, unit) },
        { label: 'z-score', value: x.z.toFixed(2) },
        { label: 'Flag threshold', value: `|z| ≥ ${Z_THRESHOLD}` },
        { label: 'Months flagged in view', value: String(an.length) },
      ],
      focus: { category: x.category, month: x.month },
    });
  }

  // 4 — momentum: last 3 months vs prior 3 months, all categories
  if (f.months >= 6) {
    const len = s[def.categories[0]].length;
    const tot = (i0: number, i1: number) => sum(def.categories.map(c => sum(s[c].slice(i0, i1))));
    const recent = tot(len - 3, len), before = tot(len - 6, len - 3);
    const chg = pct(before, recent);
    out.push({
      kind: 'momentum',
      tone: chg >= 0 ? 'up' : 'down',
      title: chg >= 0 ? 'Momentum is building' : 'Momentum is fading',
      text: `Total ${mLabel} over the last three months (${MONTHS[b - 2]} to ${MONTHS[b]}) is ${fmtPct(chg)} versus the three months before.`,
      working: [
        { label: `${MONTHS[b - 5]} – ${MONTHS[b - 3]}`, value: fmt(before, unit) },
        { label: `${MONTHS[b - 2]} – ${MONTHS[b]}`, value: fmt(recent, unit) },
        { label: 'Change', value: fmtPct(chg) },
      ],
      focus: {},
    });
  }

  // 5 — concentration: largest entity share
  const byEntity = new Map<string, number>();
  for (const r of cur) byEntity.set(r.entity, (byEntity.get(r.entity) || 0) + value(r, f.measure));
  const totalAll = sum([...byEntity.values()]);
  const ranked = [...byEntity.entries()].sort((p, q) => q[1] - p[1]);
  const top5 = sum(ranked.slice(0, 5).map(e => e[1]));
  const lead = ranked[0];
  out.push({
    kind: 'concentration',
    tone: 'neutral',
    title: `Top five ${def.entityLabel.toLowerCase()}s hold ${((top5 / totalAll) * 100).toFixed(1)}%`,
    text: `${lead[0]} is the largest ${def.entityLabel.toLowerCase()} at ${((lead[1] / totalAll) * 100).toFixed(1)}% of ${mLabel}; the top five together account for ${((top5 / totalAll) * 100).toFixed(1)}% across ${ranked.length} ${def.entityLabel.toLowerCase()}s.`,
    working: [
      { label: `${lead[0]}`, value: fmt(lead[1], unit) },
      { label: 'Top five', value: fmt(top5, unit) },
      { label: 'All', value: fmt(totalAll, unit) },
    ],
    focus: { entity: lead[0] },
  });

  return out;
}
