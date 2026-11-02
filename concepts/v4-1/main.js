import { kinetic } from './kinetic.js';
import { drawing, PHASES } from './think.js';
import { untangle, ruleIt, askTable } from './tools.js';

const root = document.documentElement, reduce = root.classList.contains('rm');
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// header follows the ground it sits on
const header = $('.top'), sections = $$('[data-tone]'), navs = $$('.top nav a');
function tone() {
  const y = 30; let cur = sections[0];
  for (const s of sections) if (s.getBoundingClientRect().top <= y) cur = s;
  header.dataset.tone = cur.dataset.tone; header.classList.toggle('past', scrollY > 40);
  const id = cur.id === 'background' ? 'beyond' : cur.id;
  navs.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + id));
}

// 01 · the sentence, assembled from a heap of loose type
const hero = $('#h1');
const heroK = kinetic(hero, {
  reduce,
  pile: (i, n, R) => { const W = innerWidth, H = innerHeight, mob = W < 760, a = R() * Math.PI * 2, r = Math.sqrt(R());
    return [W * (mob ? .52 : .7) + Math.cos(a) * r * W * (mob ? .34 : .2), (mob ? H * .26 : H * .3) + Math.sin(a) * r * H * (mob ? .12 : .16)]; },
  loosen: () => cl(scrollY / innerHeight - .15) * 1.2,        // scrolling on, the sentence starts to come apart
});
const heroEl = $('.hero');
// the spare pieces left on the bench: never assembled, always within reach
const spares = kinetic($('#spares'), { pile: (i, n, R) => { const W = innerWidth, H = innerHeight, mob = W < 760;
  return mob ? [W * (.62 + R() * .3), H * (.08 + R() * .16) + 60] : [W * (.66 + R() * .26), H * (.2 + R() * .42)]; } });
addEventListener('pointermove', e => { if (reduce || scrollY > innerHeight) return; heroEl.style.setProperty('--lx', (e.clientX / innerWidth * 100).toFixed(1) + '%'); heroEl.style.setProperty('--ly', (e.clientY / innerHeight * 100).toFixed(1) + '%'); }, { passive: true });
const apart = $('#apart');
apart.addEventListener('click', () => { heroK.set(heroK.mode === 'pile' ? 'built' : 'pile'); apart.textContent = heroK.mode === 'pile' ? 'Put it together' : 'Take it apart'; });
setTimeout(() => heroK.set('built'), reduce ? 0 : 650);

// 06 · the closing line assembles when it arrives and loosens when it leaves
const closeH = $('#h-close');
const closeK = kinetic(closeH, {
  reduce, drag: false,
  pile: (i, n, R, r0) => [r0.left + R() * r0.width, r0.top + r0.height / 2 + (R() - .5) * innerHeight * .5],
});
new IntersectionObserver(es => es.forEach(e => closeK.set(e.isIntersecting ? 'built' : 'pile')), { threshold: .45 }).observe(closeH);

// 02 · the exploded drawing, scrubbed by scroll
const track = $('#think'), D = drawing($('#draw'), { reduce }), phases = $$('#phases li'), rail = $$('.rail li');
let g = 0, lastPhase = -1;
function think(t) {
  const r = track.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return;
  const target = cl(-r.top / (r.height - innerHeight));
  g += (target - g) * (reduce ? 1 : .1);
  D.render(g, t);
  let ph = 0; PHASES.forEach((s, i) => { if (g >= s - .02) ph = i; });
  if (ph !== lastPhase) { lastPhase = ph; phases.forEach((li, i) => li.classList.toggle('on', i === ph)); rail.forEach((li, i) => { li.classList.toggle('on', i === ph - 1); li.classList.toggle('done', i < ph - 1); }); }
}

// 03 · tools
const shared = {};
untangle($('#t-untangle .card'), shared);
ruleIt($('#t-rules .card'), shared);
askTable($('#t-ask .card'), reduce);

// 04 · L//IOS: tabs (arrow keys), screens, and the window settling into place as it arrives
const tabs = $$('.lios-tabs [role=tab]');
function select(i, focus) {
  tabs.forEach((t, k) => {
    t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1;
    const panel = document.getElementById(t.getAttribute('aria-controls')), was = panel.hidden;
    panel.hidden = k !== i;
    if (k === i && was && !reduce) { panel.classList.remove('enter'); void panel.offsetWidth; panel.classList.add('enter'); }   // a cut, then the new screen settles
  });
  if (focus) tabs[i].focus();
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => select(i));
  t.addEventListener('keydown', e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); select((i + d + tabs.length) % tabs.length, true); } });
});
$$('.lp').forEach(p => {
  const imgs = [...p.querySelectorAll('.shots img')], btns = [...p.querySelectorAll('.thumbs button')];
  btns.forEach((b, k) => b.addEventListener('click', () => {
    imgs.forEach((im, j) => { im.hidden = j !== k; if (j === k && !reduce) { im.classList.remove('swap'); void im.offsetWidth; im.classList.add('swap'); } });
    btns.forEach((x, j) => x.setAttribute('aria-pressed', j === k));
  }));
});
const settle = $$('.lp-stage');
function lios() { settle.forEach(s => { const r = s.getBoundingClientRect(); const v = cl(1 - (r.top - innerHeight * .25) / (innerHeight * .75)); s.style.setProperty('--v', (reduce ? 1 : v).toFixed(3)); }); }

// editorial reveals: one per heading
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .2 });
$$('.work-head, .tool, .door, .lios-hero, .lios-pr, .by-head, .contents li, .cv-head, .cv-cols, .close .rule').forEach(el => { el.classList.add('rev'); io.observe(el); });

let last = performance.now();
function loop(now) {
  const dt = Math.min(.033, (now - last) / 1000); last = now;
  if (scrollY < innerHeight * 1.6) { heroK.step(dt, now); spares.step(dt, now); }
  const cr = closeH.getBoundingClientRect(); if (cr.top < innerHeight * 1.5 && cr.bottom > -innerHeight * .5) closeK.step(dt, now);
  think(now / 1000); lios(); tone();
  requestAnimationFrame(loop);
}
(document.fonts?.ready ?? Promise.resolve()).then(() => { heroK.measure(); spares.measure(); closeK.measure(); requestAnimationFrame(loop); });
root.classList.add('ready');
