import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  REVIEW_MODE, site, contact, story, experience, metrics, cases, expertise, principles, lios, projects, type Level, type Project,
} from '../content';
import HeroSignals from '../components/HeroSignals';
import ScrollThread from '../components/ScrollThread';
import CaseVisual from '../components/CaseVisual';

const THREAD: [string, string][] = [['about', 'About'], ['experience', 'Experience'], ['impact', 'Impact'], ['expertise', 'Expertise'], ['lios', 'L//IOS'], ['lab', 'Lab'], ['philosophy', 'Principles'], ['projects', 'Projects'], ['contact', 'Contact']];
import { Nav, Footer, Intro, SignalField, Review, Status, useReveal, Eyebrow, Brand, type NavItem } from '../components/common';
import SignalPanel from '../components/SignalPanel';
import LoopDiagram from '../components/LoopDiagram';
import { Shot } from '../components/Shot';
const AnalystLab = lazy(() => import('../lab/AnalystLab'));

export const HOME_NAV: NavItem[] = [
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
  useHashOnLoad();
  return (
    <>
      <Intro />
      <a className="skip" href="#main">Skip to content</a>
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <Nav items={HOME_NAV} home="#home" />
      <ScrollThread sections={THREAD} />
      <main id="main">
        <Hero />
        <Story />
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

/** Content is rendered by script, so jump to a #section once it exists. */
function useHashOnLoad() {
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    const go = () => document.getElementById(id)?.scrollIntoView({ block: 'start' });
    requestAnimationFrame(go);
    document.fonts?.ready.then(go);
  }, []);
}

function Hero() {
  return (
    <section className="hero" id="home" aria-labelledby="hero-h">
      <HeroSignals />
      <div className="wrap">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="hero-name"><span className="live-dot" aria-hidden="true" />{site.name}</p>
            <h1 id="hero-h" className="hero-h">
              {site.headline.lead} <span className="serif">{site.headline.em}</span> {site.headline.tail}
            </h1>
            <p className="hero-role"><strong>{site.title}</strong><Review /></p>
            <p className="hero-tags">{site.roles.map((r, i) => <span key={r}>{r}{i < site.roles.length - 1 && <i aria-hidden="true">/</i>}</span>)}</p>
            <div className="hero-ctas">
              <a className="btn btn-primary" href="#impact">Explore my work <span className="arr" aria-hidden="true">→</span></a>
              <a className="btn btn-lios" href="/lios/">Discover L//IOS <span className="arr" aria-hidden="true">→</span></a>
            </div>
          </div>
          <div className="hero-viz"><SignalPanel /></div>
        </div>
        <dl className="proof" aria-label="Selected outcomes">
          {metrics.map(m => (
            <div key={m.label}>
              <dt>{m.label}</dt>
              <dd><span className="v">{m.value}</span><span className="n">{m.note}</span></dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Story() {
  return (
    <section className="section story" id="about" aria-labelledby="about-h">
      <div className="wrap">
        <div className="story-grid">
          <div className="rv">
            <Eyebrow>About</Eyebrow>
            <h2 id="about-h" className="h-display">{story.statement}</h2>
          </div>
          <div className="story-copy rv">
            <p className="lead">{site.intro}</p>
            {story.paragraphs.map(p => <p key={p.slice(0, 18)}>{p}</p>)}
          </div>
        </div>
        <figure className="why rv">
          <p className="why-lead">{story.why.lead}</p>
          <blockquote>{story.why.q}</blockquote>
          <figcaption>{story.why.tail} <a className="link-arrow" href="#lios">See L//IOS <span className="arr" aria-hidden="true">↓</span></a></figcaption>
        </figure>
      </div>
    </section>
  );
}

const T0 = 2013, T1 = 2026.9;
const pos = (t: number) => ((t - T0) / (T1 - T0)) * 100;

function Experience() {
  const [sel, setSel] = useState(experience[0].id);
  const r = experience.find(x => x.id === sel)!;
  const order = [...experience].sort((a, b) => a.from - b.from);
  const move = (dir: number) => {
    const i = order.findIndex(x => x.id === sel);
    const n = order[(i + dir + order.length) % order.length];
    setSel(n.id);
    document.getElementById(`tl-${n.id}`)?.focus();
  };
  const years = Array.from({ length: 14 }, (_, i) => T0 + i);
  return (
    <section className="section" id="experience" aria-labelledby="xp-h">
      <div className="wrap">
        <div className="sec-head rv">
          <Eyebrow>Experience</Eyebrow>
          <h2 id="xp-h" className="h-section">Where the business meets the build.</h2>
          <p className="lede">I bridge business requirements and technical execution: understanding what a markets team needs, then building and validating the systems that deliver it.</p>
        </div>
        <div className="tl2 rv" role="tablist" aria-label="Career timeline, 2013 to today" aria-orientation="vertical" onKeyDown={e => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); move(-1); }
          if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); move(1); }
        }}>
          {[...order].reverse().map(x => {
            const to = x.to === null ? T1 : x.to;
            const band = to !== undefined;
            return (
              <button key={x.id} id={`tl-${x.id}`} role="tab" aria-selected={sel === x.id} aria-controls="tl-panel" tabIndex={sel === x.id ? 0 : -1}
                className={`tl2-row tl2-${x.kind}`} onClick={() => setSel(x.id)}>
                <span className="tl2-lbl"><b>{x.title}</b><span>{x.org}</span></span>
                <span className="tl2-when mono">{x.when}</span>
                <span className="tl2-track" aria-hidden="true">
                  {band
                    ? <span className="tl2-bar" style={{ left: `${pos(x.from)}%`, width: `${pos(to!) - pos(x.from)}%` }} />
                    : <span className="tl2-dot" style={{ left: `${pos(x.from)}%` }} />}
                </span>
              </button>
            );
          })}
          <div className="tl2-axis" aria-hidden="true">
            <span /><span />
            <span className="tl2-years">{years.filter(y => y % 2 === 1 || y === T0).map(yv => <i key={yv} style={{ left: `${pos(yv)}%` }}>{yv}</i>)}</span>
          </div>
        </div>
        <div className="tl-panel" id="tl-panel" role="tabpanel" aria-labelledby={`tl-${r.id}`}>
          <div key={r.id} className="xp-anim tl-panel-in">
            <div>
              <span className="mono muted">{r.when}</span>
              <h3>{r.title}</h3>
              <p className="org">{r.org} {r.flag && <Review>{r.flag}</Review>}</p>
            </div>
            <div>
              <p className="sum">{r.summary}</p>
              {r.points.length > 0 && <ul className="scope" aria-label="Scope">{r.points.map(p => <li key={p}>{p}</li>)}</ul>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Impact() {
  const [sel, setSel] = useState(cases[0].id);
  const c = cases.find(x => x.id === sel)!;
  const rows: [string, string][] = [['Problem', c.problem], ['My contribution', c.contribution], ['Approach', c.approach], ['Impact', c.impact]];
  return (
    <section className="section impact" id="impact" aria-labelledby="impact-h">
      <div className="wrap">
        <div className="sec-head rv">
          <Eyebrow review={<Review>Employer metrics</Review>}>Impact</Eyebrow>
          <h2 id="impact-h" className="h-section">Reliable data, less manual work, <span className="serif">clearer</span> answers.</h2>
          <p className="lede">Selected work from Capital Markets, described in general terms. No client, trade or proprietary detail is shown.</p>
        </div>
        <div className="cs rv">
          <div className="cs-list" role="tablist" aria-label="Case studies" aria-orientation="vertical">
            {cases.map((x, i) => (
              <button key={x.id} id={`cs-${x.id}`} role="tab" aria-selected={sel === x.id} aria-controls="cs-panel" onClick={() => setSel(x.id)}>
                <span className="cs-n">{String(i + 1).padStart(2, '0')}</span>
                <span><span className="cs-k">{x.k}</span><span className="cs-t">{x.title}</span></span>
              </button>
            ))}
          </div>
          <article className="cs-panel" id="cs-panel" role="tabpanel" aria-labelledby={`cs-${c.id}`}>
            <div key={c.id} className="xp-anim">
              <h3>{c.title}</h3>
              <CaseVisual id={c.id} />
              <dl>{rows.map(([k, v]) => <div key={k} className={k === 'Impact' ? 'hl' : undefined}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
              <div className="chips">{c.tags.map(t => <span key={t} className="chip">{t}</span>)}</div>
            </div>
          </article>
        </div>
        <div className="flow rv" aria-label="The general pattern I use for data controls">
          <span className="eyebrow">The pattern behind it · general, not employer-specific</span>
          <ol className="flow-steps">
            {[['Ingest', 'source feeds'], ['Reconcile', 'match & align'], ['Validate', 'rules engine'], ['Resolve', 'exceptions'], ['Report', 'certified output']].map(([b, s], i) => (
              <li key={b} className="flow-step" style={{ ['--i' as string]: i }}><b>{b}</b><span>{s}</span></li>
            ))}
          </ol>
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
        <div className="sec-head rv">
          <Eyebrow>Expertise</Eyebrow>
          <h2 id="exp-h" className="h-section">Markets knowledge, data discipline, and the tools to build.</h2>
        </div>
        <div className="kit rv">
          {expertise.map(g => (
            <div key={g.group} className="kit-col">
              <h3>{g.group}</h3>
              <ul>{g.items.map(([n, l]) => <li key={n}><span>{n}</span><span className={`lvl lvl-${l}`}>{l}</span></li>)}</ul>
            </div>
          ))}
        </div>
        <div className="kit-legend">
          {levels.map(([l, d]) => <span key={l}><span className={`lvl lvl-${l}`}>{l}</span>{d}</span>)}
        </div>
      </div>
    </section>
  );
}

function Lios() {
  return (
    <section className="section lios-sec" id="lios" aria-labelledby="lios-h">
      <div className="wrap">
        <Eyebrow tone="lios">Independent project · Flagship</Eyebrow>
        <div className="lios-intro">
          <h2 id="lios-h" className="rv"><span className="wordmark">L<span className="sl">//</span>IOS</span><span className="sr-only">: {lios.tagline}</span></h2>
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
        <div className="feature rv">
          <div className="feature-copy">
            <div className="pillar-top"><span className="eyebrow eyebrow-lios"><b aria-hidden="true">//</b>01 · {lios.pillars[0].line}</span><Status s={lios.pillars[0].status} /></div>
            <h3><Brand text={lios.pillars[0].name} /></h3>
            <p>{lios.pillars[0].body}</p>
            <p className="app-flow mono">{lios.pillars[0].flow}</p>
            <ul className="proof-list">{lios.pillars[0].proof.slice(0, 3).map(x => <li key={x}>{x}</li>)}</ul>
            <div className="lios-ctas" style={{ marginTop: 6 }}>
              <a className="link-arrow" href="/lios/#data">See it in depth <span className="arr" aria-hidden="true">→</span></a>
              <a className="link-arrow" href="#lab">Try it in miniature <span className="arr" aria-hidden="true">↓</span></a>
            </div>
          </div>
          <div className="feature-shot"><Shot shot={lios.pillars[0].shots[0]} sizes="(max-width: 960px) 100vw, 58vw" /></div>
        </div>
        <div className="pillars two">
          {lios.pillars.slice(1).map((p, n) => (
            <a key={p.id} href={`/lios/#${p.id}`} className={`pillar rv pillar-${p.id}`}>
              <div className="pillar-top"><span className="eyebrow">0{n + 2} · {p.short}</span><Status s={p.status} /></div>
              <h3><Brand text={p.name} /><small>{p.line}</small></h3>
              <div className="pillar-prev"><Shot shot={p.shots[0]} sizes="(max-width: 960px) 100vw, 40vw" /></div>
              <p>{p.body}</p>
              <span className="link-arrow">Explore {p.short} <span className="arr" aria-hidden="true">→</span></span>
            </a>
          ))}
        </div>
        <LoopDiagram />
        <div className="lios-ctas">
          <a className="btn btn-lios" href="/lios/">Open the L//IOS project page <span className="arr" aria-hidden="true">→</span></a>
          <a className="link-arrow" href="#lab">Try the Intelligence Lab <span className="arr" aria-hidden="true">↓</span></a>
        </div>
        <p className="disclaimer">{lios.disclaimer}</p>
      </div>
    </section>
  );
}

function LabSection() {
  return (
    <section className="section lab-sec" id="lab" aria-labelledby="lab-h">
      <div className="wrap">
        <div className="sec-head rv">
          <Eyebrow>Intelligence Lab</Eyebrow>
          <h2 id="lab-h" className="h-section">Beyond the dashboard, <span className="serif">in miniature</span>.</h2>
          <p className="lede">A hands-on version of L//IOS Analyst. Give it three files, press “Watch it run”, or try your own CSV, and see it work out the data, check it, build the dashboard and investigate what changed. Every number goes back to a row.</p>
        </div>
        <LazyLab />
      </div>
    </section>
  );
}

/** Load the Lab's code only when its section comes near, or when someone arrives at #lab. */
function LazyLab() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (show || !ref.current) return;
    if (!('IntersectionObserver' in window)) { setShow(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShow(true); io.disconnect(); } }, { rootMargin: '800px 0px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [show]);
  const ph = <div className="alab alab-ph" aria-busy="true"><span className="mono muted">Loading the Intelligence Lab…</span></div>;
  return <div ref={ref}>{show ? <Suspense fallback={ph}><AnalystLab /></Suspense> : ph}</div>;
}

function Philosophy() {
  const [morePr, setMorePr] = useState(false);
  return (
    <section className="section philo" id="philosophy" aria-labelledby="philo-h">
      <div className="wrap">
        <div className="sec-head rv">
          <Eyebrow>How I work</Eyebrow>
          <h2 id="philo-h" className="h-section">Five principles.</h2>
        </div>
        <ul className={`principles${morePr ? '' : ' fold fold-3'}`}>
          {principles.map(p => (
            <li key={p.t} className="rv">
              <span className="t"><span className="s" aria-hidden="true">//</span>{p.t}</span>
              <span className="d">{p.d}</span>
            </li>
          ))}
        </ul>
        <button className="more-btn" aria-expanded={morePr} onClick={() => setMorePr(m => !m)}>{morePr ? 'Show less' : `Show all ${principles.length} principles`}</button>
      </div>
    </section>
  );
}

function Projects() {
  const cats = ['All', 'Flagship', 'Data Analytics', 'Web Development', 'Experimental', 'Earlier'] as const;
  const [cat, setCat] = useState<(typeof cats)[number]>('All');
  const list = projects.filter(p => cat === 'All' || p.cat === cat);
  const [more, setMore] = useState(false);
  const Row = ({ p }: { p: Project }) => {
    const inner = (
      <>
        <span className="cat">{p.cat} · {p.year}</span>
        <h3><Brand text={p.name} />{p.img && <img className="thumb" src={p.img} alt={`Screenshot of ${p.name}`} loading="lazy" decoding="async" width="64" height="40" />}</h3>
        <p>{p.body}</p>
        <span className="go" aria-hidden="true">{p.href ? '↗' : ''}</span>
      </>
    );
    return (
      <li className={`proj${p.cat === 'Flagship' ? ' flag' : ''}`}>
        {p.href ? <a href={p.href} {...(p.internal ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>{inner}</a> : <div>{inner}</div>}
      </li>
    );
  };
  return (
    <section className="section" id="projects" aria-labelledby="proj-h">
      <div className="wrap">
        <div className="sec-head rv">
          <Eyebrow>Projects</Eyebrow>
          <h2 id="proj-h" className="h-section">The work, and the path to it.</h2>
          <p className="lede">L//IOS leads. The earlier builds stay as a record of how I learned: the first apps, charts and sites I made.</p>
        </div>
        <div className="filters" role="group" aria-label="Filter projects">
          {cats.map(c => <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
        </div>
        <ul className={`proj-list${more ? '' : ' fold fold-4'}`} aria-live="polite">{list.map(p => <Row key={p.name} p={p} />)}</ul>
        {list.length > 4 && <button className="more-btn" aria-expanded={more} onClick={() => setMore(m => !m)}>{more ? 'Show less' : `Show earlier work (${list.length - 4})`}</button>}
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
  ].filter(i => i.href || REVIEW_MODE);
  return (
    <section className="contact" id="contact" aria-labelledby="contact-h">
      <SignalField density={18} />
      <div className="wrap">
        <Eyebrow>Contact</Eyebrow>
        <h2 id="contact-h" className="rv">Let’s build something <span className="serif">meaningful</span>.</h2>
        <p className="contact-lede rv">Whether it’s markets data, analytics, automation or applied AI, I’m always glad to compare notes.</p>
        <div className="contact-links rv" style={{ ['--n' as string]: items.length }}>
          {items.map(i => i.href
            ? <a key={i.k} href={i.href} {...(i.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}><span className="k">{i.k}</span><span className="v">{i.v} <span aria-hidden="true">↗</span></span></a>
            : <div key={i.k} className="slot"><span className="k">{i.k}</span><span className="v"><Review>Add in content.ts</Review></span></div>)}
        </div>
      </div>
    </section>
  );
}
