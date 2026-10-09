import { useEffect, useState, type ReactElement } from 'react';
import { lios } from '../content';
import { Nav, Footer, SectionHead, SignalField, Review, Status, useReveal, type NavItem } from '../components/common';
import { IntelligencePreview, HealthPreview, DataPreview } from '../components/previews';

const NAV: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '#vision', label: 'Vision', id: 'vision' },
  { href: '#ecosystem', label: 'Ecosystem', id: 'ecosystem' },
  { href: '#technology', label: 'Technology', id: 'technology' },
  { href: '#roadmap', label: 'Roadmap', id: 'roadmap' },
  { href: '/#lab', label: 'Lab' },
  { href: '/#contact', label: 'Contact' },
];

const PREVIEW: Record<string, () => ReactElement> = {
  intelligence: () => <IntelligencePreview />,
  health: () => <HealthPreview />,
  data: () => <DataPreview />,
};

export default function LiosPage() {
  useReveal();
  const ids = lios.pillars.map(p => p.id);
  const fromHash = () => (ids.includes(location.hash.slice(1)) ? location.hash.slice(1) : ids[0]);
  const [sel, setSel] = useState(fromHash);
  useEffect(() => {
    const onHash = () => { if (ids.includes(location.hash.slice(1))) { setSel(fromHash()); document.getElementById('ecosystem')?.scrollIntoView(); } };
    if (ids.includes(location.hash.slice(1))) setTimeout(() => document.getElementById('ecosystem')?.scrollIntoView(), 50);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const p = lios.pillars.find(x => x.id === sel)!;

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Nav items={NAV} home="/" />
      <main id="main">
        <section className="lp-hero lios-sec" aria-labelledby="lp-h">
          <SignalField tint="lios" density={26} />
          <div className="wrap">
            <div className="eyebrow" style={{ marginBottom: 24 }}><b style={{ color: 'var(--lios)' }}>//</b>An independent project by Ryan Law</div>
            <h1 id="lp-h"><span className="wordmark" aria-label="L//IOS">L<span className="sl">//</span>IOS</span></h1>
            <p className="tag">{lios.tagline}</p>
            <p className="statement">{lios.statement}</p>
            <div className="hero-ctas">
              <a className="btn btn-lios" href="#ecosystem">See the ecosystem <span className="arr">↓</span></a>
              <a className="btn" href="/#lab">Try the Intelligence Lab <span className="arr">→</span></a>
            </div>
          </div>
        </section>

        <section className="section" id="vision" aria-labelledby="vision-h">
          <div className="wrap vision">
            <div className="rv">
              <div className="eyebrow"><b style={{ color: 'var(--lios)' }}>//</b>Vision</div>
              <h2 id="vision-h" className="h-section" style={{ marginTop: 18 }}>Less navigating. More <span className="serif" style={{ color: 'var(--lios)' }}>understanding</span>.</h2>
            </div>
            <div className="copy rv">
              {lios.vision.map(v => <p key={v.slice(0, 16)}>{v}</p>)}
              <figure className="thesis" style={{ margin: '12px 0 0', gridTemplateColumns: '2.4rem minmax(0,1fr)' }}>
                <span className="q" aria-hidden="true">“</span>
                <blockquote style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2.2rem)' }}>The future of analytics isn’t more dashboards. It’s systems that <em>understand the data</em> and tell us what matters.</blockquote>
              </figure>
            </div>
          </div>
        </section>

        <section className="section" id="ecosystem" aria-labelledby="eco-h">
          <div className="wrap">
            <SectionHead eyebrow="Ecosystem" title={<span id="eco-h">Three applications, one idea.</span>} lede="Each application is in active development. Previews are conceptual and use synthetic data; statuses show what is being built versus what is planned." review={<Review>Confirm statuses & stacks</Review>} />
            <div className="eco-tabs" role="tablist" aria-label="L//IOS applications">
              {lios.pillars.map(x => (
                <button key={x.id} role="tab" id={`eco-${x.id}`} aria-selected={sel === x.id} aria-controls="eco-panel"
                  onClick={() => { setSel(x.id); history.replaceState(null, '', `#${x.id}`); }}>{x.name}</button>
              ))}
            </div>
            <div className="eco rv" id="eco-panel" role="tabpanel" aria-labelledby={`eco-${p.id}`}>
              <div className="eco-info" key={p.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}><span className="line">{p.line}</span><Status s={p.status} /></div>
                <h3>{p.name}</h3>
                <p className="muted">{p.body}</p>
                {p.extra && <p className="mono muted" style={{ fontSize: '0.75rem', lineHeight: 1.6 }}>{p.extra}</p>}
                <div>
                  <span className="eyebrow">Capabilities</span>
                  <ul className="caps" style={{ marginTop: 10 }}>{p.capabilities.map(c => <li key={c.name}><span>{c.name}</span><Status s={c.status} /></li>)}</ul>
                </div>
                <div>
                  <span className="eyebrow">Built with</span>
                  <div className="chips" style={{ marginTop: 10 }}>{p.stack.map(s => <span key={s} className="chip">{s}</span>)}</div>
                </div>
              </div>
              <div className="eco-stage xp-anim" key={`s-${p.id}`}>{PREVIEW[p.id]()}</div>
            </div>
            <div className="kit-legend" style={{ marginTop: 16 }}>
              {(['In development', 'Prototype', 'Planned'] as const).map(s => <span key={s} className="muted" style={{ fontSize: '0.85rem', display: 'inline-flex', gap: 8, alignItems: 'center' }}><Status s={s} />{s === 'In development' ? 'being built now' : s === 'Prototype' ? 'early working version' : 'future direction'}</span>)}
            </div>
          </div>
        </section>

        <section className="section" id="technology" aria-labelledby="tech-h">
          <div className="wrap">
            <SectionHead eyebrow="Technology" title={<span id="tech-h">The foundations.</span>} lede={lios.techNote} review={<Review>Confirm</Review>} />
            <div className="tech rv">{lios.tech.map(t => <span key={t}>{t}</span>)}</div>
          </div>
        </section>

        <section className="section" id="roadmap" aria-labelledby="road-h">
          <div className="wrap">
            <SectionHead eyebrow="Roadmap" title={<span id="road-h">Where it’s heading.</span>} lede="These are future directions, not finished capabilities." />
            <ol className="roadmap rv">{lios.roadmap.map(r => <li key={r.t}><span className="status status-plan" style={{ justifySelf: 'start' }}>Future</span><b>{r.t}</b><p>{r.d}</p></li>)}</ol>
            <p className="disclaimer">{lios.disclaimer}</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
