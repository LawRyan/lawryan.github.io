// Independent checks for the Intelligence Lab. Every figure the engine reports is
// recomputed here straight from the raw generated rows, without the engine's helpers.
import {
  generateFiles, profile, relationships, lookupClients, quality, kpis, driverTree, findings, ask, QUESTIONS,
  PLANTED, WEEKS, RECENT, type Node, type Trade,
} from './analyst';

let checks = 0, failures = 0;
const ok = (c: boolean, m: string) => { checks++; if (!c) { failures++; console.error('FAIL', m); } };
const near = (a: number, b: number, tol: number, m: string) => ok(Math.abs(a - b) <= tol, `${m}: ${a} vs ${b}`);
const nums = (s: string) => (s.replace(/,/g, '').match(/[−-]?\d+(\.\d+)?/g) || []).map(x => Number(x.replace('−', '-')));

const f = generateFiles();
const f2 = generateFiles();
ok(JSON.stringify(f) === JSON.stringify(f2), 'generation is deterministic');
ok(new Set(f.trades.map(t => t.rid)).size === f.trades.length, 'source row numbers unique');
ok(f.trades.every((t, i) => t.rid === i + 2), 'row numbers follow file order (header = row 1)');

// ── raw helpers (independent)
const master = new Map(f.clients.map(c => [c.clientId, c]));
const cls = (t: Trade) => master.get(t.clientId)?.clientClass ?? (t.clientClass === 'HF' ? 'Hedge Fund' : t.clientClass);
const live = f.trades.filter(t => t.status !== 'Cancelled');
const sum = (xs: Trade[], k: 'cv' | 'notional') => xs.reduce((a, t) => a + t[k], 0);

// ── profiling
const prof = profile(f);
const role = (file: string, name: string) => prof.find(p => p.file === file && p.name === name)!;
ok(role('Trades.csv', 'Trade Date').role === 'date', 'date detected');
ok(role('Trades.csv', 'Notional (USD mm)').role === 'measure' && role('Trades.csv', 'Revenue (USD k)').role === 'measure', 'measures detected');
ok(role('Targets.csv', 'Revenue Target (USD k)').role === 'measure', 'target is a measure');
ok(role('Trades.csv', 'Region').meaning === 'geography' && role('Trades.csv', 'Desk').meaning === 'organisation', 'meanings detected');
ok(role('Clients.csv', 'Client ID').meaning === 'record key' && role('Trades.csv', 'Client ID').meaning === 'foreign key', 'keys detected');

// ── relationships: a lookup never multiplies rows
const joined = lookupClients(f);
ok(joined.length === f.trades.length, 'lookup keeps row count');
const rel = relationships(f)[0];
const matched = f.trades.filter(t => master.has(t.clientId)).length;
near(rel.matchFrom, matched / f.trades.length, 1e-12, 'match rate');
ok(rel.unmatchedRows === f.trades.length - matched && rel.strategy === 'LOOKUP' && rel.cardinality === 'MANY → ONE', 'lookup strategy');

// ── quality finds exactly what was planted
const q = quality(f);
const dupCheck = q.checks.find(c => c.id === 'dups')!;
ok(dupCheck.affected === PLANTED.duplicates, `duplicates: ${dupCheck.affected} vs ${PLANTED.duplicates}`);
const orphans = f.trades.filter(t => !master.has(t.clientId));
ok(q.checks.find(c => c.id === 'orphans')!.affected === orphans.length, 'orphans counted');
ok([...q.orphanIds].sort().join() === [...PLANTED.orphanIds].sort().join(), 'orphan ids are the planted ones');
const conflicts = f.trades.filter(t => master.has(t.clientId) && master.get(t.clientId)!.clientClass !== t.clientClass);
ok(conflicts.length === q.conflictCount && conflicts.every(t => t.clientClass === PLANTED.hfAlias), 'class conflicts are the HF alias');
ok(q.miss.length === 1 && q.miss[0].region === PLANTED.missing.region && q.miss[0].dates.length === PLANTED.missing.days.length, 'missing days found, nothing else');
const missDates = PLANTED.missing.days.map(d => new Date(Date.UTC(2024, 8, 30) + (PLANTED.missing.week * 7 + d) * 86400000).toISOString().slice(0, 10));
ok(JSON.stringify(q.miss[0].dates) === JSON.stringify(missDates), 'missing dates exact');
const N = f.trades.length;
near(q.overall, (1 + (1 - PLANTED.duplicates / N) + (1 - conflicts.length / N) + 1 + (1 - orphans.length / N)) / 5, 1e-12, 'quality score');

// ── KPIs
const k = kpis(f);
near(k.cv.cur, sum(live.filter(t => t.week >= 52), 'cv'), 1e-6, 'Revenue this year');
near(k.cv.pri, sum(live.filter(t => t.week < 52), 'cv'), 1e-6, 'Revenue last year');
ok(k.trades.cur === live.filter(t => t.week >= 52).length, 'trade count');

// ── driver trees are additive at every level
const additive = (n: Node, path: string) => {
  if (!n.children.length) return;
  near(n.children.reduce((a, c) => a + c.delta, 0), n.delta, 1e-6, `children sum to parent at ${path}`);
  near(n.children.reduce((a, c) => a + c.share, 0), 1, 1e-9, `shares sum to 1 at ${path}`);
  n.children.forEach(c => additive(c, path + '/' + c.label));
};
const tree = driverTree(f, {}, [0, 51], [52, 103], 'cv', 3, 3);
additive(tree, 'all');
near(tree.delta, k.cv.cur - k.cv.pri, 1e-6, 'tree root = KPI change');
const t2 = driverTree(f, { clientClass: 'Asset Manager', desk: 'Credit' }, [WEEKS - 2 * RECENT, WEEKS - RECENT - 1], [WEEKS - RECENT, WEEKS - 1], 'cv', 3, 2);
additive(t2, 'AM Credit');

// ── findings: the planted stories, with numbers that recompute
const F = findings(f);
const trend = (s: string) => F.find(x => x.kind === 'TREND' && x.title.startsWith(s));
const surge = trend(`${PLANTED.surge.clientClass} ${PLANTED.surge.desk}`), slump = trend(`${PLANTED.slump.region} ${PLANTED.slump.clientClass}`);
ok(!!surge && surge.title.includes('accelerating'), 'surge found');
ok(!!slump && slump.title.includes('declining'), 'slump found');
ok(F.filter(x => x.kind === 'TREND').length === 2, `no spill-over trend findings (${F.filter(x => x.kind === 'TREND').map(x => x.title).join('; ')})`);
for (const x of [surge!, slump!]) {
  ok(x.verdict === 'BUSINESS CHANGE · DATA CHECKS PASS', `${x.title} passes data checks`);
  const inS = (t: Trade) => (!x.seg.desk || t.desk === x.seg.desk) && (!x.seg.region || t.region === x.seg.region) && (!x.seg.clientClass || cls(t) === x.seg.clientClass);
  const a = sum(live.filter(t => inS(t) && t.week >= WEEKS - 2 * RECENT && t.week < WEEKS - RECENT), x.measure);
  const b = sum(live.filter(t => inS(t) && t.week >= WEEKS - RECENT), x.measure);
  const ra = sum(live.filter(t => !inS(t) && t.week >= WEEKS - 2 * RECENT && t.week < WEEKS - RECENT), x.measure);
  const rb = sum(live.filter(t => !inS(t) && t.week >= WEEKS - RECENT), x.measure);
  const [p1, p2] = nums(x.text).filter(n => Math.abs(n) > 0.0001 && !Number.isInteger(n) || Math.abs(n) > 0 && x.text.includes(`${Math.abs(n)}%`));
  near(p1, ((b - a) / a) * 100, 0.051, `${x.title} segment %`);
  near(p2, ((rb - ra) / ra) * 100, 0.051, `${x.title} rest-of-business %`);
}
const dq = F.find(x => x.kind === 'DATA QUALITY');
ok(!!dq && dq.title.includes(PLANTED.missing.region), 'missing load surfaces as a finding');
const churn = F.find(x => x.kind === 'CHURN')!;
ok(churn.title.startsWith(`${PLANTED.churned} clients`) && churn.title.includes(`${PLANTED.churnRegion} ${PLANTED.churnClass}`), 'churn found');
const tgt = F.find(x => x.kind === 'TARGET')!;
const tgtAll = f.targets.reduce((a, g) => a + g.cvTarget, 0);
near(nums(tgt.title)[0], (sum(live.filter(t => t.week >= 52), 'cv') / tgtAll) * 100, 0.051, 'target attainment');

// ── every question answers, and its records filter selects rows
for (const qq of QUESTIONS) {
  const a = ask(f, qq);
  ok(a.lines.length >= 2, `${qq} answers`);
  ok(a.lines.some(l => l.tag === 'FACT'), `${qq} has facts`);
  if (a.rows) ok(f.trades.some(a.rows), `${qq} records filter is not empty`);
  ok(!a.lines.some(l => /\$-|NaN|undefined/.test(l.text)), `${qq} formatting`);
}
const variance = ask(f, 'Which factors explain the variance?');
near(nums(variance.lines[0].text)[0], ((k.cv.cur - k.cv.pri) / k.cv.pri) * 100, 0.051, 'variance answer %');

// ── a different seed still finds the planted stories (the engine isn't tuned to one dataset)
for (const seed of [7, 99, 2024]) {
  const g = generateFiles(seed), G = findings(g);
  ok(G.some(x => x.kind === 'TREND' && x.title.startsWith('Asset Manager Credit')), `seed ${seed}: surge found`);
  ok(quality(g).checks.find(c => c.id === 'dups')!.affected === PLANTED.duplicates, `seed ${seed}: duplicates found`);
}

console.log(`analyst: ${checks} checks, ${failures} failures`);
if (failures) process.exit(1);
