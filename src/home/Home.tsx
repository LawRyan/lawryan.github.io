import { useState } from 'react';
import {
  REVIEW_MODE, site, contact, focus, evolution, about, experience, metrics, cases, expertise, principles, lios, projects, type Level, type Project,
} from '../content';
import { Nav, Footer, Intro, SectionHead, SignalField, Review, Status, useReveal, type NavItem } from '../components/common';
import { IntelligencePreview, HealthPreview, DataPreview } from '../components/previews';
import Lab from '../lab/Lab';

const NAV: NavItem[] = [
  { href: '#home', label: 'Home', id: 'home' },
  { href: '#about', label: 'About', id: 'about' },
  { href: '#experience', label: 'Experience', id: 'experience' },
  { href: '#impact', label: 'Impact', id: 'impact' },
  { href: '#lios', label: 'L//IOS', id: 'lios', lios: true },
  { href: '#projects', label: 'Projects', id: 'projects' },
  { href: '#contact', label: 'Contact', id: 'contact' },
];

export default function Home() {
  useReveal();
  return (
    <>
      <Intro />
      <a className="skip" href="#main">Skip to content</a>
      <Nav items={NAV} home="#home" />
      <main id="main">
        <Hero />
        <About />
        <Experience />
        <Impact />
        <Expertise />
        <Lios />
        <LabSection />
        <Philosophy />
        <Projects />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

function Hero() {
  return (
    <section className="hero" id="home" aria-labelledby="hero-h">
      <SignalField />
      <div className="wrap">
        <div className="hero-name">{site.name}</div>
        <h1 id="hero-h">
          {site.headline.lead} <span className="serif">{site.headline.em}</span> {site.headline.tail}
        </h1>
        <div className="hero-role">
          <strong>{site.title}</strong>
          <Review />
        </div>
        <div className="chips" style={{ marginTop: 14 }}>
          {site.roles.map(r => <span key={r} className="chip">{r}</span>)}
        </div>
        <div className="hero-ctas">
          <a className="btn btn-primary" href="#impact">Explore my work <span className="arr">→</span></a>
          <a className="btn btn-lios" href="/lios/">Discover L//IOS <span className="arr">→</span></a>
        </div>
        <div className="hero-foot">
          {focus.map(f => (
            <article key={f.k}>
              <span className="eyebrow"><b>//</b>{f.k}</span>
              <h2>{f.title}</h2>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="section" id="about" aria-labelledby="about-h">
      <div className="wrap">
        <SectionHead eyebrow="About" title={<span id="about-h">From building websites to building <span className="serif">intelligence</span>.</span>} />
        <div className="about-grid">
          <div className="about-copy rv">
            <p>{site.intro}</p>
            {about.map(p => <p key={p.slice(0, 20)}>{p}</p>)}
          </div>
          <ol className="evo" aria-label="Career progression">
            {evolution.map(e => (
              <li key={e.stage} className="rv">
                <span className="yr">{e.years}</span>
                <div>
                  <h3>{e.stage}</h3>
                  <p>{e.text}</p>
                </div>
                <span className="evo-bar" aria-hidden="true" />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Experience() {
  const [sel, setSel] = useState(experience[0].id);
  const r = experience.find(x => x.id === sel)!;
  return (
    <section className="section" id="experience" aria-labelledby="xp-h">
      <div className="wrap">
        <SectionHead eyebrow="Experience" title={<span id="xp-h">Where the business meets the build.</span>} lede="I sit between business requirements and technical execution: understanding what a markets team needs, then building and validating the systems that deliver it." />
        <div className="xp">
          <ul className="xp-list rv" role="tablist" aria-label="Career timeline" aria-orientation="vertical">
            {experience.map(x => (
              <li key={x.id} className="xp-item">
                <button role="tab" id={`tab-${x.id}`} aria-controls="xp-panel" aria-selected={sel === x.id} onClick={() => setSel(x.id)}
                  onKeyDown={e => {
                    const i = experience.findIndex(y => y.id === sel);
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                      e.preventDefault();
                      const n = experience[(i + (e.key === 'ArrowDown' ? 1 : experience.length - 1)) % experience.length];
                      setSel(n.id); document.getElementById(`tab-${n.id}`)?.focus();
                    }
                  }}>
                  <span className="xp-when">{x.when}</span>
                  <span className="xp-title">{x.title}</span>
                  <span className="xp-org">{x.org}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="xp-panel rv" id="xp-panel" role="tabpanel" aria-labelledby={`tab-${r.id}`}>
            <div key={r.id} className="xp-anim">
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="xp-when">{r.when}</span>
                {r.flag && <Review>{r.flag}</Review>}
              </div>
              <h3>{r.title}</h3>
              <div className="org">{r.org}</div>
              <p className="sum">{r.summary}</p>
              {r.points.length > 0 && <ul className="xp-points">{r.points.map(p => <li key={p}>{p}</li>)}</ul>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Impact() {
  const steps = [['Ingest', 'source feeds'], ['Reconcile', 'match & align'], ['Validate', 'rules engine'], ['Resolve', 'exceptions'], ['Report', 'certified output']];
  return (
    <section className="section" id="impact" aria-labelledby="impact-h">
      <div className="wrap">
        <SectionHead
          eyebrow="Impact"
          review={<Review>Employer metrics</Review>}
          title={<span id="impact-h">Reliable data, less manual work, <span className="serif">clearer</span> answers.</span>}
          lede="Selected outcomes from my work in Capital Markets, described in general terms. No client, trade or proprietary detail is shown."
        />
        <div className="metrics rv">
          {metrics.map(m => (
            <div key={m.label} className="metric">
              <span className="v">{m.value}</span>
              <span className="l">{m.label}</span>
              <span className="n">{m.note}</span>
            </div>
          ))}
        </div>
        <div className="cases">
          {cases.map(c => (
            <article key={c.title} className="case rv">
              <span className="eyebrow"><b>//</b>{c.k}</span>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
              <div className="chips">{c.tags.map(t => <span key={t} className="chip">{t}</span>)}</div>
            </article>
          ))}
        </div>
        <div className="flow rv" aria-label="How a data control framework works, in general terms">
          <span className="eyebrow">How I approach a data control framework · general pattern</span>
          <div className="flow-steps">
            {steps.map(([b, s], i) => <div key={b} className="flow-step" style={{ ['--i' as string]: i }}><b>{b}</b><span>{s}</span></div>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function Expertise() {
  const levels: [Level, string][] = [['Established', 'Professional depth'], ['Building', 'Actively applying'], ['Exploring', 'Learning and experimenting']];
  return (
    <section className="section" id="expertise" aria-labelledby="exp-h">
      <div className="wrap">
        <SectionHead eyebrow="Expertise" title={<span id="exp-h">Markets knowledge, data discipline, and the tools to build.</span>} />
        <div className="kit rv">
          {expertise.map(g => (
            <div key={g.group} className="kit-col">
              <h3>{g.group}</h3>
              <ul>{g.items.map(([n, l]) => <li key={n}><span>{n}</span><span className={`lvl lvl-${l}`}>{l}</span></li>)}</ul>
            </div>
          ))}
        </div>
        <div className="kit-legend">
          {levels.map(([l, d]) => <span key={l} className="muted" style={{ fontSize: '0.85rem', display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className={`lvl lvl-${l}`}>{l}</span>{d}</span>)}
        </div>
      </div>
    </section>
  );
}

function Lios() {
  const P = [IntelligencePreview, HealthPreview, DataPreview];
  return (
    <section className="section lios-sec" id="lios" aria-labelledby="lios-h">
      <div className="wrap">
        <div className="eyebrow rv" style={{ marginBottom: 20 }}><b style={{ color: 'var(--lios)' }}>//</b>Independent project · Flagship</div>
        <div className="lios-intro">
          <h2 id="lios-h" className="rv"><span className="wordmark" aria-label="L//IOS">L<span className="sl">//</span>IOS</span></h2>
          <div className="rv">
            <p className="tag">{lios.tagline}</p>
            <p>{lios.statement}</p>
          </div>
        </div>
        <figure className="thesis rv">
          <span className="q" aria-hidden="true">“</span>
          <div>
            <blockquote>The future of analytics isn’t more dashboards. It’s systems that <em>understand the data</em> and tell us what matters.</blockquote>
            <figcaption className="eyebrow">The idea behind L//IOS</figcaption>
          </div>
        </figure>
        <div className="pillars">
          {lios.pillars.map((p, i) => {
            const Prev = P[i];
            return (
              <a key={p.id} href={`/lios/#${p.id}`} className="pillar rv" style={{ textDecoration: 'none' }}>
                <div className="pillar-top"><span className="eyebrow">{p.short}</span><Status s={p.status} /></div>
                <h3>{p.name}<small>{p.line}</small></h3>
                <div style={{ minHeight: 0 }}>{i === 1 ? <HealthPreview single /> : <Prev compact />}</div>
                <p>{p.body}</p>
                <span className="link-arrow">Explore {p.short} <span className="arr">→</span></span>
              </a>
            );
          })}
        </div>
        <div style={{ marginTop: 32, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <a className="btn btn-lios" href="/lios/">Open the L//IOS project page <span className="arr">→</span></a>
          <a className="link-arrow" href="#lab">Try the Intelligence Lab <span className="arr">↓</span></a>
        </div>
        <p className="disclaimer">{lios.disclaimer}</p>
      </div>
    </section>
  );
}

function LabSection() {
  return (
    <section className="section" id="lab" aria-labelledby="lab-h">
      <div className="wrap">
        <SectionHead
          eyebrow="Intelligence Lab"
          title={<span id="lab-h">Beyond the dashboard, <span className="serif">in miniature</span>.</span>}
          lede="A small working demo of the approach behind L//IOS Data Intelligence. Change the filters and the insights recalculate. Click any insight, month or bar to see the records behind it."
        />
        <Lab />
      </div>
    </section>
  );
}

function Philosophy() {
  return (
    <section className="section philo" id="philosophy" aria-labelledby="philo-h">
      <div className="wrap">
        <SectionHead eyebrow="How I work" title={<span id="philo-h">Five principles.</span>} />
        <ul className="principles">
          {principles.map(p => (
            <li key={p.t} className="rv">
              <span className="t"><span className="s">//</span>{p.t}</span>
              <span className="d">{p.d}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Projects() {
  const cats = ['All', 'Flagship', 'Data Analytics', 'Web Development', 'Experimental', 'Earlier'] as const;
  const [cat, setCat] = useState<(typeof cats)[number]>('All');
  const list = projects.filter(p => cat === 'All' || p.cat === cat);
  const Row = ({ p }: { p: Project }) => {
    const inner = (
      <>
        <span className="cat">{p.cat} · {p.year}</span>
        <h3>{p.name}{p.img && <img className="thumb" src={p.img} alt="" loading="lazy" width="64" height="40" />}</h3>
        <p>{p.body}</p>
        <span className="go" aria-hidden="true">{p.href ? '↗' : ''}</span>
      </>
    );
    return (
      <li className={`proj rv${p.cat === 'Flagship' ? ' flag' : ''}`}>
        {p.href ? <a href={p.href} {...(p.internal ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>{inner}</a> : <div>{inner}</div>}
      </li>
    );
  };
  return (
    <section className="section" id="projects" aria-labelledby="proj-h">
      <div className="wrap">
        <SectionHead eyebrow="Projects" title={<span id="proj-h">The work, and the path to it.</span>} lede="L//IOS leads. The earlier builds stay as a record of how I learned: the first apps, charts and sites I made." />
        <div className="filters" role="group" aria-label="Filter projects">
          {cats.map(c => <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
        </div>
        <ul className="proj-list">{list.map(p => <Row key={p.name} p={p} />)}</ul>
      </div>
    </section>
  );
}

function Contact() {
  const items = [
    { k: 'LinkedIn', v: 'Ryan Law', href: contact.linkedin },
    { k: 'GitHub', v: 'lawryan', href: contact.github },
    { k: 'Email', v: contact.email, href: contact.email ? `mailto:${contact.email}` : '' },
    { k: 'Résumé', v: contact.resume ? 'Download PDF' : '', href: contact.resume },
  ];
  return (
    <section className="contact" id="contact" aria-labelledby="contact-h">
      <SignalField density={18} />
      <div className="wrap">
        <div className="eyebrow rv"><b>//</b>Contact</div>
        <h2 id="contact-h" className="rv" style={{ marginTop: 18 }}>Let’s build something <span className="serif">meaningful</span>.</h2>
        <p className="muted rv" style={{ marginTop: 20, fontSize: 'var(--step-1)', maxWidth: '34rem' }}>Whether it’s markets data, analytics, automation or applied AI, I’m always glad to compare notes.</p>
        <div className="contact-links rv" style={{ ['--n' as string]: items.filter(i => i.href || REVIEW_MODE).length }}>
          {items.filter(i => i.href || REVIEW_MODE).map(i => i.href
            ? <a key={i.k} href={i.href} {...(i.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}><span className="k">{i.k}</span><span className="v">{i.v} ↗</span></a>
            : <div key={i.k} className="slot"><span className="k">{i.k}</span><span className="v"><Review>Add in content.ts</Review></span></div>)}
        </div>
      </div>
    </section>
  );
}
