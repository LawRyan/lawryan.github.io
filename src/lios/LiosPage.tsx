import { useEffect, useState } from 'react';
import { lios } from '../content';
import HeroSignals from '../components/HeroSignals';
import { Nav, Footer, Review, Status, useReveal, Eyebrow, Brand, type NavItem } from '../components/common';
import { Shot, ShotGallery } from '../components/Shot';
import LoopDiagram from '../components/LoopDiagram';

const NAV: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '#vision', label: 'Vision', id: 'vision' },
  { href: '#ecosystem', label: 'Applications', id: 'ecosystem' },
  { href: '#principles', label: 'Principles', id: 'principles' },
  { href: '#technology', label: 'Technology', id: 'technology' },
  { href: '#roadmap', label: 'Roadmap', id: 'roadmap' },
  { href: '/#contact', label: 'Contact' },
];

const ALIAS: Record<string, string> = { intelligence: 'markets', analyst: 'data' };
const uses = (stack: string[], t: string) => stack.some(s => s.toLowerCase().startsWith(t.toLowerCase()));

export default function LiosPage() {
  useReveal();
  const ids = lios.pillars.map(p => p.id);
  const fromHash = () => { const h = location.hash.slice(1); const id = ALIAS[h] || h; return ids.includes(id) ? id : null; };
  const [sel, setSel] = useState(ids[0]);
  useEffect(() => {
    const jump = () => {
      const id = fromHash();
      if (id) { setSel(id); requestAnimationFrame(() => document.getElementById('ecosystem')?.scrollIntoView()); }
      else if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
    };
    jump();
    document.fonts?.ready.then(() => { if (location.hash) jump(); });
    window.addEventListener('hashchange', jump);
    return () => window.removeEventListener('hashchange', jump);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const p = lios.pillars.find(x => x.id === sel)!;
  const i = ids.indexOf(sel);
  const pick = (id: string) => { setSel(id); history.replaceState(null, '', `#${id}`); };
  const hero = lios.pillars[0].shots[0];

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <div className="aurora aurora-lios" aria-hidden="true"><i /><i /><i /></div>
      <Nav items={NAV} home="/" />
      <main id="main" className="lp">
        <section className="lp-hero lios-sec" aria-labelledby="lp-h">
          <HeroSignals tint="lios" />
          <div className="wrap">
            <Eyebrow tone="lios">An independent project by Ryan Law</Eyebrow>
            <h1 id="lp-h" className="lp-word"><span className="wordmark">L<span className="sl">//</span>IOS</span><span className="sr-only">: {lios.tagline}</span></h1>
            <div className="lp-hero-row">
              <p className="tag" aria-hidden="true">{lios.tagline}</p>
              <div>
                <p className="statement">{lios.statement}</p>
                <div className="hero-ctas">
                  <a className="btn btn-lios" href="#ecosystem">See the applications <span className="arr" aria-hidden="true">↓</span></a>
                  <a className="btn" href="/#lab">Try the Intelligence Lab <span className="arr" aria-hidden="true">→</span></a>
                </div>
              </div>
            </div>
            <div className="lp-showcase">
              <Shot shot={hero} eager sizes="(max-width: 1300px) 100vw, 1240px" />
            </div>
            <ul className="lp-index" aria-label="The three applications">
              {lios.pillars.map((x, n) => (
                <li key={x.id}><a href={`#${x.id}`} onClick={e => { e.preventDefault(); pick(x.id); document.getElementById('ecosystem')?.scrollIntoView({ behavior: 'smooth' }); }}>
                  <span className="mono">0{n + 1}</span><b>{x.short}</b><span>{x.line}</span><Status s={x.status} />
                </a></li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section" id="vision" aria-labelledby="vision-h">
          <div className="wrap vision">
            <div className="rv">
              <Eyebrow tone="lios">Vision</Eyebrow>
              <h2 id="vision-h" className="h-display">Less navigating. More <span className="serif" style={{ color: 'var(--lios)' }}>understanding</span>.</h2>
            </div>
            <div className="copy rv">
              {lios.vision.map(v => <p key={v.slice(0, 16)}>{v}</p>)}
              <figure className="thesis lp-thesis">
                <span className="q" aria-hidden="true">“</span>
                <blockquote>The future of analytics isn’t more dashboards. It’s systems that <em>understand the data</em> and tell us what matters.</blockquote>
              </figure>
            </div>
          </div>
          <div className="wrap"><LoopDiagram large /></div>
        </section>

        <section className="section" id="ecosystem" aria-labelledby="eco-h">
          <div className="wrap">
            <div className="sec-head rv">
              <Eyebrow tone="lios" review={<Review>Confirm statuses</Review>}>Applications</Eyebrow>
              <h2 id="eco-h" className="h-section">Three applications, one way of thinking.</h2>
              <p className="lede">These are real screenshots, captured by running each app’s own QA on demo or synthetic data. None of the data shown is real.</p>
            </div>
            <div className="eco-tabs" role="tablist" aria-label="L//IOS applications">
              {lios.pillars.map((x, n) => (
                <button key={x.id} role="tab" id={`eco-${x.id}`} aria-selected={sel === x.id} aria-controls="eco-panel" tabIndex={sel === x.id ? 0 : -1}
                  onClick={() => pick(x.id)}
                  onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const m = ids[(n + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length]; pick(m); document.getElementById(`eco-${m}`)?.focus(); } }}>
                  <span className="mono">0{n + 1}</span> <Brand text={x.name} />
                </button>
              ))}
            </div>
            <div className="app" id="eco-panel" role="tabpanel" aria-labelledby={`eco-${p.id}`}>
              <div className="app-head" key={`h-${p.id}`}>
                <div>
                  <div className="eco-top"><span className="line">{p.line}</span><Status s={p.status} /></div>
                  <h3><Brand text={p.name} /></h3>
                  <p className="app-flow mono">{p.flow}</p>
                </div>
                <p className="app-body">{p.body}</p>
              </div>
              <div className={`app-stage${p.shots[0].device === 'phone' ? ' is-phone' : ''}`}>
                <ShotGallery shots={p.shots} label={`${p.name} screenshots`} />
              </div>
              <div className="app-grid" key={`g-${p.id}`}>
                <div>
                  <span className="eyebrow">Capabilities</span>
                  <ul className="caps">{p.capabilities.map(c => <li key={c.name}><span>{c.name}</span><Status s={c.status} /></li>)}</ul>
                </div>
                <div className="app-side">
                  <div>
                    <span className="eyebrow">Evidence</span>
                    <ul className="proof-list">{p.proof.map(x => <li key={x}>{x}</li>)}</ul>
                  </div>
                  <div>
                    <span className="eyebrow">Built with</span>
                    <div className="chips" style={{ marginTop: 10 }}>{p.stack.map(s => <span key={s} className="chip">{s}</span>)}</div>
                  </div>
                  {p.extra && <p className="mono muted eco-extra">{p.extra}</p>}
                  <div className="eco-pager">
                    <button onClick={() => pick(ids[(i + ids.length - 1) % ids.length])} aria-label="Previous application">←</button>
                    <span className="mono">{i + 1} / {ids.length}</span>
                    <button onClick={() => pick(ids[(i + 1) % ids.length])} aria-label="Next application">→</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="kit-legend">
              {(['Working', 'In development', 'Prototype', 'Planned'] as const).map(s => <span key={s}><Status s={s} />{s === 'Working' ? 'in the current build and tested' : s === 'In development' ? 'being built now' : s === 'Prototype' ? 'early, works with limits' : 'future direction'}</span>)}
            </div>
          </div>
        </section>

        <section className="section philo" id="principles" aria-labelledby="pp-h">
          <div className="wrap">
            <div className="sec-head rv">
              <Eyebrow tone="lios">Product principles</Eyebrow>
              <h2 id="pp-h" className="h-section">The rules every L//IOS app follows.</h2>
            </div>
            <ol className="pp-grid">
              {lios.philosophy.map((x, n) => (
                <li key={x.t} className="rv" style={{ ['--i' as string]: n }}>
                  <span className="pp-n mono">0{n + 1}</span>
                  <h3>{x.t}</h3>
                  <p>{x.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section" id="technology" aria-labelledby="tech-h">
          <div className="wrap">
            <div className="sec-head rv">
              <Eyebrow tone="lios">Technology</Eyebrow>
              <h2 id="tech-h" className="h-section">The foundations.</h2>
              <p className="lede">{lios.techNote}</p>
            </div>
            <div className="tech-matrix rv" data-allow-overflow>
              <table>
                <caption className="sr-only">Technologies by application</caption>
                <thead><tr><th scope="col">Technology</th>{lios.pillars.map(x => <th key={x.id} scope="col">{x.short}</th>)}</tr></thead>
                <tbody>
                  {lios.tech.filter(t => lios.pillars.some(x => uses(x.stack, t))).map(t => (
                    <tr key={t}>
                      <th scope="row">{t}</th>
                      {lios.pillars.map(x => {
                        const has = uses(x.stack, t);
                        return <td key={x.id}><span className={has ? 'dot-on' : 'dot-off'} aria-hidden="true" /><span className="sr-only">{has ? 'used' : 'not used'}</span></td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="section" id="roadmap" aria-labelledby="road-h">
          <div className="wrap">
            <div className="sec-head rv">
              <Eyebrow tone="lios">Roadmap</Eyebrow>
              <h2 id="road-h" className="h-section">Where it’s heading.</h2>
              <p className="lede">These are directions, not finished capabilities.</p>
            </div>
            <ol className="roadmap rv">{lios.roadmap.map(r => <li key={r.t}><span className="status status-plan">Next</span><b>{r.t}</b><p>{r.d}</p></li>)}</ol>
            <p className="disclaimer">{lios.disclaimer}</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
