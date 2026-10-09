/**
 * Intelligence Lab — a browser-sized version of the L//IOS Analyst pipeline.
 *
 *   FILES → UNDERSTAND (schema, meaning, relationships, quality) → DASHBOARD → INSIGHTS → INVESTIGATE
 *
 * Everything is deterministic and runs in the browser on synthetic data (fictional firms).
 * Stories and data problems are planted on purpose so the engine has something to find;
 * the engine is not told where they are. No AI model is involved anywhere.
 */
import { rng } from './rng';

// ───────────────────────── types ─────────────────────────
export const DESKS = ['Rates', 'Credit', 'FX', 'Equities'] as const;
export const REGIONS = ['Americas', 'EMEA', 'APAC'] as const;
export const CLASSES = ['Hedge Fund', 'Asset Manager', 'Bank', 'Pension', 'Corporate'] as const;
export type Desk = (typeof DESKS)[number];
export type Region = (typeof REGIONS)[number];

export interface Trade {
  rid: number;          // source row number in Trades.csv (header = row 1)
  tradeId: string;
  date: string;         // ISO
  week: number;         // 0..103, Monday-based business weeks
  clientId: string;
  clientClass: string;  // as written in the trades extract (may be "HF")
  desk: Desk;
  region: Region;
  notional: number;     // USD mm
  cv: number;           // client value, USD k
  status: 'Done' | 'Cancelled';
  notionalAsText: boolean;
}
export interface Client { rid: number; clientId: string; name: string; clientClass: string; region: Region }
export interface Target { rid: number; quarter: number; desk: Desk; cvTarget: number }
export interface Files { trades: Trade[]; clients: Client[]; targets: Target[] }

export const WEEKS = 104;
export const START = Date.UTC(2024, 8, 30); // Mon 30 Sep 2024
export const RECENT = 6;                    // the "last six weeks" window
const DAY = 86400000;

export function weekStart(w: number) { return new Date(START + w * 7 * DAY); }
export function fmtDay(d: Date) { return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }); }
export function weekLabel(w: number) { return fmtDay(weekStart(w)); }

// ───────────────────────── generation (with planted facts) ─────────────────────────
const PRE = ['Ridgeline', 'Bayview', 'Highgate', 'Northwind', 'Copperleaf', 'Stonebridge', 'Larkspur', 'Westmere', 'Alder', 'Kestrel', 'Silverpine', 'Granite', 'Harborview', 'Clearwater', 'Ashford', 'Blackwater', 'Redfern', 'Tidewell', 'Oakmont', 'Fernhill'];
const SUF: Record<string, string[]> = {
  'Hedge Fund': ['Partners', 'Global Macro', 'Capital', 'Advisors'],
  'Asset Manager': ['Investments', 'Asset Management', 'Funds'],
  Bank: ['Bank', 'Banking Group'],
  Pension: ['Pension Plan', 'Retirement Fund'],
  Corporate: ['Industries', 'Holdings'],
};
const CLASS_W = [0.3, 0.28, 0.16, 0.12, 0.14];
const REGION_W = [0.5, 0.32, 0.18];
const DESK_BASE: Record<Desk, { notional: number; margin: number }> = {
  Rates: { notional: 90, margin: 1.1 }, Credit: { notional: 22, margin: 4.2 }, FX: { notional: 60, margin: 0.9 }, Equities: { notional: 12, margin: 6.5 },
};
const AFFINITY: Record<string, number[]> = { // desk weights by class
  'Hedge Fund': [0.3, 0.2, 0.3, 0.2], 'Asset Manager': [0.25, 0.35, 0.15, 0.25], Bank: [0.45, 0.2, 0.3, 0.05], Pension: [0.5, 0.35, 0.1, 0.05], Corporate: [0.2, 0.1, 0.65, 0.05],
};
const pick = <T,>(r: () => number, xs: readonly T[], w: number[]) => { let u = r() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < xs.length; i++) { u -= w[i]; if (u <= 0) return xs[i]; } return xs[xs.length - 1]; };
const r2 = (n: number) => Math.round(n * 100) / 100;

/** The facts planted in the data — used only by tests, never by the engine. */
export const PLANTED = {
  surge: { clientClass: 'Asset Manager', desk: 'Credit' as Desk, fromWeek: WEEKS - RECENT },
  slump: { clientClass: 'Hedge Fund', region: 'EMEA' as Region, fromWeek: WEEKS - RECENT },
  missing: { region: 'APAC' as Region, week: 84, days: [1, 2, 3] },  // Tue–Thu of week 84 (May 2026)
  duplicates: 30,
  orphanIds: ['C19901', 'C19902', 'C19903'],
  hfAlias: 'HF',
  churnRegion: 'EMEA' as Region, churnClass: 'Pension', churned: 4,
};

export function generateFiles(seed = 20261009): Files {
  const r = rng(seed);
  const clients: Client[] = [];
  const used = new Set<string>();
  for (let i = 0; i < 64; i++) {
    const cls = pick(r, CLASSES, CLASS_W);
    let name = '';
    for (let t = 0; t < 50 && (!name || used.has(name)); t++) name = `${PRE[Math.floor(r() * PRE.length)]} ${SUF[cls][Math.floor(r() * SUF[cls].length)]}`;
    used.add(name);
    clients.push({ rid: i + 2, clientId: `C${10001 + i}`, name, clientClass: cls, region: pick(r, REGIONS, REGION_W) });
  }
  // guarantee enough EMEA pensions for the churn story
  let emeaPension = clients.filter(c => c.region === 'EMEA' && c.clientClass === 'Pension');
  for (let i = 0; emeaPension.length < 6 && i < clients.length; i++) {
    const c = clients[i];
    if (c.clientClass === 'Corporate') { c.clientClass = 'Pension'; c.region = 'EMEA'; c.name = c.name.split(' ')[0] + ' Pension Plan'; emeaPension = clients.filter(x => x.region === 'EMEA' && x.clientClass === 'Pension'); }
  }
  const churned = new Set(emeaPension.slice(0, PLANTED.churned).map(c => c.clientId));
  const size = clients.map(() => Math.exp((r() - 0.5) * 1.6));

  const trades: Trade[] = [];
  let n = 0;
  const push = (t: Omit<Trade, 'rid' | 'tradeId'>) => { n++; trades.push({ ...t, rid: 0, tradeId: `T${String(500000 + n)}` }); };
  for (let w = 0; w < WEEKS; w++) {
    const growth = 1 + 0.22 * (w / WEEKS);              // steady growth across two years
    const season = 1 + 0.06 * Math.sin((w / 52) * 2 * Math.PI);
    for (let d = 0; d < 5; d++) {
      const date = new Date(START + (w * 7 + d) * DAY).toISOString().slice(0, 10);
      const count = Math.round(34 * growth * season * (0.85 + r() * 0.3));
      for (let k = 0; k < count; k++) {
        const ci = Math.floor(Math.pow(r(), 1.3) * clients.length);
        const c = clients[ci];
        if (churned.has(c.clientId) && w >= 52) continue;  // stopped trading this year
        const desk = pick(r, DESKS, AFFINITY[c.clientClass]);
        const recent = w >= WEEKS - RECENT;
        if (recent && c.clientClass === PLANTED.slump.clientClass && c.region === PLANTED.slump.region && r() < 0.55) continue;
        if (w === PLANTED.missing.week && PLANTED.missing.days.includes(d) && c.region === PLANTED.missing.region) continue;
        let mult = 1;
        if (recent && c.clientClass === PLANTED.surge.clientClass && desk === PLANTED.surge.desk) mult = 1.75;
        const base = DESK_BASE[desk];
        const notional = r2(base.notional * size[ci] * (0.4 + r() * 1.2) * mult);
        const cv = r2(notional * base.margin * (0.75 + r() * 0.5));
        const cls = c.clientClass === 'Hedge Fund' && r() < 0.08 ? PLANTED.hfAlias : c.clientClass;
        push({ date, week: w, clientId: c.clientId, clientClass: cls, desk, region: c.region, notional, cv, status: r() < 0.015 ? 'Cancelled' : 'Done', notionalAsText: r() < 0.03 });
        if (recent && mult > 1 && r() < 0.3) { // more tickets, too
          const n2 = r2(base.notional * size[ci] * (0.4 + r() * 1.2) * mult);
          push({ date, week: w, clientId: c.clientId, clientClass: cls, desk, region: c.region, notional: n2, cv: r2(n2 * base.margin * (0.75 + r() * 0.5)), status: 'Done', notionalAsText: false });
        }
      }
    }
  }
  // orphan client ids (missing from the client master)
  for (let k = 0; k < 140; k++) {
    const src = trades[Math.floor(r() * trades.length)];
    src.clientId = PLANTED.orphanIds[k % PLANTED.orphanIds.length];
  }
  // duplicate rows (a double-loaded extract): identical in every column
  const dupSrc = new Set<number>();
  while (dupSrc.size < PLANTED.duplicates) dupSrc.add(Math.floor(r() * trades.length));
  const dups = [...dupSrc].map(i => ({ ...trades[i] }));
  const all = [...trades, ...dups].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  all.forEach((t, i) => (t.rid = i + 2));

  const targets: Target[] = [];
  let tr = 2;
  for (let q = 0; q < 4; q++) for (const d of DESKS) {
    const lastYear = all.filter(t => t.status === 'Done' && t.desk === d && t.week >= q * 13 && t.week < q * 13 + 13).reduce((s, t) => s + t.cv, 0);
    targets.push({ rid: tr++, quarter: q + 1, desk: d, cvTarget: Math.round(lastYear * (1.06 + r() * 0.06) / 100) * 100 });
  }
  return { trades: all, clients, targets };
}

// ───────────────────────── understand: schema & meaning ─────────────────────────
export type Role = 'identifier' | 'date' | 'measure' | 'dimension';
export interface ColumnProfile { file: string; name: string; role: Role; meaning: string; distinct: number; nulls: number; sample: string; reasons: string[] }

function profileColumn(file: string, name: string, values: (string | number)[]): ColumnProfile {
  const distinct = new Set(values).size;
  const nulls = values.filter(v => v === '' || v === null || v === undefined).length;
  const numeric = values.every(v => typeof v === 'number');
  const isDate = !numeric && values.every(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v));
  const lname = name.toLowerCase();
  const reasons: string[] = [];
  let role: Role, meaning = 'category';
  if (isDate) { role = 'date'; meaning = 'trade date'; reasons.push('every value parses as an ISO date'); }
  else if (/\bid\b/.test(lname) && !numeric) {
    role = 'identifier';
    const ratio = distinct / values.length;
    meaning = ratio > 0.99 ? 'record key' : 'foreign key';
    reasons.push(ratio === 1 ? 'unique on every row' : ratio > 0.99 ? `unique on ${(ratio * 100).toFixed(2)}% of rows (${values.length - distinct} repeats)` : `${distinct} distinct values repeat across rows`, 'name ends in "ID"');
  }
  else if (numeric && !/quarter/.test(lname) && (distinct > 20 || /usd|target|notional|\bcv\b/.test(lname))) { role = 'measure'; meaning = /usd|notional|cv|target/.test(lname) ? 'currency' : 'number'; reasons.push('numeric with many distinct values', meaning === 'currency' ? 'name mentions a currency amount' : 'additive'); }
  else { role = 'dimension'; reasons.push(`${distinct} distinct values`); if (/region/.test(lname)) meaning = 'geography'; else if (/desk/.test(lname)) meaning = 'organisation'; else if (/class/.test(lname)) meaning = 'client segment'; else if (/status/.test(lname)) meaning = 'status'; else if (/quarter/.test(lname)) meaning = 'period'; else if (/name/.test(lname)) meaning = 'client name'; }
  return { file, name, role, meaning, distinct, nulls, sample: String(values[0]), reasons };
}

export function profile(f: Files): ColumnProfile[] {
  const T = f.trades, C = f.clients, G = f.targets;
  return [
    profileColumn('Trades.csv', 'Trade ID', T.map(t => t.tradeId)),
    profileColumn('Trades.csv', 'Trade Date', T.map(t => t.date)),
    profileColumn('Trades.csv', 'Client ID', T.map(t => t.clientId)),
    profileColumn('Trades.csv', 'Client Class', T.map(t => t.clientClass)),
    profileColumn('Trades.csv', 'Desk', T.map(t => t.desk)),
    profileColumn('Trades.csv', 'Region', T.map(t => t.region)),
    profileColumn('Trades.csv', 'Notional (USD mm)', T.map(t => t.notional)),
    profileColumn('Trades.csv', 'CV (USD k)', T.map(t => t.cv)),
    profileColumn('Trades.csv', 'Status', T.map(t => t.status)),
    profileColumn('Clients.csv', 'Client ID', C.map(c => c.clientId)),
    profileColumn('Clients.csv', 'Client Name', C.map(c => c.name)),
    profileColumn('Clients.csv', 'Client Class', C.map(c => c.clientClass)),
    profileColumn('Clients.csv', 'Region', C.map(c => c.region)),
    profileColumn('Targets.csv', 'Quarter', G.map(g => g.quarter)),
    profileColumn('Targets.csv', 'Desk', G.map(g => g.desk)),
    profileColumn('Targets.csv', 'CV Target (USD k)', G.map(g => g.cvTarget)),
  ];
}

// ───────────────────────── relationships ─────────────────────────
export interface Relationship { from: string; to: string; key: string; strategy: 'LOOKUP' | 'AGGREGATE + JOIN'; matchFrom: number; matchTo: number; cardinality: string; unmatchedRows: number; note: string }

export function relationships(f: Files): Relationship[] {
  const ids = new Set(f.clients.map(c => c.clientId));
  const unique = ids.size === f.clients.length;
  const matched = f.trades.filter(t => ids.has(t.clientId)).length;
  const used = new Set(f.trades.map(t => t.clientId));
  const tq = new Set(f.targets.map(g => `${g.quarter}|${g.desk}`));
  const tradeQ = new Set(f.trades.filter(t => t.week >= 52).map(t => `${Math.floor((t.week - 52) / 13) + 1}|${t.desk}`));
  const tMatch = [...tq].filter(k => tradeQ.has(k)).length / tq.size;
  return [
    {
      from: 'Trades', to: 'Clients', key: 'Client ID → Client ID', strategy: 'LOOKUP',
      matchFrom: matched / f.trades.length, matchTo: f.clients.filter(c => used.has(c.clientId)).length / f.clients.length,
      cardinality: unique ? 'MANY → ONE' : 'MANY → MANY', unmatchedRows: f.trades.length - matched,
      note: unique ? 'Client ID is unique in Clients, so each trade finds at most one match. Rows cannot multiply.' : 'Key is not unique: kept separate.',
    },
    {
      from: 'Trades', to: 'Targets', key: 'Trade Date → Quarter · Desk → Desk', strategy: 'AGGREGATE + JOIN',
      matchFrom: tMatch, matchTo: tMatch, cardinality: 'MANY → ONE (after aggregation)', unmatchedRows: 0,
      note: 'Targets are set per quarter and desk. Trades are summed to that grain first, then joined. No double counting.',
    },
  ];
}

/** The analytical table: Trades with the client master looked up. Never more rows than Trades. */
export function lookupClients(f: Files) {
  const byId = new Map(f.clients.map(c => [c.clientId, c]));
  return f.trades.map(t => ({ t, client: byId.get(t.clientId) }));
}

// ───────────────────────── quality ─────────────────────────
export interface QualityCheck { id: string; severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'OK'; dimension: string; title: string; detail: string; affected: number; method: string; rows: (t: Trade) => boolean }

export function duplicateKeys(trades: Trade[]) {
  const seen = new Map<string, number>(); const dup = new Set<number>();
  for (const t of trades) {
    const k = [t.tradeId, t.date, t.clientId, t.clientClass, t.desk, t.region, t.notional, t.cv, t.status].join('|');
    if (seen.has(k)) { dup.add(t.rid); dup.add(seen.get(k)!); } else seen.set(k, t.rid);
  }
  return { rids: dup, extra: trades.length - seen.size };
}

/** Days (by date) on which a region has no records while every other region does. */
export function missingDays(trades: Trade[]) {
  const by = new Map<string, Set<string>>();
  for (const t of trades) { if (!by.has(t.date)) by.set(t.date, new Set()); by.get(t.date)!.add(t.region); }
  const out: { region: Region; dates: string[] }[] = [];
  for (const rg of REGIONS) {
    const dates = [...by.entries()].filter(([, s]) => !s.has(rg) && s.size === REGIONS.length - 1).map(([d]) => d).sort();
    if (dates.length) out.push({ region: rg, dates });
  }
  return out;
}

export function quality(f: Files) {
  const T = f.trades;
  const ids = new Set(f.clients.map(c => c.clientId));
  const masterClass = new Map(f.clients.map(c => [c.clientId, c.clientClass]));
  const dup = duplicateKeys(T);
  const orphan = T.filter(t => !ids.has(t.clientId));
  const orphanIds = new Set(orphan.map(t => t.clientId));
  const conflict = T.filter(t => ids.has(t.clientId) && masterClass.get(t.clientId) !== t.clientClass);
  const conflictPairs = new Map<string, number>();
  conflict.forEach(t => { const k = `"${t.clientClass}" → "${masterClass.get(t.clientId)}"`; conflictPairs.set(k, (conflictPairs.get(k) || 0) + 1); });
  const topPair = [...conflictPairs.entries()].sort((a, b) => b[1] - a[1])[0];
  const miss = missingDays(T);
  const missRows = new Set(miss.flatMap(m => m.dates));
  const asText = T.filter(t => t.notionalAsText).length;
  const cancelled = T.filter(t => t.status === 'Cancelled').length;
  const dupCv = [...dup.rids].length ? T.filter(t => dup.rids.has(t.rid)).reduce((s, t) => s + t.cv, 0) / 2 : 0;

  const checks: QualityCheck[] = [];
  for (const m of miss) {
    const d0 = new Date(m.dates[0] + 'T00:00:00Z'), d1 = new Date(m.dates[m.dates.length - 1] + 'T00:00:00Z');
    checks.push({ id: 'missing', severity: 'HIGH', dimension: 'Timeliness', title: `${m.region}: no records on ${fmtDay(d0)}–${fmtDay(d1)} ${d1.getUTCFullYear()}`, detail: `Every other region traded on those ${m.dates.length} days. Looks like a missing load, not a business change.`, affected: m.dates.length, method: 'daily record count per region; days with zero records while all other regions were active', rows: t => missRows.has(t.date) });
  }
  checks.push({ id: 'orphans', severity: 'MEDIUM', dimension: 'Integrity', title: `${orphan.length} trades have no match in Clients`, detail: `${orphanIds.size} Client ID values (${[...orphanIds].sort().join(', ')}) are missing from the client master, so their client attributes are blank.`, affected: orphan.length, method: 'Trades.Client ID NOT IN Clients.Client ID', rows: t => orphanIds.has(t.clientId) });
  if (topPair) checks.push({ id: 'mapping', severity: 'MEDIUM', dimension: 'Consistency', title: `${conflict.length} Client Class values disagree with Clients`, detail: `${topPair[0].split(' → ')[0]} in Trades but ${topPair[0].split(' → ')[1]} in the client master (${topPair[1]} rows). One-click mapping available.`, affected: conflict.length, method: 'join on Client ID; compare Trades.Client Class with Clients.Client Class', rows: t => ids.has(t.clientId) && masterClass.get(t.clientId) !== t.clientClass });
  checks.push({ id: 'dups', severity: 'MEDIUM', dimension: 'Uniqueness', title: `${dup.extra} duplicate Trades rows`, detail: `${dup.extra} records appear twice with identical values in every column, adding ${money(dupCv)} of CV twice. Likely a double-loaded extract.`, affected: dup.extra, method: 'GROUP BY every column HAVING COUNT(*) > 1', rows: t => dup.rids.has(t.rid) });
  checks.push({ id: 'text', severity: 'LOW', dimension: 'Validity', title: `${asText} Notional values stored as text`, detail: 'Converted to numbers on import. Nothing was lost, but the source should store numbers as numbers.', affected: asText, method: 'parsed text → number during import', rows: t => t.notionalAsText });
  checks.push({ id: 'cancelled', severity: 'OK', dimension: 'Assumption', title: `Excluding ${cancelled} Cancelled trades`, detail: 'Status = Cancelled rows are kept in the file but left out of every total.', affected: cancelled, method: 'Status ≠ Cancelled', rows: t => t.status === 'Cancelled' });

  const N = T.length;
  const scores = {
    Completeness: 1,
    Uniqueness: 1 - dup.extra / N,
    Consistency: 1 - conflict.length / N,
    Validity: 1,
    Integrity: 1 - orphan.length / N,
  };
  const overall = Object.values(scores).reduce((a, b) => a + b, 0) / 5;
  return { checks, scores, overall, dup, orphanIds, conflictCount: conflict.length, miss, cancelled };
}

// ───────────────────────── analytics ─────────────────────────
export type Measure = 'cv' | 'notional';
export interface Seg { desk?: Desk; region?: Region; clientClass?: string }
export const live = (f: Files) => f.trades.filter(t => t.status !== 'Cancelled');
/** Client class from the client master (the reference), falling back to the trade's own value. */
export function classOf(f: Files) { const m = new Map(f.clients.map(c => [c.clientId, c.clientClass])); return (t: Trade) => m.get(t.clientId) ?? (t.clientClass === 'HF' ? 'Hedge Fund' : t.clientClass); }
export function inSeg(t: Trade, s: Seg, cls: (t: Trade) => string) { return (!s.desk || t.desk === s.desk) && (!s.region || t.region === s.region) && (!s.clientClass || cls(t) === s.clientClass); }
export const sumOf = (rows: Trade[], m: Measure) => rows.reduce((a, t) => a + t[m], 0);
export const pctChg = (a: number, b: number) => (a === 0 ? 0 : ((b - a) / a) * 100);
export function segName(s: Seg) { return [s.region, s.clientClass, s.desk].filter(Boolean).join(' ') || 'All business'; }

export function weekly(rows: Trade[], m: Measure) { const out = new Array(WEEKS).fill(0); rows.forEach(t => (out[t.week] += t[m])); return out.map(r2); }

export function kpis(f: Files) {
  const L = live(f);
  const cur = L.filter(t => t.week >= 52), pri = L.filter(t => t.week < 52);
  const clientsActive = (rows: Trade[]) => new Set(rows.map(t => t.clientId)).size;
  const q = quality(f);
  return {
    cv: { cur: sumOf(cur, 'cv'), pri: sumOf(pri, 'cv') },
    notional: { cur: sumOf(cur, 'notional'), pri: sumOf(pri, 'notional') },
    trades: { cur: cur.length, pri: pri.length },
    clients: { cur: clientsActive(cur), pri: clientsActive(pri) },
    quality: q.overall,
    issues: q.checks.filter(c => c.severity !== 'OK').length,
  };
}

// driver tree: decompose a change by dimensions in order, skipping those fixed by the segment
export interface Node { label: string; dim: string; a: number; b: number; delta: number; pct: number; share: number; children: Node[]; seg: Seg; other?: boolean }
const DIMS: { key: keyof Seg; label: string; values: readonly string[] }[] = [
  { key: 'desk', label: 'desk', values: DESKS }, { key: 'region', label: 'region', values: REGIONS }, { key: 'clientClass', label: 'client class', values: CLASSES },
];
export function driverTree(f: Files, seg: Seg, wa: [number, number], wb: [number, number], m: Measure, depth = 3, top = 3): Node {
  const cls = classOf(f), L = live(f);
  const val = (s: Seg, w: [number, number]) => sumOf(L.filter(t => t.week >= w[0] && t.week <= w[1] && inSeg(t, s, cls)), m);
  const leaf = (s: Seg, label: string, parentDelta: number): Node => {
    const a = val(s, wa), b = val(s, wb), delta = b - a;
    return { label, dim: '', a, b, delta, pct: pctChg(a, b), share: parentDelta ? delta / parentDelta : 1, children: [], seg: s };
  };
  // expand a node one level; then expand only its largest child (as the app does)
  const build = (s: Seg, label: string, parentDelta: number, level: number): Node => {
    const node = leaf(s, label, parentDelta);
    const dim = DIMS.find(d => !s[d.key]);
    if (level >= depth || !dim) return node;
    node.dim = dim.label;
    const kids = dim.values.map(v => leaf({ ...s, [dim.key]: v }, String(v), node.delta)).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
    const shown = kids.slice(0, top), rest = kids.slice(top);
    if (rest.length) {
      const ra = rest.reduce((x, k) => x + k.a, 0), rb = rest.reduce((x, k) => x + k.b, 0);
      shown.push({ label: `${rest.length} other ${dim.label} value${rest.length > 1 ? 's' : ''}`, dim: '', a: ra, b: rb, delta: rb - ra, pct: pctChg(ra, rb), share: node.delta ? (rb - ra) / node.delta : 0, children: [], seg: s, other: true });
    }
    node.children = shown.map((k, i) => (i === 0 && level + 1 < depth ? build(k.seg, k.label, node.delta, level + 1) : k));
    return node;
  };
  return build(seg, segName(seg) === 'All business' ? 'All business' : segName(seg), 0, 0);
}

// ───────────────────────── insights ─────────────────────────
export type Kind = 'TREND' | 'DRIVER' | 'TARGET' | 'CHURN' | 'DATA QUALITY';
export interface DataCheck { name: string; pass: boolean; detail: string }
export interface Finding {
  id: string; kind: Kind; title: string; text: string; score: number;
  seg: Seg; measure: Measure; window?: { a: [number, number]; b: [number, number] };
  checks?: DataCheck[]; verdict?: 'BUSINESS CHANGE · DATA CHECKS PASS' | 'POSSIBLE DATA ISSUE';
  numbers: { label: string; value: string }[];
  rows: (t: Trade) => boolean;
  z?: number;
}

export const money = (k: number) => `${k < 0 ? '−' : ''}${Math.abs(k) >= 1000 ? `$${(Math.abs(k) / 1000).toFixed(Math.abs(k) >= 10000 ? 1 : 2)}M` : `$${Math.round(Math.abs(k))}K`}`;
export const moneyMM = (mm: number) => `${mm < 0 ? '−' : ''}${Math.abs(mm) >= 1000 ? `$${(Math.abs(mm) / 1000).toFixed(2)}B` : `$${Math.abs(mm).toFixed(0)}M`}`;
export const signed = (n: number, d = 1) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(d)}%`;
export const fmtMeasure = (m: Measure, v: number) => (m === 'cv' ? money(v) : moneyMM(v));

/** Segment trend shifts, tested against each segment's own history and checked for data explanations. */
export function trendFindings(f: Files): Finding[] {
  const cls = classOf(f), L = live(f);
  const q = quality(f);
  const missAt = q.miss.flatMap(m => m.dates.map(d => ({ region: m.region, week: Math.floor((Date.parse(d + 'T00:00:00Z') - START) / (7 * DAY)) })));
  const segs: Seg[] = [];
  for (const d of DESKS) for (const c of CLASSES) segs.push({ desk: d, clientClass: c });
  for (const rg of REGIONS) for (const c of CLASSES) segs.push({ region: rg, clientClass: c });
  const threshold = 2 + 0.5 * Math.log10(segs.length * 2);
  const wk = (s: Seg, m: Measure) => weekly(L.filter(t => inSeg(t, s, cls)), m);
  const total = { cv: weekly(L, 'cv'), notional: weekly(L, 'notional') };
  const win = (xs: number[], end: number) => xs.slice(end - RECENT + 1, end + 1).reduce((a, b) => a + b, 0);
  const out: Finding[] = [];
  for (const s of segs) for (const m of ['cv', 'notional'] as Measure[]) {
    const xs = wk(s, m), tot = total[m];
    const rel = (end: number) => {
      const sa = win(xs, end - RECENT), sb = win(xs, end);
      const ra = win(tot, end - RECENT) - sa, rb = win(tot, end) - sb;
      return { s: pctChg(sa, sb), rest: pctChg(ra, rb), sa, sb };
    };
    const hist: number[] = [];
    for (let e = 2 * RECENT - 1; e <= WEEKS - 1 - RECENT; e++) { const r = rel(e); hist.push(r.s - r.rest); }
    const mu = hist.reduce((a, b) => a + b, 0) / hist.length;
    const sd = Math.sqrt(hist.reduce((a, b) => a + (b - mu) ** 2, 0) / hist.length);
    const now = rel(WEEKS - 1);
    const z = sd ? (now.s - now.rest - mu) / sd : 0;
    if (Math.abs(z) < threshold || now.sa < (m === 'cv' ? 400 : 4000)) continue;
    const a: [number, number] = [WEEKS - 2 * RECENT, WEEKS - RECENT - 1], b: [number, number] = [WEEKS - RECENT, WEEKS - 1];
    const rowsA = L.filter(t => inSeg(t, s, cls) && t.week >= a[0] && t.week <= a[1]);
    const rowsB = L.filter(t => inSeg(t, s, cls) && t.week >= b[0] && t.week <= b[1]);
    const weeksWith = (rows: Trade[], w: [number, number]) => new Set(rows.map(t => t.week)).size + 0 * (w[1] - w[0]);
    const ly = { a: [a[0] - 52, a[1] - 52] as [number, number], b: [b[0] - 52, b[1] - 52] as [number, number] };
    const lyS = pctChg(sumOf(L.filter(t => inSeg(t, s, cls) && t.week >= ly.a[0] && t.week <= ly.a[1]), m), sumOf(L.filter(t => inSeg(t, s, cls) && t.week >= ly.b[0] && t.week <= ly.b[1]), m));
    const lyRest = pctChg(sumOf(L.filter(t => !inSeg(t, s, cls) && t.week >= ly.a[0] && t.week <= ly.a[1]), m), sumOf(L.filter(t => !inSeg(t, s, cls) && t.week >= ly.b[0] && t.week <= ly.b[1]), m));
    const recPct = pctChg(rowsA.length, rowsB.length);
    const perRec = pctChg(now.sa / rowsA.length, now.sb / rowsB.length);
    const gapNow = now.s - now.rest, gapLy = lyS - lyRest;
    const overlapsMissing = missAt.some(x => x.week >= a[0] && x.week <= b[1] && (!s.region || s.region === x.region));
    const checks: DataCheck[] = [
      { name: 'Weeks with data', pass: weeksWith(rowsB, b) === RECENT && weeksWith(rowsA, a) === RECENT, detail: `${weeksWith(rowsB, b)} of ${RECENT} recent weeks have records (vs ${weeksWith(rowsA, a)} of ${RECENT} before)` },
      { name: 'Records vs value', pass: true, detail: `records ${signed(recPct)}, value per record ${signed(perRec)}: ${Math.abs(recPct) > Math.abs(perRec) ? 'record count' : 'record size'} drives it` },
      { name: 'Not seasonal', pass: Math.abs(gapNow - gapLy) > Math.abs(gapNow) / 2, detail: `same weeks last year: ${signed(lyS)} (rest of business ${signed(lyRest)}). The gap ${Math.abs(gapNow - gapLy) > Math.abs(gapNow) / 2 ? 'persists, so it is not the usual time of year' : 'looks seasonal'}` },
      { name: 'No missing loads in the window', pass: !overlapsMissing, detail: overlapsMissing ? 'a known missing load for this segment overlaps these weeks' : 'no missing-day gaps for this segment in these twelve weeks' },
      { name: 'Unusual for this segment', pass: true, detail: `${Math.abs(z).toFixed(1)} standard deviations from its usual six-week swing relative to the rest (threshold ${threshold.toFixed(2)} for ${segs.length * 2} tests)` },
    ];
    const ok = checks.every(c => c.pass);
    const name = segName(s), up = now.s >= 0;
    out.push({
      id: `trend-${name}-${m}`, kind: 'TREND',
      title: `${name} ${m === 'cv' ? 'CV' : 'activity'} ${up ? 'accelerating' : 'declining'}`,
      text: `${m === 'cv' ? 'CV' : 'Notional'} ${signed(now.s)} over six weeks (rest of business ${signed(now.rest)}).`,
      score: Math.min(1, Math.abs(z) / 8) * 0.55 + (ok ? 0.3 : 0.1) + 0.15,
      seg: s, measure: m, window: { a, b }, checks, verdict: ok ? 'BUSINESS CHANGE · DATA CHECKS PASS' : 'POSSIBLE DATA ISSUE',
      numbers: [
        { label: 'Last 6 weeks', value: fmtMeasure(m, now.sb) }, { label: 'Prior 6 weeks', value: fmtMeasure(m, now.sa) },
        { label: 'Change', value: `${now.sb - now.sa >= 0 ? '+' : '−'}${fmtMeasure(m, Math.abs(now.sb - now.sa))}` }, { label: '%', value: signed(now.s) },
      ],
      rows: t => inSeg(t, s, cls) && t.status !== 'Cancelled' && t.week >= a[0],
      z,
    });
  }
  // keep the strongest measure per segment
  const best = new Map<string, Finding>();
  for (const x of out) { const k = segName(x.seg); if (!best.has(k) || Math.abs(best.get(k)!.z!) < Math.abs(x.z!)) best.set(k, x); }
  // structure before spill-over: drop a segment whose change mostly sits inside a stronger finding's segment
  const delta = (s: Seg, m: Measure) => sumOf(L.filter(t => inSeg(t, s, cls) && t.week >= WEEKS - RECENT), m) - sumOf(L.filter(t => inSeg(t, s, cls) && t.week >= WEEKS - 2 * RECENT && t.week < WEEKS - RECENT), m);
  const merge = (x: Seg, y: Seg): Seg | null => { const o: Seg = { ...x }; for (const k of Object.keys(y) as (keyof Seg)[]) { if (o[k] && o[k] !== y[k]) return null; (o as Record<string, string>)[k] = y[k] as string; } return o; };
  const kept: Finding[] = [];
  for (const x of [...best.values()].sort((a, b) => Math.abs(b.z!) - Math.abs(a.z!))) {
    const d = delta(x.seg, x.measure);
    const host = kept.find(k => { const m = merge(x.seg, k.seg); return m && Math.abs(delta(m, x.measure)) > 0.5 * Math.abs(d) && Math.sign(delta(m, x.measure)) === Math.sign(d); });
    if (!host) kept.push(x);
  }
  return kept;
}

export function findings(f: Files): Finding[] {
  const cls = classOf(f), L = live(f), q = quality(f);
  const out: Finding[] = [...trendFindings(f)];
  // year-on-year driver
  const total = driverTree(f, {}, [0, 51], [52, 103], 'cv', 2, 4);
  const lead = total.children[0];
  const deep = lead.children[0];
  if (deep && !deep.other) {
    const same = Math.sign(deep.delta) === Math.sign(total.delta);
    const bigger = same && Math.abs(deep.delta) > Math.abs(total.delta);
    const verb = deep.delta >= 0 ? 'rose' : 'fell';
    out.push({
      id: 'driver', kind: 'DRIVER', title: `${deep.label} ${lead.label} ${verb} ${money(Math.abs(deep.delta))}${bigger ? ', more than the whole change' : ''}`,
      text: `CV ${signed(total.pct)} overall (${money(total.delta)}); ${deep.label} ${lead.label} ${signed(deep.pct)}${bigger ? ', partly offset elsewhere' : ''}.`,
      score: 0.62, seg: { ...lead.seg, ...deep.seg }, measure: 'cv',
      numbers: [{ label: 'This year', value: money(total.b) }, { label: 'Last year', value: money(total.a) }, { label: 'Change', value: money(total.delta) }, { label: `${deep.label} ${lead.label}`, value: money(deep.delta) }],
      rows: t => t.status !== 'Cancelled' && t.week >= 52 && inSeg(t, deep.seg, cls),
    });
  }
  // target attainment (full quarters this year)
  const att = DESKS.map(d => {
    const tgt = f.targets.filter(g => g.desk === d).reduce((s, g) => s + g.cvTarget, 0);
    const act = sumOf(L.filter(t => t.desk === d && t.week >= 52), 'cv');
    return { d, tgt, act, pct: (act / tgt) * 100 };
  }).sort((a, b) => a.pct - b.pct);
  const tgtAll = att.reduce((s, x) => s + x.tgt, 0), actAll = att.reduce((s, x) => s + x.act, 0);
  out.push({
    id: 'target', kind: 'TARGET', title: `CV at ${((actAll / tgtAll) * 100).toFixed(1)}% of target, ${att[0].d} furthest behind (${att[0].pct.toFixed(1)}%)`,
    text: `${money(actAll)} vs ${money(tgtAll)} across four quarters.`, score: 0.5, seg: { desk: att[0].d }, measure: 'cv',
    numbers: att.map(x => ({ label: x.d, value: `${x.pct.toFixed(1)}%` })),
    rows: t => t.status !== 'Cancelled' && t.week >= 52 && t.desk === att[0].d,
  });
  // churn: active last year, none this year
  const lastYr = new Set(L.filter(t => t.week < 52).map(t => t.clientId)), thisYr = new Set(L.filter(t => t.week >= 52).map(t => t.clientId));
  const gone = [...lastYr].filter(c => !thisYr.has(c) && f.clients.some(x => x.clientId === c));
  if (gone.length) {
    const goneSet = new Set(gone);
    const byReg = new Map<string, number>(); gone.forEach(id => { const c = f.clients.find(x => x.clientId === id)!; const k = `${c.region} ${c.clientClass}`; byReg.set(k, (byReg.get(k) || 0) + 1); });
    const topSeg = [...byReg.entries()].sort((a, b) => b[1] - a[1])[0];
    const lostCv = sumOf(L.filter(t => goneSet.has(t.clientId) && t.week < 52), 'cv');
    out.push({
      id: 'churn', kind: 'CHURN', title: `${gone.length} clients stopped trading, mostly ${topSeg[0]}`,
      text: `Active last year, none this year; worth ${money(lostCv)} of CV last year.`, score: 0.48, seg: {}, measure: 'cv',
      numbers: [{ label: 'Clients', value: String(gone.length) }, { label: 'CV last year', value: money(lostCv) }, { label: 'Largest group', value: `${topSeg[0]} (${topSeg[1]})` }],
      rows: t => goneSet.has(t.clientId),
    });
  }
  // data quality as findings
  for (const c of q.checks.filter(c => c.severity === 'HIGH')) {
    out.push({ id: `dq-${c.id}`, kind: 'DATA QUALITY', title: `Missing data: ${c.title}`, text: c.detail, score: 0.45, seg: {}, measure: 'cv', numbers: [{ label: 'Days affected', value: String(c.affected) }], rows: c.rows });
  }
  return out.sort((a, b) => b.score - a.score);
}

// ───────────────────────── ask: deterministic question answering ─────────────────────────
export interface Answer { q: string; lines: { tag: 'FACT' | 'INTERPRETATION' | 'DATA CHECK'; text: string }[]; tools: string[]; finding?: string; rows?: (t: Trade) => boolean; rowsLabel?: string; tree?: Node }
export const QUESTIONS = ['What changed most?', 'Which segment is outperforming?', 'Are there unusual movements?', 'What should I investigate?', 'Which factors explain the variance?', 'Could this be a data issue?'] as const;

export function ask(f: Files, q: (typeof QUESTIONS)[number]): Answer {
  const F = findings(f), cls = classOf(f), L = live(f), Q = quality(f);
  const trends = F.filter(x => x.kind === 'TREND');
  if (q === 'What changed most?') {
    const t = [...trends].sort((a, b) => Math.abs(b.z!) - Math.abs(a.z!))[0];
    return { q, finding: t.id, rows: t.rows, rowsLabel: segName(t.seg), tools: ['compare_periods()', 'segment_history()', 'data_checks()'], lines: [
      { tag: 'FACT', text: `${t.title}: ${t.text}` },
      { tag: 'FACT', text: `${Math.abs(t.z!).toFixed(1)} standard deviations from this segment’s usual six-week swing.` },
      { tag: 'DATA CHECK', text: t.verdict === 'BUSINESS CHANGE · DATA CHECKS PASS' ? 'All data checks pass: full weeks, no missing loads, not seasonal.' : 'One or more data checks fail. Treat with care.' },
      { tag: 'INTERPRETATION', text: 'This locates the change arithmetically. Causes are not in the data and are not asserted.' },
    ] };
  }
  if (q === 'Which segment is outperforming?') {
    const rows = DESKS.flatMap(d => CLASSES.map(c => ({ s: { desk: d, clientClass: c } as Seg })))
      .map(x => { const a = sumOf(L.filter(t => t.week < 52 && inSeg(t, x.s, cls)), 'cv'), b = sumOf(L.filter(t => t.week >= 52 && inSeg(t, x.s, cls)), 'cv'); return { ...x, a, b, p: pctChg(a, b) }; })
      .filter(x => x.a > 2000).sort((a, b) => b.p - a.p);
    const all = { a: sumOf(L.filter(t => t.week < 52), 'cv'), b: sumOf(L.filter(t => t.week >= 52), 'cv') };
    const [t1, t2] = rows;
    const bySize = [...rows].sort((a, b) => (b.b - b.a) - (a.b - a.a))[0];
    return { q, rows: t => t.status !== 'Cancelled' && t.week >= 52 && inSeg(t, t1.s, cls), rowsLabel: segName(t1.s), tools: ['group_by(desk, client class)', 'compare_periods(last 52w, prior 52w)'], lines: [
      { tag: 'FACT', text: `${segName(t1.s)} grew ${signed(t1.p)} year on year (${money(t1.a)} → ${money(t1.b)}), outperforming ${segName(t2.s)} by ${(t1.p - t2.p).toFixed(1)} percentage points.` },
      { tag: 'FACT', text: `The business overall ${pctChg(all.a, all.b) >= 0 ? 'grew' : 'changed'} ${signed(pctChg(all.a, all.b))}. Segments under $2.0M of CV last year are left out.` },
      { tag: 'INTERPRETATION', text: bySize.s === t1.s ? `${segName(t1.s)} leads on both pace and size of gain.` : `${segName(t1.s)} leads on pace; ${segName(bySize.s)} added the most CV (${money(bySize.b - bySize.a)}).` },
    ] };
  }
  if (q === 'Are there unusual movements?') {
    return { q, finding: trends[0]?.id, rows: trends[0]?.rows, rowsLabel: trends[0] ? segName(trends[0].seg) : undefined, tools: ['segment_history()', 'z_score(threshold rises with tests)'], lines: [
      { tag: 'FACT', text: `${trends.length} segment${trends.length === 1 ? '' : 's'} moved beyond the threshold in the last six weeks.` },
      ...trends.map(t => ({ tag: 'FACT' as const, text: `${t.title}: ${t.text} z = ${t.z!.toFixed(1)}.` })),
    ] };
  }
  if (q === 'What should I investigate?') {
    return { q, finding: F[0].id, rows: F[0].rows, rowsLabel: F[0].title, tools: ['rank(magnitude, breadth, confidence, novelty, recency)'], lines: [
      ...F.slice(0, 4).map((x, i) => ({ tag: 'FACT' as const, text: `${i + 1}. ${x.title} (score ${x.score.toFixed(2)})` })),
      { tag: 'INTERPRETATION', text: `Start with “${F[0].title}”: it ranks highest${F[0].verdict ? (F[0].verdict.startsWith('BUSINESS') ? ' and passes its data checks' : ', but check the data first') : ''}.` },
    ] };
  }
  if (q === 'Which factors explain the variance?') {
    const tree = driverTree(f, {}, [0, 51], [52, 103], 'cv', 3, 3);
    const k = tree.children[0], kk = k.children[0];
    return { q, tree, rows: t => t.status !== 'Cancelled' && t.week >= 52 && inSeg(t, kk && !kk.other ? kk.seg : k.seg, cls), rowsLabel: kk && !kk.other ? `${kk.label} ${k.label}` : k.label, tools: ['compare_periods()', 'find_top_contributors()', 'driver_tree()'], lines: [
      { tag: 'FACT', text: `CV ${signed(tree.pct)} year on year (${money(tree.a)} → ${money(tree.b)}, ${money(tree.delta)}).` },
      { tag: 'FACT', text: `${k.label} contributed ${money(k.delta)} (${(k.share * 100).toFixed(0)}% of the change)${kk && !kk.other ? `; inside it, ${kk.label} ${money(kk.delta)}` : ''}.` },
      { tag: 'INTERPRETATION', text: 'Contributions add up exactly to the total. Causes such as pricing or coverage are not in the data and are not asserted.' },
    ] };
  }
  // Could this be a data issue?
  const issues = Q.checks.filter(c => c.severity !== 'OK');
  return { q, rows: issues[0]?.rows, rowsLabel: issues[0]?.title, tools: ['quality_checks()', 'missing_days()', 'duplicates()', 'mapping_conflicts()'], lines: [
    { tag: 'FACT', text: `Overall data quality ${(Q.overall * 100).toFixed(2)}%: the average of five row-weighted pass rates.` },
    ...issues.map(c => ({ tag: 'DATA CHECK' as const, text: `${c.severity}: ${c.title}. ${c.detail}` })),
    { tag: 'INTERPRETATION', text: F.filter(x => x.kind === 'TREND').every(x => x.verdict!.startsWith('BUSINESS')) ? 'Every trend finding was tested against these, and none of them overlaps a known issue.' : 'At least one trend finding overlaps a known issue. Check it before acting.' },
  ] };
}
