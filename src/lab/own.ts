/**
 * "Try it on your own file": a small, deterministic profiler for any CSV/TSV a visitor drops in.
 * Everything runs in the browser. No network, no model; every statement is computed from the rows.
 */

export const LIMITS = { bytes: 10 * 1024 * 1024, rows: 200_000, cols: 200 };

export type ColType = 'number' | 'date' | 'boolean' | 'text';
export type ColRole = 'measure' | 'dimension' | 'date' | 'identifier' | 'text' | 'empty';
export interface NumStats { min: number; max: number; mean: number; median: number; sum: number; negatives: number; integers: boolean }
export interface OwnColumn {
  index: number; name: string; type: ColType; role: ColRole;
  filled: number; empty: number; distinct: number; examples: string[];
  num?: NumStats; dates?: { min: number; max: number; order?: 'DMY' | 'MDY' }; decimalComma?: boolean;
  top?: { value: string; count: number }[];
  reasons: string[];
}
export type Severity = 'HIGH' | 'MEDIUM' | 'LOW' | 'OK';
export interface OwnCheck { id: string; severity: Severity; title: string; detail: string; method: string; affected: number; rows: number[] }
export interface Point { label: string; t: number; v: number }
export interface OwnTrend { date: string; measure: string; agg: 'sum' | 'count'; grain: 'day' | 'week' | 'month'; points: Point[]; partialLast: boolean; statement: string; change?: number }
export interface OwnMovers { dimension: string; measure: string; agg: 'sum' | 'count'; mode: 'halves' | 'share'; items: { value: string; a: number; b: number; delta: number }[]; statement: string }
export interface OwnAnalysis {
  file: { name: string; bytes: number; rows: number; cols: number; delimiter: string; truncated: boolean; colsTruncated: number };
  columns: OwnColumn[]; checks: OwnCheck[]; trend?: OwnTrend; movers?: OwnMovers; facts: string[];
  /** raw access for "show rows" (1-based file line numbers: header = 1) */
  header: string[]; cells: string[][];
}

// ───────────────────────── parsing ─────────────────────────
const DELIMS = [',', ';', '\t', '|'];

/** Pick the delimiter that splits the first lines most consistently (quotes respected). */
export function sniffDelimiter(text: string): string {
  const lines = text.split(/\r\n|\n|\r/).filter(l => l.trim()).slice(0, 8);
  let best = ',', bestScore = -1;
  for (const d of DELIMS) {
    const counts = lines.map(l => { let n = 0, q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === d && !q) n++; } return n; });
    if (!counts.length || counts[0] === 0) continue;
    const same = counts.filter(c => c === counts[0]).length;
    const score = same * 100 + counts[0];
    if (score > bestScore) { best = d; bestScore = score; }
  }
  return best;
}

/** RFC 4180 parser: quoted fields, doubled quotes, embedded delimiters and newlines, CRLF/LF/CR. */
export function parseDelimited(text: string, delimiter = sniffDelimiter(text), maxRows = LIMITS.rows + 1): { rows: string[][]; truncated: boolean } {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [], field = '', i = 0, q = false;
  const n = text.length;
  const endRow = () => { row.push(field); field = ''; if (!(row.length === 1 && row[0] === '')) rows.push(row); row = []; };
  while (i < n) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } q = false; i++; continue; }
      field += ch; i++; continue;
    }
    if (ch === '"' && field === '') { q = true; i++; continue; }
    if (ch === delimiter) { row.push(field); field = ''; i++; continue; }
    if (ch === '\r' || ch === '\n') { endRow(); if (ch === '\r' && text[i + 1] === '\n') i++; i++; if (rows.length >= maxRows) { const re = /\S/g; re.lastIndex = i; return { rows, truncated: re.test(text) }; } continue; }
    field += ch; i++;
  }
  if (field !== '' || row.length) endRow();
  return { rows, truncated: false };
}

// ───────────────────────── value parsing ─────────────────────────
/** Parse a number the way people type them: 1,234.50 · $1,234 · (12.5) · −3 · 45% · 12,5 (with ; files). */
export function parseNumber(raw: string, decimalComma = false): number | null {
  let s = raw.trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1).trim(); }
  s = s.replace(/^[−–]/, '-');
  if (s.startsWith('-')) { neg = !neg; s = s.slice(1).trim(); } else if (s.startsWith('+')) s = s.slice(1).trim();
  s = s.replace(/^[$€£¥]\s?/, '').replace(/\s?[$€£¥]$/, '');
  let pct = false; if (s.endsWith('%')) { pct = true; s = s.slice(0, -1).trim(); }
  if (decimalComma) { if (!/^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(s)) return null; s = s.replace(/\./g, '').replace(',', '.'); }
  else { if (!/^\d{1,3}(,\d{3})*(\.\d+)?$|^\d+(\.\d+)?$|^\.\d+$/.test(s)) return null; s = s.replace(/,/g, ''); }
  let v = Number(s); if (!Number.isFinite(v)) return null;
  if (pct) v = v / 100;
  return neg ? -v : v;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const PIVOT = (new Date().getUTCFullYear() % 100) + 10;
const utc = (y: number, m: number, d: number) => { if (y < 100) y += y <= PIVOT ? 2000 : 1900; if (m < 1 || m > 12 || d < 1 || d > 31) return null; const t = Date.UTC(y, m - 1, d); const dt = new Date(t); return dt.getUTCDate() === d ? t : null; };

/** Parse a date. `order` resolves a/b/yyyy: 'DMY' or 'MDY'. Returns a UTC timestamp (ms) or null. */
export function parseDate(raw: string, order: 'DMY' | 'MDY' = 'MDY'): number | null {
  const s = raw.trim(); if (!s) return null;
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/);
  if (m) return utc(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:[ T]\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)?$/i);
  if (m) return order === 'DMY' ? utc(+m[3], +m[2], +m[1]) : utc(+m[3], +m[1], +m[2]);
  m = s.match(/^(\d{1,2})[ -]([A-Za-z]{3,9})[ -,]*(\d{4})$/);
  if (m) { const mo = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()); return mo < 0 ? null : utc(+m[3], mo + 1, +m[1]); }
  m = s.match(/^([A-Za-z]{3,9})\.? (\d{1,2}),? (\d{4})$/);
  if (m) { const mo = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()); return mo < 0 ? null : utc(+m[3], mo + 1, +m[2]); }
  m = s.match(/^([A-Za-z]{3,9})[ -](\d{4})$/);
  if (m) { const mo = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()); return mo < 0 ? null : utc(+m[2], mo + 1, 1); }
  return null;
}

/** Decide day-first vs month-first from the values themselves. */
export function dateOrder(values: string[]): { order: 'DMY' | 'MDY'; ambiguous: boolean; mixed: boolean } {
  let dmy = 0, mdy = 0;
  for (const v of values) {
    const m = v.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/); if (!m) continue;
    if (+m[1] > 12) dmy++; else if (+m[2] > 12) mdy++;
  }
  if (dmy && !mdy) return { order: 'DMY', ambiguous: false, mixed: false };
  if (mdy && !dmy) return { order: 'MDY', ambiguous: false, mixed: false };
  if (dmy && mdy) return { order: dmy >= mdy ? 'DMY' : 'MDY', ambiguous: false, mixed: true };
  return { order: 'MDY', ambiguous: values.some(v => /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(v.trim())), mixed: false };
}

const BOOL = new Set(['true', 'false', 'yes', 'no', 'y', 'n', 't', 'f']);
const median = (xs: number[]) => { if (!xs.length) return NaN; const s = [...xs].sort((a, b) => a - b); const h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
/** "1 row" / "3 rows" */
const plural = (k: number, one: string, many = one + 's') => `${k.toLocaleString('en-US')} ${k === 1 ? one : many}`;
const r2 = (x: number) => Math.round(x * 100) / 100;
/** min/max without spreading (large files would overflow the call stack) */
const minOf = (xs: number[]) => { let m = Infinity; for (const x of xs) if (x < m) m = x; return m; };
const maxOf = (xs: number[]) => { let m = -Infinity; for (const x of xs) if (x > m) m = x; return m; };

// ───────────────────────── formatting (shared by UI) ─────────────────────────
export function fmt(v: number): string {
  const a = Math.abs(v), sign = v < 0 ? '−' : '';
  if (a >= 1e9) return `${sign}${(a / 1e9).toFixed(a >= 1e10 ? 1 : 2)}B`;
  if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`;
  if (a >= 1e4) return `${sign}${(a / 1e3).toFixed(1)}K`;
  if (Number.isInteger(v)) return `${sign}${a.toLocaleString('en-US')}`;
  return `${sign}${a.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}
export const pct = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(Math.abs(x) < 0.1 ? 1 : 0)}%`;
const DAY = 86_400_000;
export const dayLabel = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const monthLabel = (t: number) => new Date(t).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });

// ───────────────────────── analysis ─────────────────────────
export function analyse(name: string, bytes: number, text: string): OwnAnalysis {
  const delimiter = sniffDelimiter(text);
  const { rows: raw, truncated } = parseDelimited(text, delimiter);
  if (!raw.length) throw new Error('The file is empty.');
  // header: names, de-duplicated; blanks get a name
  const used = new Set<string>();
  const colsTruncated = Math.max(0, raw[0].length - LIMITS.cols);
  const header = raw[0].slice(0, LIMITS.cols).map((h, i) => {
    const base = h.trim() || `Column ${i + 1}`;
    let n = base, k = 2;
    while (used.has(n.toLowerCase())) n = `${base} (${k++})`;
    used.add(n.toLowerCase());
    return n;
  });
  const data = raw.slice(1);
  if (!data.length) throw new Error('The file has a header row but no data rows.');
  const width = header.length;
  const ragged: number[] = [];
  const fullWidth = raw[0].length;
  const cells = data.map((r, i) => { if (r.length !== fullWidth) ragged.push(i + 2); const x = r.slice(0, width); while (x.length < width) x.push(''); return x; });
  const N = cells.length;
  const today = Date.now();
  const okDate = (t: number) => t <= today + 2 * DAY && t >= Date.UTC(1900, 0, 1);

  // ── columns
  const mixedOrder: number[] = [];
  const columns: OwnColumn[] = header.map((h, ci) => {
    const vals = cells.map(r => r[ci]);
    const nonEmpty = vals.filter(v => v.trim() !== '');
    const filled = nonEmpty.length, empty = N - filled;
    const distinctSet = new Set(nonEmpty.map(v => v.trim()));
    const distinct = distinctSet.size;
    const examples = [...distinctSet].slice(0, 3);
    const reasons: string[] = [];
    const lname = h.toLowerCase();
    if (!filled) return { index: ci, name: h, type: 'text', role: 'empty', filled, empty, distinct, examples, reasons: ['every cell is empty'] };

    // decimal style is decided per column: try both and keep the one that reads more values
    const dotN = nonEmpty.map(v => parseNumber(v, false)), comN = nonEmpty.map(v => parseNumber(v, true));
    const dotOk = dotN.filter(v => v !== null).length, comOk = comN.filter(v => v !== null).length;
    const decimalComma = comOk > dotOk || (comOk === dotOk && delimiter === ';' && nonEmpty.some(v => /,\d/.test(v)));
    const nums = decimalComma ? comN : dotN;
    const numOk = decimalComma ? comOk : dotOk;
    const { order, ambiguous, mixed } = dateOrder(nonEmpty);
    const dts = nonEmpty.map(v => parseDate(v, order));
    // with mixed day/month orders, a value counts as date-like if it reads either way (the mix is flagged below)
    const dateOk = mixed ? nonEmpty.filter(v => parseDate(v, 'DMY') !== null || parseDate(v, 'MDY') !== null).length : dts.filter(v => v !== null).length;
    const lower = new Set(nonEmpty.map(v => v.trim().toLowerCase()));
    const isBool = [...lower].every(v => BOOL.has(v)) && lower.size <= 2;

    let type: ColType = 'text';
    if (isBool) type = 'boolean';
    else if (dateOk / filled >= 0.95 && dateOk > numOk * 0.5) type = 'date';
    else if (numOk / filled >= 0.95) type = 'number';

    // top values for low-cardinality columns
    const counts = new Map<string, number>(); nonEmpty.forEach(v => counts.set(v.trim(), (counts.get(v.trim()) ?? 0) + 1));
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([value, count]) => ({ value, count }));

    const col: OwnColumn = { index: ci, name: h, type, role: 'dimension', filled, empty, distinct, examples, reasons, decimalComma };
    if (mixed) mixedOrder.push(ci);
    const idName = /(^|[^a-z])(id|ids|key|code|uuid|guid|sku|zip|postal|phone|account|acct)([^a-z]|$)|number$|no\.?$|#$/.test(lname);

    if (type === 'date') {
      const all = dts.filter((v): v is number => v !== null);
      const ok = all.filter(okDate).length ? all.filter(okDate) : all;
      col.dates = { min: minOf(ok), max: maxOf(ok), order };
      col.role = 'date';
      reasons.push(`${Math.round((dateOk / filled) * 100)}% of values read as dates`);
      if (ambiguous) reasons.push('day and month are ambiguous; read as month/day');
      else if (mixed) reasons.push('both day/month and month/day forms appear');
      else if (order === 'DMY') reasons.push('read as day/month/year');
    } else if (type === 'number') {
      const ok = nums.filter((v): v is number => v !== null);
      const integers = ok.every(Number.isInteger);
      col.num = { min: minOf(ok), max: maxOf(ok), mean: ok.reduce((a, b) => a + b, 0) / ok.length, median: median(ok), sum: ok.reduce((a, b) => a + b, 0), negatives: ok.filter(v => v < 0).length, integers };
      if (idName || /year|^yr$/.test(lname) || (integers && distinct === filled && filled > 20 && col.num.min >= 0 && !/amount|value|price|cost|qty|quantity|sales|revenue|total/.test(lname))) { col.role = 'identifier'; reasons.push(idName ? 'name looks like a code or ID' : /year/.test(lname) ? 'a year, not an amount' : 'whole numbers, all different'); }
      else if (integers && distinct <= 12 && filled >= 50 && distinct / filled < 0.2 && !/amount|value|price|cost|qty|quantity|sales|revenue|total|units|count/.test(lname)) { col.role = 'dimension'; reasons.push(`whole numbers with only ${distinct} distinct values`); }
      else { col.role = 'measure'; reasons.push(`${Math.round((numOk / filled) * 100)}% numeric`, `${distinct.toLocaleString('en-US')} distinct values`); }
    } else if (type === 'boolean') {
      col.role = 'dimension'; reasons.push('yes/no values');
    } else {
      const avgLen = nonEmpty.reduce((a, v) => a + v.length, 0) / filled;
      if (avgLen > 40) { col.role = 'text'; reasons.push('long free text'); }
      else if (idName || (distinct === filled && filled > 20)) { col.role = 'identifier'; reasons.push(idName ? 'name looks like a code or ID' : 'every value is different'); }
      else if (distinct <= Math.max(30, N * 0.05)) { col.role = 'dimension'; reasons.push(`${distinct.toLocaleString('en-US')} distinct values`); }
      else { col.role = 'identifier'; reasons.push('many distinct values'); }
    }
    if (col.role === 'dimension' || type === 'boolean') col.top = top;
    return col;
  });

  // ── checks
  const checks: OwnCheck[] = [];
  const add = (c: Omit<OwnCheck, 'rows'> & { rows?: number[] }) => checks.push({ ...c, rows: (c.rows ?? []).slice(0, 500) });

  if (ragged.length) add({ id: 'ragged', severity: 'MEDIUM', title: `${plural(ragged.length, 'row')} ${ragged.length === 1 ? 'has' : 'have'} the wrong number of fields`, detail: `The header has ${fullWidth} columns. These rows were padded or cut to fit, so values may have shifted.`, method: 'count delimiters per row (quotes respected) vs the header', affected: ragged.length, rows: ragged });

  const emptyCols = columns.filter(c => c.role === 'empty');
  if (emptyCols.length) add({ id: 'empty-cols', severity: 'LOW', title: `${emptyCols.length} column${emptyCols.length > 1 ? 's are' : ' is'} completely empty`, detail: emptyCols.map(c => c.name).slice(0, 6).join(', '), method: 'no non-blank cell in the column', affected: emptyCols.length });

  for (const c of columns) {
    if (c.role === 'empty' || !c.empty) continue;
    const share = c.empty / N;
    const rows = cells.map((r, i) => (r[c.index].trim() === '' ? i + 2 : 0)).filter(Boolean);
    add({ id: `blank-${c.index}`, severity: share > 0.2 ? 'MEDIUM' : 'LOW', title: `${plural(c.empty, 'blank value')} in “${c.name}”`, detail: `${(share * 100).toFixed(share < 0.01 ? 2 : 1)}% of rows have no value here.`, method: 'cells that are empty after trimming spaces', affected: c.empty, rows });
  }

  // duplicates
  const keyRows = new Map<string, number[]>();
  cells.forEach((r, i) => { const k = r.join('\u0001'); const a = keyRows.get(k); if (a) a.push(i + 2); else keyRows.set(k, [i + 2]); });
  const dupRows = [...keyRows.values()].filter(a => a.length > 1).flatMap(a => a.slice(1));
  if (dupRows.length) add({ id: 'dups', severity: 'MEDIUM', title: `${plural(dupRows.length, 'duplicate row')}`, detail: 'Rows identical to an earlier row in every column. If they are not real repeats, totals are overstated.', method: 'compare every column of every row', affected: dupRows.length, rows: dupRows });

  // mixed types
  for (const c of columns) {
    if (c.type !== 'number' && c.type !== 'date') continue;
    const bad = cells.map((r, i) => { const v = r[c.index]; if (!v.trim()) return 0; const ok = c.type === 'number' ? parseNumber(v, c.decimalComma) !== null : parseDate(v, c.dates?.order) !== null; return ok ? 0 : i + 2; }).filter(Boolean);
    if (bad.length) {
      const ex = cells[bad[0] - 2][c.index];
      add({ id: `mixed-${c.index}`, severity: 'MEDIUM', title: `${plural(bad.length, 'value')} in “${c.name}” ${bad.length === 1 ? 'isn’t a' : 'aren’t'} ${c.type === 'number' ? (bad.length === 1 ? 'number' : 'numbers') : (bad.length === 1 ? 'date' : 'dates')}`, detail: `For example “${ex.slice(0, 40)}”. They are left out of totals and trends.`, method: `try to read each non-blank cell as a ${c.type}`, affected: bad.length, rows: bad });
    }
  }

  // category spelling variants
  for (const c of columns) {
    if (c.role !== 'dimension' || c.type !== 'text') continue;
    const groups = new Map<string, Set<string>>();
    cells.forEach(r => { const v = r[c.index]; if (!v.trim()) return; const k = v.trim().toLowerCase().replace(/\s+/g, ' '); const g = groups.get(k) ?? new Set(); g.add(v); groups.set(k, g); });
    const variants = [...groups.values()].filter(g => g.size > 1);
    if (variants.length) {
      const bad = new Set(variants.flatMap(g => [...g].slice(1)));
      const rows = cells.map((r, i) => (bad.has(r[c.index]) ? i + 2 : 0)).filter(Boolean);
      const ex = [...variants[0]].slice(0, 3).map(v => `“${v}”`).join(' vs ');
      add({ id: `variants-${c.index}`, severity: 'MEDIUM', title: `“${c.name}” has ${variants.length} value${variants.length > 1 ? 's' : ''} spelled more than one way`, detail: `For example ${ex}. They would be counted as different categories.`, method: 'group values ignoring case and extra spaces', affected: rows.length, rows });
    }
  }

  // outliers (robust z-score); remembered so trends and movers can leave them out
  const outlierRows = new Map<number, Set<number>>();
  for (const c of columns) {
    if (c.role !== 'measure' || !c.num) continue;
    const vals = cells.map((r, i) => ({ v: parseNumber(r[c.index], c.decimalComma), row: i + 2 })).filter((x): x is { v: number; row: number } => x.v !== null);
    if (vals.length < 30) continue;
    const med = median(vals.map(x => x.v));
    const mad = median(vals.map(x => Math.abs(x.v - med)));
    if (!mad) continue;
    const out = vals.filter(x => Math.abs(x.v - med) / (1.4826 * mad) > 10);
    if (out.length && out.length <= vals.length * 0.02) {
      outlierRows.set(c.index, new Set(out.map(x => x.row)));
      const top = [...out].sort((a, b) => Math.abs(b.v - med) - Math.abs(a.v - med))[0];
      add({ id: `outliers-${c.index}`, severity: 'LOW', title: `${plural(out.length, 'extreme value')} in “${c.name}”`, detail: `Far from the typical value of ${fmt(r2(med))}; the largest is ${fmt(top.v)} (row ${top.row}). Worth checking before using totals.`, method: 'more than 10 robust standard deviations (median absolute deviation) from the median', affected: out.length, rows: out.map(x => x.row) });
    }
  }

  // repeated values in a column that is otherwise unique (a likely key); full duplicate rows are already counted above
  const dupSet = new Set(dupRows);
  for (const c of columns) {
    if (c.role !== 'identifier' || c.distinct === c.filled || c.distinct / c.filled < 0.95) continue;
    const firstSeen = new Set<string>(); const rows: number[] = [];
    cells.forEach((r, i) => { if (dupSet.has(i + 2)) return; const v = r[c.index].trim(); if (!v) return; if (firstSeen.has(v)) rows.push(i + 2); else firstSeen.add(v); });
    if (rows.length) add({ id: `dupid-${c.index}`, severity: 'LOW', title: `${plural(rows.length, 'repeated value')} in “${c.name}”`, detail: 'Almost every value in this column is unique, but these repeat. If it is meant to be a key, they need checking.', method: 'values seen earlier in the same column, ignoring rows that are full duplicates', affected: rows.length, rows });
  }
  for (const ci of mixedOrder) {
    const c = columns[ci]; if (c.role !== 'date') continue;
    add({ id: `order-${ci}`, severity: 'MEDIUM', title: `“${c.name}” mixes day/month and month/day dates`, detail: `Some values only make sense as day-first and others as month-first. They were read as ${c.dates?.order === 'DMY' ? 'day/month/year' : 'month/day/year'}, so some dates may be wrong.`, method: 'look for a first or second number above 12 in each date', affected: c.filled, rows: [] });
  }

  // dates in the future / far past (also kept out of the trend and the comparison)
  const badDateRows = new Map<number, Set<number>>();
  for (const c of columns) {
    if (c.role !== 'date' || !c.dates) continue;
    const rows = cells.map((r, i) => { const t = parseDate(r[c.index], c.dates!.order); return t !== null && !okDate(t) ? i + 2 : 0; }).filter(Boolean);
    badDateRows.set(c.index, new Set(rows));
    if (rows.length) add({ id: `dates-${c.index}`, severity: 'LOW', title: `${plural(rows.length, 'date')} in “${c.name}” ${rows.length === 1 ? 'is' : 'are'} in the future or before 1900`, detail: 'Possibly placeholders or typos.', method: 'dates after today or before 1 Jan 1900', affected: rows.length, rows });
  }

  const sevRank = { HIGH: 0, MEDIUM: 1, LOW: 2, OK: 3 } as const;
  checks.sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || b.affected - a.affected);
  if (!dupRows.length) checks.push({ id: 'ok-dups', severity: 'OK', title: 'No duplicate rows', detail: 'Every row differs from the others in at least one column.', method: 'compare every column of every row', affected: 0, rows: [] });
  if (!ragged.length) checks.push({ id: 'ok-shape', severity: 'OK', title: 'Every row has the same shape', detail: `All rows have ${fullWidth} fields, like the header.`, method: 'count fields per row vs the header', affected: 0, rows: [] });

  // ── trend: first well-filled date column × best measure (or row count)
  const dateCol = columns.find(c => c.role === 'date' && c.filled >= N * 0.8 && c.dates && c.dates.max > c.dates.min);
  const measures = columns.filter(c => c.role === 'measure');
  const pref = /amount|revenue|sales|value|total|price|cost|profit|qty|quantity|volume|spend|balance/;
  const measure = measures.find(c => pref.test(c.name.toLowerCase())) ?? measures[0];
  let trend: OwnTrend | undefined;
  const skip = new Set<number>([...((measure && outlierRows.get(measure.index)) || []), ...((dateCol && badDateRows.get(dateCol.index)) || [])]);
  const nOut = (measure && outlierRows.get(measure.index)?.size) || 0, nBad = (dateCol && badDateRows.get(dateCol.index)?.size) || 0;
  const leftOut = [nOut ? `${nOut.toLocaleString('en-US')} extreme value${nOut > 1 ? 's' : ''}` : '', nBad ? `${nBad.toLocaleString('en-US')} out-of-range date${nBad > 1 ? 's' : ''}` : ''].filter(Boolean).join(' and ');
  const skipNote = leftOut ? ` ${leftOut} left out (see the checks).` : '';
  if (dateCol && dateCol.dates) {
    const span = (dateCol.dates.max - dateCol.dates.min) / DAY;
    const grain: OwnTrend['grain'] = span <= 45 ? 'day' : span <= 400 ? 'week' : 'month';
    const bucket = (t: number) => {
      if (grain === 'day') return t;
      if (grain === 'week') { const d = new Date(t); const dow = (d.getUTCDay() + 6) % 7; return t - dow * DAY; }
      const d = new Date(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    };
    const sums = new Map<number, number>(), counts = new Map<number, number>();
    cells.forEach((r, i) => {
      if (skip.has(i + 2)) return;
      const t = parseDate(r[dateCol.index], dateCol.dates!.order); if (t === null) return;
      const v = measure ? parseNumber(r[measure.index], measure.decimalComma) : 1; if (v === null) return;
      const b = bucket(t); sums.set(b, (sums.get(b) ?? 0) + v); counts.set(b, (counts.get(b) ?? 0) + 1);
    });
    const keys = [...sums.keys()].sort((a, b) => a - b);
    if (keys.length >= 3) {
      // fill gaps so the line is honest about empty periods
      const filled: number[] = [];
      for (let k = keys[0]; k <= keys[keys.length - 1];) {
        filled.push(k);
        if (grain === 'day') k += DAY; else if (grain === 'week') k += 7 * DAY; else { const d = new Date(k); k = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); }
        if (filled.length > 2000) break;
      }
      const points = filled.map(t => ({ t, v: r2(sums.get(t) ?? 0), label: grain === 'month' ? monthLabel(t) : dayLabel(t) }));
      const last = points[points.length - 1];
      const end = grain === 'day' ? last.t + DAY : grain === 'week' ? last.t + 7 * DAY : Date.UTC(new Date(last.t).getUTCFullYear(), new Date(last.t).getUTCMonth() + 1, 1);
      const partialLast = grain !== 'day' && dateCol.dates.max < end - DAY;
      const cmp = partialLast ? points.slice(0, -1) : points;
      const agg: OwnTrend['agg'] = measure ? 'sum' : 'count';
      const what = measure ? measure.name : 'Rows';
      let statement = '', change: number | undefined;
      if (cmp.length >= 2) {
        const a = cmp[cmp.length - 2], b = cmp[cmp.length - 1];
        const per = grain === 'day' ? 'day' : grain === 'week' ? 'week' : 'month';
        if (!counts.get(b.t)) statement = `The latest full ${per} (${b.label}) has no rows.`;
        else if (a.v !== 0 && counts.get(a.t)) { change = (b.v - a.v) / Math.abs(a.v); statement = `${what} in the latest full ${per} (${b.label}): ${fmt(b.v)}, ${pct(change)} vs the ${per} before.`; }
        else statement = `${what} in the latest full ${per} (${b.label}): ${fmt(b.v)}.`;
        if (partialLast) statement += ` The last ${per} is partial, so it is left out of the comparison.`;
        statement += skipNote;
      }
      trend = { date: dateCol.name, measure: what, agg, grain, points, partialLast, statement, change };
    }
  }

  // ── movers: the dimension whose values shifted most between the two halves of the date range
  let movers: OwnMovers | undefined;
  // only dimensions whose values repeat enough to group by (a file of 3 unique names has nothing to compare)
  const dims = N < 10 ? [] : columns.filter(c => c.role === 'dimension' && c.distinct >= 2 && c.distinct <= 40 && c.distinct <= c.filled / 3).sort((a, b) => a.distinct - b.distinct);
  const dim = dims.find(c => c.distinct >= 3) ?? dims[0];
  if (dim) {
    const what = measure ? measure.name : 'Rows';
    const agg: OwnMovers['agg'] = measure ? 'sum' : 'count';
    if (dateCol && dateCol.dates && trend) {
      // split on a whole day: the first half is every day before `mid`
      const mid = Math.floor((dateCol.dates.min + (dateCol.dates.max - dateCol.dates.min) / 2) / DAY) * DAY + DAY;
      const A = new Map<string, number>(), B = new Map<string, number>();
      cells.forEach((r, i) => {
        if (skip.has(i + 2)) return;
        const t = parseDate(r[dateCol.index], dateCol.dates!.order); const k = r[dim.index].trim(); if (t === null || !k) return;
        const v = measure ? parseNumber(r[measure.index], measure.decimalComma) : 1; if (v === null) return;
        const m = t < mid ? A : B; m.set(k, (m.get(k) ?? 0) + v);
      });
      const items = [...new Set([...A.keys(), ...B.keys()])].map(value => { const a = r2(A.get(value) ?? 0), b = r2(B.get(value) ?? 0); return { value, a, b, delta: r2(b - a) }; })
        .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta)).slice(0, 6);
      if (items.length && items[0].delta !== 0) {
        const t = items[0];
        const rel = t.a ? ` (${pct(t.delta / Math.abs(t.a))})` : '';
        movers = { dimension: dim.name, measure: what, agg, mode: 'halves', items, statement: `By ${dim.name}, “${t.value}” moved most: ${t.delta >= 0 ? '+' : '−'}${fmt(Math.abs(t.delta))}${rel} from the first half of the period (to ${dayLabel(mid - DAY)}) to the second.${skipNote}` };
      }
    } else {
      const S = new Map<string, number>();
      let total = 0;
      cells.forEach((r, i) => { if (skip.has(i + 2)) return; const v = measure ? parseNumber(r[measure.index], measure.decimalComma) : 1; if (v === null) return; total += v; const k = r[dim.index].trim(); if (!k) return; S.set(k, (S.get(k) ?? 0) + v); });
      const items = [...S.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([value, b]) => ({ value, a: 0, b: r2(b), delta: r2(b) }));
      if (items.length && total) movers = { dimension: dim.name, measure: what, agg, mode: 'share', items, statement: `By ${dim.name}, “${items[0].value}” is the largest: ${fmt(items[0].b)} (${Math.round((items[0].b / total) * 100)}% of ${measure ? 'the total' : 'rows'}).` };
    }
  }

  // ── plain facts
  const byRole = (r: ColRole) => columns.filter(c => c.role === r).length;
  const facts = [
    `${N.toLocaleString('en-US')} row${N === 1 ? '' : 's'} and ${width} column${width === 1 ? '' : 's'}${truncated ? ` (only the first ${LIMITS.rows.toLocaleString('en-US')} rows were read)` : ''}${colsTruncated ? ` (only the first ${LIMITS.cols} of ${fullWidth} columns were analysed)` : ''}.`,
    `${byRole('measure')} measure${byRole('measure') === 1 ? '' : 's'}, ${byRole('dimension')} dimension${byRole('dimension') === 1 ? '' : 's'}, ${byRole('date')} date column${byRole('date') === 1 ? '' : 's'}, ${byRole('identifier')} identifier${byRole('identifier') === 1 ? '' : 's'}.`,
  ];
  const issues = checks.filter(c => c.severity !== 'OK');
  facts.push(issues.length ? `${issues.length} data-quality issue${issues.length > 1 ? 's' : ''} to review; the biggest: ${issues[0].title.charAt(0).toLowerCase()}${issues[0].title.slice(1)}.` : 'No data-quality issues found by these checks.');
  if (trend?.statement) facts.push(trend.statement);
  if (movers) facts.push(movers.statement);

  return { file: { name, bytes, rows: N, cols: width, delimiter, truncated, colsTruncated }, columns, checks, trend, movers, facts, header, cells };
}

/** A small, deliberately messy CSV so visitors without a file can try it. Deterministic. */
export function sampleCsv(): string {
  let s = 1234567;
  const r = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const regions = ['North', 'South', 'East', 'West'];
  const products = ['Widgets', 'Gadgets', 'Gizmos', 'Doohickeys'];
  const lines = ['Order ID,Order Date,Region,Product,Units,Amount ($)'];
  let id = 10001;
  for (let d = 0; d < 180; d++) {
    const t = Date.UTC(2026, 0, 1) + d * DAY;
    const date = new Date(t).toISOString().slice(0, 10);
    const n = 4 + Math.floor(r() * 5);
    for (let k = 0; k < n; k++) {
      const region = regions[Math.floor(r() * 4)], product = products[Math.floor(r() * 4)];
      const units = 1 + Math.floor(r() * 20);
      const price = product === 'Gizmos' && d >= 90 ? 48 : 25 + Math.floor(r() * 10);
      const amount = units * price;
      let reg: string = region;
      if (r() < 0.02) reg = region.toUpperCase();            // spelling variants
      let amt = amount.toFixed(2);
      if (r() < 0.01) amt = '';                                // blanks
      if (r() < 0.004) amt = 'n/a';                            // text in a number column
      if (r() < 0.002) amt = (amount * 1000).toFixed(2);       // a fat-finger outlier
      const line = `${id++},${date},${reg},${product},${units},${amt}`;
      lines.push(line);
      if (r() < 0.006) lines.push(line);                        // duplicate row
    }
  }
  return lines.join('\n') + '\n';
}

// ───────────────────────── worker plumbing ─────────────────────────
declare const __OWN_WORKER__: string;
/** Run the analysis off the main thread when a worker bundle is available; otherwise inline. */
export function analyseAsync(name: string, bytes: number, text: string): Promise<OwnAnalysis> {
  const url = typeof __OWN_WORKER__ === 'string' ? __OWN_WORKER__ : '';
  if (!url || typeof Worker === 'undefined') return new Promise((res, rej) => setTimeout(() => { try { res(analyse(name, bytes, text)); } catch (e) { rej(e); } }, 30));
  return new Promise((res, rej) => {
    const w = new Worker(url);
    w.onmessage = (e: MessageEvent<{ ok: boolean; a?: OwnAnalysis; error?: string }>) => { w.terminate(); if (e.data.ok && e.data.a) res(e.data.a); else rej(new Error(e.data.error || 'Could not read the file.')); };
    w.onerror = () => { w.terminate(); try { res(analyse(name, bytes, text)); } catch (e) { rej(e); } };
    w.postMessage({ name, bytes, text });
  });
}
