import { useState } from 'react';
import { lios } from '../content';

/**
 * "One loop, three domains": the shared way of thinking behind every L//IOS app.
 * This is a product concept diagram, not a technical architecture.
 */
export default function LoopDiagram({ large = false }: { large?: boolean }) {
  const [domain, setDomain] = useState<'markets' | 'health' | 'data'>('data');
  const [stage, setStage] = useState(0);
  const L = lios.loop;
  const R = 112, C = 150;
  const pt = (i: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / L.length;
    return [C + R * Math.cos(a), C + R * Math.sin(a)];
  };
  const names = { markets: 'Markets', health: 'Health', data: 'Analyst' };
  return (
    <div className={`loop rv${large ? ' loop-lg' : ''}`}>
      <div className="loop-fig">
        <svg viewBox="0 0 300 300" role="img" aria-label={`The L//IOS loop: ${L.map(s => s.k).join(', ')}, then back to the start.`}>
          <defs>
            <linearGradient id="loopG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#b7a8ff" /><stop offset="1" stopColor="#6fd3f2" />
            </linearGradient>
          </defs>
          <circle cx={C} cy={C} r={R} fill="none" stroke="rgba(186,204,228,0.12)" strokeWidth="1" />
          <circle className="loop-run" cx={C} cy={C} r={R} fill="none" stroke="url(#loopG)" strokeWidth="1.6" strokeDasharray="60 644" strokeLinecap="round" />
          <text x={C} y={C - 4} textAnchor="middle" className="loop-core">L//IOS</text>
          <text x={C} y={C + 16} textAnchor="middle" className="loop-sub">{names[domain]}</text>
          {L.map((s, i) => {
            const [x, y] = pt(i);
            const on = i === stage;
            return (
              <g key={s.k} className={`loop-node${on ? ' on' : ''}`} onMouseEnter={() => setStage(i)} onClick={() => setStage(i)}>
                <circle cx={x} cy={y} r={on ? 9 : 6} />
                <text x={x} y={y + (y > C ? 26 : -16)} textAnchor="middle">{s.k}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="loop-copy">
        <span className="eyebrow"><b style={{ color: 'var(--lios)' }}>//</b>One loop, three domains · concept</span>
        <h3>Each app runs the same five steps on a different kind of data.</h3>
        <div className="seg" role="group" aria-label="Domain">
          {(['data', 'markets', 'health'] as const).map(d => (
            <button key={d} aria-pressed={domain === d} onClick={() => setDomain(d)}>{names[d]}</button>
          ))}
        </div>
        <ol className="loop-steps">
          {L.map((s, i) => (
            <li key={s.k} className={i === stage ? 'on' : undefined}>
              <button onClick={() => setStage(i)} onFocus={() => setStage(i)}>
                <b>{s.k}</b>
                <span>{lios.domains[domain][s.k]}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
