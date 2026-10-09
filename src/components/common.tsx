import { useEffect, useRef, useState, type ReactNode } from 'react';
import { REVIEW_MODE, site, type Status as StatusT } from '../content';

export function Review({ children = 'Needs approval' }: { children?: ReactNode }) {
  if (!REVIEW_MODE) return null;
  return <span className="review" title="Listed in CONTENT_REVIEW.md">{children}</span>;
}

const statusClass: Record<StatusT, string> = { 'In development': 'dev', Prototype: 'proto', Planned: 'plan', Concept: 'concept' };
export function Status({ s }: { s: StatusT }) {
  return <span className={`status status-${statusClass[s]}`}>{s}</span>;
}

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Opt-in reveal: content renders visible; once JS runs, off-screen `.rv` items fade up on entry. */
export function useReveal() {
  useEffect(() => {
    if (reducedMotion() || !('IntersectionObserver' in window)) return;
    // Only elements below the fold at load are marked pending. React never manages the
    // data-pending attribute, so re-renders can't hide content, and anything mounted later shows at once.
    const vh = window.innerHeight;
    const els = Array.from(document.querySelectorAll<HTMLElement>('.rv')).filter(el => el.getBoundingClientRect().top > vh * 0.92);
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.removeAttribute('data-pending'); io.unobserve(e.target); } }),
      { rootMargin: '0px 0px -6% 0px', threshold: 0.06 },
    );
    els.forEach(el => { el.setAttribute('data-pending', ''); io.observe(el); });
    document.documentElement.classList.add('reveal-on');
    // safety net: never leave anything hidden for long
    const t = setTimeout(() => els.forEach(el => el.removeAttribute('data-pending')), 12000);
    return () => { io.disconnect(); clearTimeout(t); };
  }, []);
}

export interface NavItem { href: string; label: string; id?: string; lios?: boolean }

export function Nav({ items, home }: { items: NavItem[]; home: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('');
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const ids = items.map(i => i.id).filter(Boolean) as string[];
    const io = new IntersectionObserver(
      es => es.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }),
      { rootMargin: '-45% 0px -50% 0px' },
    );
    ids.forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => { window.removeEventListener('scroll', onScroll); io.disconnect(); };
  }, [items]);
  useEffect(() => {
    document.documentElement.classList.toggle('nav-open', open);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <header className={`nav${scrolled || open ? ' scrolled' : ''}`}>
      <div className="wrap nav-in">
        <a className="brand" href={home} aria-label={`${site.name}, home`}>
          <span className="brand-mark">R/L</span>
          <span>{site.name}</span>
        </a>
        <nav aria-label="Primary">
          <button className="nav-toggle" aria-expanded={open} aria-controls="nav-links" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(o => !o)}>
            <span />
          </button>
          <ul className="nav-links" id="nav-links">
            {items.map(i => (
              <li key={i.href}>
                <a href={i.href} className={i.lios ? 'is-lios' : undefined} aria-current={i.id && active === i.id ? 'true' : undefined} onClick={() => setOpen(false)}>
                  {i.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="wrap footer">
      <span>© {new Date().getFullYear()} {site.name}</span>
      <span>Personal site. Views are my own.</span>
    </footer>
  );
}

export function SectionHead({ eyebrow, title, lede, review }: { eyebrow: string; title: ReactNode; lede?: ReactNode; review?: ReactNode }) {
  return (
    <div className="section-head rv">
      <div>
        <div className="eyebrow"><b>//</b>{eyebrow}{review}</div>
        <h2 className="h-section">{title}</h2>
      </div>
      {lede && <p className="lede">{lede}</p>}
    </div>
  );
}

/**
 * Hero field: a stack of market-like series drawn in depth, like a surface of
 * yield curves. A faint cyan "scan" moves across and lights up the nearest
 * points. Static frame under reduced motion; paused when off-screen.
 */
export function SignalField({ tint = 'signal', density = 30 }: { tint?: 'signal' | 'lios'; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    const reduce = reducedMotion();
    let raf = 0, visible = true, t0 = performance.now();
    const seeds = Array.from({ length: density }, (_, i) => [Math.sin(i * 12.9898) * 43758.5453 % 1, Math.sin(i * 78.233) * 12345.678 % 1].map(Math.abs));
    const accent = tint === 'lios' ? [183, 168, 255] : [111, 211, 242];
    const draw = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = c.clientWidth, h = c.clientHeight;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const t = reduce ? 18 : (now - t0) / 1000;
      const rows = density;
      const scanX = ((t * 0.06) % 1.3 - 0.15) * w;
      for (let i = 0; i < rows; i++) {
        const depth = i / (rows - 1); // 0 = far, 1 = near
        const y0 = h * (0.18 + depth * 0.78);
        const amp = 10 + depth * 46;
        const [s1, s2] = seeds[i];
        const alpha = 0.07 + depth * 0.3;
        ctx.beginPath();
        const steps = 90;
        let px = 0, py = 0;
        for (let k = 0; k <= steps; k++) {
          const u = k / steps;
          const x = -40 + u * (w + 80);
          const n = Math.sin(u * 6.2 + s1 * 9 + t * 0.12 * (0.5 + s2)) * 0.55
            + Math.sin(u * 15.7 + s2 * 13 - t * 0.09) * 0.25
            + Math.sin(u * 2.1 + i * 0.35 + t * 0.05) * 0.6;
          const bump = Math.exp(-(((u - 0.68) * 5) ** 2)) * (0.5 + 0.5 * Math.sin(t * 0.25 + i * 0.2));
          const y = y0 - (n + bump * 1.4) * amp * 0.6;
          if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          if (Math.abs(x - scanX) < (w + 80) / steps / 2) { px = x; py = y; }
        }
        ctx.strokeStyle = `rgba(200, 212, 228, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        if (!reduce && px && depth > 0.25) {
          ctx.fillStyle = `rgba(${accent.join(',')}, ${0.25 + depth * 0.6})`;
          ctx.beginPath(); ctx.arc(px, py, 1.2 + depth * 1.6, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (!reduce && visible) raf = requestAnimationFrame(draw);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(draw);
    });
    io.observe(c);
    const onResize = () => { if (reduce) draw(performance.now()); };
    window.addEventListener('resize', onResize);
    draw(performance.now());
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('resize', onResize); };
  }, [tint, density]);
  return <canvas ref={ref} className="hero-canvas" aria-hidden="true" />;
}

/** ~1.4s initialization sequence, once per browser session. Click, Esc or "Skip" ends it. */
export function Intro({ word = 'RYAN LAW' }: { word?: string }) {
  const [state, setState] = useState<'on' | 'out' | 'gone'>(() => {
    try {
      if (reducedMotion() || location.hash || sessionStorage.getItem('rl-intro') || /[?&]nointro/.test(location.search)) return 'gone';
    } catch { return 'gone'; }
    return 'on';
  });
  useEffect(() => {
    if (state !== 'on') return;
    try { sessionStorage.setItem('rl-intro', '1'); } catch { /* storage unavailable */ }
    const t = setTimeout(() => setState('out'), 1450);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') setState('out'); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [state]);
  useEffect(() => {
    if (state === 'out') { const t = setTimeout(() => setState('gone'), 550); return () => clearTimeout(t); }
  }, [state]);
  if (state === 'gone') return null;
  const lines: [string, string][] = [['markets', 'linked'], ['data', 'validated'], ['signals', 'resolving'], ['L//IOS', 'online']];
  return (
    <div className={`intro${state === 'out' ? ' out' : ''}`} onClick={() => setState('out')} role="presentation">
      <div className="intro-in" aria-hidden="true">
        <div className="intro-word">{[...word].map((ch, i) => <span key={i} style={{ ['--i' as string]: i }}>{ch === ' ' ? ' ' : ch}</span>)}</div>
        <div className="intro-bar" />
        <div className="intro-lines">
          {lines.map(([a, b], i) => <div key={a} style={{ ['--i' as string]: i }}><span>{a}</span><b>{b}</b></div>)}
        </div>
      </div>
      <button className="intro-skip" onClick={() => setState('out')}>Skip intro</button>
    </div>
  );
}
