/**
 * Conceptual previews for L//IOS. These are illustrations built in code with
 * synthetic numbers — not screenshots of the real applications — and every one
 * is labeled that way on the page.
 */
import { rng } from '../lab/engine';

function spark(seed: number, n: number, drift: number) {
  const r = rng(seed);
  let v = 50;
  return Array.from({ length: n }, () => (v += (r() - 0.5 + drift) * 6));
}
function path(vals: number[], w: number, h: number, pad = 2) {
  const lo = Math.min(...vals), hi = Math.max(...vals);
  return vals.map((v, i) => `${i ? 'L' : 'M'}${(pad + (i * (w - 2 * pad)) / (vals.length - 1)).toFixed(1)},${(h - pad - ((v - lo) / (hi - lo || 1)) * (h - 2 * pad)).toFixed(1)}`).join(' ');
}

const Label = ({ text = 'Conceptual preview · synthetic data' }: { text?: string }) => <span className="preview-label">{text}</span>;

export function IntelligencePreview({ compact = false }: { compact?: boolean }) {
  const sectors: [string, number][] = [['AI Infra', 3.4], ['Semis', -1.2], ['Nuclear', 5.1], ['Robotics', 0.8], ['Cyber', 1.9], ['Mega-cap', -0.4]];
  const color = (x: number) => x >= 0 ? `rgba(99,214,160,${0.18 + Math.min(x, 6) / 9})` : `rgba(242,139,139,${0.18 + Math.min(-x, 6) / 9})`;
  const a = spark(11, 40, 0.12), b = spark(29, 40, 0.03);
  return (
    <div className={`mock mock-desk preview${compact ? ' compact' : ''}`} role="img" aria-label="Conceptual preview of L//IOS Intelligence with synthetic sector data">
      <Label />
      <div className="mock-chrome"><i /><i /><i /><span>lios / intelligence</span></div>
      <div className="mock-grid" style={compact ? { gridTemplateColumns: '1fr', minHeight: 0 } : undefined}>
        {!compact && (
          <div className="mock-side">
            {['Overview', 'Sectors', 'Compare', 'Narratives', 'Watchlist'].map((x, i) => <div key={x} className={i === 1 ? 'on' : ''}>{x}</div>)}
          </div>
        )}
        <div className="mock-main">
          <div className="heat">
            {sectors.map(([n, v]) => <div key={n} style={{ background: color(v) }} title={`${n} ${v}%`}>{n}<br />{v > 0 ? '+' : ''}{v.toFixed(1)}%</div>)}
          </div>
          <svg viewBox="0 0 300 70" width="100%" aria-hidden="true">
            <path d={path(a, 300, 70)} fill="none" stroke="#b7a8ff" strokeWidth="1.5" />
            <path d={path(b, 300, 70)} fill="none" stroke="#6c7789" strokeWidth="1.2" strokeDasharray="3 3" />
          </svg>
          <div className="mock-ask">Compare AI infrastructure with semiconductors this quarter</div>
          <div className="mock-ans">AI infrastructure outperformed in the sample period while semiconductors lagged after a mid-quarter drawdown. <span style={{ color: '#6c7789' }}>(illustrative text)</span></div>
        </div>
      </div>
    </div>
  );
}

function Ring({ v, color }: { v: number; color: string }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(186,204,228,0.12)" strokeWidth="6" />
      <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} transform="rotate(-90 32 32)" />
    </svg>
  );
}

export function HealthPreview({ single = false }: { single?: boolean }) {
  const lift = [100, 102.5, 102.5, 105, 107.5, 107.5, 110, 112.5];
  return (
    <div className="preview" style={{ background: 'transparent', border: 0, overflow: 'visible', width: '100%' }} role="img" aria-label="Conceptual preview of the L//IOS Health mobile app with synthetic sample data">
      <Label />
      <div className="phones" style={{ paddingTop: 22 }}>
        <div className="phone">
          <div className="phone-scr">
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>TODAY · SAMPLE</span>
            <h5>Performance</h5>
            <div className="ph-card" style={{ gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: 10 }}>
              <Ring v={0.72} color="#6fd3f2" />
              <div style={{ display: 'grid', gap: 2 }}><span style={{ fontSize: 9 }}>Readiness</span><span className="big">72</span></div>
            </div>
            <div className="ph-card">
              <span style={{ fontSize: 9 }}>Squat · est. 1RM (kg)</span>
              <span className="big">112.5 <span className="up" style={{ fontSize: 10 }}>+12.5</span></span>
              <svg viewBox="0 0 150 34" aria-hidden="true"><path d={path(lift, 150, 34)} fill="none" stroke="#6fd3f2" strokeWidth="1.6" /></svg>
            </div>
            <div className="ph-card"><span style={{ fontSize: 9 }}>5 km run</span><span className="big">24:38</span><span style={{ fontSize: 9 }}>4:56 /km avg</span></div>
          </div>
        </div>
        {!single && (
          <div className="phone">
            <div className="phone-scr">
              <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>NUTRITION · SAMPLE</span>
              <h5>Lunch, estimated</h5>
              <div className="ph-card" style={{ background: 'linear-gradient(135deg,#1d2633,#121821)', height: 70, placeItems: 'center' }}>
                <span style={{ fontSize: 9, color: 'var(--ink-3)' }}>photo analysed</span>
              </div>
              <div className="ph-card"><span style={{ fontSize: 9 }}>Calories</span><span className="big">640</span></div>
              {[['Protein', 42, 0.7, '#63d6a0'], ['Carbs', 58, 0.55, '#6fd3f2'], ['Fat', 22, 0.4, '#b7a8ff']].map(([n, g, p, c]) => (
                <div key={n as string} style={{ display: 'grid', gap: 3 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}><span>{n}</span><span>{g} g</span></div>
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}><div style={{ width: `${(p as number) * 100}%`, height: '100%', borderRadius: 2, background: c as string }} /></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function DataPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`mock mock-desk preview${compact ? ' compact' : ''}`} role="img" aria-label="Conceptual preview of L//IOS Data Intelligence with synthetic data">
      <Label />
      <div className="mock-chrome"><i /><i /><i /><span>lios / data</span></div>
      <div className="mock-grid" style={compact ? { gridTemplateColumns: '1fr', minHeight: 0 } : undefined}>
        {!compact && (
          <div className="mock-side">
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', padding: '0 8px' }}>DATASETS</span>
            {['trades.csv', 'clients.xlsx', 'desks.csv', 'fx_rates.csv'].map((x, i) => <div key={x} className={i === 0 ? 'on' : ''}>{x}</div>)}
          </div>
        )}
        <div className="mock-main">
          <div className="dq">
            <div><span>Rows</span><b>48,210</b></div>
            <div><span>Complete</span><b className="up">99.2%</b></div>
            <div><span>Rule breaks</span><b className="watch">37</b></div>
          </div>
          <div className="join"><span>trades.client_id</span><em>⟷ suggested join · 98% match</em><span>clients.id</span></div>
          <div className="ins-mini">Credit volume in week 32 is 2.4σ above its 12-week average. 3 clients account for 61% of the change. <span style={{ color: '#6c7789' }}>View 214 records →</span></div>
          {!compact && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{['profiled', 'validated', 'joined', 'explained'].map((s, i) => <span key={s} className="chip" style={{ borderColor: i < 3 ? 'rgba(111,211,242,0.35)' : undefined }}>{i < 3 ? '✓ ' : ''}{s}</span>)}</div>}
        </div>
      </div>
    </div>
  );
}
