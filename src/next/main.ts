/**
 * The Resolve: scroll director for the experimental site.
 * One requestAnimationFrame loop drives the field, the camera and the HTML overlay. Native scrolling is kept
 * (no smooth-scroll library). Scroll is damped into a scene position `pos` (0 = complexity … 8 = horizon); each
 * scene holds still across the middle of its section, and `hold[i]` (0–1) is the progress through that hold.
 */
import { Vector3 } from 'three';
import { CAREER, CLUSTERS, careerPath, careerU, Field, LIOS_C, NETWORK, SCENES } from './field';
import './next.css';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = () => innerWidth < 760;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
const root = document.documentElement;
const debug = /[?&]debug/.test(location.search);
const near = (pos: number, k: number, w = 2.5) => clamp(1 - Math.abs(pos - k) * w);

function webglOk() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

// ── camera keyframes per scene: [position, look-at], desktop and phone. Career and L//IOS are computed.
type Key = { p: Vector3; l: Vector3 };
const L = LIOS_C;
const STATIC: Record<'d' | 'm', (Key | null)[]> = {
  d: [
    { p: V(0.4, 0.2, 9.0), l: V(0.2, 0.1, -1) },
    { p: V(2.4, 1.0, 9.0), l: V(2.2, 0, 0) },
    { p: V(-2.8, 1.3, 8.2), l: V(-1.5, -0.3, 0) },
    { p: V(0.2, -1.2, 9.2), l: V(0.2, -0.5, 0) },          // manual: loops under the headline
    { p: V(-6.8, 1.2, 7.4), l: V(1.8, -0.9, -1.2) },         // automated: along the pipeline
    { p: V(0.4, 0.4, 10.6), l: V(-2.3, -0.5, 0) },          // leadership
    null,                                                    // career: flown
    null,                                                    // L//IOS
    { p: V(L.x, L.y - 1.0, L.z + 9), l: V(L.x, L.y + 0.1, L.z - 4) },
  ],
  m: [
    { p: V(1.6, 0.4, 11.5), l: V(1.6, 1.3, -1) },
    { p: V(0.3, -2.6, 16.5), l: V(0.3, -3.4, 0) },
    { p: V(-0.4, 0.8, 14.5), l: V(0.6, -1.6, 0) },
    { p: V(0, -2.4, 17), l: V(0, -3.6, 0) },
    { p: V(-5.5, 2.4, 13), l: V(1.2, -0.2, -1) },
    { p: V(0.2, -1.2, 17.5), l: V(0.2, -0.6, 0) },
    null,
    null,
    { p: V(L.x, L.y - 2.2, L.z + 12), l: V(L.x, L.y + 0.9, L.z - 4) },
  ],
};
function careerKey(m: boolean, u: number): Key {
  const p = careerPath(u).add(m ? V(0, 1.1, 5.2) : V(1.1, 0.7, 3.4));
  const l = careerPath(Math.min(1.15, u + 0.07)).add(m ? V(0, 0.4, 0) : V(-0.4, 0.1, 0));
  return { p, l };
}
function liosKey(m: boolean, show: number): Key {
  // the stage arrives: a slow push in, and the mark falls out of focus behind the panels
  const d = (m ? 19 : 12.5) - show * (m ? 4 : 3);
  return { p: V(L.x, L.y + (m ? -0.6 : 0.4), L.z + d), l: V(L.x, L.y + (m ? -2.6 : -0.5), L.z) };
}

async function fontsReady() {
  try { await Promise.race([document.fonts.load('700 100px "Mona Sans"'), new Promise(r => setTimeout(r, 1500))]); } catch { /* fall back */ }
}

// ── the L//IOS showcase: tabs, screenshot switcher, tilt (works without WebGL)
function showcase() {
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('.tabs [role="tab"]')];
  const panels = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')!)!);
  const select = (i: number, focus = false) => {
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; panels[k].hidden = k !== i; });
    if (focus) tabs[i].focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', e => {
      const k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (k) { e.preventDefault(); select((i + k + tabs.length) % tabs.length, true); }
      if (e.key === 'Home') { e.preventDefault(); select(0, true); }
      if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
    });
  });
  panels.forEach(p => {
    const shots = [...p.querySelectorAll<HTMLImageElement>('.shot')];
    const thumbs = [...p.querySelectorAll<HTMLButtonElement>('.thumb')];
    const show = (i: number) => {
      shots.forEach((s, k) => {
        const o = k - i, a = Math.abs(o);
        s.style.setProperty('--o', String(o)); s.style.setProperty('--a', String(a));
        s.classList.toggle('cur', o === 0); s.classList.toggle('near', a > 0 && a <= 2);
        if (a <= 1) s.loading = 'eager';
        s.setAttribute('aria-hidden', String(o !== 0));
      });
      thumbs.forEach((t, k) => t.setAttribute('aria-pressed', String(k === i)));
    };
    thumbs.forEach((t, k) => t.addEventListener('click', () => show(k)));
    // phones: a swipe on the stage moves through the screens
    let x0 = 0, cur = 0; const stage = p.querySelector<HTMLElement>('.screens')!;
    thumbs.forEach((t, k) => t.addEventListener('click', () => { cur = k; }));
    stage.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) { cur = clamp(cur + (dx < 0 ? 1 : -1), 0, shots.length - 1); show(cur); }
    }, { passive: true });
    if (!reduce) {
      const fig = p.querySelector<HTMLElement>('.stage')!;
      fig.addEventListener('pointermove', e => {
        const r = fig.getBoundingClientRect();
        stage.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 7}deg`);
        stage.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - 0.5) * 5}deg`);
      });
      fig.addEventListener('pointerleave', () => { stage.style.setProperty('--ry', '0deg'); stage.style.setProperty('--rx', '0deg'); });
    }
    show(0);
  });
  select(0);
}

async function boot() {
  showcase();
  const canvas = document.getElementById('field') as HTMLCanvasElement;
  const gl = webglOk();
  if (!gl) root.classList.add('no-webgl');
  await fontsReady();   // the L//IOS mark is sampled from the typeface
  const count = mobile() ? 11000 : (navigator.hardwareConcurrency || 4) >= 8 ? 30000 : 20000;
  const field = gl ? new Field({ canvas, count, mobile: mobile(), reduce }) : null;
  const size = () => field?.resize(innerWidth, innerHeight);
  size(); addEventListener('resize', size);

  // ── sections → scene position and hold progress
  const sections = SCENES.map(k => document.querySelector<HTMLElement>(`[data-scene="${k}"]`)!);
  const showcaseEl = document.getElementById('showcase')!;
  const miles = [...document.querySelectorAll<HTMLElement>('.miles li')];
  const rail = [...document.querySelectorAll<HTMLAnchorElement>('.rail a')];
  const CH = [0, 1, 2, 3, 3, 4, 5, 6, 7];   // scene → chapter
  let pos = 0, posT = 0, show = 0, careerT = 0;
  const hold = new Array(SCENES.length).fill(0);
  const HOLD = 0.25;
  const onScroll = () => {
    const mid = innerHeight / 2;
    const cs = sections.map(s => { const r = s.getBoundingClientRect(); return r.top + r.height / 2; });
    let p = 0;
    if (mid >= cs[cs.length - 1]) p = cs.length - 1;
    else for (let i = 0; i < cs.length - 1; i++) if (mid >= cs[i] && mid < cs[i + 1]) { p = i + (mid - cs[i]) / (cs[i + 1] - cs[i]); break; }
    const i = Math.floor(p), f = p - i;
    posT = i + clamp((f - HOLD) / (1 - 2 * HOLD));
    for (let k = 0; k < cs.length; k++) {
      const a = k ? cs[k - 1] + (1 - HOLD) * (cs[k] - cs[k - 1]) : -1e9;
      const b = k < cs.length - 1 ? cs[k] + HOLD * (cs[k + 1] - cs[k]) : 1e9;
      hold[k] = k && k < cs.length - 1 ? clamp((mid - a) / (b - a)) : mid >= a ? 1 : 0;
    }
    careerT = hold[6];
    const sr = showcaseEl.getBoundingClientRect();
    show = clamp((innerHeight * 0.95 - sr.top) / (innerHeight * 0.65)) * clamp((sr.bottom - innerHeight * 0.1) / (innerHeight * 0.4));
    const H = document.documentElement.scrollHeight - innerHeight;
    root.style.setProperty('--hero-out', String(clamp(scrollY / (innerHeight * 0.7))));
    root.style.setProperty('--prog', String(clamp(scrollY / Math.max(1, H))));
    root.style.setProperty('--rail', String(clamp(scrollY / innerHeight - 0.6)));
    root.style.setProperty('--show', show.toFixed(3));
    root.style.setProperty('--career', careerT.toFixed(3));
    root.style.setProperty('--career-in', String(near(posT, 6, 1.6)));
    // career: the milestone the camera is passing
    const u = 0.02 + careerT * 0.84 + 0.07;   // the ring just ahead of the camera
    let on = 0; CAREER.forEach((c, k) => { if (u >= careerU(c.year)) on = k; });
    miles.forEach((m, k) => m.classList.toggle('on', k === on && near(posT, 6, 1.6) > 0.3));
    const ch = CH[Math.round(posT)];
    rail.forEach((a, k) => a.classList.toggle('on', k + 1 === ch));
    if (!field) pos = posT;
  };
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll();
  if (!field) return;

  // ── pointer lens (touch too); when idle, the lens wanders on its own so the idea is visible
  let lastMove = -1e9;
  const setPointer = (x: number, y: number) => { field.pointerT.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); lastMove = performance.now(); };
  addEventListener('pointermove', e => setPointer(e.clientX, e.clientY), { passive: true });
  addEventListener('touchmove', e => { const t = e.touches[0]; if (t) setPointer(t.clientX, t.clientY); }, { passive: true });

  // ── HTML labels laid over the 3D scene
  const labelLayer = document.getElementById('labels')!;
  type Lab = { el: HTMLElement; v: Vector3; scene: number; right?: boolean; fade?: boolean };
  const labs: Lab[] = [];
  const mk = (text: string, cls: string, v: Vector3, scene: number, extra: Partial<Lab> = {}) => {
    const el = document.createElement('div'); el.className = 'lab ' + cls; el.textContent = text; labelLayer.appendChild(el);
    labs.push({ el, v, scene, ...extra });
  };
  CLUSTERS.forEach(c => mk(c.name, 'cluster', c.c.clone().add(V(0, 1.05, 0)), 1));
  mk('Rule gate: 300+ checks', 'gate', V(0, 2.35, 0), 2);
  mk('Exceptions tray', 'tray', V(3.2, -1.25, 0.4), 2);
  ['Quarterly', 'Monthly', 'Weekly'].forEach((t, k) => mk(t, 'row right', V(-4.85, (k - 1) * 1.55, 0), 3, { right: true }));
  const pipeAt = (x: number) => V(x, 0.7 * Math.sin(x * 0.33) - 0.2 + 0.7, 0.9 * Math.cos(x * 0.27) - 0.6);
  mk('Source data', 'pipe', pipeAt(-7.5), 4);
  mk('Tableau', 'pipe', pipeAt(6.5), 4);
  mk('Client Intelligence', 'hub', V(0, -0.75, 0), 5);
  NETWORK.groups.forEach(g => mk(g.name, 'node', g.c.clone().add(V(0, g.r * 0.6 + 0.45, 0)), 5));
  CAREER.forEach((c, k) => mk(c.when, 'year' + (k === CAREER.length - 1 ? ' now' : ''), careerPath(careerU(c.year)).add(V(0, k === CAREER.length - 1 ? 1.85 : 1.3, 0)), 6, { fade: true }));

  const lensEl = document.getElementById('lens')!;
  const counter = document.getElementById('checked')!, excCounter = document.getElementById('exceptions')!;
  const fps = debug ? Object.assign(document.body.appendChild(document.createElement('pre')), { className: 'dbg' }) : null;
  if (fps) fps.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;margin:0;font:12px monospace;color:#9fd4ff;background:rgba(0,0,0,.6);padding:6px 8px;border-radius:6px';

  const t0 = performance.now();
  requestAnimationFrame(() => root.classList.add('ready'));
  const cam = field.camera;
  let last = performance.now(), visible = true, checked = 0, frames = 0, fpsT = last;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) { last = performance.now(); requestAnimationFrame(frame); } });

  const keyAt = (k: number, m: boolean): Key => k === 6 ? careerKey(m, 0.02 + careerT * 0.84) : k === 7 ? liosKey(m, show) : STATIC[m ? 'm' : 'd'][k]!;

  function frame(now: number) {
    if (!visible || !field) return;
    const dt = Math.min(64, now - last); last = now; field.adapt(dt);
    const t = (now - t0) / 1000;
    pos += (posT - pos) * (reduce ? 1 : 1 - Math.pow(0.001, dt / 1000));   // frame-rate independent damping
    field.mat.uniforms.uIntro.value = reduce ? 1 : ease(clamp((t - 0.15) / 2.6));

    if (now - lastMove > 3500 && !reduce) field.pointerT.set(Math.sin(t * 0.33) * 0.55 + 0.15, Math.sin(t * 0.47 + 1) * 0.35);
    const lens = (reduce ? 0.6 : 1) * clamp(1 - pos * 1.6) * clamp((t - 2.2) / 1.2);

    // camera: blend the two neighbouring keys, then a little parallax from the pointer
    const m = mobile(), i = Math.min(SCENES.length - 2, Math.floor(pos)), f = ease(clamp(pos - i));
    const A = keyAt(i, m), B = keyAt(i + 1, m);
    const p = A.p.clone().lerp(B.p, f), l = A.l.clone().lerp(B.l, f);
    if (!reduce) {
      const orbit = Math.abs(pos - 1) < 0.5 ? (hold[1] - 0.5) * 0.5 : 0;   // structure: a slow orbit while you read
      if (orbit) { const c = l.clone(); p.sub(c).applyAxisAngle(V(0, 1, 0), orbit * 0.6).add(c); }
      p.x += field.pointer.x * 0.35 * (1 - show); p.y += field.pointer.y * 0.2 * (1 - show);
    }
    cam.position.copy(p); cam.lookAt(l);
    let focus = cam.position.distanceTo(l) * (1 + 0.04 * Math.sin(t * 0.2));
    if (pos > 6.5 && pos < 7.5) focus -= show * 7;   // the mark goes soft behind the product stage
    field.render(reduce ? 0 : t, pos, lens, focus, 1 - show * 0.35);
    lensEl.style.opacity = String(lens * 0.9);
    lensEl.style.transform = `translate3d(${(field.pointer.x + 1) / 2 * innerWidth}px, ${(1 - field.pointer.y) / 2 * innerHeight}px, 0) translate(-50%, -50%)`;

    // labels
    const W = innerWidth, H = innerHeight;
    for (const Lb of labs) {
      let o = near(pos, Lb.scene, Lb.scene === 6 ? 1.6 : 2.5);
      if (o > 0.01) {
        const s = field.project(Lb.v, W, H);
        if (Lb.fade) { const d = cam.position.distanceTo(Lb.v); o *= clamp((d - 1.5) / 2) * clamp((22 - d) / 8); }
        o = s.visible ? o : 0;
        if (o > 0.01) Lb.el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(${Lb.right ? '-100%' : '-50%'}, -50%)`;
      }
      Lb.el.style.opacity = String(o);
    }
    if (near(pos, 2) > 0.5 && !reduce) checked += dt * 2.6;   // illustrative throughput
    counter.textContent = Math.floor(checked).toLocaleString('en-US');
    excCounter.textContent = Math.floor(checked * 0.03).toLocaleString('en-US');
    if (fps && ++frames && now - fpsT > 1000) { fps.textContent = `${Math.round(frames * 1000 / (now - fpsT))} fps · dpr ${field.dpr} · ${count} pts · pos ${pos.toFixed(2)}`; frames = 0; fpsT = now; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
