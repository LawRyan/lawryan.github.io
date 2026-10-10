// Independent checks for the "own file" profiler. Figures are recomputed from the raw text
// with simple string handling, not the engine's helpers.
import { analyse, parseDelimited, parseNumber, parseDate, dateOrder, sniffDelimiter, sampleCsv } from './own';

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
  const r = a.checks.find(c => c.id === 'ragged');
  eq(r?.rows, [3, 4], 'ragged rows reported with file line numbers');
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

console.log(`own-file: ${checks} checks, ${failures} failures`);
if (failures) process.exitCode = 1;
