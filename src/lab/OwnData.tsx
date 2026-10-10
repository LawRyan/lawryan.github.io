import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { reducedMotion } from '../components/common';
import { analyseAsync, decode, sampleCsv, fmt, pct, LIMITS, type OwnAnalysis, type OwnBreakdown, type OwnCheck, type OwnColumn, type OwnInsight, type Point } from './own';

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
  const title = useRef<HTMLHeadingElement>(null);
  const runId = useRef(0);
  // keyboard and screen-reader users land on the heading when the screen opens or a report is ready
  // (one frame later, so a click that opened the screen doesn't immediately take focus back)
  useEffect(() => { if (state !== 'idle' && state !== 'done') return; const f = requestAnimationFrame(() => title.current?.focus({ preventScroll: state === 'idle' })); return () => cancelAnimationFrame(f); }, [state]);
  useEffect(() => () => { runId.current++; }, []);

  const run = async (name: string, bytes: number, read: () => Promise<{ text: string; encoding: string }>) => {
    if (bytes > LIMITS.bytes) { setError(`That file is ${(bytes / 1048576).toFixed(1)} MB. The limit here is ${LIMITS.bytes / 1048576} MB.`); setState('error'); return; }
    const id = ++runId.current;
    setState('reading'); setError('');
    try { const { text, encoding } = await read(); const r = await analyseAsync(name, bytes, text, encoding); if (id !== runId.current) return; setA(r); setState('done'); }
    catch (e) { if (id !== runId.current) return; setError(e instanceof Error ? e.message : 'Could not read the file.'); setState('error'); }
  };
  const onFile = (f?: File | null) => {
    if (!f || state === 'reading') return;
    if (!/\.(csv|tsv|txt)$/i.test(f.name) && !/text\/|csv/.test(f.type)) { setError('Please choose a CSV or TSV file. From Excel: File → Save As → CSV.'); setState('error'); return; }
    run(f.name, f.size, async () => decode(await f.arrayBuffer()));
  };
  const sample = () => { const t = sampleCsv(); run('messy-sample.csv', t.length, async () => ({ text: t, encoding: 'UTF-8' })); };
  const download = () => { const url = URL.createObjectURL(new Blob([sampleCsv()], { type: 'text/csv' })); const l = document.createElement('a'); l.href = url; l.download = 'messy-sample.csv'; l.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  const reset = () => { setA(null); setState('idle'); setError(''); if (input.current) input.current.value = ''; };

  return (
    <div className="st st-own">
      <div className="own-head">
        <div>
          <span className="eyebrow">Your own file</span>
          <h3 ref={title} tabIndex={-1}>{a ? a.file.name : 'Try it on your own CSV.'}</h3>
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

      {a && state === 'done' && <p className="sr-only" role="status">Analysis complete: {a.file.rows.toLocaleString('en-US')} rows, {a.checks.filter(c => c.severity !== 'OK').length} issues to review.</p>}
      {a && state === 'done' && <Report a={a} />}
    </div>
  );
}

const ROLE_LABEL: Record<OwnColumn['role'], string> = { measure: 'Measure', dimension: 'Dimension', date: 'Date', identifier: 'Identifier', text: 'Free text', empty: 'Empty' };

type Tab = 'dash' | 'quality' | 'cols';
interface Drill { label: string; rows: number[]; total: number }
const KIND: Record<OwnInsight['kind'], string> = { TREND: 'Trend', MOVER: 'Mover', SHARE: 'Share', ISSUE: 'Data issue' };

function Report({ a }: { a: OwnAnalysis }) {
  const issues = a.checks.filter(c => c.severity !== 'OK');
  const [tab, setTab] = useState<Tab>('dash');
  const [drill, setDrill] = useState<Drill | null>(null);
  const tabs: [Tab, string][] = [['dash', 'Dashboard'], ['quality', `Data quality${issues.length ? ` · ${issues.length}` : ''}`], ['cols', 'Columns']];
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, k: number) => {
    const n = ({ ArrowRight: k + 1, ArrowLeft: k - 1, Home: 0, End: tabs.length - 1 } as Record<string, number>)[e.key];
    if (n === undefined) return; e.preventDefault();
    const m = (n + tabs.length) % tabs.length; setTab(tabs[m][0]); tabRefs.current[m]?.focus();
  };
  const byValue = (col: number, value: string, label: string) => {
    const rows: number[] = []; a.cells.forEach((r, i) => { if ((r[col] ?? '').trim() === value) rows.push(i + 2); });
    setDrill({ label, rows, total: rows.length });
  };
  const byCheck = (id: string) => { const c = a.checks.find(x => x.id === id); if (c) setDrill({ label: c.title, rows: c.rows, total: c.affected }); };
  const readNote = a.facts.find(f => f.startsWith('To read this file'));
  return (
    <div className="own-report">
      <div className="own-tabs" role="tablist" aria-label="Report views">
        {tabs.map(([id, label], k) => (
          <button key={id} ref={el => { tabRefs.current[k] = el; }} role="tab" id={`own-tab-${id}`} aria-controls={`own-panel-${id}`} aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} className={tab === id ? 'on' : ''} onClick={() => setTab(id)} onKeyDown={e => onKey(e, k)}>{label}</button>
        ))}
      </div>

      {tab === 'dash' && (
        <div role="tabpanel" id="own-panel-dash" aria-labelledby="own-tab-dash" className="own-dash">
          <div className="own-dash-main">
            <div className="kpis5 own-kpis" style={{ ['--n' as string]: a.dash.kpis.length }}>
              {a.dash.kpis.map(k => (
                <div key={k.label} className="kpi">
                  <span className="k" title={k.label}>{k.label}</span>
                  <span className={`v${k.value.length > 11 ? ' sm' : ''}`}>{k.value}</span>
                  {k.change !== undefined ? <span className={`d ${k.change >= 0 ? 'up' : 'down'}`}>{pct(k.change)}</span> : k.watch ? <span className="d watch">review</span> : null}
                  <span className="d muted">{k.sub}</span>
                </div>
              ))}
            </div>
            {readNote && <p className="mono muted small own-readnote">{readNote}</p>}
            {a.trend && (
              <div className="chart-card">
                <div className="chart-head"><span className="eyebrow">{a.trend.measure} by {a.trend.grain} · {a.trend.agg === 'sum' ? 'total' : a.trend.agg === 'avg' ? 'average' : 'count'}</span><span className="mono muted small">from “{a.trend.date}”{a.trend.partialLast ? ' · dashed = partial' : ''}</span></div>
                <Line points={a.trend.points} partial={a.trend.partialLast} />
              </div>
            )}
            {a.dash.breakdowns.length > 0 && (
              <div className={`own-bds n${Math.min(a.dash.breakdowns.length, 3)}`}>
                {a.dash.breakdowns.map(b => <Breakdown key={b.col} b={b} onPick={v => byValue(b.col, v, `${b.dimension} = “${v}”`)} />)}
              </div>
            )}
            {!a.trend && !a.dash.breakdowns.length && <p className="muted own-nochart">No date column or repeating categories were found, so there is nothing to chart. The data-quality checks and column summary still apply.</p>}
          </div>
          <aside className="dash-side own-side" aria-label="What you need to know">
            <div className="side-head"><span className="eyebrow">What you need to know</span></div>
            <ol className="flist">
              {a.dash.insights.map((f, i) => {
                const body = (
                  <>
                    <span className="fn mono">{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      <b>{f.title}</b>
                      <span className="ft">{f.text}</span>
                      <span className="fmeta"><i className={`kd own-kd-${f.kind.toLowerCase()}`} />{KIND[f.kind]}{f.severity && <em className="bad">{f.severity}</em>}{(f.filter || f.check) && <span className="inv">Show rows →</span>}</span>
                    </span>
                  </>
                );
                const act = f.check ? () => byCheck(f.check!) : f.filter && f.filter.col >= 0 ? () => byValue(f.filter!.col, f.filter!.value, `${a.header[f.filter!.col]} = “${f.filter!.value}”`) : null;
                return <li key={i}>{act ? <button onClick={act}>{body}</button> : <div className="flist-static">{body}</div>}</li>;
              })}
            </ol>
            <p className="mono muted small own-side-note">Every line is computed from your rows. No language model is involved.</p>
          </aside>
          {drill && <Records a={a} d={drill} onClose={() => setDrill(null)} />}
        </div>
      )}

      {tab === 'quality' && (
        <section role="tabpanel" id="own-panel-quality" aria-labelledby="own-tab-quality">
          <span className="eyebrow">Data quality · {issues.length ? `${issues.length} to review` : 'nothing to fix'} · {(a.dash.quality * 100).toFixed(1)}% of rows pass the checks (blank values aren’t counted against it)</span>
          <ul className="own-checks">{a.checks.map(c => <Check key={c.id} c={c} a={a} />)}</ul>
        </section>
      )}

      {tab === 'cols' && (
        <section role="tabpanel" id="own-panel-cols" aria-labelledby="own-tab-cols">
          <dl className="inv-nums own-nums">
            <div><dt>Rows</dt><dd>{a.file.rows.toLocaleString('en-US')}</dd></div>
            <div><dt>Columns</dt><dd>{a.file.cols}</dd></div>
            <div><dt>Separator</dt><dd>{a.file.delimiter === '\t' ? 'tab' : a.file.delimiter === ' ' ? 'space' : `“${a.file.delimiter}”`}</dd></div>
            <div><dt>Encoding</dt><dd>{a.file.encoding}</dd></div>
          </dl>
          <ul className="own-facts-list">{a.facts.slice(0, a.facts.length - (a.trend?.statement ? 1 : 0) - (a.movers ? 1 : 0)).map(f => <li key={f}>{f}</li>)}</ul>
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
      )}
    </div>
  );
}

function Breakdown({ b, onPick }: { b: OwnBreakdown; onPick: (v: string) => void }) {
  const max = Math.max(...b.items.map(x => Math.abs(x.v)), 1e-9);
  return (
    <div className="chart-card own-bd">
      <div className="chart-head"><span className="eyebrow">{b.agg === 'count' ? 'Rows' : b.agg === 'avg' ? `Average ${b.measure}` : b.measure} by {b.dimension}</span>{b.halves && <span className="mono muted small">change: 2nd half vs 1st</span>}</div>
      <div className="dbars">
        {b.items.map(x => (
          <button key={x.value} className="dbar own-dbar" onClick={() => onPick(x.value)} aria-label={`${b.dimension} ${x.value}: ${fmt(x.v)}${x.change !== undefined ? `, ${pct(x.change)}` : ''}. Show rows.`}>
            <span className="nm" title={x.value}>{x.value}</span>
            <span className="tr"><span style={{ width: `${Math.max(1, (Math.abs(x.v) / max) * 100)}%` }} /></span>
            <span className="val">{fmt(x.v)}</span>
            <span className={`val ${x.change === undefined ? 'muted' : x.change >= 0 ? 'up' : 'down'}`}>{x.change === undefined ? '' : pct(x.change)}</span>
          </button>
        ))}
        {b.otherCount > 0 && <div className="dbar own-dbar other"><span className="nm muted">{b.otherCount} more</span><span /><span className="val muted">{b.agg === 'avg' ? '' : fmt(b.others)}</span><span /></div>}
      </div>
    </div>
  );
}

function Records({ a, d, onClose }: { a: OwnAnalysis; d: Drill; onClose: () => void }) {
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => { head.current?.focus({ preventScroll: true }); head.current?.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' }); }, [d]);
  const rows = d.rows.slice(0, 50);
  return (
    <section className="own-records" aria-label="Matching rows">
      <div className="own-records-head">
        <h4 ref={head} tabIndex={-1}>{d.label} <span className="muted mono small">· {d.total.toLocaleString('en-US')} row{d.total === 1 ? '' : 's'}{d.total > rows.length ? `, first ${rows.length} shown` : ''}</span></h4>
        <button className="btn" onClick={onClose}>Close</button>
      </div>
      {rows.length ? (
        <div className="tbl-wrap own-rows">
          <table className="tbl">
            <thead><tr><th className="n">Line</th>{a.header.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
            <tbody>{rows.map(n => <tr key={n}><td className="n">{n + a.file.lineOffset}</td>{a.cells[n - 2].map((v, i) => <td key={i}>{v === '' ? <span className="muted">·blank·</span> : v}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : <p className="muted">This check is about columns, not rows; see Data quality.</p>}
    </section>
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
              <thead><tr><th className="n">Line</th>{a.header.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
              <tbody>{rows.map(n => <tr key={n}><td className="n">{n + a.file.lineOffset}</td>{a.cells[n - 2].map((v, i) => <td key={i}>{v === '' ? <span className="muted">·blank·</span> : v}</td>)}</tr>)}</tbody>
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
