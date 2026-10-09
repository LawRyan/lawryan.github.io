import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  generateFiles, profile, relationships, quality, kpis, findings, ask, driverTree, weekly, live, classOf, inSeg, segName,
  QUESTIONS, WEEKS, weekLabel, money, moneyMM, signed, pctChg, DESKS,
  type Files, type Finding, type Trade, type Node, type Answer,
} from './analyst';
import { reducedMotion } from '../components/common';

type Step = 'files' | 'understand' | 'dashboard' | 'ask' | 'investigate';
const STEPS: [Step, string][] = [['files', 'Files'], ['understand', 'Understand'], ['dashboard', 'Dashboard'], ['ask', 'Ask'], ['investigate', 'Investigate']];
const PAGE = 8;

export default function AnalystLab() {
  const files = useMemo(() => generateFiles(), []);
  const [step, setStep] = useState<Step>('files');
  const [ran, setRan] = useState(false);
  const [focus, setFocus] = useState<Finding | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [records, setRecords] = useState<{ label: string; rows: (t: Trade) => boolean } | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const analysis = useMemo(() => (ran ? { prof: profile(files), rels: relationships(files), q: quality(files), k: kpis(files), F: findings(files) } : null), [ran, files]);

  const go = (s: Step) => {
    setStep(s);
    const el = top.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  };
  const investigate = (f: Finding) => { setFocus(f); setRecords({ label: f.title, rows: f.rows }); go('investigate'); };
  const can = (s: Step) => s === 'files' || s === 'understand' || ran;

  return (
    <div className="alab rv" ref={top}>
      <div className="alab-bar">
        <div className="alab-brand"><b>L<span>//</span>IOS</b> <span>Analyst · in miniature</span></div>
        <ol className="alab-steps" aria-label="Demo steps">
          {STEPS.map(([s, l], i) => (
            <li key={s}>
              <button aria-current={step === s ? 'step' : undefined} disabled={!can(s)} onClick={() => (s === 'understand' && !ran ? (setRan(true), go('understand')) : go(s))}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>{l}
              </button>
            </li>
          ))}
        </ol>
        <span className="alab-badge">Synthetic data · no AI</span>
      </div>
      <div className="alab-body" aria-live="polite">
        {step === 'files' && <FilesStep files={files} onRun={() => { setRan(true); go('understand'); }} />}
        {step === 'understand' && analysis && <UnderstandStep files={files} a={analysis} onNext={() => go('dashboard')} />}
        {step === 'dashboard' && analysis && <DashboardStep files={files} a={analysis} onInvestigate={investigate} onAsk={() => go('ask')} />}
        {step === 'ask' && analysis && (
          <AskStep answer={answer} onAsk={q => setAnswer(ask(files, q))}
            onRecords={a => { const f = a.finding && analysis.F.find(x => x.id === a.finding); if (f) investigate(f); else if (a.rows) { setFocus(null); setRecords({ label: a.rowsLabel || a.q, rows: a.rows }); go('investigate'); } }} />
        )}
        {step === 'investigate' && analysis && <InvestigateStep files={files} finding={focus} records={records} findings={analysis.F} onPick={investigate} />}
      </div>
    </div>
  );
}

/* ───────── 01 Files ───────── */
function FilesStep({ files, onRun }: { files: Files; onRun: () => void }) {
  const cards = [
    { name: 'Trades.csv', rows: files.trades.length, cols: 9, kb: Math.round(files.trades.length * 0.092), note: 'one row per trade, two years' },
    { name: 'Clients.csv', rows: files.clients.length, cols: 4, kb: 3, note: 'client master' },
    { name: 'Targets.csv', rows: files.targets.length, cols: 3, kb: 1, note: 'Revenue target by quarter and desk' },
  ];
  return (
    <div className="st st-files">
      <div className="st-copy">
        <h3>Three files it has never seen.</h3>
        <p>No schema, no mapping, no instructions. The same pipeline as L//IOS Analyst works out what the data is, how it connects, whether it can be trusted, and what changed.</p>
        <p className="mono muted small">Synthetic and fictional, generated in your browser. Two stories and five data problems are planted; the engine isn’t told where.</p>
        <button className="btn btn-primary alab-run" onClick={onRun}>Analyse 3 files <span className="arr" aria-hidden="true">→</span></button>
      </div>
      <ul className="filecards">
        {cards.map(c => (
          <li key={c.name}>
            <span className="fi" aria-hidden="true">CSV</span>
            <b>{c.name}</b>
            <span>{c.rows.toLocaleString('en-US')} rows · {c.cols} columns · {c.kb.toLocaleString('en-US')} KB</span>
            <span className="muted">{c.note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────── 02 Understand ───────── */
interface A { prof: ReturnType<typeof profile>; rels: ReturnType<typeof relationships>; q: ReturnType<typeof quality>; k: ReturnType<typeof kpis>; F: Finding[] }

function UnderstandStep({ files, a, onNext }: { files: Files; a: A; onNext: () => void }) {
  const engines = ['Ingestion', 'Schema discovery', 'Semantic engine', 'Relationship engine', 'Quality engine', 'Analytical engine', 'Insight engine'];
  const log = useMemo(() => {
    const L: { t: string; text: string; warn?: boolean }[] = [];
    let t = 0.02;
    const at = (dt: number, text: string, warn = false) => { t += dt; L.push({ t: `${t.toFixed(2)}s`, text, warn }); };
    at(0.01, `Trades.csv · ${files.trades.length.toLocaleString('en-US')} rows · 9 columns`);
    at(0.01, `Clients.csv · ${files.clients.length} rows · Targets.csv · ${files.targets.length} rows`);
    const m = a.prof.filter(p => p.role === 'measure'), d = a.prof.filter(p => p.role === 'dimension'), ids = a.prof.filter(p => p.role === 'identifier');
    at(0.04, `Measures: ${[...new Set(m.map(x => x.name))].join(', ')}`);
    at(0.01, `Dimensions: ${[...new Set(d.filter(x => x.file === 'Trades.csv').map(x => `${x.name} (${x.meaning})`))].join(', ')}`);
    at(0.01, `Keys: ${ids.map(x => `${x.file.replace('.csv', '')}.${x.name} (${x.meaning})`).join(' · ')}`);
    at(0.02, `Assumption: excluding ${a.q.cancelled} Cancelled trades`, true);
    for (const r of a.rels) at(0.03, `${r.from} → ${r.to}: ${r.strategy} · ${(r.matchFrom * 100).toFixed(1)}% match`);
    for (const c of a.q.checks.filter(c => c.severity !== 'OK')) at(0.02, `Quality: ${c.title}`, c.severity !== 'LOW');
    at(0.05, 'Comparing the last 52 weeks with the 52 before…');
    at(0.08, `Testing ${DESKS.length * 5 + 15} segments against their own history…`);
    at(0.04, `${a.F.length} findings ranked`);
    return L;
  }, [files, a]);
  const [n, setN] = useState(() => (reducedMotion() ? log.length : 0));
  useEffect(() => {
    if (n >= log.length) return;
    const id = setTimeout(() => setN(v => v + 1), 90);
    return () => clearTimeout(id);
  }, [n, log.length]);
  const done = n >= log.length;
  const grid: [string, string][] = [
    ['Files', '3'], ['Rows indexed', (files.trades.length + files.clients.length + files.targets.length).toLocaleString('en-US')], ['Measures', String(new Set(a.prof.filter(p => p.role === 'measure').map(p => p.name)).size)],
    ['Dimensions', String(new Set(a.prof.filter(p => p.role === 'dimension').map(p => p.name)).size)], ['Relationships', String(a.rels.length)], ['Quality', `${(a.q.overall * 100).toFixed(2)}%`],
  ];
  return (
    <div className="st st-und">
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
            <p><b>{a.F.filter(f => f.kind !== 'DATA QUALITY').length}</b> material findings · <b>{a.q.checks.filter(c => c.severity !== 'OK').length}</b> data-quality issues · <b>3</b> files connected</p>
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
    </div>
  );
}

/* ───────── 03 Dashboard ───────── */
function DashboardStep({ files, a, onInvestigate, onAsk }: { files: Files; a: A; onInvestigate: (f: Finding) => void; onAsk: () => void }) {
  const L = useMemo(() => live(files), [files]);
  const wk = useMemo(() => weekly(L, 'cv'), [L]);
  const k = a.k;
  const tiles = [
    { l: 'Revenue', v: money(k.cv.cur), d: pctChg(k.cv.pri, k.cv.cur), sub: `${money(k.cv.cur - k.cv.pri)} vs last year` },
    { l: 'Notional', v: moneyMM(k.notional.cur), d: pctChg(k.notional.pri, k.notional.cur), sub: 'USD' },
    { l: 'Active clients', v: String(k.clients.cur), d: pctChg(k.clients.pri, k.clients.cur), sub: `${k.clients.cur - k.clients.pri} vs last year` },
    { l: 'Trades', v: k.trades.cur.toLocaleString('en-US'), d: pctChg(k.trades.pri, k.trades.cur), sub: 'excl. cancelled' },
    { l: 'Data quality', v: `${(k.quality * 100).toFixed(1)}%`, d: null as number | null, sub: `${k.issues} issues to review` },
  ];
  const desk = DESKS.map(d => ({ d, a: L.filter(t => t.desk === d && t.week < 52).reduce((s, t) => s + t.cv, 0), b: L.filter(t => t.desk === d && t.week >= 52).reduce((s, t) => s + t.cv, 0) })).sort((x, y) => y.b - x.b);
  const max = Math.max(...desk.map(x => x.b));
  return (
    <div className="st st-dash">
      <div className="dash-main">
        <div className="kpis5">
          {tiles.map(t => (
            <div key={t.l} className="kpi">
              <span className="k">{t.l}</span><span className="v">{t.v}</span>
              {t.d !== null ? <span className={`d ${t.d >= 0 ? 'up' : 'down'}`}>{signed(t.d)}</span> : <span className="d watch">review</span>}
              <span className="d muted">{t.sub}</span>
            </div>
          ))}
        </div>
        <div className="chart-card">
          <div className="chart-head"><span className="eyebrow">Weekly revenue · this year vs last</span><span className="mono muted small">Is it growing, and is this year different?</span></div>
          <YoY cur={wk.slice(52)} prev={wk.slice(0, 52)} />
        </div>
        <div className="chart-card">
          <div className="chart-head"><span className="eyebrow">Revenue by desk · last 52 weeks</span></div>
          <div className="dbars">
            {desk.map(x => (
              <div key={x.d} className="dbar">
                <span className="nm">{x.d}</span>
                <span className="tr"><span style={{ width: `${(x.b / max) * 100}%` }} /></span>
                <span className="val">{money(x.b)}</span>
                <span className={`val ${x.b >= x.a ? 'up' : 'down'}`}>{signed(pctChg(x.a, x.b))}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <aside className="dash-side" aria-label="What you need to know">
        <div className="side-head"><span className="eyebrow">What you need to know</span><button className="link-arrow small" onClick={onAsk}>Ask a question →</button></div>
        <ol className="flist">
          {a.F.map((f, i) => (
            <li key={f.id}>
              <button onClick={() => onInvestigate(f)}>
                <span className="fn mono">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <b>{f.title}</b>
                  <span className="ft">{f.text}</span>
                  <span className="fmeta"><i className={`kd kd-${f.kind.replace(' ', '-').toLowerCase()}`} />{f.kind}{f.verdict && <em className={f.verdict.startsWith('BUSINESS') ? 'ok' : 'bad'}>{f.verdict.startsWith('BUSINESS') ? 'DATA CHECKED' : 'DATA ISSUE?'}</em>}<span className="inv">Investigate →</span></span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

function useWidth<T extends HTMLElement>(initial = 640) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    const el = ref.current; if (!el || !('ResizeObserver' in window)) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function niceMax(v: number) { const p = 10 ** Math.floor(Math.log10(v || 1)); const m = v / p; return ([1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(x => x >= m) || 10) * p; }

/** Two weekly series on one scale. `startWeek` labels the x axis. Highlights an optional window. */
function YoY({ cur, prev, startWeek = 52, highlight, labels = ['This year', 'Last year'] }: { cur: number[]; prev: number[]; startWeek?: number; highlight?: [number, number]; labels?: [string, string] }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = Math.round(Math.min(240, Math.max(170, W * 0.34))), Lp = 52, R = 10, T = 12, B = 24;
  const n = cur.length, mx = niceMax(Math.max(...cur, ...prev));
  const x = (i: number) => Lp + (i * (W - Lp - R)) / (n - 1), y = (v: number) => T + (1 - v / mx) * (H - T - B);
  const path = (s: number[]) => s.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const every = Math.max(1, Math.ceil(n / Math.max(3, Math.floor((W - Lp) / 74))));
  return (
    <div ref={ref}>
      <div className="legend static"><span><i style={{ background: 'var(--signal)' }} />{labels[0]}</span><span><i style={{ background: 'var(--ink-3)' }} />{labels[1]}</span></div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label={`${labels[0]} vs ${labels[1]}, weekly revenue. ${labels[0]} total ${money(cur.reduce((a, b) => a + b, 0))}, ${labels[1]} ${money(prev.reduce((a, b) => a + b, 0))}.`} onMouseLeave={() => setHover(null)}>
        {highlight && <rect x={x(highlight[0])} y={T} width={x(highlight[1]) - x(highlight[0])} height={H - T - B} fill="rgba(183,168,255,0.08)" />}
        {[0, 0.5, 1].map(t => <g key={t}><line x1={Lp} x2={W - R} y1={y(t * mx)} y2={y(t * mx)} stroke="rgba(186,204,228,0.08)" /><text x={Lp - 6} y={y(t * mx) + 3} textAnchor="end">{money(t * mx)}</text></g>)}
        {Array.from({ length: n }, (_, i) => i).filter(i => i % every === 0 && n - 1 - i >= every / 2).map(i => <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : 'middle'}>{weekLabel(startWeek + i)}</text>)}
        <path d={path(prev)} fill="none" stroke="var(--ink-3)" strokeWidth="1.3" />
        <path d={`${path(cur)} L${x(n - 1)},${H - B} L${x(0)},${H - B} Z`} fill="rgba(111,211,242,0.08)" />
        <path d={path(cur)} fill="none" stroke="var(--signal)" strokeWidth="2" strokeLinejoin="round" />
        <circle cx={x(n - 1)} cy={y(cur[n - 1])} r="3.5" fill="var(--signal)" />
        {hover !== null && <><line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="rgba(186,204,228,0.3)" /><circle cx={x(hover)} cy={y(cur[hover])} r="3.5" fill="var(--signal)" /></>}
        {Array.from({ length: n }, (_, i) => <rect key={i} x={x(i) - (W - Lp - R) / (n - 1) / 2} y={T} width={(W - Lp - R) / (n - 1)} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} />)}
      </svg>
      <p className="lab-note">{hover !== null ? <>Week of {weekLabel(startWeek + hover)} · {labels[0]} {money(cur[hover])} · {labels[1]} {money(prev[hover])} · {signed(pctChg(prev[hover], cur[hover]))}</> : (typeof matchMedia !== 'undefined' && matchMedia('(hover: none)').matches ? 'Tap a week to compare.' : 'Hover a week to compare.')}</p>
    </div>
  );
}

/* ───────── 04 Ask ───────── */
function AskStep({ answer, onAsk, onRecords }: { answer: Answer | null; onAsk: (q: (typeof QUESTIONS)[number]) => void; onRecords: (a: Answer) => void }) {
  return (
    <div className="st st-ask">
      <div className="ask-q">
        <h3>Ask L//IOS</h3>
        <p className="muted">Pick a question. Each one runs a fixed set of deterministic tools on the data above. There is no language model here; the wording of every answer is built from the computed numbers.</p>
        <div className="qchips" role="group" aria-label="Suggested questions">
          {QUESTIONS.map(q => <button key={q} aria-pressed={answer?.q === q} onClick={() => onAsk(q)}>{q}</button>)}
        </div>
      </div>
      <div className="ask-a">
        {!answer && <div className="ask-empty"><span className="mono">↳</span> Choose a question to see an evidence-based answer.</div>}
        {answer && (
          <div className="answer xp-anim" key={answer.q}>
            <div className="ans-q"><span className="mono">L//IOS</span>{answer.q}</div>
            <dl>
              {answer.lines.map((l, i) => <Fragment key={i}><dt className={`atag atag-${l.tag.replace(' ', '-').toLowerCase()}`}>{l.tag}</dt><dd>{l.text}</dd></Fragment>)}
            </dl>
            {answer.tree && <Tree node={answer.tree} />}
            <div className="ans-foot">
              {answer.rows && <button className="btn btn-sm" onClick={() => onRecords(answer)}>Investigate the records <span className="arr" aria-hidden="true">→</span></button>}
              <span className="mono muted small">{answer.tools.join(' → ')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Tree({ node }: { node: Node }) {
  const rows: { n: Node; depth: number; last: boolean }[] = [];
  const walk = (n: Node, d: number, last: boolean) => { rows.push({ n, depth: d, last }); n.children.forEach((c, i) => walk(c, d + 1, i === n.children.length - 1)); };
  walk(node, 0, true);
  return (
    <div className="tree" role="table" aria-label="Driver tree">
      <div className="tree-h" role="row"><span role="columnheader">Segment</span><span role="columnheader">Change</span><span role="columnheader">%</span><span role="columnheader">Share of parent</span></div>
      {rows.map(({ n, depth }, i) => (
        <div key={i} className={`tree-r${n.other ? ' other' : ''}`} role="row">
          <span role="cell" style={{ paddingLeft: depth * 16 }}>{depth > 0 && <i className="tree-l" aria-hidden="true">├─</i>}{n.label}{n.dim && <em> by {n.dim}</em>}</span>
          <span role="cell" className={n.delta >= 0 ? 'up' : 'down'}>{n.delta >= 0 ? '+' : ''}{money(n.delta)}</span>
          <span role="cell" className={n.pct >= 0 ? 'up' : 'down'}>{signed(n.pct, 0)}</span>
          <span role="cell">{depth > 0 && <><span className="sbar"><span style={{ width: `${Math.min(100, Math.abs(n.share) * 100)}%` }} /></span>{(n.share * 100).toFixed(0)}%</>}</span>
        </div>
      ))}
    </div>
  );
}

/* ───────── 05 Investigate ───────── */
function InvestigateStep({ files, finding, records, findings: F, onPick }: { files: Files; finding: Finding | null; records: { label: string; rows: (t: Trade) => boolean } | null; findings: Finding[]; onPick: (f: Finding) => void }) {
  const f = finding;
  const cls = useMemo(() => classOf(files), [files]);
  const series = useMemo(() => {
    if (!f) return null;
    const rows = live(files).filter(t => inSeg(t, f.seg, cls));
    const w = weekly(rows, f.measure);
    const from = WEEKS - 26;
    return { cur: w.slice(from), prev: w.slice(from - 52, WEEKS - 52), from };
  }, [f, files, cls]);
  const tree = useMemo(() => (f?.window ? driverTree(files, f.seg, f.window.a, f.window.b, f.measure, 3, 3) : null), [f, files]);
  if (!f && !records) {
    return (
      <div className="st st-pick">
        <div className="pick-head"><span className="eyebrow">Investigate</span><h3>Pick a finding to look into.</h3><p className="muted">Each one opens with its numbers, the chart, the driver tree, the data checks and the rows behind it.</p></div>
        <ol className="flist pick-list">
          {F.map((x, i) => (
            <li key={x.id}>
              <button onClick={() => onPick(x)}>
                <span className="fn mono">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <b>{x.title}</b>
                  <span className="ft">{x.text}</span>
                  <span className="fmeta"><i className={`kd kd-${x.kind.replace(' ', '-').toLowerCase()}`} />{x.kind}{x.verdict && <em className={x.verdict.startsWith('BUSINESS') ? 'ok' : 'bad'}>{x.verdict.startsWith('BUSINESS') ? 'DATA CHECKED' : 'DATA ISSUE?'}</em>}<span className="inv">Investigate →</span></span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    );
  }
  return (
    <div className="st st-inv">
      {f && (
        <>
          <div className="inv-head">
            <div>
              <span className="fmeta"><i className={`kd kd-${f.kind.replace(' ', '-').toLowerCase()}`} />{f.kind} · score {f.score.toFixed(2)}</span>
              <h3>{f.title}</h3>
              <p className="muted">{f.text}</p>
            </div>
            <label className="inv-pick">
              <span className="mono muted small">Other findings</span>
              <select id="lab-finding" value={f.id} onChange={e => { const n = F.find(x => x.id === e.target.value); if (n) onPick(n); }}>
                {F.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}
              </select>
            </label>
          </div>
          <div className="inv-grid">
            <div className="inv-main">
              <dl className="inv-nums">{f.numbers.map(n => <div key={n.label}><dt>{n.label}</dt><dd>{n.value}</dd></div>)}</dl>
              {series && f.window && (
                <div className="chart-card">
                  <div className="chart-head"><span className="eyebrow">{segName(f.seg)} · weekly {f.measure === 'cv' ? 'revenue' : 'notional'}</span><span className="mono muted small">When did it start?</span></div>
                  <YoY cur={series.cur} prev={series.prev} startWeek={series.from} highlight={[f.window.b[0] - series.from, f.window.b[1] - series.from]} labels={['Recent', 'Year earlier']} />
                </div>
              )}
              {tree && <div className="tree-card"><span className="eyebrow">Why · driver tree</span><Tree node={tree} /></div>}
            </div>
            {f.checks && (
              <aside className="inv-checks" aria-label="Data quality checks">
                <span className="eyebrow">Is it real? · data checks</span>
                <div className={`verdict ${f.verdict!.startsWith('BUSINESS') ? 'ok' : 'bad'}`}>{f.verdict}</div>
                <ul>{f.checks.map(c => <li key={c.name} className={c.pass ? 'pass' : 'fail'}><b>{c.pass ? '✓' : '!'} {c.name}</b><span>{c.detail}</span></li>)}</ul>
              </aside>
            )}
          </div>
        </>
      )}
      {records && <Records files={files} label={records.label} filter={records.rows} />}
    </div>
  );
}

function Records({ files, label, filter }: { files: Files; label: string; filter: (t: Trade) => boolean }) {
  const [page, setPage] = useState(0);
  const [desc, setDesc] = useState(true);
  const names = useMemo(() => new Map(files.clients.map(c => [c.clientId, c.name])), [files]);
  const rows = useMemo(() => files.trades.filter(filter).sort((a, b) => (desc ? b.cv - a.cv : a.cv - b.cv)), [files, filter, desc]);
  useEffect(() => setPage(0), [filter]);
  const total = rows.reduce((s, t) => s + t.cv, 0);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  return (
    <div className="records">
      <div className="records-head">
        <div className="crumbs"><span className="eyebrow">Underlying records</span><span className="crumb">{label}</span></div>
        <span className="mono muted">{rows.length.toLocaleString('en-US')} rows · {money(total)} revenue</span>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th className="n">Row</th><th>Trade</th><th>Date</th><th>Client</th><th>Class</th><th>Desk</th><th>Region</th><th className="n">Notional $mm</th><th className="n"><button onClick={() => setDesc(d => !d)} aria-label="Sort by revenue">Revenue $k {desc ? '↓' : '↑'}</button></th><th>Status</th></tr></thead>
          <tbody>
            {rows.slice(page * PAGE, page * PAGE + PAGE).map(t => (
              <tr key={t.rid} className={t.status === 'Cancelled' ? 'muted' : undefined}>
                <td className="n mono">{t.rid}</td><td className="mono">{t.tradeId}</td><td>{t.date}</td>
                <td>{names.get(t.clientId) ?? <span className="watch">{t.clientId} · no match</span>}</td>
                <td>{t.clientClass}</td><td>{t.desk}</td><td>{t.region}</td>
                <td className="n">{t.notional.toFixed(2)}</td><td className="n">{t.cv.toFixed(2)}</td><td>{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="tbl-foot">
        <span>Row = line number in Trades.csv · page {page + 1} of {pages}</span>
        <span style={{ display: 'flex', gap: 6 }}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
          <button disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>Next</button>
        </span>
      </div>
    </div>
  );
}
