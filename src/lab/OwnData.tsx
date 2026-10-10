import { useRef, useState } from 'react';
import { analyseAsync, sampleCsv, fmt, LIMITS, type OwnAnalysis, type OwnCheck, type OwnColumn, type Point } from './own';

/**
 * "Try it on your own file". The file is read by the browser (File API) and analysed in a
 * Web Worker. Nothing is sent anywhere or stored; leaving the page clears it.
 */
export default function OwnData({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<'idle' | 'reading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [a, setA] = useState<OwnAnalysis | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const run = async (name: string, bytes: number, text: () => Promise<string>) => {
    if (bytes > LIMITS.bytes) { setError(`That file is ${(bytes / 1048576).toFixed(1)} MB. The limit here is ${LIMITS.bytes / 1048576} MB.`); setState('error'); return; }
    setState('reading'); setError('');
    try { setA(await analyseAsync(name, bytes, await text())); setState('done'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not read the file.'); setState('error'); }
  };
  const onFile = (f?: File | null) => {
    if (!f) return;
    if (!/\.(csv|tsv|txt)$/i.test(f.name) && !/text\/|csv/.test(f.type)) { setError('Please choose a CSV or TSV file. From Excel: File → Save As → CSV.'); setState('error'); return; }
    run(f.name, f.size, () => f.text());
  };
  const sample = () => { const t = sampleCsv(); run('messy-sample.csv', t.length, async () => t); };
  const download = () => { const url = URL.createObjectURL(new Blob([sampleCsv()], { type: 'text/csv' })); const l = document.createElement('a'); l.href = url; l.download = 'messy-sample.csv'; l.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  const reset = () => { setA(null); setState('idle'); setError(''); if (input.current) input.current.value = ''; };

  return (
    <div className="st st-own">
      <div className="own-head">
        <div>
          <span className="eyebrow">Your own file</span>
          <h3>{a ? a.file.name : 'Try it on your own CSV.'}</h3>
          <p className="muted own-privacy"><span aria-hidden="true">🔒</span> Read by your browser only. Nothing is uploaded or saved; leave the page and it’s gone.</p>
        </div>
        <div className="own-head-btns">
          {a && <button className="btn" onClick={reset}>Try another file</button>}
          <button className="btn" onClick={onBack}>Back to the demo</button>
        </div>
      </div>

      {state !== 'done' && (
        <div className={`own-drop${drag ? ' over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files?.[0]); }}>
          {state === 'reading' ? (
            <p className="own-busy" role="status"><span className="own-spin" aria-hidden="true" /> Reading and checking your file…</p>
          ) : (
            <>
              <p className="own-drop-t">Drop a CSV here</p>
              <p className="muted small">or</p>
              <div className="own-drop-btns">
                <button className="btn btn-primary" onClick={() => input.current?.click()}>Choose a file</button>
                <button className="btn" onClick={sample}>Use a messy sample</button>
              </div>
              <p className="mono muted small own-limits">CSV or TSV · up to {LIMITS.bytes / 1048576} MB · first {LIMITS.rows.toLocaleString('en-US')} rows · <button className="linkish" onClick={download}>download the sample</button></p>
              {state === 'error' && <p className="own-error" role="alert">{error}</p>}
            </>
          )}
          <input ref={input} type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" hidden onChange={e => onFile(e.target.files?.[0])} aria-label="Choose a CSV file" />
        </div>
      )}

      {a && state === 'done' && <Report a={a} />}
    </div>
  );
}

const ROLE_LABEL: Record<OwnColumn['role'], string> = { measure: 'Measure', dimension: 'Dimension', date: 'Date', identifier: 'Identifier', text: 'Free text', empty: 'Empty' };

function Report({ a }: { a: OwnAnalysis }) {
  const issues = a.checks.filter(c => c.severity !== 'OK');
  return (
    <div className="own-report">
      <dl className="inv-nums own-nums">
        <div><dt>Rows</dt><dd>{a.file.rows.toLocaleString('en-US')}</dd></div>
        <div><dt>Columns</dt><dd>{a.file.cols}</dd></div>
        <div><dt>Issues</dt><dd className={issues.length ? 'warn' : 'up'}>{issues.length}</dd></div>
        <div><dt>Separator</dt><dd>{a.file.delimiter === '\t' ? 'tab' : `“${a.file.delimiter}”`}</dd></div>
      </dl>

      <section className="own-facts" aria-label="What it found">
        <span className="eyebrow">What it found</span>
        <ul>{a.facts.map(f => <li key={f}><span className="fact-tag">FACT</span>{f}</li>)}</ul>
        <p className="mono muted small">Every sentence is computed from your rows. No language model is involved.</p>
      </section>

      {(a.trend || a.movers) && (
        <div className="own-charts">
          {a.trend && (
            <div className="chart-card">
              <div className="chart-head"><span className="eyebrow">{a.trend.measure} by {a.trend.grain} · {a.trend.agg === 'sum' ? 'total' : 'count'}</span><span className="mono muted small">from “{a.trend.date}”</span></div>
              <Line points={a.trend.points} partial={a.trend.partialLast} />
            </div>
          )}
          {a.movers && (
            <div className="chart-card">
              <div className="chart-head"><span className="eyebrow">{a.movers.mode === 'halves' ? `Change by ${a.movers.dimension}` : `${a.movers.measure} by ${a.movers.dimension}`}</span><span className="mono muted small">{a.movers.mode === 'halves' ? 'second half vs first' : 'largest groups'}</span></div>
              <Bars items={a.movers.items} diverging={a.movers.mode === 'halves'} />
            </div>
          )}
        </div>
      )}

      <section aria-label="Data quality checks">
        <span className="eyebrow">Data quality · {issues.length ? `${issues.length} to review` : 'nothing to fix'}</span>
        <ul className="own-checks">{a.checks.map(c => <Check key={c.id} c={c} a={a} />)}</ul>
      </section>

      <section aria-label="Columns">
        <span className="eyebrow">How it read each column</span>
        <div className="tbl-wrap own-cols">
          <table className="tbl">
            <thead><tr><th>Column</th><th>Read as</th><th className="n">Filled</th><th className="n">Distinct</th><th>Summary</th><th>Why</th></tr></thead>
            <tbody>
              {a.columns.map(c => (
                <tr key={c.index}>
                  <td>{c.name}</td>
                  <td><span className={`role role-${c.role}`}>{ROLE_LABEL[c.role]}</span></td>
                  <td className="n">{a.file.rows ? Math.round((c.filled / a.file.rows) * 100) : 0}%</td>
                  <td className="n">{c.distinct.toLocaleString('en-US')}</td>
                  <td className="own-sum">{summary(c)}</td>
                  <td className="muted small">{c.reasons.join('; ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function summary(c: OwnColumn) {
  if (c.num && c.role === 'measure') return `total ${fmt(c.num.sum)} · ${fmt(c.num.min)} to ${fmt(c.num.max)}`;
  if (c.dates) return `${new Date(c.dates.min).toISOString().slice(0, 10)} to ${new Date(c.dates.max).toISOString().slice(0, 10)}`;
  if (c.top) return c.top.slice(0, 3).map(t => `${t.value} (${t.count.toLocaleString('en-US')})`).join(', ');
  return c.examples.slice(0, 2).map(e => `“${e.slice(0, 24)}”`).join(', ');
}

function Check({ c, a }: { c: OwnCheck; a: OwnAnalysis }) {
  const [open, setOpen] = useState(false);
  const rows = c.rows.slice(0, 12);
  return (
    <li className={`own-check sev-${c.severity.toLowerCase()}`}>
      <span className={`sev sev-${c.severity.toLowerCase()}`}>{c.severity === 'OK' ? 'OK' : c.severity}</span>
      <div>
        <b>{c.title}</b>
        <span className="muted">{c.detail}</span>
        <span className="mono muted small">Method: {c.method}</span>
        {rows.length > 0 && <button className="linkish" aria-expanded={open} onClick={() => setOpen(o => !o)}>{open ? 'Hide rows' : `Show rows${c.rows.length > 12 ? ` (first 12 of ${c.affected.toLocaleString('en-US')})` : ''}`}</button>}
        {open && (
          <div className="tbl-wrap own-rows">
            <table className="tbl">
              <thead><tr><th className="n">Line</th>{a.header.map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{rows.map(n => <tr key={n}><td className="n">{n}</td>{a.cells[n - 2].map((v, i) => <td key={i}>{v === '' ? <span className="muted">·blank·</span> : v}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </li>
  );
}

function Line({ points, partial }: { points: Point[]; partial: boolean }) {
  // drawn at roughly its on-screen width so labels stay readable on phones
  const narrow = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 560px)').matches;
  const W = narrow ? 330 : 640, H = narrow ? 180 : 200, L = 48, R = 10, T = 10, B = 24;
  const max = Math.max(...points.map(p => p.v), 0), min = Math.min(...points.map(p => p.v), 0);
  const span = max - min || 1;
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, points.length - 1);
  const y = (v: number) => T + (1 - (v - min) / span) * (H - T - B);
  const solid = partial ? points.slice(0, -1) : points;
  const d = (ps: Point[], off = 0) => ps.map((p, i) => `${i ? 'L' : 'M'}${x(i + off).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const every = Math.max(1, Math.ceil(points.length / (narrow ? 3 : 5)));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg own-line" role="img" aria-label={`Line chart, ${points.length} periods, from ${points[0].label} to ${points[points.length - 1].label}`}>
      {[0, 0.5, 1].map(f => { const v = min + span * f; return <g key={f}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="grid" /><text x={L - 6} y={y(v) + 4} textAnchor="end" className="axis">{fmt(span > 100 ? Math.round(v) : Math.round(v * 100) / 100)}</text></g>; })}
      <path d={d(solid)} className="own-path" />
      {partial && points.length > 1 && <path d={d(points.slice(-2), points.length - 2)} className="own-path partial" />}
      {points.map((p, i) => (i % every === 0 ? <text key={p.t} x={x(i)} y={H - 6} textAnchor="middle" className="axis">{p.label.replace(/ \d{4}$/, '')}</text> : null))}
    </svg>
  );
}

function Bars({ items, diverging }: { items: { value: string; delta: number; b: number }[]; diverging: boolean }) {
  const vals = items.map(i => (diverging ? i.delta : i.b));
  const max = Math.max(...vals.map(Math.abs), 1);
  return (
    <ul className="own-bars">
      {items.map((it, k) => {
        const v = vals[k], w = (Math.abs(v) / max) * 100;
        return (
          <li key={it.value}>
            <span className="own-bar-k" title={it.value}>{it.value}</span>
            <span className={`own-bar-track${diverging ? ' div' : ''}`}><i className={v < 0 ? 'neg' : 'pos'} style={{ width: `${diverging ? w / 2 : w}%` }} /></span>
            <span className={`own-bar-v mono ${diverging ? (v < 0 ? 'down' : 'up') : ''}`}>{diverging && v > 0 ? '+' : ''}{fmt(v)}</span>
          </li>
        );
      })}
    </ul>
  );
}
