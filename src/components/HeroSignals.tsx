import { useEffect, useRef } from 'react';
import { reducedMotion } from './common';

/**
 * Hero background: a few faint, price-like series drift slowly to the left.
 * Every few seconds one of them jumps; when the jump reaches the "detector"
 * line a cyan ring pulses on it and a small z-score label fades in and out,
 * as if the system had just caught an outlier. Pauses off-screen, draws a
 * single still frame for reduced-motion visitors, and uses fewer lines on phones.
 */
interface Line { pts: number[]; v: number; base: number; amp: number; alpha: number; flags: Map<number, number> }
interface Ping { line: number; idx: number; born: number; z: number }

const DX = 9;            // px between points
const SPEED = 22;        // px per second
const DETECT = 0.7;      // detector position, share of width

export default function HeroSignals({ tint = 'signal' }: { tint?: 'signal' | 'lios' }) {
  const A = tint === 'lios' ? '183,168,255' : '111,211,242';
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    const reduce = reducedMotion();
    let raf = 0, visible = true, last = performance.now(), shift = 0, serial = 0, nextSpike = last + 1200;
    let lines: Line[] = [], W = 0, H = 0;
    const pings: Ping[] = [];
    const seen = new Set<string>();

    const step = (l: Line) => {
      l.v += -0.08 * l.v + (Math.random() - 0.5) * 0.55;
      const prev = l.pts[l.pts.length - 1] ?? 0;
      return prev * 0.92 + l.v;
    };
    const build = () => {
      const narrow = W < 700;
      const n = narrow ? 3 : 5;
      const count = Math.ceil(W / DX) + 4;
      lines = Array.from({ length: n }, (_, i) => {
        const depth = n === 1 ? 1 : i / (n - 1);
        const l: Line = { pts: [], v: 0, base: H * ((narrow ? 0.45 : 0.355) + depth * (narrow ? 0.39 : 0.48)), amp: 12 + depth * 16, alpha: 0.16 + depth * 0.2, flags: new Map() };
        for (let k = 0; k < count; k++) l.pts.push(step(l));
        return l;
      });
      if (reduce) { // one still frame with a single caught outlier
        const l = lines[Math.floor(n / 2)], idx = Math.floor((W * DETECT) / DX);
        l.pts[idx] += 7; l.flags.set(idx, 3.4);
      }
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = c.clientWidth, h = c.clientHeight;
      if (w === W && h === H) return;
      W = w; H = h; c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    let lastPaint = 0;
    const draw = (now: number) => {
      // 30 fps is plenty for lines moving ~22 px/s, and halves the work
      if (!reduce && now - lastPaint < 31) { if (visible) raf = requestAnimationFrame(draw); return; }
      lastPaint = now;
      resize();
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!reduce) {
        shift += SPEED * dt;
        while (shift >= DX) {
          shift -= DX; serial++;
          for (const l of lines) {
            l.pts.shift();
            const moved = new Map<number, number>();
            l.flags.forEach((z, i) => { if (i > 0) moved.set(i - 1, z); });
            l.flags = moved;
            l.pts.push(step(l));
          }
          if (now > nextSpike && lines.length) { // plant a jump at the right edge
            // plant the jump a little ahead of the detector so it is caught within a few seconds
            const li = Math.floor(Math.random() * lines.length), l = lines[li];
            const z = 2.9 + Math.random() * 1.6, sign = Math.random() < 0.5 ? -1 : 1, size = 2.6 + Math.random() * 1.2;
            const at = Math.min(l.pts.length - 2, Math.round((W * DETECT + 70 + Math.random() * 60 + shift) / DX) + 1);
            [-3, -2, -1, 0, 1, 2, 3].forEach(o => { if (l.pts[at + o] !== undefined) l.pts[at + o] += sign * size * Math.exp(-(o * o) / 2.2); });
            l.flags.set(at, Number(z.toFixed(1)));
            nextSpike = now + 5000 + Math.random() * 3000;
          }
        }
      }

      ctx.clearRect(0, 0, W, H);
      const detX = W * DETECT;
      // detector: a faint vertical scan line
      const g = ctx.createLinearGradient(0, H * 0.19, 0, H);
      g.addColorStop(0, `rgba(${A},0)`); g.addColorStop(0.5, `rgba(${A},0.12)`); g.addColorStop(1, `rgba(${A},0)`);
      ctx.fillStyle = g; ctx.fillRect(detX, H * 0.19, 1, H * 0.81);

      lines.forEach((l, li) => {
        const fade = ctx.createLinearGradient(0, 0, W, 0);
        fade.addColorStop(0, `rgba(200,212,228,0)`);
        fade.addColorStop(0.18, `rgba(200,212,228,${l.alpha})`);
        fade.addColorStop(0.85, `rgba(200,212,228,${l.alpha})`);
        fade.addColorStop(1, `rgba(200,212,228,0)`);
        ctx.strokeStyle = fade; ctx.lineWidth = 1.2;
        ctx.beginPath();
        l.pts.forEach((p, k) => { const x = k * DX - shift - DX, y = l.base - p * l.amp * 0.5; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        ctx.stroke();
        l.flags.forEach((z, k) => {
          const x = k * DX - shift - DX, y = l.base - l.pts[k] * l.amp * 0.5;
          if (x < 0 || x > W) return;
          const caught = x <= detX;
          ctx.fillStyle = caught ? `rgba(${A},0.85)` : 'rgba(200,212,228,0.35)';
          ctx.beginPath(); ctx.arc(x, y, caught ? 2.4 : 1.6, 0, Math.PI * 2); ctx.fill();
          const id = `${li}:${serial + k}`;
          if (caught && !seen.has(id)) { seen.add(id); if (seen.size > 200) seen.clear(); pings.push({ line: li, idx: serial + k, born: reduce ? now - 900 : now, z }); }
        });
      });

      // pings: expanding ring + fading label, tracked to the moving point
      for (let i = pings.length - 1; i >= 0; i--) {
        const p = pings[i], age = (now - p.born) / 3200;
        const l = lines[p.line]; const k = p.idx - serial;
        if (!l || age > 1 || k < 0) { if (!reduce) pings.splice(i, 1); continue; }
        const x = k * DX - shift - DX, y = l.base - l.pts[k] * l.amp * 0.5;
        const a = Math.max(0, 1 - age);
        ctx.strokeStyle = `rgba(${A},${0.8 * a})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, 4 + age * 20, 0, Math.PI * 2); ctx.stroke();
        ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
        ctx.fillStyle = `rgba(${A},${0.9 * Math.min(1, a * 1.6)})`;
        ctx.fillText(`outlier · z ${p.z.toFixed(1)}`, x + 10, y - 10);
      }

      if (!reduce && visible) raf = requestAnimationFrame(draw);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !reduce) { last = performance.now(); raf = requestAnimationFrame(draw); }
    });
    io.observe(c);
    const onResize = () => { if (reduce) draw(performance.now()); };
    window.addEventListener('resize', onResize);
    draw(performance.now());
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('resize', onResize); };
  }, [A]);
  // the canvas only covers the band the lines live in (38–100% of the first screen), which keeps repaints small
  return <canvas ref={ref} className="hero-canvas sig-band" aria-hidden="true" />;
}
