import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { reducedMotion } from '../components/common';
import { analyseAsync, decode, sampleCsv, fmt, fmtFor, pct, pp, LIMITS, type OwnAnalysis, type OwnBreakdown, type OwnColumn, type OwnInsight, type Point } from './own';
import { answer as askOwn, findings as ownFindings, fromInsight, questions, segment, type OwnAnswer, type OwnFinding, type OwnQuestion } from './ownflow';

/**
 * "Try it on your own file": the same five steps as the demo (Files → Understand → Dashboard → Ask → Investigate),
 * run on a file the visitor chooses. The file is read by the browser (File API) and analysed in a Web Worker.
 * Nothing is sent anywhere or stored; leaving the page clears it.
 */

// ───────────────────────── loading ─────────────────────────
export interface OwnFileState { state: 'idle' | 'reading' | 'done' | 'error'; error: string; a: OwnAnalysis | null; load: (f?: File | null) => void; sample: () => void; reset: () => void }

export function useOwnFile(onReady: (a: OwnAnalysis) => void): OwnFileState {
  const [state, setState] = useState<OwnFileState['state']>('idle');
  const [error, setError] = useState('');
  const [a, setA] = useState<OwnAnalysis | null>(null);
  const runId = useRef(0);
  const ready = useRef(onReady); ready.current = onReady;
  useEffect(() => () => { runId.current++; }, []);
  const run = async (name: string, bytes: number, read: () => Promise<{ text: string; encoding: string }>) => {
    if (bytes > LIMITS.bytes) { setError(`That file is ${(bytes / 1048576).toFixed(1)} MB. The limit here is ${LIMITS.bytes / 1048576} MB.`); setState('error'); return; }
    const id = ++runId.current;
    setState('reading'); setError('');
    try { const { text, encoding } = await read(); const r = await analyseAsync(name, bytes, text, encoding); if (id !== runId.current) return; setA(r); setState('done'); ready.current(r); }
    catch (e) { if (id !== runId.current) return; setError(e instanceof Error ? e.message : 'Could not read the file.'); setState('error'); }
  };
  const load = (f?: File | null) => {
    if (!f || state === 'reading') return;
    if (!/\.(csv|tsv|txt)$/i.test(f.name) && !/text\/|csv/.test(f.type)) { setError('Please choose a CSV or TSV file. From Excel: File → Save As → CSV.'); setState('error'); return; }
    run(f.name, f.size, async () => decode(await f.arrayBuffer()));
  };
  const sample = () => { const t = sampleCsv(); run('messy-sample.csv', t.length, async () => ({ text: t, encoding: 'UTF-8' })); };
  const reset = () => { runId.current++; setA(null); setState('idle'); setError(''); };
  return { state, error, a, load, sample, reset };
}

const download = () => { const url = URL.createObjectURL(new Blob([sampleCsv()], { type: 'text/csv' })); const l = document.createElement('a'); l.href = url; l.download = 'messy-sample.csv'; l.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
const Privacy = () => <p className="muted own-privacy"><span aria-hidden="true">🔒</span> Read by your browser only. Nothing is uploaded or saved; leave the page and it’s gone.</p>;

/* ───────── 01 Files ───────── */
export function OwnFilesStep({ f, onBack, onContinue }: { f: OwnFileState; onBack: () => void; onContinue: () => void }) {
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  // keyboard and screen-reader users land on the heading when the screen opens
  // (one frame later, so the click that opened it doesn't take focus straight back)
  useEffect(() => { const id = requestAnimationFrame(() => title.current?.focus({ preventScroll: true })); return () => cancelAnimationFrame(id); }, []);
  const a = f.a;
  return (
    <div className="st st-files st-ownfiles">
      <div className="st-copy">
        <span className="eyebrow">Your own file</span>
        <h3 ref={title} tabIndex={-1}>{a ? 'Your file is loaded.' : 'Try it on your own CSV.'}</h3>
        <p>{a ? 'The same five steps as the demo, run on your rows: understand it, build a dashboard, answer questions, and show the rows behind every number.' : 'The same five steps as the demo. Drop in a CSV and it works out what each column is, checks it, builds a dashboard and lets you dig into the rows.'}</p>
        <Privacy />
        <div className="files-ctas">
          {a && <button className="btn btn-primary" onClick={onContinue}>See the analysis <span className="arr" aria-hidden="true">→</span></button>}
          {a && <button className="btn" onClick={() => { f.reset(); if (input.current) input.current.value = ''; }}>Try another file</button>}
          <button className="btn" onClick={onBack}>Back to the demo</button>
        </div>
      </div>
      {a ? (
        <ul className="filecards">
          <li>
            <span className="fi" aria-hidden="true">{/\.tsv$/i.test(a.file.name) ? 'TSV' : 'CSV'}</span>
            <b>{a.file.name}</b>
            <span>{a.file.rows.toLocaleString('en-US')} rows · {a.file.cols} columns · {Math.max(1, Math.round(a.file.bytes / 1024)).toLocaleString('en-US')} KB</span>
            <span className="muted">{a.file.encoding} · separated by {a.file.delimiter === '\t' ? 'tabs' : a.file.delimiter === ' ' ? 'spaces' : `“${a.file.delimiter}”`}</span>
          </li>
        </ul>
      ) : (
        <div className={`own-drop${drag ? ' over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); f.load(e.dataTransfer.files?.[0]); }}>
          {f.state === 'reading' ? (
            <p className="own-busy" role="status"><span className="own-spin" aria-hidden="true" /> Reading and checking your file…</p>
          ) : (
            <>
              <p className="own-drop-t">Drop a CSV here</p>
              <p className="muted small">or</p>
              <div className="own-drop-btns">
                <button className="btn btn-primary" onClick={() => input.current?.click()}>Choose a file</button>
                <button className="btn" onClick={f.sample}>Use a messy sample</button>
              </div>
              <p className="mono muted small own-limits">CSV or TSV · up to {LIMITS.bytes / 1048576} MB · first {LIMITS.rows.toLocaleString('en-US')} rows · <button className="linkish" onClick={download}>download the sample</button></p>
              {f.state === 'error' && <p className="own-error" role="alert">{f.error}</p>}
            </>
          )}
          <input ref={input} type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" hidden onChange={e => f.load(e.target.files?.[0])} aria-label="Choose a CSV file" />
        </div>
      )}
    </div>
  );
}

/* ───────── 02 Understand ───────── */
const ROLE_LABEL: Record<OwnColumn['role'], string> = { measure: 'Measure', dimension: 'Dimension', date: 'Date', identifier: 'Identifier', text: 'Free text', empty: 'Empty' };

export function OwnUnderstandStep({ a, onNext }: { a: OwnAnalysis; onNext: () => void }) {
  const engines = ['Ingestion', 'Schema discovery', 'Semantic engine', 'Quality engine', 'Analytical engine', 'Insight engine'];
  const F = useMemo(() => ownFindings(a), [a]);
  const log = useMemo(() => {
    const L: { t: string; text: string; warn?: boolean }[] = [];
    let t = 0.02;
    const at = (dt: number, text: string, warn = false) => { t += dt; L.push({ t: `${t.toFixed(2)}s`, text, warn }); };
    at(0.01, `${a.file.name} · ${a.file.rows.toLocaleString('en-US')} rows · ${a.file.cols} columns`);
    const read = a.facts.find(x => x.startsWith('To read this file')); if (read) at(0.01, read.replace(/^To read this file it /, 'Read: ').replace(/\.$/, ''), true);
    const of = (r: OwnColumn['role']) => a.columns.filter(c => c.role === r).map(c => c.name);
    for (const [r, l] of [['measure', 'Measures'], ['dimension', 'Dimensions'], ['date', 'Dates'], ['identifier', 'Keys'], ['text', 'Free text']] as const) {
      const n = of(r); if (n.length) at(0.02, `${l}: ${n.slice(0, 8).join(', ')}${n.length > 8 ? ` +${n.length - 8} more` : ''}`);
    }
    const c = a.dash.ctx;
    at(0.02, c.agg === 'sum' ? `Assumption: totals add up “${c.measureName}”` : c.agg === 'avg' ? `Assumption: “${c.measureName}” is a level, so it is averaged, not added` : 'Assumption: no amount column found, so rows are counted', true);
    for (const k of a.checks) at(0.02, `Quality: ${k.severity === 'OK' ? '✓ ' : ''}${k.title}`, k.severity === 'HIGH' || k.severity === 'MEDIUM');
    if (a.trend) at(0.04, `Trend: ${a.trend.measure} by ${a.trend.grain} from “${a.trend.date}”`);
    if (a.dash.breakdowns.length) at(0.04, `Splitting by ${a.dash.breakdowns.map(b => b.dimension).join(', ')}…`);
    at(0.03, `${F.length} finding${F.length === 1 ? '' : 's'} ranked`);
    return L;
  }, [a, F.length]);
  const [n, setN] = useState(() => (reducedMotion() ? log.length : 0));
  useEffect(() => {
    if (n >= log.length) return;
    const id = setTimeout(() => setN(v => v + 1), 90);
    return () => clearTimeout(id);
  }, [n, log.length]);
  const done = n >= log.length;
  const issues = a.checks.filter(c => c.severity !== 'OK').length;
  const role = (r: OwnColumn['role']) => String(a.columns.filter(c => c.role === r).length);
  const grid: [string, string][] = [['Rows', a.file.rows.toLocaleString('en-US')], ['Columns', String(a.file.cols)], ['Measures', role('measure')], ['Dimensions', role('dimension')], ['Issues', String(issues)], ['Quality', `${(a.dash.quality * 100).toFixed(1)}%`]];
  return (
    <div className="st st-und st-ownund">
      <div>
        <ul className="engines">
          {engines.map((e, i) => {
            const on = done || n > (i * log.length) / engines.length;
            return <li key={e}><span>{e}</span><b className={on ? 'on' : ''}>{on ? 'ONLINE' : 'STARTING'}</b></li>;
          })}
        </ul>
        {done && (
          <div className="und-done">
            <span className="eyebrow" style={{ color: 'var(--up)' }}>Analysis complete</span>
            <p role="status"><b>{F.filter(f => f.kind !== 'ISSUE').length}</b> findings · <b>{issues}</b> data-quality issue{issues === 1 ? '' : 's'} · <b>{a.file.cols}</b> columns read</p>
            <button className="btn btn-primary" onClick={onNext}>Open the dashboard <span className="arr" aria-hidden="true">→</span></button>
          </div>
        )}
      </div>
      <div className="und-right">
        <dl className="und-grid">{grid.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        <ol className="und-log" aria-label="Analysis log">
          {log.slice(0, n).map((l, i) => <li key={i} className={l.warn ? 'warn' : undefined}><span>{l.t}</span>{l.text}</li>)}
        </ol>
      </div>
      {done && (
        <details className="own-coldetails">
          <summary>How it read each column</summary>
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
        </details>
      )}
    </div>
  );
}

function summary(c: OwnColumn) {
  if (c.num && c.role === 'measure') { const f = fmtFor(c.percent); return c.percent ? `${f(c.num.min)} to ${f(c.num.max)}, average ${f(c.num.mean)}` : `total ${fmt(c.num.sum)} · ${fmt(c.num.min)} to ${fmt(c.num.max)}`; }
  if (c.dates) return `${new Date(c.dates.min).toISOString().slice(0, 10)} to ${new Date(c.dates.max).toISOString().slice(0, 10)}`;
  if (c.top) return c.top.slice(0, 3).map(t => `${t.value} (${t.count.toLocaleString('en-US')})`).join(', ');
  return c.examples.slice(0, 2).map(e => `“${e.slice(0, 24)}”`).join(', ');
}

/* ───────── 03 Dashboard ───────── */
const KIND: Record<OwnInsight['kind'], string> = { TREND: 'Trend', MOVER: 'Mover', SHARE: 'Share', ISSUE: 'Data issue' };

export function OwnDashboardStep({ a, onInvestigate, onAsk }: { a: OwnAnalysis; onInvestigate: (f: OwnFinding) => void; onAsk: () => void }) {
  const readNote = a.facts.find(f => f.startsWith('To read this file'));
  return (
    <div className="st st-dash own-dash">
      <div className="dash-main own-dash-main">
        <div className="kpis5 own-kpis" style={{ ['--n' as string]: a.dash.kpis.length }}>
          {a.dash.kpis.map(k => (
            <div key={k.label} className="kpi">
              <span className="k" title={k.label}>{k.label}</span>
              <span className={`v${k.value.length > 11 ? ' sm' : ''}`}>{k.value}</span>
              {k.change !== undefined ? <span className={`d ${k.change >= 0 ? 'up' : 'down'}`}>{k.changeText ?? pct(k.change)}</span> : k.watch ? <span className="d watch">review</span> : null}
              <span className="d muted">{k.sub}</span>
            </div>
          ))}
        </div>
        {readNote && <p className="mono muted small own-readnote">{readNote}</p>}
        {a.trend && (
          <div className="chart-card">
            <div className="chart-head"><span className="eyebrow">{a.trend.measure} by {a.trend.grain} · {a.trend.agg === 'sum' ? 'total' : a.trend.agg === 'avg' ? 'average' : 'count'}</span><span className="mono muted small">from “{a.trend.date}”{a.trend.partialLast ? ' · dashed = partial' : ''}</span></div>
            <Line points={a.trend.points} partial={a.trend.partialLast} percent={a.dash.ctx.percent} />
          </div>
        )}
        {a.dash.breakdowns.length > 0 && (
          <div className="own-bds">
            {a.dash.breakdowns.map(b => <Breakdown key={b.col} b={b} percent={a.dash.ctx.percent} onPick={v => { const sg = segment(a, b.col, v); onInvestigate(ownFindings(a).find(x => x.id === sg.id) ?? sg); }} />)}
          </div>
        )}
        {!a.trend && !a.dash.breakdowns.length && <p className="muted own-nochart">No date column or repeating categories were found, so there is nothing to chart. The checks and the column summary still apply.</p>}
      </div>
      <aside className="dash-side own-side" aria-label="What you need to know">
        <div className="side-head"><span className="eyebrow">What you need to know</span><button className="link-arrow small" onClick={onAsk}>Ask a question →</button></div>
        <ol className="flist">
          {a.dash.insights.map((x, i) => {
            // worked out on click, not on every render (large files)
            const can = !!x.check || (!!x.filter && x.filter.col >= 0) || (x.kind === 'TREND' && !!a.trend);
            const open = () => { const f = ownFindings(a).find(y => y.title === x.title) ?? fromInsight(a, x); if (f) onInvestigate(f); };
            return (
              <li key={i}>
                <button onClick={open} disabled={!can}>
                  <span className="fn mono">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <b>{x.title}</b>
                    <span className="ft">{x.text}</span>
                    <span className="fmeta"><i className={`kd own-kd-${x.kind.toLowerCase()}`} />{KIND[x.kind]}{x.severity && <em className="bad">{x.severity}</em>}{can && <span className="inv">Investigate →</span>}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mono muted small own-side-note">Every line is computed from your rows. No language model is involved.</p>
      </aside>
    </div>
  );
}

function Breakdown({ b, onPick, percent }: { b: OwnBreakdown; onPick: (v: string) => void; percent?: boolean }) {
  const F = fmtFor(percent), C = percent ? pp : pct;
  const max = Math.max(...b.items.map(x => Math.abs(x.v)), 1e-9);
  return (
    <div className="chart-card own-bd">
      <div className="chart-head"><span className="eyebrow">{b.agg === 'count' ? 'Rows' : b.agg === 'avg' ? `Average ${b.measure}` : b.measure} by {b.dimension}</span>{b.halves && <span className="mono muted small">change: 2nd half vs 1st</span>}</div>
      <div className="dbars">
        {b.items.map(x => (
          <button key={x.value} className="dbar own-dbar" onClick={() => onPick(x.value)} aria-label={`${b.dimension} ${x.value}: ${F(x.v)}${x.change !== undefined ? `, ${C(x.change)}` : ''}. Investigate.`}>
            <span className="nm" title={x.value}>{x.value}</span>
            <span className="tr"><span style={{ width: `${Math.max(1, (Math.abs(x.v) / max) * 100)}%` }} /></span>
            <span className="val">{F(x.v)}</span>
            <span className={`val ${x.change === undefined ? 'muted' : x.change >= 0 ? 'up' : 'down'}`}>{x.change === undefined ? '' : C(x.change)}</span>
          </button>
        ))}
        {b.otherCount > 0 && <div className="dbar own-dbar other"><span className="nm muted">{b.otherCount} more</span><span /><span className="val muted">{b.agg === 'avg' ? '' : F(b.others)}</span><span /></div>}
      </div>
    </div>
  );
}

/* ───────── 04 Ask ───────── */
export function OwnAskStep({ a, answer, onAsk, onRecords }: { a: OwnAnalysis; answer: OwnAnswer | null; onAsk: (q: OwnQuestion) => void; onRecords: (x: OwnAnswer) => void }) {
  const qs = useMemo(() => questions(a), [a]);
  return (
    <div className="st st-ask">
      <div className="ask-q">
        <h3>Ask about your file</h3>
        <p className="muted">These questions are picked to fit your columns. Each one runs a fixed set of calculations on your rows; there is no language model here, and every answer is built from the computed numbers.</p>
        <div className="qchips" role="group" aria-label="Suggested questions">
          {qs.map(q => <button key={q.id} aria-pressed={answer?.id === q.id} onClick={() => onAsk(q)}>{q.q}</button>)}
        </div>
      </div>
      <div className="ask-a">
        {!answer && <div className="ask-empty"><span className="mono">↳</span> Choose a question to see an evidence-based answer.</div>}
        {answer && (
          <div className="answer xp-anim" key={answer.id}>
            <div className="ans-q"><span className="mono">L//IOS</span>{answer.q}</div>
            <dl>
              {answer.lines.map((l, i) => <Fragment key={i}><dt className={`atag atag-${l.tag.replace(' ', '-').toLowerCase()}`}>{l.tag}</dt><dd>{l.text}</dd></Fragment>)}
            </dl>
            {answer.bars && answer.bars.length > 0 && <AnswerBars bars={answer.bars} diverging={answer.bars.some(b => b.v < 0)} />}
            <div className="ans-foot">
              {answer.rows && answer.rows.length > 0 && <button className="btn btn-sm" onClick={() => onRecords(answer)}>Investigate the records <span className="arr" aria-hidden="true">→</span></button>}
              <span className="mono muted small">{answer.tools.join(' → ')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AnswerBars({ bars, diverging }: { bars: NonNullable<OwnAnswer['bars']>; diverging: boolean }) {
  const max = Math.max(...bars.map(b => Math.abs(b.v)), 1e-9);
  return (
    <ul className="own-bars">
      {bars.map(b => {
        const w = (Math.abs(b.v) / max) * 100;
        return (
          <li key={b.label}>
            <span className="own-bar-k" title={b.label}>{b.label}</span>
            <span className={`own-bar-track${diverging ? ' div' : ''}`}><i className={b.v < 0 ? 'neg' : 'pos'} style={{ width: `${diverging ? w / 2 : w}%` }} /></span>
            <span className={`own-bar-v mono ${diverging ? (b.v < 0 ? 'down' : 'up') : ''}`}>{b.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

/* ───────── 05 Investigate ───────── */
export function OwnInvestigateStep({ a, finding: f, onPick }: { a: OwnAnalysis; finding: OwnFinding | null; onPick: (f: OwnFinding) => void }) {
  const F = useMemo(() => ownFindings(a), [a]);
  if (!f) {
    return (
      <div className="st st-pick">
        <div className="pick-head"><span className="eyebrow">Investigate</span><h3>Pick a finding to look into.</h3><p className="muted">Each one opens with its numbers, its trend, the data checks on just those rows, and the rows themselves.</p></div>
        <ol className="flist pick-list">
          {F.map((x, i) => (
            <li key={x.id}>
              <button onClick={() => onPick(x)}>
                <span className="fn mono">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <b>{x.title}</b>
                  <span className="ft">{x.text}</span>
                  <span className="fmeta"><i className={`kd own-kd-${x.kind.toLowerCase()}`} />{KIND[x.kind]}{x.severity && <em className="bad">{x.severity}</em>}{x.verdict && <em className={x.verdict === 'DATA CHECKS PASS' ? 'ok' : 'bad'}>{x.verdict === 'DATA CHECKS PASS' ? 'DATA CHECKED' : 'DATA ISSUE?'}</em>}<span className="inv">Investigate →</span></span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    );
  }
  const inList = F.some(x => x.id === f.id);
  const s = f.series;
  return (
    <div className="st st-inv">
      <div className="inv-head">
        <div>
          <span className="fmeta"><i className={`kd own-kd-${f.kind.toLowerCase()}`} />{KIND[f.kind]}{f.severity && ` · ${f.severity}`}</span>
          <h3>{f.title}</h3>
          <p className="muted">{f.text}</p>
        </div>
        <label className="inv-pick">
          <span className="mono muted small">Other findings</span>
          <select value={inList ? f.id : ''} onChange={e => { const n = F.find(x => x.id === e.target.value); if (n) onPick(n); }}>
            {!inList && <option value="">{f.title}</option>}
            {F.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}
          </select>
        </label>
      </div>
      <div className="inv-grid">
        <div className="inv-main">
          <dl className="inv-nums">{f.numbers.map(n => <div key={n.label}><dt>{n.label}</dt><dd>{n.value}</dd></div>)}</dl>
          {s && a.trend && (
            <div className="chart-card">
              <div className="chart-head"><span className="eyebrow">{s.seg ? `“${s.segLabel}”` : a.trend.measure} · by {a.trend.grain}</span><span className="mono muted small">{s.seg ? 'When did it move?' : 'Latest full period highlighted'}</span></div>
              <Line points={s.seg ?? s.all} partial={a.trend.partialLast} highlight={s.highlight} percent={a.dash.ctx.percent} />
            </div>
          )}
          {f.method && <p className="mono muted small">Method: {f.method}</p>}
        </div>
        {f.checks && (
          <aside className="inv-checks" aria-label="Data quality checks">
            <span className="eyebrow">Is it real? · data checks</span>
            <div className={`verdict ${f.verdict === 'DATA CHECKS PASS' ? 'ok' : 'bad'}`}>{f.verdict}</div>
            <ul>{f.checks.map(c => <li key={c.name} className={c.pass ? 'pass' : 'fail'}><b>{c.pass ? '✓' : '!'} {c.name}</b><span>{c.detail}</span></li>)}</ul>
          </aside>
        )}
      </div>
      <Records a={a} label={f.rowsLabel} rows={f.rows} />
    </div>
  );
}

const PAGE = 10;
function Records({ a, label, rows }: { a: OwnAnalysis; label: string; rows: number[] }) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [rows]);
  if (!rows.length) return <p className="muted own-norows">This check is about whole columns, not rows, so there are no rows to show.</p>;
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);
  return (
    <div className="records own-records2">
      <div className="records-head">
        <div className="crumbs"><span className="eyebrow">Underlying records</span><span className="crumb">{label}</span></div>
        <span className="mono muted">{rows.length.toLocaleString('en-US')} row{rows.length === 1 ? '' : 's'}</span>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th className="n">Line</th>{a.header.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody>{shown.map(n => <tr key={n}><td className="n mono">{n + a.file.lineOffset}</td>{(a.cells[n - 2] ?? []).map((v, i) => <td key={i}>{v === '' ? <span className="muted">·blank·</span> : v}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <div className="tbl-foot">
        <span>Line = line number in your file · page {page + 1} of {pages}</span>
        <span style={{ display: 'flex', gap: 6 }}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
          <button disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>Next</button>
        </span>
      </div>
    </div>
  );
}

/** For the Ask step's "Investigate the records" button. */
export const answerFinding = (x: OwnAnswer): OwnFinding => ({ id: `ask:${x.id}`, kind: x.id === 'trust' ? 'ISSUE' : 'SHARE', title: x.q, text: x.lines[0]?.text ?? '', rows: x.rows ?? [], rowsLabel: x.rowsLabel ?? x.q, numbers: [{ label: 'Rows', value: (x.rows?.length ?? 0).toLocaleString('en-US') }] });
export { askOwn };

function Line({ points, partial, highlight, percent }: { points: Point[]; partial: boolean; highlight?: number; percent?: boolean }) {
  // drawn at roughly its on-screen width so labels stay readable on phones
  const narrow = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 560px)').matches;
  const W = narrow ? 330 : 640, H = narrow ? 180 : 200, L = 48, R = 10, T = 10, B = 24;
  if (!points.length) return null;
  const max = Math.max(...points.map(p => p.v), 0), min = Math.min(...points.map(p => p.v), 0);
  const span = max - min || 1;
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, points.length - 1);
  const y = (v: number) => T + (1 - (v - min) / span) * (H - T - B);
  const solid = partial ? points.slice(0, -1) : points;
  const d = (ps: Point[], off = 0) => ps.map((p, i) => `${i ? 'L' : 'M'}${x(i + off).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const every = Math.max(1, Math.ceil(points.length / (narrow ? 3 : 5)));
  const hw = (W - L - R) / Math.max(1, points.length - 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg own-line" role="img" aria-label={`Line chart, ${points.length} periods, from ${points[0].label} to ${points[points.length - 1].label}`}>
      {highlight !== undefined && highlight >= 0 && <rect x={x(highlight) - hw / 2} y={T} width={hw} height={H - T - B} className="own-hl" />}
      {[0, 0.5, 1].map(f => { const v = min + span * f; return <g key={f}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="grid" /><text x={L - 6} y={y(v) + 4} textAnchor="end" className="axis">{percent ? fmtFor(true)(v) : fmt(span > 100 ? Math.round(v) : Math.round(v * 100) / 100)}</text></g>; })}
      <path d={d(solid)} className="own-path" />
      {partial && points.length > 1 && <path d={d(points.slice(-2), points.length - 2)} className="own-path partial" />}
      {points.map((p, i) => (i % every === 0 ? <text key={p.t} x={x(i)} y={H - 6} textAnchor="middle" className="axis">{p.label.replace(/ \d{4}$/, '')}</text> : null))}
    </svg>
  );
}
