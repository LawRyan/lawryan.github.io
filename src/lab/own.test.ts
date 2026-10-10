// Independent checks for the "own file" profiler. Figures are recomputed from the raw text
// with simple string handling, not the engine's helpers.
import { analyse, decode, parseDelimited, parseNumber, parseDate, dateOrder, sniffDelimiter, sampleCsv } from './own';

let checks = 0, failures = 0;
const ok = (c: boolean, m: string) => { checks++; if (!c) { failures++; console.error('FAIL', m); } };
const eq = (a: unknown, b: unknown, m: string) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);

// ── numbers
eq(parseNumber('1,234.50'), 1234.5, 'thousands + decimals');
eq(parseNumber('$1,234'), 1234, 'currency');
eq(parseNumber('(12.5)'), -12.5, 'parentheses negative');
eq(parseNumber('−3'), -3, 'unicode minus');
eq(parseNumber('45%'), 0.45, 'percent');
eq(parseNumber('12,5', true), 12.5, 'decimal comma');
eq(parseNumber('1.234,5', true), 1234.5, 'decimal comma with thousands');
eq(parseNumber('n/a'), null, 'text is not a number');
eq(parseNumber('12a'), null, 'trailing junk');
eq(parseNumber('1,23'), null, 'bad grouping');

// ── dates
eq(parseDate('2026-02-13'), Date.UTC(2026, 1, 13), 'ISO date');
eq(parseDate('2026-02-13T10:30:00Z'), Date.UTC(2026, 1, 13), 'ISO date-time');
eq(parseDate('13/02/2026', 'DMY'), Date.UTC(2026, 1, 13), 'day-first');
eq(parseDate('02/13/2026', 'MDY'), Date.UTC(2026, 1, 13), 'month-first');
eq(parseDate('13 Feb 2026'), Date.UTC(2026, 1, 13), 'day month-name year');
eq(parseDate('Feb 13, 2026'), Date.UTC(2026, 1, 13), 'month-name day, year');
eq(parseDate('2026-02-30'), null, 'impossible date');
eq(dateOrder(['13/02/2026', '01/03/2026']).order, 'DMY', 'detect day-first');
eq(dateOrder(['02/13/2026']).order, 'MDY', 'detect month-first');
ok(dateOrder(['01/02/2026']).ambiguous, 'flag ambiguous order');

// ── parsing
eq(sniffDelimiter('a;b;c\n1;2;3'), ';', 'sniff semicolon');
eq(sniffDelimiter('a\tb\n1\t2'), '\t', 'sniff tab');
eq(sniffDelimiter('a,b\n"x,y",2'), ',', 'sniff comma with quoted comma');
eq(parseDelimited('﻿a,b\r\n"x, ""y""",2\r\n"line\nbreak",3\r\n').rows, [['a', 'b'], ['x, "y"', '2'], ['line\nbreak', '3']], 'quotes, BOM, CRLF, embedded newline');
eq(parseDelimited('a,b\n1,2\n\n').rows.length, 2, 'blank trailing lines dropped');

// ── errors
let threw = false; try { analyse('x.csv', 0, ''); } catch { threw = true; } ok(threw, 'empty file rejected');
threw = false; try { analyse('x.csv', 3, 'a,b\n'); } catch { threw = true; } ok(threw, 'header-only file rejected');

// ── ragged rows, blanks, duplicate header names
{
  const a = analyse('r.csv', 0, 'id,v,v\n1,2,3\n2,3\n3,4,5,6\n');
  eq(a.header, ['id', 'v', 'v (2)'], 'duplicate header names made unique');
  eq(a.checks.find(c => c.id === 'ragged')?.rows, [4], 'long rows reported with line numbers');
  eq(a.checks.find(c => c.id === 'short')?.rows, [3], 'short rows reported separately');
}

// ── day-first file with a semicolon delimiter and decimal commas
{
  const t = 'Date;Region;Sales\n13/01/2026;North;1.200,50\n14/01/2026;South;800\n20/01/2026;North;950,25\n03/02/2026;South;1.000\n';
  const a = analyse('eu.csv', t.length, t);
  const d = a.columns.find(c => c.name === 'Date')!;
  eq([d.type, d.dates?.order], ['date', 'DMY'], 'day-first date column');
  const s = a.columns.find(c => c.name === 'Sales')!;
  eq([s.type, s.num?.sum], ['number', 1200.5 + 800 + 950.25 + 1000], 'decimal-comma measure summed');
}

// ── the messy sample, recomputed independently
const text = sampleCsv();
const a = analyse('sample.csv', text.length, text);
const lines = text.trim().split('\n');
const rows = lines.slice(1).map(l => l.split(','));
eq(a.file.rows, rows.length, 'row count');
eq(a.file.cols, 6, 'column count');

const role = (n: string) => a.columns.find(c => c.name === n)?.role;
eq([role('Order ID'), role('Order Date'), role('Region'), role('Product'), role('Units'), role('Amount ($)')], ['identifier', 'date', 'dimension', 'dimension', 'measure', 'measure'], 'roles');

// duplicates: lines identical to an earlier line
const seen = new Set<string>(); let dups = 0; for (const l of lines.slice(1)) { if (seen.has(l)) dups++; else seen.add(l); }
eq(a.checks.find(c => c.id === 'dups')?.affected ?? 0, dups, 'duplicate rows');
ok(dups > 0, 'sample has planted duplicates');

// blanks and text in the amount column
const blanks = rows.filter(r => r[5] === '').length;
const amt = a.columns.find(c => c.name === 'Amount ($)')!;
eq(a.checks.find(c => c.id === `blank-${amt.index}`)?.affected ?? 0, blanks, 'blank amounts');
const textVals = rows.filter(r => r[5] !== '' && !/^\d+(\.\d+)?$/.test(r[5])).length;
eq(a.checks.find(c => c.id === `mixed-${amt.index}`)?.affected ?? 0, textVals, 'non-numeric amounts');

// spelling variants in Region (upper-case copies)
const upper = rows.filter(r => r[2] === r[2].toUpperCase()).length;
const reg = a.columns.find(c => c.name === 'Region')!;
const variants = a.checks.find(c => c.id === `variants-${reg.index}`);
ok(!!variants && upper > 0, 'region spelling variants found');
eq(new Set(variants!.rows.map(n => rows[n - 2][2])).size <= 4 && variants!.rows.every(n => rows[n - 2][2] === rows[n - 2][2].toUpperCase()), true, 'variant rows are the upper-case copies');

// outliers: the fat-finger amounts (×1000)
const out = a.checks.find(c => c.id === `outliers-${amt.index}`);
ok(!!out && out.rows.every(n => Number(rows[n - 2][5]) > 5000), 'outliers are the ×1000 amounts');

// trend total = sum of numeric amounts, minus the flagged extreme values
const outRows = new Set(out?.rows ?? []);
const total = rows.reduce((s, r, i) => s + (/^\d+(\.\d+)?$/.test(r[5]) && !outRows.has(i + 2) ? Number(r[5]) : 0), 0);
const tsum = a.trend!.points.reduce((s, p) => s + p.v, 0);
ok(Math.abs(tsum - total) < 0.5, `trend sums to the file total: ${tsum} vs ${total}`);
eq([a.trend!.grain, a.trend!.measure], ['week', 'Amount ($)'], 'weekly trend of the amount');
ok(a.trend!.statement.includes('left out'), 'trend says extreme values were left out');

// movers: Gizmos price rises late in the period, so it should move most by product
eq([a.movers?.dimension, a.movers?.items[0].value], ['Product', 'Gizmos'], 'planted Gizmos story found');
const mid = (Date.UTC(2026, 0, 1) + Date.UTC(2026, 0, 1) + 179 * 86_400_000) / 2;
let ga = 0, gb = 0;
for (const [i, r] of rows.entries()) { if (r[3] !== 'Gizmos' || !/^\d+(\.\d+)?$/.test(r[5]) || outRows.has(i + 2)) continue; const t = Date.parse(r[1] + 'T00:00:00Z'); if (t < mid) ga += Number(r[5]); else gb += Number(r[5]); }
ok(Math.abs(a.movers!.items[0].delta - (gb - ga)) < 0.5, `Gizmos change recomputed: ${a.movers!.items[0].delta} vs ${gb - ga}`);

// ── review fixes
const DAYMS = 86_400_000;
{ // a far-future typo must not take over the trend or the comparison
  const lines = ['Date,Group,Amount'];
  for (let d = 0; d < 120; d++) lines.push(`${new Date(Date.UTC(2026, 0, 1) + d * DAYMS).toISOString().slice(0, 10)},${['A1', 'A2', 'A3'][d % 3]},${100 + (d % 7)}`);
  lines.push('2206-01-15,A2,500');
  const t = lines.join('\n'); const r = analyse('typo.csv', t.length, t);
  ok(!!r.trend && r.trend.points[r.trend.points.length - 1].t < Date.UTC(2026, 5, 1), 'future typo kept out of the trend');
  ok(/out-of-range date/.test(r.trend!.statement), 'trend says the out-of-range date was left out');
  ok(!r.movers || !/2116|2206/.test(r.movers.statement), 'future typo kept out of the comparison');
  ok(!/: 0\b/.test(r.trend!.statement), 'no zero "latest period" from gap filling');
}
{ // sorted day-first file: early values have day <= 12
  const lines = ['When,Amount'];
  for (let d = 1; d <= 31; d++) for (let k = 0; k < 200; k++) lines.push(`${String(d).padStart(2, '0')}/01/2026,${k + 1}`);
  const t = lines.join('\n'); const r = analyse('dmy.csv', t.length, t);
  const c = r.columns.find(c => c.name === 'When')!;
  eq([c.type, c.dates?.order], ['date', 'DMY'], 'day-first detected across the whole column');
}
{ // mixed date orders are flagged
  const t = 'D,V\n13/01/2026,1\n01/14/2026,2\n02/02/2026,3\n'; const r = analyse('mix.csv', t.length, t);
  ok(r.checks.some(c => c.id.startsWith('order-')), 'mixed day/month order flagged');
}
{ // semicolon file with dot decimals
  const t = 'Item;Price\na;12.50\nb;3.75\nc;1,234.00\nd;8.10\n'; const r = analyse('dot.csv', t.length, t);
  const c = r.columns.find(c => c.name === 'Price')!;
  eq([c.type, c.num?.sum], ['number', 12.5 + 3.75 + 1234 + 8.1], 'semicolon file with dot decimals');
}
{ // a foreign key repeats legitimately: no "duplicate ID" issue
  const lines = ['Trade ID,Client ID,Amount']; for (let i = 0; i < 300; i++) lines.push(`T${i},C${i % 20},${10 + (i % 9)}`);
  const t = lines.join('\n'); const r = analyse('fk.csv', t.length, t);
  ok(!r.checks.some(c => c.id.startsWith('dupid-')), 'foreign key not flagged as duplicate IDs');
}
{ // full duplicate rows are not double-counted as repeated IDs
  ok(!a.checks.some(c => c.id.startsWith('dupid-')), 'sample: duplicate rows not double-counted');
}
{ // halves label: 1–31 Jan splits after 16 Jan; label says "to 15 Jan" and 16 Jan is in the second half
  const lines = ['Date,G,Amount']; for (let d = 1; d <= 31; d++) for (const g of ['x', 'y', 'z']) lines.push(`2026-01-${String(d).padStart(2, '0')},${g},${g === 'x' && d >= 16 ? 10 : 1}`);
  const t = lines.join('\n'); const r = analyse('half.csv', t.length, t);
  ok(/to 16 Jan 2026/.test(r.movers!.statement) || /to 15 Jan 2026/.test(r.movers!.statement), 'halves label is a whole day');
  const x = r.movers!.items.find(i => i.value === 'x')!;
  const firstDays = /to 16 Jan/.test(r.movers!.statement) ? 16 : 15;
  eq(x.a, firstDays >= 16 ? 15 + 10 : 15, 'first-half total matches the label');
}
{ // truncation flag ignores trailing blank lines
  const body = Array.from({ length: 5 }, (_, i) => `${i}`).join('\n');
  eq(parseDelimited('v\n' + body + '\n\n\n', ',', 6).truncated, false, 'trailing blank lines are not truncation');
  eq(parseDelimited('v\n' + body + '\n6\n', ',', 6).truncated, true, 'real truncation flagged');
}
{ // duplicate headers stay unique
  const r = analyse('h.csv', 0, 'Name,name,Name (2),Name\n1,2,3,4\n');
  eq(new Set(r.header.map(h => h.toLowerCase())).size, 4, 'duplicate header names made unique');
}
{ // two-digit years
  eq(new Date(parseDate('5/1/99')!).getUTCFullYear(), 1999, '99 is 1999');
  eq(new Date(parseDate('5/1/26')!).getUTCFullYear(), 2026, '26 is 2026');
}
{ // very wide files are capped
  const w = 400; const t = Array.from({ length: w }, (_, i) => `c${i}`).join(',') + '\n' + Array.from({ length: w }, (_, i) => i).join(',') + '\n';
  const r = analyse('wide.csv', t.length, t);
  eq([r.columns.length, r.file.colsTruncated], [200, 200], 'columns capped at 200');
  ok(/first 200 of 400 columns/.test(r.facts[0]), 'cap is stated');
}

// ── real-world file shapes
{ const t = 'Trade Blotter Extract\nGenerated 2026-09-25\n\nDate,Desk,Revenue\n2026-01-01,A,10\n2026-01-02,B,12\n2026-01-03,A,9\n';
  const r = analyse('t.csv', t.length, t); eq([r.header, r.file.skippedTop], [['Date', 'Desk', 'Revenue'], 2], 'title lines above the header skipped (blank lines aside)'); }
{ const t = '# source: somewhere\nDate,X\n2026-01-01,1\n2026-01-02,2\n'; eq(analyse('c.csv', t.length, t).header, ['Date', 'X'], '# comment line skipped'); }
{ const t = '1.5,2,3\n4.5,5,6\n7.5,8,9\n'; const r = analyse('h.csv', t.length, t); eq([r.file.headerless, r.header, r.file.rows], [true, ['Column 1', 'Column 2', 'Column 3'], 3], 'headerless file'); }
{ const t = 'Item,Amount\na,1\nb,2\nc,3\nd,4\nTotal,10\n'; const r = analyse('tot.csv', t.length, t); ok(!r.file.totalRowDropped && r.file.rows === 5, 'Total row with no blanks is kept (could be a real row)'); }
{ const t = 'Item,Cat,Amount\na,x,1\nb,y,2\nc,x,3\nd,y,4\n,Total,10\n'; const r = analyse('tot2.csv', t.length, t); eq([r.file.totalRowDropped, r.file.rows], [true, 4], 'trailing Total row dropped'); }
{ const t = 'a b c\n1 2 3\n4  5 6\n7 8   9\n'; const r = analyse('sp.txt', t.length, t); eq([r.file.cols, r.file.rows], [3, 3], 'space-separated columns'); }
{ const enc = new TextEncoder();
  const u16 = new Uint8Array([0xff, 0xfe, ...[...'a\tb\n1\t2\n'].flatMap(ch => [ch.charCodeAt(0), 0])]);
  eq(decode(u16), { text: 'a\tb\n1\t2\n', encoding: 'UTF-16' }, 'UTF-16 LE decoded by BOM');
  eq(decode(new Uint8Array([0x4d, 0xfc, 0x6e])).text, 'Mün', 'Windows-1252 fallback for invalid UTF-8');
  eq(decode(enc.encode('Zürich')).encoding, 'UTF-8', 'valid UTF-8 kept'); }
eq(parseDate('19-Sep-03'), Date.UTC(2003, 8, 19), 'd-Mon-yy dates');
{ const t = 'Date,Close\n' + Array.from({ length: 40 }, (_, i) => `2026-01-${String(i % 28 + 1).padStart(2, '0')}`).map((d, i) => `${d.slice(0, 7)}-${String(i + 1).padStart(2, '0').slice(-2)}`).slice(0, 28).map((d, i) => `${d},${100 + i}`).join('\n');
  const r = analyse('px.csv', t.length, t); eq(r.trend?.agg, 'avg', 'prices are averaged, not summed'); }
{ const lines = ['Date,Amount']; let s = 9; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2000; i++) lines.push(`2026-01-${String(i % 28 + 1).padStart(2, '0')},${Math.exp(5 + 1.2 * Math.sqrt(-2 * Math.log(rnd())) * Math.cos(2 * Math.PI * rnd())).toFixed(2)}`);
  lines.push('2026-01-15,9999999999');
  const t = lines.join('\n'); const r = analyse('skew.csv', t.length, t);
  const o = r.checks.find(c => c.id.startsWith('outliers-'));
  eq(o?.affected, 1, 'skewed amounts: only the ×1,000,000 typo is extreme'); }
{ const t = 'x\n' + Array.from({ length: 30 }, (_, i) => `${i},NA`).join('\n'); }
{ const t = 'id,v\n1,NA\n2,5\n3,n/a\n4,7\n'; const r = analyse('na.csv', t.length, t); const v = r.columns.find(c => c.name === 'v')!; eq([v.type, v.empty], ['number', 2], 'NA markers count as blank, not text'); }

console.log(`own-file: ${checks} checks, ${failures} failures`);
if (failures) process.exitCode = 1;
