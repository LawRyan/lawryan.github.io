import { useEffect, useState } from 'react';

/**
 * A thin rail in the left margin (wide screens only). It fills as you scroll, and each
 * section has a node that lights up when you reach it; clicking a node jumps there.
 * Node positions start evenly spaced (same on server and client) and are measured after load.
 */
export default function ScrollThread({ sections }: { sections: [string, string][] }) {
  const n = sections.length;
  const [pos, setPos] = useState<number[]>(() => sections.map((_, i) => i / (n - 1)));
  const [p, setP] = useState(0);
  const [active, setActive] = useState(-1);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      setPos(sections.map(([id]) => {
        const el = document.getElementById(id);
        return el ? Math.min(1, Math.max(0, (el.getBoundingClientRect().top + scrollY - innerHeight * 0.35) / max)) : 0;
      }));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
        setP(Math.min(1, scrollY / max));
        setShown(scrollY > innerHeight * 0.6);
        let a = -1;
        sections.forEach(([id], i) => { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top < innerHeight * 0.4) a = i; });
        setActive(a);
      });
    };
    measure(); onScroll();
    const ro = new ResizeObserver(() => { measure(); onScroll(); });
    ro.observe(document.body);
    addEventListener('scroll', onScroll, { passive: true });
    return () => { cancelAnimationFrame(raf); ro.disconnect(); removeEventListener('scroll', onScroll); };
  }, [sections]);

  return (
    <nav className={`thread${shown ? ' on' : ''}`} aria-label="Sections on this page">
      <div className="thread-track" aria-hidden="true"><i style={{ transform: `scaleY(${p})` }} /></div>
      <ol>
        {sections.map(([id, label], i) => (
          <li key={id} style={{ top: `${(pos[i] * 100).toFixed(2)}%` }} className={i === active ? 'now' : i < active ? 'past' : undefined}>
            <a href={`#${id}`} aria-current={i === active ? 'location' : undefined}><span className="thread-lbl">{label}</span><span className="thread-dot" aria-hidden="true" /></a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
