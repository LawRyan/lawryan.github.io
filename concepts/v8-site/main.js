/**
 * V8 site prototype. One WebGL renderer, three rooms, rendered only when their chapter is on screen:
 *   01 The Transformation (tower)  →  02 How I think (city)  →  … tools, L//IOS, beyond (DOM) …  →  06 Connect (living field)
 * GSAP choreographs; ScrollTrigger reads progress (no pinning by script, no snapping).
 */
import { WebGLRenderer } from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createTower } from './tower.js';
import { createCity } from './city.js';
import { createField } from './field.js';
import { untangle, ruleIt, askTable } from './tools.js';
gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement, reduce = root.classList.contains('rm'), mob = innerWidth < 860;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

// ── the rooms
let renderer = null;
try { renderer = new WebGLRenderer({ canvas: $('#gl'), antialias: true, powerPreference: 'high-performance' }); renderer.setClearColor(0x0B0D11); } catch { root.classList.add('no-gl'); }
const rooms = renderer ? { tower: createTower({ mob, reduce }), city: createCity({ mob, reduce }), field: createField({ mob, reduce }) } : {};
let dpr = Math.min(devicePixelRatio || 1, mob ? 1.5 : 1.75);
function resize() { if (!renderer) return; renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight, false); Object.values(rooms).forEach(r => r.resize(innerWidth, innerHeight)); }
resize(); addEventListener('resize', resize);

if (renderer) {
  const { tower, city, field } = rooms;
  // 01 · the tower assembles on arrival; scrolling on breaks it apart again: every structure starts as a problem
  if (reduce) tower.st.build = 1; else gsap.to(tower.st, { build: 1, duration: 4.2, ease: 'power3.inOut', delay: .9 });
  let broken = false;
  $('#break').onclick = () => { broken = !broken; gsap.to(tower.st, { build: broken ? 0 : 1, duration: broken ? 1.6 : 3.4, ease: broken ? 'power2.out' : 'power3.inOut', overwrite: true }); $('#break').textContent = broken ? 'Build it' : 'Break it apart'; };
  ScrollTrigger.create({ trigger: '.x-hero', start: 'top top', end: 'bottom top', scrub: 1,
    onUpdate: s => { if (!gsap.isTweening(tower.st) && !broken) tower.st.build = 1 - Math.max(0, s.progress - .25) * 1.4; tower.st.lift = reduce ? 0 : Math.max(0, Math.min(1, (s.progress - .35) / .65)); } });
  addEventListener('pointermove', e => { const x = e.clientX / innerWidth * 2 - 1, y = -(e.clientY / innerHeight) * 2 + 1; tower.pointer(x, y); city.pointer(x, y);
    gsap.to(tower.mat.uniforms.uPow, { value: 1, duration: .25, overwrite: true }); gsap.to(tower.mat.uniforms.uPow, { value: 0, duration: 1.8, delay: .6, ease: 'power2.inOut' }); }, { passive: true });

  // 02 · the city: step back → get close → follow the signal → find what doesn't fit
  $('#anom-text').textContent = `One value, series ${city.anomaly.series} in week ${city.anomaly.week}, stands several times taller than anything near it. Then the real work: check the data before calling it an event.`;
  const ctl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  ctl.to(city.st, { rise: 1, duration: 1 }, 0).to(city.st, { path: 1, duration: 1.2, ease: 'power2.inOut' }, .9).to(city.st, { path: 2, duration: 1.4, ease: 'power2.inOut' }, 2.2)
     .to(city.st, { sig: .55, duration: 1.2 }, 3.3).to(city.st, { path: 3, sig: 1, duration: 1.5, ease: 'power2.inOut' }, 4.6).to({}, { duration: .6 }, 6.1);
  ScrollTrigger.create({ trigger: '#think-track', start: 'top top', end: 'bottom bottom', scrub: reduce ? true : 1.2, animation: ctl });
  const BEATS = [0, 2.2, 3.3, 4.6].map(t => t / ctl.duration()); let beat = -1;

  // 06 · the living field: grows when you arrive; touch sends a wave; hold or the button brings it to order
  ScrollTrigger.create({ trigger: '.x-close', start: 'top 70%', onEnter: () => gsap.to(field.st, { grow: 1, duration: reduce ? 0 : 2.4, ease: 'power3.out' }), onLeaveBack: () => gsap.to(field.st, { grow: 0, duration: .8 }) });
  let lastT = 0, hold, ordered = false;
  const fieldOn = () => active === 'field';
  addEventListener('pointermove', e => { const n = performance.now(); if (fieldOn() && n - lastT > 260) { lastT = n; field.touch(e.clientX, e.clientY); } }, { passive: true });
  $('.x-close').addEventListener('pointerdown', e => { if (e.target.closest('a, button')) return; field.touch(e.clientX, e.clientY); hold = gsap.to(field.st, { order: 1, duration: 2.4, ease: 'power2.inOut' }); });
  addEventListener('pointerup', () => { if (hold && !ordered) { hold.kill(); hold = null; gsap.to(field.st, { order: 0, duration: 3, ease: 'power2.inOut' }); } });
  $('#order').onclick = () => { ordered = !ordered; gsap.to(field.st, { order: ordered ? 1 : 0, duration: 2.6, ease: 'power2.inOut' }); $('#order').textContent = ordered ? 'Let it run' : 'Bring it to order'; };

  // ── one loop: render only the room whose chapter is on screen
  const sections = [['tower', $('.x-hero')], ['city', $('.x-think')], ['field', $('.x-close')]];
  let active = null, frames = 0, ft = 0, last = performance.now(), shown = null;
  const canvas = $('#gl');
  // warm up: compile every room's shaders while the visitor reads the hero, so no chapter stutters on arrival
  const warm = () => { for (const r of Object.values(rooms)) { try { r.update(0); renderer.compile(r.scene, r.cam); } catch {} } };
  setTimeout(() => ('requestIdleCallback' in window ? requestIdleCallback(warm, { timeout: 3000 }) : warm()), 2500);
  gsap.ticker.add(t => {
    if (document.hidden) return;
    let best = null, bestA = 0;
    for (const [k, el] of sections) { const r = el.getBoundingClientRect(), a = Math.min(innerHeight, r.bottom) - Math.max(0, r.top); if (a > bestA) { bestA = a; best = k; } }
    active = bestA > 0 ? best : null;
    canvas.style.visibility = active ? 'visible' : 'hidden';
    if (!active) return;
    if (active !== shown) {   // a short dissolve between rooms instead of a hard cut
      if (shown && !reduce) gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: .7, ease: 'power2.out' });
      shown = active;
    }
    const room = rooms[active]; room.update(t); renderer.render(room.scene, room.cam); window.__renders = (window.__renders || 0) + 1;
    if (active === 'city') {
      const p = ctl.progress(), b = BEATS.reduce((a, s, i) => (p >= s - .01 ? i : a), 0);
      if (b !== beat) { beat = b; $$('#beats li').forEach((li, i) => li.classList.toggle('on', i === b)); $$('.x-rail li').forEach((li, i) => { li.classList.toggle('on', i === b); li.classList.toggle('done', i < b); }); }
    }
    const now = performance.now(); frames++; ft += now - last; last = now;
    if (frames === 90) { if (ft / 90 > 24 && dpr > 1) { dpr = Math.max(1, dpr - .25); resize(); } frames = 0; ft = 0; }
  });
  window.__rooms = rooms; window.__ctl = ctl;
} else $$('#beats li').forEach(li => li.classList.add('on'));

// ── 03 · tools (they work: paste your own data)
const shared = {};
untangle($('#t-untangle .card'), shared); ruleIt($('#t-rules .card'), shared); askTable($('#t-ask .card'), reduce);

// ── 04 · L//IOS: tabs with arrow keys, screens, the window settling into place
const tabs = $$('.lios-tabs [role=tab]');
function select(i, focus) {
  tabs.forEach((t, k) => { t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1; const panel = document.getElementById(t.getAttribute('aria-controls')), was = panel.hidden; panel.hidden = k !== i;
    if (k === i && was && !reduce) { panel.classList.remove('enter'); void panel.offsetWidth; panel.classList.add('enter'); } });
  if (focus) tabs[i].focus();
}
tabs.forEach((t, i) => { t.addEventListener('click', () => select(i)); t.addEventListener('keydown', e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); select((i + d + tabs.length) % tabs.length, true); } }); });
$$('.lp').forEach(p => { const imgs = [...p.querySelectorAll('.shots img')], btns = [...p.querySelectorAll('.thumbs button')];
  btns.forEach((b, k) => b.addEventListener('click', () => { imgs.forEach((im, j) => { im.hidden = j !== k; if (j === k && !reduce) { im.classList.remove('swap'); void im.offsetWidth; im.classList.add('swap'); } }); btns.forEach((x, j) => x.setAttribute('aria-pressed', j === k)); })); });
const stages = $$('.lp-stage');
gsap.ticker.add(() => stages.forEach(s => { const r = s.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; s.style.setProperty('--v', (reduce ? 1 : Math.max(0, Math.min(1, 1 - (r.top - innerHeight * .25) / (innerHeight * .75)))).toFixed(3)); }));

// ── header tone and editorial reveals
const header = $('.top'), tones = $$('[data-tone]'), navs = $$('.top nav a');
addEventListener('scroll', () => { let cur = tones[0]; for (const s of tones) if (s.getBoundingClientRect().top <= 30) cur = s; header.dataset.tone = cur.dataset.tone; header.classList.toggle('past', scrollY > 40);
  const id = cur.id === 'background' ? 'beyond' : cur.id === 'about' ? '' : cur.id; navs.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + id)); }, { passive: true });
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .2 });
$$('.work-head, .tool, .door, .lios-hero, .lios-pr, .by-head, .contents li, .cv-head, .cv-cols').forEach(el => { el.classList.add('rev'); io.observe(el); });
root.classList.add('ready');
