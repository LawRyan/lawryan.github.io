/**
 * "Try it on your own file": a small, deterministic profiler for any CSV/TSV a visitor drops in.
 * Everything runs in the browser. No network, no model; every statement is computed from the rows.
 */

export const LIMITS = { bytes: 10 * 1024 * 1024, rows: 200_000, cols: 200 };

export type ColType = 'number' | 'date' | 'boolean' | 'text';
/** how a date column is read: day/month order, Excel serial day numbers, or bare years */
export type DateOrder = 'DMY' | 'MDY' | 'XL' | 'Y';
export type ColRole = 'measure' | 'dimension' | 'date' | 'identifier' | 'text' | 'empty';
export interface NumStats { min: number; max: number; mean: number; median: number; sum: number; negatives: number; integers: boolean }
export interface OwnColumn {
  index: number; name: string; type: ColType; role: ColRole;
  filled: number; empty: number; distinct: number; examples: string[];
  num?: NumStats; dates?: { min: number; max: number; order?: DateOrder }; decimalComma?: boolean; percent?: boolean;
  top?: { value: string; count: number }[];
  reasons: string[];
}
export type Severity = 'HIGH' | 'MEDIUM' | 'LOW' | 'OK';
export interface OwnCheck { id: string; severity: Severity; title: string; detail: string; method: string; affected: number; rows: number[] }
export interface Point { label: string; t: number; v: number }
export type Grain = 'day' | 'week' | 'month' | 'quarter' | 'year';
export interface OwnTrend { date: string; measure: string; agg: 'sum' | 'count' | 'avg'; grain: Grain; points: Point[]; partialLast: boolean; statement: string; change?: number; changeText?: string }
export interface OwnMovers { dimension: string; measure: string; agg: 'sum' | 'count'; mode: 'halves' | 'share'; items: { value: string; a: number; b: number; delta: number }[]; statement: string }
export interface OwnBreakdown { dimension: string; col: number; agg: 'sum' | 'avg' | 'count'; measure: string; halves: boolean; items: { value: string; v: number; rows: number; change?: number }[]; others: number; otherCount: number }
export interface OwnKpi { label: string; value: string; sub: string; change?: number; changeText?: string; watch?: boolean }
export type InsightKind = 'TREND' | 'MOVER' | 'SHARE' | 'ISSUE';
export interface OwnInsight { kind: InsightKind; title: string; text: string; severity?: Severity; check?: string; filter?: { col: number; value: string } }
export interface OwnDash { kpis: OwnKpi[]; breakdowns: OwnBreakdown[]; insights: OwnInsight[]; quality: number; flaggedRows: number;
  /** what the trend and totals were built from, so later steps (Ask, Investigate) compute the same way */
  ctx: { measure?: number; measureName: string; decimalComma?: boolean; agg: 'sum' | 'avg' | 'count'; date?: number; order?: DateOrder; percent?: boolean; mixedBy?: string; excluded: number[] } }
export interface OwnAnalysis {
  file: { name: string; bytes: number; rows: number; cols: number; delimiter: string; truncated: boolean; colsTruncated: number; encoding: string;
    /** add to an internal row number (data row index + 2) to get the line in the file */ lineOffset: number; skippedTop: number; headerless: boolean; totalRowDropped: boolean };
  columns: OwnColumn[]; checks: OwnCheck[]; trend?: OwnTrend; movers?: OwnMovers; facts: string[]; dash: OwnDash;
  /** raw access for "show rows" (1-based file line numbers: header = 1) */
  header: string[]; cells: string[][];
}

// ───────────────────────── decoding & parsing ─────────────────────────
/** Turn file bytes into text: UTF-16 (Excel "Unicode text") by its BOM, UTF-8 if valid, else Windows-1252 (older Excel CSVs). */
export function decode(buf: ArrayBuffer | Uint8Array): { text: string; encoding: string } {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if (b[0] === 0xff && b[1] === 0xfe) return { text: new TextDecoder('utf-16le').decode(b), encoding: 'UTF-16' };
  if (b[0] === 0xfe && b[1] === 0xff) return { text: new TextDecoder('utf-16be').decode(b), encoding: 'UTF-16' };
  try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(b), encoding: 'UTF-8' }; }
  catch { return { text: new TextDecoder('windows-1252').decode(b), encoding: 'Windows-1252' }; }
}

const DELIMS = [',', ';', '\t', '|'];
const isNote = (l: string) => /^\s*#/.test(l);

/** Pick the delimiter that splits lines most consistently (quotes respected; title and # lines don't decide it). */
export function sniffDelimiter(text: string): string {
  const all = text.split(/\r\n|\n|\r/).filter(l => l.trim()).slice(0, 60);
  // "#" lines are comments only when they're a minority (a column of values like #1001 is data)
  const notes = all.filter(isNote).length;
  const lines = (notes * 2 < all.length ? all.filter(l => !isNote(l)) : all).slice(0, 30);
  let best = '', bestScore = -1;
  for (const d of DELIMS) {
    const counts = lines.map(l => { let n = 0, q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === d && !q) n++; } return n; });
    const freq = new Map<number, number>(); counts.forEach(c => { if (c > 0) freq.set(c, (freq.get(c) ?? 0) + 1); });
    const top = [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
    if (!top) continue;
    const score = top[1] * 100 + top[0];
    if (score > bestScore) { best = d; bestScore = score; }
  }
  if (best) return best;
  // no delimiter at all: columns separated by runs of spaces (fixed-width style exports)
  const widths = lines.map(l => l.trim().split(/[ \t]+/).length);
  return widths.length >= 2 && widths[0] >= 2 && widths.filter(w => w === widths[0]).length >= widths.length * 0.8 ? ' ' : ',';
}

/** RFC 4180 parser: quoted fields, doubled quotes, embedded delimiters and newlines, CRLF/LF/CR. */
export function parseDelimited(text: string, delimiter = sniffDelimiter(text), maxRows = LIMITS.rows + 1): { rows: string[][]; truncated: boolean } {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (delimiter === ' ') { text = text.split(/\r\n|\n|\r/).map(l => l.trim().replace(/[ \t]+/g, '\t')).join('\n'); delimiter = '\t'; }
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
  if (/^\d+(\.\d+)?[eE][+-]?\d+$/.test(s)) { const v = Number(s); return Number.isFinite(v) ? (neg ? -v : v) : null; }
  let mult = 1;
  const sx = s.match(/^(.*\d)\s?(k|K|m|M|mm|MM|bn|BN|b|B|t|T)$/);
  if (sx) { mult = ({ k: 1e3, m: 1e6, mm: 1e6, bn: 1e9, b: 1e9, t: 1e12 } as Record<string, number>)[sx[2].toLowerCase()]; s = sx[1].trim(); }
  if (decimalComma) { if (!/^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(s)) return null; s = s.replace(/\./g, '').replace(',', '.'); }
  else { if (!/^\d{1,3}(,\d{3})*(\.\d+)?$|^\d+(\.\d+)?$|^\.\d+$/.test(s)) return null; s = s.replace(/,/g, ''); }
  let v = Number(s) * mult; if (!Number.isFinite(v)) return null;
  if (pct) v = v / 100;
  return neg ? -v : v;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const PIVOT = (new Date().getUTCFullYear() % 100) + 10;
const utc = (y: number, m: number, d: number) => { if (y < 100) y += y <= PIVOT ? 2000 : 1900; if (m < 1 || m > 12 || d < 1 || d > 31) return null; const t = Date.UTC(y, m - 1, d); const dt = new Date(t); return dt.getUTCDate() === d ? t : null; };

/** Parse a date. `order` resolves a/b/yyyy: 'DMY' or 'MDY'. Returns a UTC timestamp (ms) or null. */
export function parseDate(raw: string, order: DateOrder = 'MDY'): number | null {
  const s = raw.trim(); if (!s) return null;
  if (order === 'XL') { if (!/^\d{4,5}(\.\d+)?$/.test(s)) return null; const n = Math.floor(+s); return n >= 1 && n < 80000 ? Date.UTC(1899, 11, 30) + n * 86_400_000 : null; }
  if (order === 'Y') { if (!/^\d{4}$/.test(s)) return null; const y = +s; return y >= 1000 && y <= 2999 ? Date.UTC(y, 0, 1) : null; }
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/);
  if (m) return utc(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{4})[-/](\d{1,2})$/);   // 2025-01: a month
  if (m) return utc(+m[1], +m[2], 1);
  m = s.match(/^(\d{4})\s?[-/]?\s?Q([1-4])$/i);   // 2024Q3, 2024-Q3: a quarter
  if (m) return utc(+m[1], (+m[2] - 1) * 3 + 1, 1);
  m = s.match(/^Q([1-4])\s?[-/]?\s?(\d{4})$/i);   // Q3 2024
  if (m) return utc(+m[2], (+m[1] - 1) * 3 + 1, 1);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:[ T]\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)?$/i);
  if (m) return order === 'DMY' ? utc(+m[3], +m[2], +m[1]) : utc(+m[3], +m[1], +m[2]);
  m = s.match(/^(\d{1,2})[ -]([A-Za-z]{3,9})[ ,-]*(\d{2}|\d{4})$/);
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

/** values people use to mean "no value" */
const NULLS = new Set(['na', 'n/a', 'n.a.', '#n/a', 'null', 'nil', 'none', 'nan', '-', '—', '–', '***', '?', '.', '#value!', '#div/0!', '#ref!', '#name?', '#num!']);
export const isBlank = (v: string) => { const t = v.trim(); return !t || NULLS.has(t.toLowerCase()); };
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
  if (a >= 1e12) return `${sign}${(a / 1e12).toFixed(a >= 1e13 ? 1 : 2)}T`;
  if (a >= 1e9) return `${sign}${(a / 1e9).toFixed(a >= 1e10 ? 1 : 2)}B`;
  if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`;
  if (a >= 1e4) return `${sign}${(a / 1e3).toFixed(1)}K`;
  if (Number.isInteger(v)) return `${sign}${a.toLocaleString('en-US')}`;
  return `${sign}${a.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}
/** a measure's own format: percentages stay percentages (0.034 → 3.4%) */
export const fmtFor = (percent?: boolean) => (percent ? (v: number) => `${v < 0 ? '−' : ''}${Math.abs(v * 100).toFixed(Math.abs(v) < 0.1 ? 2 : 1)}%` : fmt);
/** a change in a percentage, in percentage points */
export const pp = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(Math.abs(x) < 0.1 ? 2 : 1)} pp`;
export const pct = (x: number) => { const t = Math.abs(x * 100).toFixed(Math.abs(x) < 0.1 ? 1 : 0); return /^0(\.0)?$/.test(t) ? '0%' : `${x >= 0 ? '+' : '−'}${t}%`; };
const DAY = 86_400_000;
export const dayLabel = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const monthLabel = (t: number) => new Date(t).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });

// ───────────────────────── periods ─────────────────────────
/** the start of the period a timestamp falls in */
export function bucketOf(g: Grain, t: number) {
  if (g === 'day') return Math.floor(t / DAY) * DAY;
  if (g === 'week') { const d = new Date(t); const dow = (d.getUTCDay() + 6) % 7; return Math.floor(t / DAY) * DAY - dow * DAY; }
  const d = new Date(t), y = d.getUTCFullYear();
  return g === 'month' ? Date.UTC(y, d.getUTCMonth(), 1) : g === 'quarter' ? Date.UTC(y, Math.floor(d.getUTCMonth() / 3) * 3, 1) : Date.UTC(y, 0, 1);
}
/** the start of the next period */
export function nextBucket(g: Grain, t: number) {
  if (g === 'day') return t + DAY;
  if (g === 'week') return t + 7 * DAY;
  const d = new Date(t), y = d.getUTCFullYear(), m = d.getUTCMonth();
  return g === 'month' ? Date.UTC(y, m + 1, 1) : g === 'quarter' ? Date.UTC(y, m + 3, 1) : Date.UTC(y + 1, 0, 1);
}
export function periodLabel(g: Grain, t: number) {
  const d = new Date(t);
  return g === 'year' ? String(d.getUTCFullYear()) : g === 'quarter' ? `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}` : g === 'month' ? monthLabel(t) : dayLabel(t);
}

// ───────────────────────── column vocabularies ─────────────────────────
/** money: add these up (first match wins, in this order of preference) */
const MONEY_ORDER = [/revenue|sales|umsatz|turnover|income|ventes|ventas|ingresos|chiffre|收入|销售/, /p&l|\bpnl\b|profit|actuals?\b|amount|montant|importe|monto|betrag|金额|total|value|valor|spend|cost|expense|fees?\b|commission|premium|payment|debit|credit/, /budget|forecast|plan\b|target/, /notional|exposure|principal/];
/** quantities: add these up */
const QTY = /qty|quantity|units|volume|menge|count|orders?\b|items?\b|hours|minutes|customers|users|logins|visits|clicks|sessions|tickets|calls|headcount|employees|bytes|precip|rain|snow|on.?hand|stock|shares|trades/;
/** levels: average these (adding up prices, rates or temperatures means nothing) */
const LEVELQ = /price|rate|close|open|high|low|temp|tmax|tmin|index|ratio|score|rating|avg|mean|average|balance|\bbal\b|pct|percent|%|yield|spread|salary|wage|latency|_ms\b|duration|age\b|speed|weight|height|reading|unit.?cost|cost.?per|per.?unit|margin|growth|return|lat(itude)?\b|lon(gitude)?\b|lng\b/;
const MONEYQ = new RegExp(MONEY_ORDER.map(r => r.source).join('|') + '|' + QTY.source);

// ───────────────────────── analysis ─────────────────────────
export function analyse(name: string, bytes: number, text: string, encoding = 'UTF-8'): OwnAnalysis {
  const delimiter = sniffDelimiter(text);
  const { rows: parsed, truncated } = parseDelimited(text, delimiter);
  if (!parsed.length) throw new Error('The file is empty.');
  // find the header: skip title lines, notes and blank lines above it (common in exported reports)
  const nonEmptyLen = (r: string[]) => { let k = r.length; while (k > 0 && r[k - 1].trim() === '') k--; return k; };
  const sample = parsed.slice(0, 300);
  const freq = new Map<number, number>(); sample.forEach(r => { const k = nonEmptyLen(r); if (k > 1) freq.set(k, (freq.get(k) ?? 0) + 1); });
  const mode = [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] ?? nonEmptyLen(parsed[0]);
  // a comment is a "#" line that doesn't have the shape of a data row (so values like #1001 survive)
  const note = (r: string[]) => isNote(r[0] ?? '') && (mode <= 1 || nonEmptyLen(r) < Math.max(2, mode - 1));
  let headerIdx = parsed.findIndex((r, i) => i < 50 && !note(r) && nonEmptyLen(r) >= Math.max(2, mode - 1) && r.length >= mode - 1);
  if (headerIdx < 0) headerIdx = 0;
  const skippedTop = headerIdx;
  let raw = parsed.slice(headerIdx).filter(r => !note(r));
  // no header row at all (the first row is data): name the columns Column 1, 2, …
  const looksLikeData = (v: string) => !v.trim() || parseNumber(v) !== null || parseDate(v) !== null;
  const recursBelow = (v: string, ci: number) => raw.slice(1, 200).some(r => (r[ci] ?? '').trim() === v.trim());
  const headerless = raw.length > 1 && raw[0].some(v => v.trim() !== '') && (raw[0].every(looksLikeData)
    // or: it has dates/numbers like the rows below, and its text values also appear as values below
    || (raw[0].some(v => v.trim() && parseDate(v) !== null) && raw[0].every((v, ci) => looksLikeData(v) || recursBelow(v, ci))));
  if (headerless) raw = [raw[0].map((_, i) => `Column ${i + 1}`), ...raw];
  // footer lines under the data ("End of report", "Generated by …") are not rows
  let footerDropped = 0;
  while (raw.length > 3 && footerDropped < 5 && mode >= 3 && nonEmptyLen(raw[raw.length - 1]) <= 1 && !looksLikeData(raw[raw.length - 1][0] ?? '')) { raw = raw.slice(0, -1); footerDropped++; }
  // a "Total" row at the bottom is a summary, not data
  let totalRowDropped = false;
  const lastRow = raw[raw.length - 1];
  if (raw.length > 3 && lastRow.some(v => /^\s*(grand\s+)?totals?\s*:?\s*$|^\s*sum\s*$/i.test(v)) && lastRow.filter(v => v.trim() === '').length >= 1) { raw = raw.slice(0, -1); totalRowDropped = true; }
  const lineOffset = skippedTop - (headerless ? 1 : 0);
  const lineOf = (k: number) => k + lineOffset;
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
  const shortRows: number[] = [];
  const cells = data.map((r, i) => { if (nonEmptyLen(r) > fullWidth) ragged.push(i + 2); else if (r.length < fullWidth) shortRows.push(i + 2); const x = r.slice(0, width); while (x.length < width) x.push(''); return x; });
  const N = cells.length;
  // "NA" usually means "not available", but in a column of short codes (NA, EU, APAC) it's North America:
  // keep it as a value by marking it invisibly (a zero-width space), so it isn't read as blank
  const naKept: number[] = [];
  for (let ci = 0; ci < width; ci++) {
    let na = 0, codes = 0, other = 0;
    for (const r of cells) { const v = r[ci].trim(); if (v === 'NA') na++; else if (/^[A-Z]{2,5}$/.test(v)) codes++; else if (v) other++; }
    if (na >= 3 && codes >= na && other <= (codes + na) * 0.05) { naKept.push(ci); for (const r of cells) if (r[ci].trim() === 'NA') r[ci] = 'NA\u200b'; }
  }
  const today = Date.now();

  // ── columns
  const mixedOrder: number[] = [];
  const columns: OwnColumn[] = header.map((h, ci) => {
    const vals = cells.map(r => r[ci]);
    const nonEmpty = vals.filter(v => !isBlank(v));
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
    // a name that says what the column is lets a messier column still be read as that type
    const dateName = /date|time|^day$|^dt$|_dt$|_at$|created|updated|period|month|when|^asof|as of|datum|fecha/.test(lname);
    const numName = MONEYQ.test(lname);

    let type: ColType = 'text';
    let dOrder: DateOrder = order;
    if (isBool) type = 'boolean';
    else if ((dateOk / filled >= 0.95 || (dateName && dateOk / filled >= 0.45)) && dateOk > numOk * 0.5) type = 'date';
    else if (numOk / filled >= 0.95 || (numName && numOk / filled >= 0.6)) type = 'number';
    // whole numbers that are really dates: a Year column, or Excel serial day numbers under a date-like name
    const ints = type === 'number' && nums.every(v => v === null || Number.isInteger(v));
    if (ints && /^(fiscal )?(year|yr|fy|jahr|année|annee|año|ano)$/.test(lname.trim()) && nums.every(v => v === null || (v >= 1000 && v <= 2999))) { type = 'date'; dOrder = 'Y'; }
    else if (ints && dateName && nums.every(v => v === null || (v >= 20000 && v <= 60000))) { type = 'date'; dOrder = 'XL'; }
    const percent = type === 'number' && nonEmpty.filter(v => v.trim().endsWith('%')).length >= filled * 0.5;

    // top values for low-cardinality columns
    const counts = new Map<string, number>(); nonEmpty.forEach(v => counts.set(v.trim(), (counts.get(v.trim()) ?? 0) + 1));
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([value, count]) => ({ value, count }));

    const col: OwnColumn = { index: ci, name: h, type, role: 'dimension', filled, empty, distinct, examples, reasons, decimalComma, percent: percent || undefined };
    if (mixed && dOrder !== 'XL' && dOrder !== 'Y') mixedOrder.push(ci);
    // an ID-like name only counts when the values are mostly different (an "Account" column with 4 values is a category)
    const idName = /(^|[^a-z])(id|ids|key|code|uuid|guid|sku|zip|postal|phone|account|acct|lei|isin|cusip)([^a-z]|$)|number$|no\.?$|#$/.test(lname) && distinct >= filled * 0.5;

    if (type === 'date') {
      const all = (dOrder === order ? dts : nonEmpty.map(v => parseDate(v, dOrder))).filter((v): v is number => v !== null);
      const sane = all.filter(t => t >= Date.UTC(dOrder === 'Y' ? 1000 : 1900, 0, 1));
      const isSchedule = sane.filter(t => t > today + 2 * DAY).length >= sane.length * 0.1;
      const inRange = isSchedule ? sane : sane.filter(t => t <= today + 2 * DAY);
      const ok = inRange.length ? inRange : all;
      col.dates = { min: minOf(ok), max: maxOf(ok), order: dOrder };
      col.role = 'date';
      if (dOrder === 'Y') reasons.push('four-digit years');
      else if (dOrder === 'XL') reasons.push('whole numbers read as Excel date serials (days since 1900)');
      else reasons.push(`${Math.round((dateOk / filled) * 100)}% of values read as dates`);
      if (dOrder === 'Y' || dOrder === 'XL') { /* no day/month question */ }
      else if (ambiguous) reasons.push('day and month are ambiguous; read as month/day');
      else if (mixed) reasons.push('both day/month and month/day forms appear');
      else if (order === 'DMY') reasons.push('read as day/month/year');
    } else if (type === 'number') {
      const ok = nums.filter((v): v is number => v !== null);
      const integers = ok.every(Number.isInteger);
      col.num = { min: minOf(ok), max: maxOf(ok), mean: ok.reduce((a, b) => a + b, 0) / ok.length, median: median(ok), sum: ok.reduce((a, b) => a + b, 0), negatives: ok.filter(v => v < 0).length, integers };
      // unnamed whole numbers count as an ID only if they're all different and close to a sequence (1, 2, 3 … or 10001, 10002 …)
      const sequential = integers && distinct === filled && filled > 20 && col.num.min >= 0 && col.num.max - col.num.min + 1 <= filled * 3;
      if (idName || /year|^yr$/.test(lname) || (sequential && !MONEYQ.test(lname) && !LEVELQ.test(lname))) { col.role = 'identifier'; reasons.push(idName ? 'name looks like a code or ID' : /year/.test(lname) ? 'a year, not an amount' : 'whole numbers in a near-sequence, all different'); }
      else if (integers && distinct <= 12 && filled >= 50 && distinct / filled < 0.2 && !MONEYQ.test(lname)) { col.role = 'dimension'; reasons.push(`whole numbers with only ${distinct} distinct values`); }
      else { col.role = 'measure'; reasons.push(`${Math.round((numOk / filled) * 100)}% numeric`, `${distinct.toLocaleString('en-US')} distinct values`); if (percent) reasons.push('percentages'); }
      if (naKept.includes(ci)) reasons.push('“NA” kept as a value');
    } else if (type === 'boolean') {
      col.role = 'dimension'; reasons.push('yes/no values');
    } else {
      const avgLen = nonEmpty.reduce((a, v) => a + v.length, 0) / filled;
      const sentencey = nonEmpty.filter(v => /\s/.test(v.trim()) && /[.,!?;:]/.test(v)).length / filled;
      if (naKept.includes(ci)) reasons.push('“NA” kept as a value (it sits among short codes, so it likely means North America)');
      if (avgLen > 40 || (sentencey >= 0.3 && avgLen > 12)) { col.role = 'text'; reasons.push(avgLen > 40 ? 'long free text' : 'free text: sentences with punctuation'); }
      else if (idName || (distinct === filled && filled > 20)) { col.role = 'identifier'; reasons.push(idName ? 'name looks like a code or ID' : 'every value is different'); }
      else if (distinct <= Math.max(30, N * 0.05)) { col.role = 'dimension'; reasons.push(`${distinct.toLocaleString('en-US')} distinct values`); }
      else { col.role = 'identifier'; reasons.push('many distinct values'); }
    }
    if (col.role === 'dimension' || type === 'boolean') col.top = top;
    return col;
  });

  // ── checks
  const checks: OwnCheck[] = [];
  const add = (c: Omit<OwnCheck, 'rows'> & { rows?: number[] }) => checks.push({ ...c, rows: (c.rows ?? []).slice(0, 50_000) });

  if (ragged.length) add({ id: 'ragged', severity: 'MEDIUM', title: `${plural(ragged.length, 'row')} ${ragged.length === 1 ? 'has' : 'have'} more fields than the header`, detail: `The header has ${fullWidth} columns. The extra values were cut off, so some values may have shifted.`, method: 'count delimiters per row (quotes respected) vs the header', affected: ragged.length, rows: ragged });
  if (shortRows.length) add({ id: 'short', severity: 'LOW', title: `${plural(shortRows.length, 'row')} ${shortRows.length === 1 ? 'ends' : 'end'} early`, detail: 'The missing fields at the end were read as blank. Some exports leave out trailing empty cells, so this is often harmless.', method: 'rows with fewer fields than the header', affected: shortRows.length, rows: shortRows });

  const emptyCols = columns.filter(c => c.role === 'empty');
  if (emptyCols.length) add({ id: 'empty-cols', severity: 'LOW', title: `${emptyCols.length} column${emptyCols.length > 1 ? 's are' : ' is'} completely empty`, detail: emptyCols.map(c => c.name).slice(0, 6).join(', '), method: 'no non-blank cell in the column', affected: emptyCols.length });

  for (const c of columns) {
    if (c.role === 'empty' || !c.empty) continue;
    const share = c.empty / N;
    const rows = cells.map((r, i) => (isBlank(r[c.index]) ? i + 2 : 0)).filter(Boolean);
    const markers = rows.filter(n => cells[n - 2][c.index].trim() !== '').length;
    add({ id: `blank-${c.index}`, severity: share > 0.2 ? 'MEDIUM' : 'LOW', title: `${plural(c.empty, 'blank value')} in “${c.name}”`, detail: `${(share * 100).toFixed(share < 0.01 ? 2 : 1)}% of rows have no value here${markers ? `, including ${plural(markers, 'placeholder')} like “${cells[rows.find(n => cells[n - 2][c.index].trim() !== '')! - 2][c.index].trim()}”` : ''}.`, method: 'cells that are empty after trimming spaces', affected: c.empty, rows });
  }

  // duplicates
  const keyRows = new Map<string, number[]>();
  cells.forEach((r, i) => { const k = r.join('\u0001'); const a = keyRows.get(k); if (a) a.push(i + 2); else keyRows.set(k, [i + 2]); });
  const dupRows = [...keyRows.values()].filter(a => a.length > 1).flatMap(a => a.slice(1));
  const hasKey = columns.some(c => c.role === 'identifier' || (c.role === 'date' && c.distinct >= c.filled * 0.5));
  const dupSoft = !hasKey && dupRows.length < N * 0.2;
  if (dupRows.length && width >= 2) add({ id: 'dups', severity: dupSoft ? 'LOW' : 'MEDIUM', title: `${plural(dupRows.length, 'duplicate row')}`, detail: dupSoft ? 'Rows identical to an earlier row in every column. This file has no ID or timestamp column, so some of these may be genuine repeats.' : 'Rows identical to an earlier row in every column. If they are not real repeats, totals are overstated.', method: 'compare every column of every row', affected: dupRows.length, rows: dupRows });

  // mixed types
  for (const c of columns) {
    if (c.type !== 'number' && c.type !== 'date') continue;
    const bad = cells.map((r, i) => { const v = r[c.index]; if (!v.trim()) return 0; const ok = isBlank(v) || (c.type === 'number' ? parseNumber(v, c.decimalComma) !== null : parseDate(v, c.dates?.order) !== null); return ok ? 0 : i + 2; }).filter(Boolean);
    if (bad.length) {
      const ex = cells[bad[0] - 2][c.index];
      add({ id: `mixed-${c.index}`, severity: 'MEDIUM', title: `${plural(bad.length, 'value')} in “${c.name}” ${bad.length === 1 ? 'isn’t a' : 'aren’t'} ${c.type === 'number' ? (bad.length === 1 ? 'number' : 'numbers') : (bad.length === 1 ? 'date' : 'dates')}`, detail: `For example “${ex.slice(0, 40)}”. They are left out of totals and trends.`, method: `try to read each non-blank cell as a ${c.type}`, affected: bad.length, rows: bad });
    }
  }

  // category spelling variants
  for (const c of columns) {
    if (c.role !== 'dimension' || c.type !== 'text') continue;
    const groups = new Map<string, Set<string>>();
    cells.forEach(r => { const v = r[c.index]; if (isBlank(v)) return; const k = v.trim().toLowerCase().replace(/\s+/g, ' '); const g = groups.get(k) ?? new Set(); g.add(v); groups.set(k, g); });
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
    // placeholder numbers (9999, 999999, -999) typed where a value was unknown
    const ph = vals.filter(x => Number.isInteger(x.v) && /^-?9{4,}$|^-99{2,}$/.test(String(x.v)) && Math.abs(x.v) >= Math.abs(med) * 10);
    if (ph.length >= 2) {
      outlierRows.set(c.index, new Set(ph.map(x => x.row)));
      add({ id: `placeholder-${c.index}`, severity: 'MEDIUM', title: `${plural(ph.length, 'value')} in “${c.name}” ${ph.length === 1 ? 'looks' : 'look'} like ${ph.length === 1 ? 'a placeholder' : 'placeholders'} (${ph[0].v.toLocaleString('en-US')})`, detail: 'Numbers like 9999999 or −999 are often typed when the real value is unknown. They are left out of totals and trends.', method: 'whole numbers made only of 9s (or −99…), at least 10× the typical value', affected: ph.length, rows: ph.map(x => x.row) });
    }
    const phRows = new Set(ph.length >= 2 ? ph.map(x => x.row) : []);
    const rest = vals.filter(x => !phRows.has(x.row));
    // money and counts are often skewed (a few genuinely large values), so judge skewed all-positive columns
    // on a ratio scale: only values orders of magnitude away (typos like ×1000) count as extreme.
    // Evenly spread columns are judged on the plain scale, where the low end isn't stretched out.
    const sorted = rest.map(x => x.v).sort((a, b) => a - b);
    const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
    const positive = rest.every(x => x.v > 0) && q(0.9) / q(0.5) > 3;
    const f = positive ? (v: number) => Math.log10(v) : (v: number) => v;
    const fm = median(rest.map(x => f(x.v)));
    const mad = median(rest.map(x => Math.abs(f(x.v) - fm)));
    if (!mad) continue;
    const out = rest.filter(x => Math.abs(f(x.v) - fm) / (1.4826 * mad) > (positive ? 6 : 10));
    if (out.length && out.length <= rest.length * 0.02) {
      outlierRows.set(c.index, new Set([...(outlierRows.get(c.index) ?? []), ...out.map(x => x.row)]));
      const top = [...out].sort((a, b) => Math.abs(b.v - med) - Math.abs(a.v - med))[0];
      add({ id: `outliers-${c.index}`, severity: 'LOW', title: `${plural(out.length, 'extreme value')} in “${c.name}”`, detail: `Far from the typical value of ${fmt(r2(med))}; the largest is ${fmt(top.v)} (line ${lineOf(top.row)}). Worth checking before using totals.`, method: positive ? 'more than 6 robust standard deviations from the median on a log scale (values orders of magnitude off)' : 'more than 10 robust standard deviations (median absolute deviation) from the median', affected: out.length, rows: out.map(x => x.row) });
    }
  }

  // repeated values in a column that is otherwise unique (a likely key); full duplicate rows are already counted above
  const dupSet = new Set(dupRows);
  for (const c of columns) {
    if (c.role !== 'identifier' || c.distinct === c.filled || c.distinct / c.filled < 0.95) continue;
    const firstSeen = new Set<string>(); const rows: number[] = [];
    cells.forEach((r, i) => { if (dupSet.has(i + 2)) return; const v = r[c.index].trim(); if (isBlank(v)) return; if (firstSeen.has(v)) rows.push(i + 2); else firstSeen.add(v); });
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
    const ts = cells.map(r => parseDate(r[c.index], c.dates!.order));
    const future = ts.filter(t => t !== null && t > today + 2 * DAY).length;
    const schedule = future > 0 && future >= c.filled * 0.1;   // mostly-future columns are due dates, maturities, forecasts
    const floor = c.dates.order === 'Y' ? Date.UTC(1000, 0, 1) : Date.UTC(1900, 0, 1);
    const rows = ts.map((t, i) => (t !== null && (t < floor || (!schedule && t > today + 2 * DAY)) ? i + 2 : 0)).filter(Boolean);
    badDateRows.set(c.index, new Set(rows));
    if (rows.length) add({ id: `dates-${c.index}`, severity: 'LOW', title: `${plural(rows.length, 'date')} in “${c.name}” ${rows.length === 1 ? 'is' : 'are'} ${schedule ? 'before 1900' : 'in the future or before 1900'}`, detail: 'Possibly placeholders or typos.', method: schedule ? 'dates before 1 Jan 1900 (this column is mostly future dates, so it is treated as a schedule)' : 'dates after today or before 1 Jan 1900', affected: rows.length, rows });
  }

  const sevRank = { HIGH: 0, MEDIUM: 1, LOW: 2, OK: 3 } as const;
  checks.sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || b.affected - a.affected);
  if (!dupRows.length && width >= 2) checks.push({ id: 'ok-dups', severity: 'OK', title: 'No duplicate rows', detail: 'Every row differs from the others in at least one column.', method: 'compare every column of every row', affected: 0, rows: [] });
  if (!ragged.length && !shortRows.length) checks.push({ id: 'ok-shape', severity: 'OK', title: 'Every row has the same shape', detail: `All rows have ${fullWidth} fields, like the header.`, method: 'count fields per row vs the header', affected: 0, rows: [] });

  // ── trend: first well-filled date column × best measure (or row count)
  const dateCol = columns.find(c => c.role === 'date' && c.filled >= N * 0.8 && c.dates && c.dates.max > c.dates.min);
  const measures = columns.filter(c => c.role === 'measure');
  // Amounts and quantities can be added up; levels (prices, rates, balances, temperatures, percentages) can only be averaged.
  const lname = (c: OwnColumn) => c.name.toLowerCase();
  const isLevel = (c: OwnColumn) => LEVELQ.test(lname(c)) || !!c.percent;
  const oneRowPerDate = !!dateCol && dateCol.distinct >= dateCol.filled * 0.98;
  let measure: OwnColumn | undefined;
  for (const re of MONEY_ORDER) { measure = measures.find(c => re.test(lname(c)) && !isLevel(c)); if (measure) break; }
  measure ??= measures.find(c => QTY.test(lname(c)) && !isLevel(c));
  let mAgg: 'sum' | 'avg' | 'count' = measure ? 'sum' : 'count';
  if (!measure) {
    measure = measures.find(isLevel);
    if (measure) mAgg = 'avg';
    else {
      // the name doesn't say: with up to three named number columns, use the first (added up, or averaged when there's
      // one row per date); the Understand step states this assumption. Many anonymous columns (sensor or scientific data,
      // or a file with no header) have no obvious headline, so rows are counted instead.
      const named = measures.length <= 3 ? measures : measures.filter(c => !/^column \d+$/i.test(c.name));
      if (named.length && named.length <= 3) { measure = named[0]; mAgg = oneRowPerDate ? 'avg' : 'sum'; }
    }
  }
  // percentages keep their precision and format (0.0312 → 3.12%) and change in percentage points
  const isPct = !!measure?.percent;
  const rv = (x: number) => (isPct ? Math.round(x * 1e6) / 1e6 : r2(x));
  const F = fmtFor(isPct);
  let trend: OwnTrend | undefined;
  const skip = new Set<number>([...((measure && outlierRows.get(measure.index)) || []), ...((dateCol && badDateRows.get(dateCol.index)) || [])]);
  const nOut = (measure && outlierRows.get(measure.index)?.size) || 0, nBad = (dateCol && badDateRows.get(dateCol.index)?.size) || 0;
  const leftOut = [nOut ? `${nOut.toLocaleString('en-US')} extreme value${nOut > 1 ? 's' : ''}` : '', nBad ? `${nBad.toLocaleString('en-US')} out-of-range date${nBad > 1 ? 's' : ''}` : ''].filter(Boolean).join(' and ');
  const skipNote = leftOut ? ` ${leftOut} left out (see the checks).` : '';
  if (dateCol && dateCol.dates) {
    const span = (dateCol.dates.max - dateCol.dates.min) / DAY;
    const GRAINS: Grain[] = ['day', 'week', 'month', 'quarter', 'year'];
    const usable = cells.map((r, i) => (skip.has(i + 2) ? null : parseDate(r[dateCol.index], dateCol.dates!.order))).filter((t): t is number => t !== null);
    // start from the natural grain; if most periods would be empty, step up (day → week → month → quarter → year)
    let gi = span <= 45 ? 0 : span <= 400 ? 1 : span <= 365 * 12 ? 2 : 4;
    while (gi < 4) {
      const g = GRAINS[gi]; const used = new Set(usable.map(t => bucketOf(g, t))).size;
      const periods = g === 'day' ? span + 1 : g === 'week' ? span / 7 + 1 : g === 'month' ? span / 30.4 + 1 : g === 'quarter' ? span / 91.3 + 1 : span / 365 + 1;
      if (used >= periods * 0.5) break; gi++;
    }
    const grain = GRAINS[gi];
    const bucket = (t: number) => bucketOf(grain, t);
    const sums = new Map<number, number>(), counts = new Map<number, number>();
    cells.forEach((r, i) => {
      if (skip.has(i + 2)) return;
      const t = parseDate(r[dateCol.index], dateCol.dates!.order); if (t === null) return;
      const v = measure ? parseNumber(r[measure.index], measure.decimalComma) : 1; if (v === null) return;
      const b = bucket(t); sums.set(b, (sums.get(b) ?? 0) + v); counts.set(b, (counts.get(b) ?? 0) + 1);
    });
    const keys = [...sums.keys()].sort((a, b) => a - b);
    // one row per period with nothing to add up would draw a flat line of 1s
    if (keys.length >= 3 && !(mAgg === 'count' && oneRowPerDate)) {
      // fill gaps so the line is honest about empty periods
      const filled: number[] = [];
      for (let k = keys[0]; k <= keys[keys.length - 1];) {
        filled.push(k);
        k = nextBucket(grain, k);
        if (filled.length > 2000) break;
      }
      const val = (t: number) => (mAgg === 'avg' ? (counts.get(t) ? (sums.get(t) ?? 0) / counts.get(t)! : 0) : sums.get(t) ?? 0);
      const points = filled.map(t => ({ t, v: rv(val(t)), label: periodLabel(grain, t) }));
      const last = points[points.length - 1];
      const end = nextBucket(grain, last.t);
      const partialLast = grain !== 'day' && dateCol.dates.max < end - DAY;
      const cmp = partialLast ? points.slice(0, -1) : points;
      const agg: OwnTrend['agg'] = mAgg;
      const what = measure ? (mAgg === 'avg' ? `Average ${measure.name}` : measure.name) : 'Rows';
      let statement = '', change: number | undefined, changeText: string | undefined;
      if (cmp.length >= 2) {
        const a = cmp[cmp.length - 2], b = cmp[cmp.length - 1];
        const per = grain;
        if (!counts.get(b.t)) statement = `The latest full ${per} (${b.label}) has no rows.`;
        else if (isPct && counts.get(a.t)) { change = b.v - a.v; changeText = pp(change); statement = `${what} in the latest full ${per} (${b.label}): ${F(b.v)}, ${changeText} vs the ${per} before.`; }
        else if (a.v !== 0 && counts.get(a.t)) { change = (b.v - a.v) / Math.abs(a.v); statement = `${what} in the latest full ${per} (${b.label}): ${fmt(b.v)}, ${pct(change)} vs the ${per} before.`; }
        else statement = `${what} in the latest full ${per} (${b.label}): ${F(b.v)}.`;
        if (partialLast) statement += ` The last ${per} is partial, so it is left out of the comparison.`;
        statement += skipNote;
      }
      trend = { date: dateCol.name, measure: what, agg, grain, points, partialLast, statement, change, changeText };
    }
  }

  // ── movers: the dimension whose values shifted most between the two halves of the date range
  let movers: OwnMovers | undefined;
  // only dimensions whose values repeat enough to group by (a file of 3 unique names has nothing to compare)
  const dims = N < 10 ? [] : columns.filter(c => c.role === 'dimension' && c.distinct >= 2 && c.distinct <= 40 && c.distinct <= c.filled / 3).sort((a, b) => a.distinct - b.distinct);
  const dim = dims.find(c => c.distinct >= 3) ?? dims[0];
  const mm = mAgg === 'sum' ? measure : undefined;   // only amounts and row counts can be compared by adding up
  if (dim && !(measure && mAgg === 'avg')) {
    const what = mm ? mm.name : 'Rows';
    const agg: OwnMovers['agg'] = mm ? 'sum' : 'count';
    if (dateCol && dateCol.dates && trend) {
      // split on a whole day: the first half is every day before `mid`
      const mid = Math.floor((dateCol.dates.min + (dateCol.dates.max - dateCol.dates.min) / 2) / DAY) * DAY + DAY;
      const A = new Map<string, number>(), B = new Map<string, number>();
      cells.forEach((r, i) => {
        if (skip.has(i + 2)) return;
        const t = parseDate(r[dateCol.index], dateCol.dates!.order); const k = r[dim.index].trim(); if (t === null || isBlank(k)) return;
        const v = mm ? parseNumber(r[mm.index], mm.decimalComma) : 1; if (v === null) return;
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
      cells.forEach((r, i) => { if (skip.has(i + 2)) return; const v = mm ? parseNumber(r[mm.index], mm.decimalComma) : 1; if (v === null) return; total += v; const k = r[dim.index].trim(); if (isBlank(k)) return; S.set(k, (S.get(k) ?? 0) + v); });
      const items = [...S.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([value, b]) => ({ value, a: 0, b: r2(b), delta: r2(b) }));
      if (items.length && total) movers = { dimension: dim.name, measure: what, agg, mode: 'share', items, statement: `By ${dim.name}, “${items[0].value}” ${mm ? 'is the largest' : 'is the most common'}: ${fmt(items[0].b)}${mm ? '' : ` ${items[0].b === 1 ? 'row' : 'rows'}`} (${Math.round((items[0].b / total) * 100)}% of ${mm ? 'the total' : 'rows'}).` };
    }
  }

  // ── dashboard: KPI tiles, breakdowns by up to three dimensions, and a short list of things to know
  const flagged = new Set<number>();
  // blanks and short rows are often legitimate (a series that starts later, an optional field), so they don't lower the score
  const soft = (c: OwnCheck) => c.id.startsWith('blank-') || c.id === 'short' || (c.id === 'dups' && c.severity === 'LOW');
  for (const c of checks) if (c.severity !== 'OK' && !soft(c)) for (const r of c.rows) flagged.add(r);
  const softN = checks.filter(c => c.severity !== 'OK' && soft(c)).length;
  const quality = N ? 1 - flagged.size / N : 1;
  const breakdowns: OwnBreakdown[] = [];
  const bAgg: OwnBreakdown['agg'] = measure ? mAgg : 'count';
  const bWhat = measure ? measure.name : 'Rows';
  const half = dateCol && dateCol.dates && trend ? Math.floor((dateCol.dates.min + (dateCol.dates.max - dateCol.dates.min) / 2) / DAY) * DAY + DAY : null;
  // categories to split by: the regular dimensions first, then (if there's room) a long-tail column such as Customer,
  // shown as its top 8 plus "N more"
  const longTail = N < 30 ? [] : columns.filter(c => c.type === 'text' && (c.role === 'identifier' || c.role === 'dimension') && !dims.includes(c) && c.distinct > 8 && c.distinct <= c.filled * 0.7 && c.filled >= N * 0.5 && !/(^|[^a-z])(id|key|code|uuid|guid|sku|lei|isin|cusip)([^a-z]|$)|#$/.test(c.name.toLowerCase()));
  const bdCols = [...dims.slice().sort((x, y) => (x === dim ? -1 : y === dim ? 1 : x.distinct - y.distinct)).slice(0, 3), ...longTail].slice(0, 3);
  for (const d of bdCols) {
    const S = new Map<string, { s: number; n: number; a: number; b: number; an: number; bn: number; rows: number }>();
    cells.forEach((r, i) => {
      const k = (r[d.index] ?? '').trim(); if (isBlank(k)) return;
      const e = S.get(k) ?? { s: 0, n: 0, a: 0, b: 0, an: 0, bn: 0, rows: 0 }; S.set(k, e); e.rows++;
      if (skip.has(i + 2)) return;
      const v = measure ? parseNumber(r[measure.index], measure.decimalComma) : 1; if (v === null) return;
      e.s += v; e.n++;
      if (half !== null && dateCol) { const t = parseDate(r[dateCol.index], dateCol.dates!.order); if (t !== null) { if (t < half) { e.a += v; e.an++; } else { e.b += v; e.bn++; } } }
    });
    const val = (s: number, n: number) => (bAgg === 'avg' ? (n ? s / n : 0) : s);
    const all = [...S.entries()].map(([value, e]) => {
      const a = val(e.a, e.an), b = val(e.b, e.bn);
      return { value, v: rv(val(e.s, e.n)), rows: e.rows, change: half !== null && e.an && e.bn && (isPct || a !== 0) ? (isPct ? b - a : (b - a) / Math.abs(a)) : undefined };
    }).sort((x, y) => y.v - x.v || y.rows - x.rows);
    const items = all.slice(0, 8), rest = all.slice(8);
    if (items.length >= 2) breakdowns.push({ dimension: d.name, col: d.index, agg: bAgg, measure: bWhat, halves: half !== null, items, others: bAgg === 'avg' ? 0 : r2(rest.reduce((t, x) => t + x.v, 0)), otherCount: rest.length });
  }

  const kpis: OwnKpi[] = [];
  let mixedScale: OwnBreakdown | undefined;
  if (mAgg === 'avg' && !isPct && measure?.num && measure.num.min > 0) mixedScale = breakdowns.find(b => { const v = b.items.map(x => Math.abs(x.v)).filter(x => x > 0); return v.length >= 2 && Math.max(...v) / Math.min(...v) > 10; });
  if (measure) {
    let s = 0, n = 0;
    cells.forEach((r, i) => { if (skip.has(i + 2)) return; const v = parseNumber(r[measure!.index], measure!.decimalComma); if (v !== null) { s += v; n++; } });
    kpis.push({ label: mAgg === 'avg' ? `Average ${measure.name}` : `Total ${measure.name}`, value: F(rv(mAgg === 'avg' ? (n ? s / n : 0) : s)), change: mixedScale ? undefined : trend?.change, changeText: mixedScale ? undefined : trend?.changeText, watch: !!mixedScale, sub: mixedScale ? `mixes ${mixedScale.dimension} values on very different scales; compare by ${mixedScale.dimension}` : trend?.change !== undefined ? `latest full ${trend.grain} vs the one before` : `across ${plural(n, 'row')}${nOut ? `, ${nOut} extreme left out` : ''}` });
  }
  kpis.push({ label: 'Rows', value: N.toLocaleString('en-US'), change: !measure ? trend?.change : undefined, sub: !measure && trend?.change !== undefined ? `latest full ${trend.grain} vs the one before` : `${width} column${width === 1 ? '' : 's'}` });
  if (dateCol?.dates) {
    const { min: d0, max: d1 } = dateCol.dates, long = d1 - d0 > 400 * DAY;
    const sameYear = new Date(d0).getUTCFullYear() === new Date(d1).getUTCFullYear();
    const monthly = cells.every(r => { const t = parseDate(r[dateCol.index], dateCol.dates!.order); return t === null || new Date(t).getUTCDate() === 1; });
    const period = dateCol.dates.order === 'Y' ? `${new Date(d0).getUTCFullYear()} – ${new Date(d1).getUTCFullYear()}` : long || monthly ? `${monthLabel(d0)} – ${monthLabel(d1)}` : `${sameYear ? dayLabel(d0).replace(/ \d{4}$/, '') : dayLabel(d0)} – ${dayLabel(d1)}`;
    kpis.push({ label: 'Period', value: period, sub: trend ? `${trend.points.length} ${trend.grain}s from “${dateCol.name}”` : `from “${dateCol.name}”` });
  }
  const main = breakdowns[0];
  if (main) {
    const c = columns[main.col], lead = main.items[0];
    const tot = main.items.reduce((t, x) => t + x.v, 0) + main.others;
    kpis.push({ label: c.name, value: `${c.distinct.toLocaleString('en-US')}`, sub: main.agg === 'avg' ? `distinct values · highest: ${lead.value}` : `distinct values · top: ${lead.value}${tot > 0 ? ` (${Math.round((lead.v / tot) * 100)}%)` : ''}` });
  }
  const nIssues = checks.filter(c => c.severity !== 'OK').length;
  kpis.push({ label: 'Data quality', value: `${(quality * 100).toFixed(quality > 0.999 && quality < 1 ? 2 : 1)}%`, watch: nIssues > 0, sub: nIssues ? `of rows pass the checks${softN ? ' (blanks not counted)' : ''} · ${plural(nIssues, 'issue')} to review` : 'no issues found' });

  const insights: OwnInsight[] = [];
  if (mixedScale) insights.push({ kind: 'SHARE', title: `Compare “${measure!.name}” within each ${mixedScale.dimension}`, text: `Its ${mixedScale.dimension} values sit on very different scales (${mixedScale.items.slice(0, 3).map(x => `${x.value} ≈ ${F(x.v)}`).join(', ')}), so the overall average and its trend mix them together.`, filter: { col: mixedScale.col, value: mixedScale.items[0].value } });
  if (trend?.statement && !mixedScale) insights.push({ kind: 'TREND', title: trend.change === undefined ? `${trend.measure} by ${trend.grain}` : `${trend.measure} ${trend.change >= 0 ? 'up' : 'down'} ${(trend.changeText ?? pct(trend.change)).replace(/^[+−]/, '')} in the latest ${trend.grain}`, text: trend.statement });
  if (movers) { const t = movers.items[0]; insights.push({ kind: movers.mode === 'halves' ? 'MOVER' : 'SHARE', title: movers.mode === 'halves' ? `“${t.value}” moved most by ${movers.dimension}` : `“${t.value}” leads by ${movers.dimension}`, text: movers.statement, filter: { col: columns.find(c => c.name === movers!.dimension)?.index ?? -1, value: t.value } }); }
  for (const b of breakdowns.slice(movers ? 1 : 0, 3)) {
    const t = b.items[0]; if (b.agg === 'avg') continue;
    const tot = b.items.reduce((s, x) => s + x.v, 0) + b.others; if (!tot) continue;
    insights.push({ kind: 'SHARE', title: `“${t.value}” is the largest ${b.dimension}`, text: `${F(t.v)}${b.agg === 'count' ? ` ${t.v === 1 ? 'row' : 'rows'}` : ` ${b.measure}`}, ${Math.round((t.v / tot) * 100)}% of the total across ${plural(b.items.length + b.otherCount, 'value')}.`, filter: { col: b.col, value: t.value } });
  }

  for (const c of checks.filter(c => c.severity !== 'OK').sort((x, y) => sevRank[x.severity] - sevRank[y.severity]).slice(0, 4)) insights.push({ kind: 'ISSUE', title: c.title, text: c.detail, severity: c.severity, check: c.id });
  const dash: OwnDash = { kpis, breakdowns, insights, quality, flaggedRows: flagged.size, ctx: { measure: measure?.index, measureName: bWhat, decimalComma: measure?.decimalComma, percent: isPct || undefined, mixedBy: mixedScale?.dimension, agg: bAgg, date: dateCol?.dates ? dateCol.index : undefined, order: dateCol?.dates?.order, excluded: [...skip].sort((x, y) => x - y) } };

  // ── plain facts
  const byRole = (r: ColRole) => columns.filter(c => c.role === r).length;
  const facts = [
    `${N.toLocaleString('en-US')} row${N === 1 ? '' : 's'} and ${width} column${width === 1 ? '' : 's'}${truncated ? ` (only the first ${LIMITS.rows.toLocaleString('en-US')} rows were read)` : ''}${colsTruncated ? ` (only the first ${LIMITS.cols} of ${fullWidth} columns were analysed)` : ''}.`,
    `${byRole('measure')} measure${byRole('measure') === 1 ? '' : 's'}, ${byRole('dimension')} dimension${byRole('dimension') === 1 ? '' : 's'}, ${byRole('date')} date column${byRole('date') === 1 ? '' : 's'}, ${byRole('identifier')} identifier${byRole('identifier') === 1 ? '' : 's'}.`,
  ];
  const read: string[] = [];
  if (skippedTop) read.push(`skipped ${plural(skippedTop, 'title line')} above the header`);
  if (headerless) read.push('found no header row, so named the columns Column 1, 2, …');
  if (footerDropped) read.push(`left out ${plural(footerDropped, 'footer line')} under the data`);
  if (totalRowDropped) read.push('left out the “Total” row at the bottom');
  if (encoding !== 'UTF-8') read.push(`read it as ${encoding} text`);
  if (delimiter === ' ') read.push('split columns on spaces');
  if (read.length) facts.splice(1, 0, `To read this file it ${read.join(', ')}.`);
  const issues = checks.filter(c => c.severity !== 'OK');
  facts.push(issues.length ? `${issues.length} data-quality issue${issues.length > 1 ? 's' : ''} to review; the biggest: ${issues[0].title.charAt(0).toLowerCase()}${issues[0].title.slice(1)}.` : 'No data-quality issues found by these checks.');
  if (trend?.statement) facts.push(trend.statement);
  if (movers) facts.push(movers.statement);

  return { file: { name, bytes, rows: N, cols: width, delimiter, truncated, colsTruncated, encoding, lineOffset, skippedTop, headerless, totalRowDropped }, columns, checks, trend, movers, facts, dash, header, cells };
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
      if (r() < 0.004) amt = 'TBD';                            // text in a number column
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
export function analyseAsync(name: string, bytes: number, text: string, encoding = 'UTF-8'): Promise<OwnAnalysis> {
  const url = typeof __OWN_WORKER__ === 'string' ? __OWN_WORKER__ : '';
  if (!url || typeof Worker === 'undefined') return new Promise((res, rej) => setTimeout(() => { try { res(analyse(name, bytes, text, encoding)); } catch (e) { rej(e); } }, 30));
  return new Promise((res, rej) => {
    const w = new Worker(url);
    w.onmessage = (e: MessageEvent<{ ok: boolean; a?: OwnAnalysis; error?: string }>) => { w.terminate(); if (e.data.ok && e.data.a) res(e.data.a); else rej(new Error(e.data.error || 'Could not read the file.')); };
    w.onerror = () => { w.terminate(); try { res(analyse(name, bytes, text, encoding)); } catch (e) { rej(e); } };
    w.postMessage({ name, bytes, text, encoding });
  });
}
