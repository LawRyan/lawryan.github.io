import { useEffect, useMemo, useState } from 'react';
import { rng } from '../lab/rng';
import { reducedMotion } from './common';

/**
 * Hero instrument: a synthetic series is read point by point, a trend is fitted,
 * and the one statistical outlier is flagged with its z-score. Every readout is
 * computed from the series on screen — nothing is canned text.
 */
const N = 64;
const WIN = 8;

function buildSeries() {
  const r = rng(424242);
  const ys: number[] = [];
  let v = 100;
  for (let i = 0; i < N; i++) {
    v += (r() - 0.46) * 2.4;
    ys.push(v + Math.sin(i / 5) * 1.6 + (r() - 0.5) * 3.2);
  }
  ys[44] += 13; // one real event in the data
  return ys;
}

export function analyse(ys: number[]) {
  const ma = ys.map((_, i) => {
    const a = Math.max(0, i - WIN + 1);
    const w = ys.slice(a, i + 1);
    return w.reduce((s, x) => s + x, 0) / w.length;
  });
  const resid = ys.map((y, i) => y - ma[i]);
  const mu = resid.reduce((s, x) => s + x, 0) / resid.length;
  const sd = Math.sqrt(resid.reduce((s, x) => s + (x - mu) ** 2, 0) / resid.length);
  const z = resid.map(x => (x - mu) / sd);
  let flag = 0;
  z.forEach((v, i) => { if (Math.abs(v) > Math.abs(z[flag])) flag = i; });
  const chg = ((ma[ma.length - 1] - ma[WIN - 1]) / ma[WIN - 1]) * 100;
  return { ma, z, flag, chg };
}

export default function SignalPanel() {
  const ys = useMemo(buildSeries, []);
  const { ma, z, flag, chg } = useMemo(() => analyse(ys), [ys]);
  const [k, setK] = useState(N); // points revealed
  useEffect(() => {
    if (reducedMotion()) return;
    let raf = 0, t0 = performance.now(), running = true;
    const CYCLE = 9000;
    const tick = (t: number) => {
      if (!running) return;
      const p = ((t - t0) % CYCLE) / CYCLE;
      setK(Math.max(2, Math.min(N, Math.round((p / 0.62) * N))));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const vis = () => { running = !document.hidden; if (running) { t0 = performance.now(); raf = requestAnimationFrame(tick); } else cancelAnimationFrame(raf); };
    document.addEventListener('visibilitychange', vis);
    return () => { running = false; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', vis); };
  }, []);

  const W = 480, H = 220, P = 14;
  const lo = Math.min(...ys) - 3, hi = Math.max(...ys) + 3;
  const x = (i: number) => P + (i * (W - 2 * P)) / (N - 1);
  const y = (v: number) => H - P - ((v - lo) / (hi - lo)) * (H - 2 * P);
  const shown = ys.slice(0, k);
  const maPath = ma.slice(WIN - 1, k).map((v, i) => `${i ? 'L' : 'M'}${x(i + WIN - 1).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const flagged = k > flag;
  const live = k > WIN ? ((ma[k - 1] - ma[WIN - 1]) / ma[WIN - 1]) * 100 : 0;
  const stage = k < N * 0.35 ? 0 : !flagged ? 1 : 2;
  const stages = ['Data', 'Signal', 'Decision'];

  return (
    <figure className="sigp" aria-label={`Demonstration on synthetic data: a ${N}-point series, its ${WIN}-point trend (${chg >= 0 ? '+' : ''}${chg.toFixed(1)}% over the window) and one flagged outlier at z = ${z[flag].toFixed(1)}.`}>
      <div className="sigp-head">
        <span className="sigp-live"><i />Live demo</span>
        <span className="mono muted">synthetic series · {N} pts</span>
      </div>
      <ol className="sigp-stages" aria-hidden="true">
        {stages.map((s, i) => <li key={s} className={i <= stage ? 'on' : ''}>{s}</li>)}
      </ol>
      <svg viewBox={`0 0 ${W} ${H}`} className="sigp-svg" aria-hidden="true">
        <defs>
          <linearGradient id="sigFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#6fd3f2" stopOpacity="0.22" />
            <stop offset="1" stopColor="#6fd3f2" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(t => <line key={t} x1={P} x2={W - P} y1={P + t * (H - 2 * P)} y2={P + t * (H - 2 * P)} stroke="rgba(186,204,228,0.07)" />)}
        {shown.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={1.7} fill={i === flag && flagged ? '#e8bd6a' : 'rgba(200,212,228,0.5)'} />)}
        {k > WIN && <path d={`${maPath} L${x(k - 1).toFixed(1)},${H - P} L${x(WIN - 1).toFixed(1)},${H - P} Z`} fill="url(#sigFill)" />}
        {k > WIN && <path d={maPath} fill="none" stroke="#6fd3f2" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {k > WIN && <circle cx={x(k - 1)} cy={y(ma[k - 1])} r="3.5" fill="#6fd3f2" />}
        {flagged && (
          <g className="sigp-flag">
            <circle cx={x(flag)} cy={y(ys[flag])} r="9" fill="none" stroke="#e8bd6a" strokeWidth="1.4" />
            <line x1={x(flag)} x2={x(flag)} y1={y(ys[flag]) - 10} y2={P + 4} stroke="rgba(232,189,106,0.5)" strokeDasharray="2 3" />
          </g>
        )}
      </svg>
      <dl className="sigp-read">
        <div><dt>Trend</dt><dd className={live >= 0 ? 'up' : 'down'}>{k > WIN ? `${live >= 0 ? '+' : ''}${live.toFixed(1)}%` : '—'}</dd></div>
        <div><dt>Outlier</dt><dd className={flagged ? 'watch' : ''}>{flagged ? `z = ${z[flag].toFixed(1)}` : 'scanning'}</dd></div>
        <div><dt>Next step</dt><dd>{flagged ? 'Review #' + (flag + 1) : '—'}</dd></div>
      </dl>
    </figure>
  );
}
