/**
 * The Resolve: scroll director for the experimental site.
 * One requestAnimationFrame loop drives the field, the camera and the HTML overlay. Native scrolling is kept
 * (no smooth-scroll library); scroll position is damped into a scene position `pos` (0 = complexity, 1 = structure,
 * 2 = validation), with each scene holding still across the middle of its section.
 */
import { Vector3 } from 'three';
import { CLUSTERS, Field, SCENES } from './field';
import './next.css';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = () => innerWidth < 760;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const root = document.documentElement;

function webglOk() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

// ── camera keyframes per scene: [position, look-at], desktop and phone
type Key = { p: Vector3; l: Vector3 };
const KEYS: Record<'d' | 'm', Key[]> = {
  d: [
    { p: new Vector3(0.4, 0.2, 9.0), l: new Vector3(0.2, 0.1, -1) },
    { p: new Vector3(2.4, 1.0, 9.0), l: new Vector3(2.2, 0, 0) },
    { p: new Vector3(-2.8, 1.3, 8.2), l: new Vector3(-1.5, -0.3, 0) },
  ],
  m: [
    { p: new Vector3(1.6, 0.4, 11.5), l: new Vector3(1.6, 1.3, -1) },
    { p: new Vector3(0.3, -0.6, 16.5), l: new Vector3(0.3, 2.9, 0) },
    { p: new Vector3(-0.4, 0.8, 14.5), l: new Vector3(0.6, -1.6, 0) },
  ],
};

function boot() {
  const canvas = document.getElementById('field') as HTMLCanvasElement;
  if (!webglOk()) { root.classList.add('no-webgl'); return; }
  const count = mobile() ? 11000 : (navigator.hardwareConcurrency || 4) >= 8 ? 30000 : 20000;
  const field = new Field({ canvas, count, mobile: mobile(), reduce });
  const size = () => field.resize(innerWidth, innerHeight);
  size(); addEventListener('resize', size);

  // ── sections → scene position
  const sections = SCENES.map(k => document.querySelector<HTMLElement>(`[data-scene="${k}"]`)!);
  let pos = 0, posT = 0, sub = 0;
  const onScroll = () => {
    const mid = innerHeight / 2;
    const cs = sections.map(s => { const r = s.getBoundingClientRect(); return { c: r.top + r.height / 2, top: r.top, h: r.height }; });
    let p = 0;
    if (mid >= cs[cs.length - 1].c) p = cs.length - 1;
    else for (let i = 0; i < cs.length - 1; i++) if (mid >= cs[i].c && mid < cs[i + 1].c) { p = i + (mid - cs[i].c) / (cs[i + 1].c - cs[i].c); break; }
    // hold each layout across the middle of its section; move between them at the edges
    const i = Math.floor(p), f = p - i, hold = 0.25;
    posT = i + clamp((f - hold) / (1 - 2 * hold));
    const cur = cs[Math.round(posT)]; sub = clamp((mid - cur.top) / cur.h);
    root.style.setProperty('--hero-out', String(clamp(window.scrollY / (innerHeight * 0.7))));
  };
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll();

  // ── pointer lens (touch too); when idle, the lens wanders on its own so the idea is visible
  let lastMove = -1e9;
  const setPointer = (x: number, y: number) => { field.pointerT.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); lastMove = performance.now(); };
  addEventListener('pointermove', e => setPointer(e.clientX, e.clientY), { passive: true });
  addEventListener('touchmove', e => { const t = e.touches[0]; if (t) setPointer(t.clientX, t.clientY); }, { passive: true });

  // ── HTML labels laid over the 3D scene
  const labelLayer = document.getElementById('labels')!;
  const mk = (text: string, cls: string) => { const d = document.createElement('div'); d.className = 'lab ' + cls; d.textContent = text; labelLayer.appendChild(d); return d; };
  const clusterLabs = CLUSTERS.map(c => ({ el: mk(c.name, 'cluster'), v: c.c.clone().add(new Vector3(0, 1.05, 0)) }));
  const gateLab = { el: mk('Rule gate: 300+ checks', 'gate'), v: new Vector3(0, 2.35, 0) };
  const trayLab = { el: mk('Exceptions tray', 'tray'), v: new Vector3(3.2, -1.25, 0.4) };
  const lensEl = document.getElementById('lens')!;
  const counter = document.getElementById('checked')!, excCounter = document.getElementById('exceptions')!;

  // ── the entrance: data arrives from depth while the name resolves
  const t0 = performance.now();
  requestAnimationFrame(() => root.classList.add('ready'));

  const cam = field.camera; const key = (m: boolean) => KEYS[m ? 'm' : 'd'];
  let last = performance.now(), visible = true, checked = 0;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) { last = performance.now(); requestAnimationFrame(frame); } });

  function frame(now: number) {
    if (!visible) return;
    const dt = Math.min(64, now - last); last = now; field.adapt(dt);
    const t = (now - t0) / 1000;
    pos += (posT - pos) * (reduce ? 1 : 1 - Math.pow(0.001, dt / 1000));   // frame-rate independent damping
    field.mat.uniforms.uIntro.value = reduce ? 1 : ease(clamp((t - 0.15) / 2.6));

    // idle lens path (Lissajous) after a few seconds without input
    if (now - lastMove > 3500 && !reduce) field.pointerT.set(Math.sin(t * 0.33) * 0.55 + 0.15, Math.sin(t * 0.47 + 1) * 0.35);
    const lens = (reduce ? 0.6 : 1) * clamp(1 - pos * 1.6) * clamp((t - 2.2) / 1.2);

    // camera: blend keyframes, then a little parallax from the pointer
    const K = key(mobile()), i = Math.min(K.length - 2, Math.floor(pos)), f = ease(clamp(pos - i));
    const p = K[i].p.clone().lerp(K[i + 1].p, f), l = K[i].l.clone().lerp(K[i + 1].l, f);
    if (!reduce) {
      const orbit = Math.abs(pos - 1) < 0.5 ? (sub - 0.5) * 0.5 : 0;   // structure: a slow orbit while you read
      p.applyAxisAngle(new Vector3(0, 1, 0), orbit * 0.6);
      p.x += field.pointer.x * 0.35; p.y += field.pointer.y * 0.2;
    }
    cam.position.copy(p); cam.lookAt(l);
    const focus = cam.position.distanceTo(l) * (1 + 0.04 * Math.sin(t * 0.2));
    field.render(reduce ? 0 : t, pos, lens, focus);
    // the lens ring follows the pointer in the opening scene
    lensEl.style.opacity = String(lens * 0.9);
    lensEl.style.transform = `translate3d(${(field.pointer.x + 1) / 2 * innerWidth}px, ${(1 - field.pointer.y) / 2 * innerHeight}px, 0) translate(-50%, -50%)`;

    // labels
    const W = innerWidth, H = innerHeight;
    const show = (L: { el: HTMLElement; v: Vector3 }, o: number) => {
      const s = field.project(L.v, W, H);
      L.el.style.opacity = String(s.visible ? o : 0);
      if (o > 0.01) L.el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -50%)`;
    };
    const sw = clamp(1 - Math.abs(pos - 1) * 2.5), vw = clamp(1 - Math.abs(pos - 2) * 2.5);
    clusterLabs.forEach(L => show(L, sw));
    show(gateLab, vw); show(trayLab, vw);
    if (vw > 0.5 && !reduce) checked += dt * 2.6;   // illustrative throughput
    counter.textContent = Math.floor(checked).toLocaleString('en-US');
    excCounter.textContent = Math.floor(checked * 0.03).toLocaleString('en-US');
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
