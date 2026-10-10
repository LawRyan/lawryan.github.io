/**
 * The later steps of the Lab (Ask, Investigate) for a visitor's own file.
 * Pure functions over an OwnAnalysis: deterministic, no network, no model.
 * Row numbers follow own.ts: data row i is row number i + 2 (header = 1); add file.lineOffset for the file line.
 */
import { parseDate, parseNumber, isBlank, fmt, pct, type OwnAnalysis, type OwnInsight, type OwnTrend, type Point, type Severity } from './own';

const DAY = 86_400_000;
type Grain = OwnTrend['grain'];

export function bucketOf(g: Grain, t: number) {
  if (g === 'day') return Math.floor(t / DAY) * DAY;
  if (g === 'week') { const d = new Date(t); const dow = (d.getUTCDay() + 6) % 7; return Math.floor(t / DAY) * DAY - dow * DAY; }
  const d = new Date(t); return g === 'month' ? Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) : Date.UTC(d.getUTCFullYear(), 0, 1);
}

/** The measure value of a row (1 when the file has no measure and rows are counted); null when unusable. */
export function valueOf(a: OwnAnalysis, row: string[]): number | null {
  const c = a.dash.ctx;
  return c.measure === undefined ? 1 : parseNumber(row[c.measure] ?? '', c.decimalComma);
}
const excludedSet = (a: OwnAnalysis) => new Set(a.dash.ctx.excluded);
/** The period (trend bucket) a row falls in, or null. */
export function periodOf(a: OwnAnalysis, row: string[]): number | null {
  const c = a.dash.ctx; if (c.date === undefined || !a.trend) return null;
  const t = parseDate(row[c.date] ?? '', c.order); return t === null ? null : bucketOf(a.trend.grain, t);
}

export function rowsWhere(a: OwnAnalysis, col: number, value: string): number[] {
  const out: number[] = []; a.cells.forEach((r, i) => { if ((r[col] ?? '').trim() === value) out.push(i + 2); }); return out;
}

/** Sum / average / count of the measure over the given rows, leaving out the rows the analysis excluded. */
export function total(a: OwnAnalysis, rows: number[]) {
  const ex = excludedSet(a); let s = 0, n = 0;
  for (const r of rows) { if (ex.has(r)) continue; const v = valueOf(a, a.cells[r - 2]); if (v === null) continue; s += v; n++; }
  return a.dash.ctx.agg === 'avg' ? (n ? s / n : 0) : s;
}

/** The trend line for a subset of rows, on the same periods as the main trend. */
export function seriesFor(a: OwnAnalysis, rows: number[]): Point[] {
  if (!a.trend) return [];
  const ex = excludedSet(a), S = new Map<number, number>(), N = new Map<number, number>();
  for (const r of rows) {
    if (ex.has(r)) continue; const row = a.cells[r - 2];
    const p = periodOf(a, row), v = valueOf(a, row); if (p === null || v === null) continue;
    S.set(p, (S.get(p) ?? 0) + v); N.set(p, (N.get(p) ?? 0) + 1);
  }
  const avg = a.dash.ctx.agg === 'avg';
  return a.trend.points.map(p => ({ ...p, v: Math.round((avg ? (N.get(p.t) ? S.get(p.t)! / N.get(p.t)! : 0) : S.get(p.t) ?? 0) * 100) / 100 }));
}

/** The last two full periods of the trend (the partial last one left out), if there are two. */
function lastTwo(a: OwnAnalysis) {
  const t = a.trend; if (!t) return null;
  const pts = t.partialLast ? t.points.slice(0, -1) : t.points;
  return pts.length >= 2 ? { prev: pts[pts.length - 2], cur: pts[pts.length - 1] } : null;
}
const what = (a: OwnAnalysis) => (a.dash.ctx.agg === 'count' ? 'rows' : a.dash.ctx.agg === 'avg' ? `average ${a.dash.ctx.measureName}` : a.dash.ctx.measureName);
const plural = (k: number, one: string, many = one + 's') => `${k.toLocaleString('en-US')} ${k === 1 ? one : many}`;

// ───────────────────────── Ask ─────────────────────────
export interface OwnQuestion { id: 'latest' | 'concentration' | 'growth' | 'trust' | 'largest'; q: string }
export type Tag = 'FACT' | 'INTERPRETATION' | 'DATA CHECK';
export interface OwnAnswer { id: OwnQuestion['id']; q: string; lines: { tag: Tag; text: string }[]; tools: string[]; bars?: { label: string; v: number; text: string }[]; rows?: number[]; rowsLabel?: string }

export function questions(a: OwnAnalysis): OwnQuestion[] {
  const out: OwnQuestion[] = [];
  const main = a.dash.breakdowns[0], c = a.dash.ctx;
  if (lastTwo(a) && c.agg !== 'avg' && main) out.push({ id: 'latest', q: `What drove the change in the latest ${a.trend!.grain}?` });
  else if (lastTwo(a)) out.push({ id: 'latest', q: `How did the latest ${a.trend!.grain} compare?` });
  if (main && main.agg !== 'avg') out.push({ id: 'concentration', q: `How concentrated is ${c.agg === 'count' ? 'activity' : c.measureName} by ${main.dimension}?` });
  const g = a.dash.breakdowns.find(b => b.halves && b.items.some(x => x.change !== undefined));
  if (g) out.push({ id: 'growth', q: `Which ${g.dimension} grew the most?` });
  if (c.measure !== undefined) out.push({ id: 'largest', q: `Which rows have the largest ${c.measureName}?` });
  out.push({ id: 'trust', q: 'Can I trust this file?' });
  return out;
}

export function answer(a: OwnAnalysis, id: OwnQuestion['id']): OwnAnswer {
  const q = questions(a).find(x => x.id === id)?.q ?? '';
  const c = a.dash.ctx, ex = excludedSet(a), W = what(a);
  const issues = a.checks.filter(x => x.severity !== 'OK');
  const leftOut = c.excluded.length ? `${plural(c.excluded.length, 'row')} with extreme values or impossible dates ${c.excluded.length === 1 ? 'is' : 'are'} left out of these numbers.` : 'No rows had to be left out of these numbers.';

  if (id === 'latest') {
    const lt = lastTwo(a)!, g = a.trend!.grain;
    const ch = lt.prev.v ? (lt.cur.v - lt.prev.v) / Math.abs(lt.prev.v) : undefined;
    const lines: OwnAnswer['lines'] = [{ tag: 'FACT', text: `${cap(W)} in ${lt.cur.label}: ${fmt(lt.cur.v)}, ${ch === undefined ? 'with nothing the period before' : `${pct(ch)} vs ${lt.prev.label} (${fmt(lt.prev.v)})`}.` }];
    const main = a.dash.breakdowns[0];
    let bars: OwnAnswer['bars'], rows: number[] | undefined, rowsLabel: string | undefined;
    if (main && c.agg !== 'avg') {
      const A = new Map<string, number>(), B = new Map<string, number>(), R = new Map<string, number[]>();
      a.cells.forEach((r, i) => {
        if (ex.has(i + 2)) return; const p = periodOf(a, r); if (p !== lt.cur.t && p !== lt.prev.t) return;
        const k = (r[main.col] ?? '').trim(); if (isBlank(k)) return; const v = valueOf(a, r); if (v === null) return;
        const m = p === lt.cur.t ? B : A; m.set(k, (m.get(k) ?? 0) + v);
        if (p === lt.cur.t) { const l = R.get(k) ?? []; l.push(i + 2); R.set(k, l); }
      });
      const d = [...new Set([...A.keys(), ...B.keys()])].map(k => ({ k, d: (B.get(k) ?? 0) - (A.get(k) ?? 0) })).sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
      const net = lt.cur.v - lt.prev.v;
      if (d.length && d[0].d !== 0) {
        const top = d[0];
        lines.push({ tag: 'FACT', text: `By ${main.dimension}, “${top.k}” moved most: ${top.d >= 0 ? '+' : '−'}${fmt(Math.abs(top.d))}${!net ? ', while the total stayed flat' : Math.sign(net) !== Math.sign(top.d) ? ', against the overall direction' : Math.abs(top.d) > Math.abs(net) ? ', more than the whole net change (others moved the other way)' : `, ${Math.round(Math.abs(top.d / net) * 100)}% of the net change`}.` });
        bars = d.slice(0, 6).map(x => ({ label: x.k, v: x.d, text: `${x.d >= 0 ? '+' : '−'}${fmt(Math.abs(x.d))}` }));
        rows = R.get(top.k); rowsLabel = `${main.dimension} = “${top.k}” · ${lt.cur.label}`;
      }
    }
    lines.push({ tag: 'DATA CHECK', text: `${a.trend!.partialLast ? `The last ${g} in the file is partial, so the comparison uses the last two full ${g}s. ` : ''}${leftOut}` });
    lines.push({ tag: 'INTERPRETATION', text: 'This locates the change arithmetically. The reasons behind it are not in the file and are not guessed.' });
    return { id, q, lines, bars, rows, rowsLabel, tools: ['group by period', `compare ${lt.prev.label} with ${lt.cur.label}`, main ? `split by ${main.dimension}` : 'total'] };
  }

  if (id === 'concentration') {
    const b = a.dash.breakdowns[0];
    const sum = b.items.reduce((s, x) => s + x.v, 0) + b.others, n = b.items.length + b.otherCount;
    const share = (v: number) => (sum ? v / sum : 0);
    const top3 = b.items.slice(0, 3).reduce((s, x) => s + x.v, 0);
    const even = 1 / n;
    const lines: OwnAnswer['lines'] = [
      { tag: 'FACT', text: `“${b.items[0].value}” is the largest of ${plural(n, 'value')}: ${fmt(b.items[0].v)}, ${Math.round(share(b.items[0].v) * 100)}% of the total.` },
      { tag: 'FACT', text: n > 3 ? `The top three make up ${Math.round(share(top3) * 100)}%.` : `An even split would be ${Math.round(even * 100)}% each.` },
      { tag: 'INTERPRETATION', text: share(b.items[0].v) > Math.max(0.5, even * 2) ? `Heavily concentrated: one ${b.dimension} carries most of it.` : share(b.items[0].v) > even * 1.5 ? 'Moderately concentrated: one value leads, but the rest matter.' : 'Fairly evenly spread.' },
    ];
    const variants = a.checks.find(x => x.id === `variants-${b.col}`);
    lines.push({ tag: 'DATA CHECK', text: variants ? `“${b.dimension}” has values spelled more than one way, so some of these groups should be merged before trusting the split.` : `No spelling variants found in “${b.dimension}”. ${leftOut}` });
    return { id, q, lines, bars: b.items.slice(0, 6).map(x => ({ label: x.value, v: share(x.v), text: `${Math.round(share(x.v) * 100)}%` })), rows: rowsWhere(a, b.col, b.items[0].value), rowsLabel: `${b.dimension} = “${b.items[0].value}”`, tools: [`group by ${b.dimension}`, 'share of total'] };
  }

  if (id === 'growth') {
    const b = a.dash.breakdowns.find(x => x.halves && x.items.some(y => y.change !== undefined))!;
    const sum = b.items.reduce((s, x) => s + Math.abs(x.v), 0);
    const sized = b.items.filter(x => x.change !== undefined && (b.agg === 'avg' || Math.abs(x.v) >= sum * 0.05));
    const pool = sized.length ? sized : b.items.filter(x => x.change !== undefined);
    const best = pool.slice().sort((x, y) => y.change! - x.change!)[0], worst = pool.slice().sort((x, y) => x.change! - y.change!)[0];
    const lines: OwnAnswer['lines'] = [
      { tag: 'FACT', text: best.change! >= 0 ? `“${best.value}” grew fastest: ${pct(best.change!)} from the first half of the period to the second.` : `Nothing grew. “${best.value}” fell least: ${pct(best.change!)} from the first half of the period to the second.` },
      ...(worst && worst !== best ? [{ tag: 'FACT' as Tag, text: `${worst.change! < 0 ? 'Weakest' : 'Slowest'}: “${worst.value}”, ${pct(worst.change!)}.` }] : []),
      { tag: 'DATA CHECK', text: `${sized.length < b.items.length && b.agg !== 'avg' ? 'Values under 5% of the total are left out, so tiny groups can’t top the list. ' : ''}${leftOut}` },
      { tag: 'INTERPRETATION', text: 'Halves are split on the middle day of the file’s date range, so both sides cover the same number of days.' },
    ];
    return { id, q, lines, bars: pool.slice().sort((x, y) => y.change! - x.change!).slice(0, 6).map(x => ({ label: x.value, v: x.change!, text: pct(x.change!) })), rows: rowsWhere(a, b.col, best.value), rowsLabel: `${b.dimension} = “${best.value}”`, tools: [`group by ${b.dimension}`, 'split the date range in half', 'compare halves'] };
  }

  if (id === 'largest') {
    const scored: { r: number; v: number }[] = [];
    a.cells.forEach((r, i) => { const v = valueOf(a, r); if (v !== null) scored.push({ r: i + 2, v }); });
    scored.sort((x, y) => y.v - x.v);
    const top = scored.slice(0, 10), all = scored.reduce((s, x) => s + x.v, 0), t10 = top.reduce((s, x) => s + x.v, 0);
    const flaggedTop = top.filter(x => ex.has(x.r)).length;
    const lines: OwnAnswer['lines'] = [
      { tag: 'FACT', text: `The largest ${c.measureName} is ${fmt(top[0]?.v ?? 0)} (line ${(top[0]?.r ?? 0) + a.file.lineOffset}).` },
      ...(c.agg === 'sum' && all > 0 ? [{ tag: 'FACT' as Tag, text: `The top ${top.length} rows are ${Math.round((t10 / all) * 100)}% of the total across ${plural(scored.length, 'row')}.` }] : []),
      { tag: 'DATA CHECK', text: flaggedTop ? `${plural(flaggedTop, 'of these rows is', 'of these rows are')} flagged as extreme and left out of totals and trends. Check them before using the totals.` : 'None of these rows is flagged as an extreme value.' },
    ];
    return { id, q, lines, bars: top.slice(0, 6).map(x => ({ label: `Line ${x.r + a.file.lineOffset}`, v: x.v, text: fmt(x.v) })), rows: top.map(x => x.r), rowsLabel: `Top ${top.length} rows by ${c.measureName}`, tools: [`sort by ${c.measureName}`, 'top 10'] };
  }

  // trust
  const by = (s: Severity) => issues.filter(x => x.severity === s).length;
  const flagged = new Set<number>(); issues.forEach(x => x.rows.forEach(r => flagged.add(r)));
  const lines: OwnAnswer['lines'] = [
    { tag: 'FACT', text: `${(a.dash.quality * 100).toFixed(1)}% of rows pass the checks${issues.some(x => x.id.startsWith('blank-') || x.id === 'short') ? ' (blank values aren’t counted against it)' : ''}. ${issues.length ? `${plural(issues.length, 'issue')}: ${by('HIGH')} high, ${by('MEDIUM')} medium, ${by('LOW')} low.` : 'No issues found.'}` },
    ...issues.slice(0, 3).map(x => ({ tag: 'DATA CHECK' as Tag, text: `${x.title}. ${x.detail}` })),
    { tag: 'FACT', text: leftOut },
    { tag: 'INTERPRETATION', text: issues.some(x => x.id === 'dups' || x.id.startsWith('variants-')) ? 'Totals and splits are usable as a first look; fix the duplicates and spelling variants before relying on them.' : issues.length ? 'Usable as a first look; the flagged rows are worth a glance first.' : 'Nothing found that would distort totals or trends.' },
  ];
  return { id, q, lines, rows: flagged.size ? [...flagged].sort((x, y) => x - y) : undefined, rowsLabel: 'Rows flagged by a check', tools: [`${a.checks.length} checks`, 'shape · blanks · duplicates · types · spelling · extremes · dates'] };
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ───────────────────────── Investigate ─────────────────────────
export interface OwnFinding {
  id: string; kind: OwnInsight['kind']; title: string; text: string; severity?: Severity;
  rows: number[]; rowsLabel: string; numbers: { label: string; value: string }[];
  series?: { all: Point[]; seg?: Point[]; segLabel?: string; highlight?: number };
  checks?: { name: string; pass: boolean; detail: string }[]; verdict?: string; method?: string;
}

/** Everything worth investigating: the dashboard's insights first, then every data issue. */
export function findings(a: OwnAnalysis): OwnFinding[] {
  const out: OwnFinding[] = [];
  const seen = new Set<string>();
  for (const i of a.dash.insights) { const f = fromInsight(a, i); if (f && !seen.has(f.id)) { seen.add(f.id); out.push(f); } }
  for (const c of a.checks) if (c.severity !== 'OK' && !seen.has(`check:${c.id}`)) { seen.add(`check:${c.id}`); out.push(fromCheck(a, c.id)!); }
  return out;
}

export function fromInsight(a: OwnAnalysis, i: OwnInsight): OwnFinding | null {
  if (i.check) return fromCheck(a, i.check);
  if (i.filter && i.filter.col >= 0) return segment(a, i.filter.col, i.filter.value, i);
  if (i.kind === 'TREND' && a.trend) {
    const lt = lastTwo(a), rows: number[] = [];
    if (lt) a.cells.forEach((r, k) => { if (periodOf(a, r) === lt.cur.t) rows.push(k + 2); });
    const W = what(a);
    return {
      id: 'trend', kind: 'TREND', title: i.title, text: i.text, rows, rowsLabel: lt ? `Rows in ${lt.cur.label}` : 'Rows',
      numbers: lt ? [{ label: lt.cur.label, value: fmt(lt.cur.v) }, { label: lt.prev.label, value: fmt(lt.prev.v) }, { label: 'Change', value: lt.prev.v ? pct((lt.cur.v - lt.prev.v) / Math.abs(lt.prev.v)) : '—' }, { label: 'Rows in period', value: rows.length.toLocaleString('en-US') }] : [],
      series: { all: a.trend.points, highlight: lt ? a.trend.points.findIndex(p => p.t === lt.cur.t) : undefined },
      ...verdictFor(a, rows, [{ name: 'Full periods compared', pass: true, detail: a.trend.partialLast ? `The last ${a.trend.grain} is partial and is left out of the comparison.` : `Both ${a.trend.grain}s are complete.` }]),
      method: `${cap(W)} per ${a.trend.grain} from “${a.trend.date}”; the last two full ${a.trend.grain}s are compared.`,
    };
  }
  return null;
}

/** A dimension value (from a bar or an insight) as something to investigate. */
export function segment(a: OwnAnalysis, col: number, value: string, from?: OwnInsight): OwnFinding {
  const rows = rowsWhere(a, col, value), dim = a.header[col];
  const b = a.dash.breakdowns.find(x => x.col === col), item = b?.items.find(x => x.value === value);
  const allRows = a.cells.map((_, k) => k + 2);
  const v = total(a, rows), all = total(a, allRows);
  const numbers = [
    { label: a.dash.ctx.agg === 'count' ? 'Rows' : a.dash.ctx.agg === 'avg' ? `Average ${a.dash.ctx.measureName}` : a.dash.ctx.measureName, value: fmt(Math.round(v * 100) / 100) },
    ...(a.dash.ctx.agg !== 'avg' && all ? [{ label: 'Share of total', value: `${Math.round((v / all) * 100)}%` }] : [{ label: `File average`, value: fmt(Math.round(all * 100) / 100) }]),
    ...(item?.change !== undefined ? [{ label: '2nd half vs 1st', value: pct(item.change) }] : []),
    { label: 'Rows', value: rows.length.toLocaleString('en-US') },
  ];
  return {
    id: `seg:${col}:${value}`, kind: from?.kind ?? 'SHARE', title: from?.title ?? `${dim}: “${value}”`, text: from?.text ?? `${numbers[0].label} ${numbers[0].value}${numbers[1] ? `, ${numbers[1].label.toLowerCase()} ${numbers[1].value}` : ''}.`,
    rows, rowsLabel: `${dim} = “${value}”`, numbers,
    series: a.trend ? { all: a.trend.points, seg: seriesFor(a, rows), segLabel: value } : undefined,
    ...verdictFor(a, rows, a.checks.some(x => x.id === `variants-${col}`) ? [{ name: 'One spelling per value', pass: false, detail: `“${dim}” has values spelled more than one way, so “${value}” may be split across groups.` }] : [{ name: 'One spelling per value', pass: true, detail: `No spelling variants in “${dim}”.` }]),
    method: `rows where “${dim}” is exactly “${value}”`,
  };
}

function fromCheck(a: OwnAnalysis, id: string): OwnFinding | null {
  const c = a.checks.find(x => x.id === id); if (!c) return null;
  return {
    id: `check:${c.id}`, kind: 'ISSUE', title: c.title, text: c.detail, severity: c.severity, rows: c.rows, rowsLabel: c.title,
    numbers: [{ label: 'Affected', value: c.affected.toLocaleString('en-US') }, { label: 'Share of rows', value: a.file.rows && c.rows.length ? `${((c.rows.length / a.file.rows) * 100).toFixed(c.rows.length / a.file.rows < 0.01 ? 2 : 1)}%` : '—' }, { label: 'Severity', value: c.severity }],
    method: c.method,
  };
}

/** Run the file's checks against just these rows: anything that would make the number unreliable. */
function verdictFor(a: OwnAnalysis, rows: number[], extra: { name: string; pass: boolean; detail: string }[]) {
  const set = new Set(rows);
  const hit = (pred: (id: string) => boolean) => a.checks.filter(c => c.severity !== 'OK' && pred(c.id)).reduce((n, c) => n + c.rows.filter(r => set.has(r)).length, 0);
  const m = a.dash.ctx.measure;
  const dups = hit(id => id === 'dups');
  const bad = m === undefined ? 0 : hit(id => id === `mixed-${m}` || id === `blank-${m}`);
  const extreme = m === undefined ? 0 : hit(id => id === `outliers-${m}`);
  const checks = [
    ...extra,
    { name: 'No duplicate rows', pass: !dups, detail: dups ? `${plural(dups, 'row')} here ${dups === 1 ? 'repeats' : 'repeat'} an earlier row exactly.` : 'None of these rows is an exact repeat.' },
    ...(m !== undefined ? [{ name: `“${a.header[m]}” readable`, pass: !bad, detail: bad ? `${plural(bad, 'row')} here ${bad === 1 ? 'has' : 'have'} a blank or non-numeric value, so ${bad === 1 ? 'it is' : 'they are'} left out.` : 'Every value is a usable number.' },
      { name: 'No extreme values', pass: !extreme, detail: extreme ? `${plural(extreme, 'row')} here ${extreme === 1 ? 'is' : 'are'} extreme and left out of totals.` : 'Nothing far outside the usual range.' }] : []),
  ];
  return { checks, verdict: checks.every(x => x.pass) ? 'DATA CHECKS PASS' : 'CHECK THE DATA FIRST' };
}
