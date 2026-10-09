import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  DATASETS, MONTHS, generate, applyFilters, seriesByCategory, totalsByCategory, summarize, insights, findAnomalies, windowRange,
  fmt, fmtPct, value, type Filters, type MeasureKey, type Rec,
} from './engine';

const PALETTE = ['#6fd3f2', '#b7a8ff', '#63d6a0', '#e8bd6a', '#f28b8b', '#c8d1dc'];
const PAGE = 8;
const tickLabel = (v: number, unit: 'mm' | 'k' | 'n') => {
  if (unit === 'n') return String(Math.round(v));
  const big = unit === 'mm' ? 'bn' : 'mm', small = unit;
  return v >= 1000 ? `${+(v / 1000).toFixed(2)}${big}` : `${Math.round(v)}${small}`;
};

interface Focus { category?: string; month?: number; entity?: string }

export default function Lab() {
  const [dsId, setDsId] = useState(DATASETS[0].id);
  const def = DATASETS.find(d => d.id === dsId)!;
  const all = useMemo(() => generate(def), [def]);
  const [f, setF] = useState<Filters>({ months: 12, regions: [], measure: 'primary' });
  const [focus, setFocus] = useState<Focus>({});
  const [activeIns, setActiveIns] = useState<number | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [sortDesc, setSortDesc] = useState(true);
  const chartRef = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(860);
  useEffect(() => {
    const el = chartRef.current;
    if (!el || !('ResizeObserver' in window)) return;
    const ro = new ResizeObserver(([e]) => setCw(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const unit = def.measures.find(m => m.key === f.measure)!.unit;
  const mLabel = def.measures.find(m => m.key === f.measure)!.label;
  const cur = useMemo(() => applyFilters(all, f), [all, f]);
  const series = useMemo(() => seriesByCategory(cur, def, f), [cur, def, f]);
  const totals = useMemo(() => totalsByCategory(cur, def, f.measure), [cur, def, f.measure]);
  const sum = useMemo(() => summarize(all, def, f), [all, def, f]);
  const ins = useMemo(() => insights(all, def, f), [all, def, f]);
  const anomalies = useMemo(() => findAnomalies(cur, def, f), [cur, def, f]);
  const [a] = windowRange(f);
  const colorOf = (c: string) => PALETTE[def.categories.indexOf(c) % PALETTE.length];

  const update = (patch: Partial<Filters>) => { setF(p => ({ ...p, ...patch })); setFocus({}); setActiveIns(null); setPage(0); };
  const switchDs = (id: string) => { setDsId(id); setF(p => ({ ...p, regions: [] })); setFocus({}); setActiveIns(null); setHidden([]); setPage(0); };
  const setFocusFrom = (fc: Focus, insIdx: number | null = null) => { setFocus(fc); setActiveIns(insIdx); setPage(0); };

  const rows = useMemo(() => {
    const r = cur.filter((x: Rec) => (!focus.category || x.category === focus.category) && (focus.month === undefined || x.month === focus.month) && (!focus.entity || x.entity === focus.entity));
    return r.sort((p, q) => (sortDesc ? 1 : -1) * (value(q, f.measure === 'count' ? 'primary' : f.measure) - value(p, f.measure === 'count' ? 'primary' : f.measure)));
  }, [cur, focus, sortDesc, f.measure]);
  const rowsTotal = rows.reduce((s, r) => s + value(r, f.measure), 0);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));

  // ── line chart geometry
  const W = cw, H = Math.round(Math.min(260, Math.max(190, cw * 0.36))), L = 46, R = 10, T = 12, B = 26;
  const visible = def.categories.filter(c => !hidden.includes(c));
  const maxV = Math.max(1, ...visible.flatMap(c => series[c]));
  const niceMax = (() => { const p = 10 ** Math.floor(Math.log10(maxV)); const m = maxV / p; const step = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(x => x >= m)!; return step * p; })();
  const n = f.months;
  const x = (i: number) => L + (i * (W - L - R)) / (n - 1);
  const y = (v: number) => T + (1 - v / niceMax) * (H - T - B);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => t * niceMax);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(3, Math.floor((W - L - R) / 70))));

  const maxTotal = Math.max(1, ...Object.values(totals));
  const sortedCats = [...def.categories].sort((p, q) => totals[q] - totals[p]);

  return (
    <div className="lab rv" aria-label="Intelligence Lab demo">
      <div className="lab-bar">
        <div className="seg" role="group" aria-label="Dataset">
          {DATASETS.map(d => <button key={d.id} aria-pressed={d.id === dsId} onClick={() => switchDs(d.id)}>{d.name}</button>)}
        </div>
        <div className="lab-controls">
          <div className="ctl"><label htmlFor="lab-period">Period</label>
          <div className="seg" role="group" aria-label="Period" id="lab-period">
            {[6, 12, 24].map(m => <button key={m} aria-pressed={f.months === m} onClick={() => update({ months: m })}>{m}M</button>)}
          </div></div>
          <div className="ctl"><label htmlFor="lab-measure">Measure</label>
          <div className="seg" role="group" aria-label="Measure" id="lab-measure">
            {def.measures.map(m => <button key={m.key} aria-pressed={f.measure === m.key} onClick={() => update({ measure: m.key as MeasureKey })}>{m.label}</button>)}
          </div></div>
          <div className="ctl"><label htmlFor="lab-region">{def.regionLabel}</label>
          <div className="seg" role="group" aria-label={def.regionLabel} id="lab-region">
            <button aria-pressed={f.regions.length === 0} onClick={() => update({ regions: [] })}>All</button>
            {def.regions.map(rg => (
              <button key={rg} aria-pressed={f.regions.includes(rg)} onClick={() => update({ regions: f.regions.includes(rg) ? f.regions.filter(x => x !== rg) : [...f.regions, rg] })}>{rg}</button>
            ))}
          </div></div>
        </div>
      </div>

      <div className="lab-body">
        <div className="lab-main">
          <div className="kpis" aria-live="polite">
            <div className="kpi"><span className="k">Total {mLabel.toLowerCase()}</span><span className="v">{fmt(sum.total, unit)}</span><span className="d muted">{MONTHS[a]} – {MONTHS[MONTHS.length - 1]}</span></div>
            <div className="kpi"><span className="k">vs prior {f.months}M</span><span className={`v ${sum.change === null ? '' : sum.change >= 0 ? 'up' : 'down'}`}>{sum.change === null ? '—' : fmtPct(sum.change)}</span><span className="d muted">{sum.prior === null ? 'no earlier data' : `prior ${fmt(sum.prior, unit)}`}</span></div>
            <div className="kpi"><span className="k">Records</span><span className="v">{sum.records.toLocaleString('en-US')}</span><span className="d muted">in this view</span></div>
            <div className="kpi"><span className="k">Flagged months</span><span className={`v ${sum.anomalies ? 'watch' : ''}`}>{sum.anomalies}</span><span className="d muted">|z| ≥ 2 by {def.categoryLabel.toLowerCase()}</span></div>
          </div>

          <div className="chart-row">
            <div className="chart-card" ref={chartRef}>
              <div className="chart-head">
                <span className="eyebrow">Monthly {mLabel.toLowerCase()} by {def.categoryLabel.toLowerCase()}</span>
                <div className="legend" role="group" aria-label="Show or hide series">
                  {def.categories.map(c => (
                    <button key={c} aria-pressed={!hidden.includes(c)} onClick={() => setHidden(h => h.includes(c) ? h.filter(x => x !== c) : visible.length > 1 ? [...h, c] : h)}>
                      <i style={{ background: colorOf(c) }} />{c}
                    </button>
                  ))}
                </div>
              </div>
              <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Line chart of monthly ${mLabel} by ${def.categoryLabel}`} onMouseLeave={() => setHover(null)}>
                {ticks.map(t => (
                  <g key={t}>
                    <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="rgba(186,204,228,0.08)" />
                    <text x={L - 6} y={y(t) + 3} textAnchor="end">{tickLabel(t, unit)}</text>
                  </g>
                ))}
                {Array.from({ length: n }, (_, i) => i).filter(i => (i % labelEvery === 0 && n - 1 - i >= labelEvery) || i === n - 1).map(i => (
                  <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>{MONTHS[a + i].replace(' 20', " '")}</text>
                ))}
                {focus.month !== undefined && <line x1={x(focus.month - a)} x2={x(focus.month - a)} y1={T} y2={H - B} stroke="rgba(232,189,106,0.6)" strokeDasharray="3 3" />}
                {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="rgba(186,204,228,0.25)" />}
                {visible.map(c => {
                  const dim = focus.category && focus.category !== c;
                  const d = series[c].map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
                  return (
                    <g key={c} opacity={dim ? 0.22 : 1} style={{ transition: 'opacity .3s' }}>
                      <path d={d} fill="none" stroke={colorOf(c)} strokeWidth={focus.category === c ? 2.4 : 1.6} strokeLinejoin="round" />
                      <circle cx={x(n - 1)} cy={y(series[c][n - 1])} r="3" fill={colorOf(c)} />
                    </g>
                  );
                })}
                {anomalies.filter(an => visible.includes(an.category)).map(an => (
                  <circle key={`${an.category}-${an.month}`} cx={x(an.month - a)} cy={y(an.value)} r="6" fill="none" stroke="#e8bd6a" strokeWidth="1.4">
                    <title>{`${an.category} · ${MONTHS[an.month]} · z = ${an.z.toFixed(2)}`}</title>
                  </circle>
                ))}
                {Array.from({ length: n }, (_, i) => (
                  <rect key={i} x={x(i) - (W - L - R) / (n - 1) / 2} y={T} width={(W - L - R) / (n - 1)} height={H - T - B} fill="transparent" style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHover(i)} onClick={() => setFocusFrom({ ...focus, month: a + i, entity: undefined })}>
                    <title>{`${MONTHS[a + i]}: ${visible.map(c => `${c} ${fmt(series[c][i], unit)}`).join(', ')}`}</title>
                  </rect>
                ))}
              </svg>
              <p className="lab-note" style={{ marginTop: 4 }}>
                {hover !== null
                  ? <>{MONTHS[a + hover]} · {visible.map(c => <span key={c} style={{ color: colorOf(c), marginRight: 10 }}>{c} {fmt(series[c][hover], unit)}</span>)}</>
                  : <>Click a month to see its records. Amber rings mark flagged months.</>}
              </p>
            </div>

            <div className="chart-card">
              <div className="chart-head"><span className="eyebrow">Share of period</span></div>
              <div className="bars">
                {sortedCats.map(c => (
                  <button key={c} className="bar-row" aria-pressed={focus.category === c} onClick={() => setFocusFrom(focus.category === c ? { ...focus, category: undefined } : { ...focus, category: c, entity: undefined })}>
                    <span className="nm">{c}</span>
                    <span className="tr"><span style={{ width: `${(totals[c] / maxTotal) * 100}%`, background: colorOf(c) }} /></span>
                    <span className="val">{sum.total ? ((totals[c] / sum.total) * 100).toFixed(1) : '0.0'}%</span>
                  </button>
                ))}
              </div>
              <p className="lab-note" style={{ marginTop: 10 }}>Click a {def.categoryLabel.toLowerCase()} to filter the records.</p>
            </div>
          </div>

          <div className="records">
            <div className="records-head">
              <div className="crumbs">
                <span className="eyebrow">Underlying records</span>
                {focus.category && <span className="crumb">{focus.category}</span>}
                {focus.month !== undefined && <span className="crumb">{MONTHS[focus.month]}</span>}
                {focus.entity && <span className="crumb">{focus.entity}</span>}
                {(focus.category || focus.month !== undefined || focus.entity) && <button className="clear" onClick={() => setFocusFrom({})}>Clear</button>}
              </div>
              <span className="mono muted">{rows.length.toLocaleString('en-US')} rows · {fmt(rowsTotal, unit)}</span>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>ID</th><th>Month</th><th>{def.categoryLabel}</th><th>{def.regionLabel}</th><th>{def.entityLabel}</th>
                    <th className="n"><button onClick={() => setSortDesc(s => !s)} aria-label="Sort by value">{def.measures[0].label} ($mm) {sortDesc ? '↓' : '↑'}</button></th>
                    <th className="n">{def.measures[1].label} ($k)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(page * PAGE, page * PAGE + PAGE).map(r => (
                    <tr key={r.id}>
                      <td className="mono">{r.id}</td><td>{MONTHS[r.month]}</td>
                      <td><span style={{ color: colorOf(r.category) }}>●</span> {r.category}</td>
                      <td>{r.region}</td><td>{r.entity}</td>
                      <td className="n">{r.primary.toFixed(2)}</td><td className="n">{r.secondary.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="tbl-foot">
              <span>Page {page + 1} of {pages}</span>
              <span style={{ display: 'flex', gap: 6 }}>
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
                <button disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>Next</button>
              </span>
            </div>
          </div>
        </div>

        <aside className="lab-side" aria-label="Insights">
          <div className="eyebrow"><b>//</b>Insights</div>
          {ins.map((it, i) => (
            <div key={`${dsId}-${it.kind}`} className={`ins t-${it.tone}`} aria-pressed={activeIns === i} role="button" tabIndex={0}
              onClick={e => { if ((e.target as HTMLElement).closest('summary,details')) return; setFocusFrom(activeIns === i ? {} : it.focus, activeIns === i ? null : i); }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocusFrom(activeIns === i ? {} : it.focus, activeIns === i ? null : i); } }}>
              <b>{it.title}</b>
              <p>{it.text}</p>
              <details className="working">
                <summary>How this was calculated</summary>
                <dl>{it.working.map(w => <Fragment key={w.label}><dt>{w.label}</dt><dd>{w.value}</dd></Fragment>)}</dl>
              </details>
            </div>
          ))}
          <p className="lab-note">
            {def.blurb} Insights are rule-based calculations run in your browser on this synthetic data: period change, z-score outliers, three-month momentum and concentration. No AI model is involved, and every figure can be traced to the records.
          </p>
        </aside>
      </div>
    </div>
  );
}
