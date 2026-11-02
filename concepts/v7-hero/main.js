/**
 * V7 hero · Lens (Observatory). The engine renders and measures; this file choreographs.
 * Scroll drives one GSAP timeline (no pinning by script, no snapping); the visitor can take the instrument at any time.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createLens } from './lens.js';
import { build } from '../v6-hero/data.js';
gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement, reduce = root.classList.contains('rm'), mob = () => innerWidth < 860;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const say0 = $('#say0'), hint = $('#hint'), h1 = $('#h1'), who = $('.who');
const L = createLens({ canvas: $('#gl'), overlay: $('#ov'), svg: $('#svg'), treatment: 't1', reduce, mobile: mob,
  onFound: by => { $('#show').disabled = true; say0.textContent = by === 'you' ? 'You found it. Three groups, visible from exactly one angle.' : 'There they are. Three groups, visible from exactly one angle.'; hint.textContent = 'Keep scrolling to see what it means.'; root.classList.add('found'); compact(true); } });

who.style.setProperty('--hh', h1.offsetHeight + 18 + 'px');
if (!L) {   // no WebGL: the same findings, as text
  root.classList.add('no-gl'); const D = build({ small: mob() }), pct = v => (v * 100).toFixed(1).replace(/\.0$/, '') + '%';
  say0.textContent = `In ${D.N.toLocaleString('en-CA')} synthetic customers, three groups only appear from one angle: a mix of visits, spend and tenure. Any single measure alone is right ${Math.round(D.BEST1 * 100)}% of the time; the combined rule sorts ${pct(D.ACC)} of ${D.HOLD.length} unseen customers correctly.`;
  fillMethod(D, D.D.map((v, i) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)} ${['visits', 'spend', 'tenure'][i]}`).join('  '));
}
else {
  const D = L.DATA, pct = v => (v * 100).toFixed(1).replace(/\.0$/, '') + '%';
  $('#b-one').textContent = Math.round(D.BEST1 * 100) + '%'; $('#b-acc').textContent = pct(D.ACC); $('#b-hold').textContent = D.HOLD.length;
  // level three: the method, for anyone who wants it
  fillMethod(D, L.coef);
  if (0) $('#method').innerHTML = [
    ['Data', `${D.N.toLocaleString('en-CA')} synthetic customers, three measures (visits a month, average spend, tenure). Three groups were planted along a direction that mixes all three, with shared spread everywhere else.`],
    ['Gauge', 'Every frame: the best between-group to within-group variance ratio over 16 directions in the current view, as a share of the best possible.'],
    ['Clustering', `k-means, k = 3, k-means++ starts, best of 6. Settles in ${D.H.length} steps.`],
    ['Direction', `Through the outer two centres: <code>${L.coef}</code>. Separation along it: ${D.SEP.toFixed(1)}× between / within.`],
    ['Rule', `Two thresholds on that direction, midway between neighbouring centres. Tested on ${D.HOLD.length} newly generated customers: ${pct(D.ACC)} correct. Best single column (${D.BEST1C}): ${Math.round(D.BEST1 * 100)}%.`],
  ].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');

  // composition: the instrument is the page
  const lay = () => { if (mob()) { L.layout.cx = .5; L.layout.cy = .33; L.layout.dist = 4.4 / (Math.tan(15 * Math.PI / 180) * innerWidth / innerHeight); L.layout.ps = 1.6; } else { L.layout.cx = isCompact ? .52 : .58; L.layout.cy = .47; L.layout.dist = 14.4; L.layout.ps = 1; } L.resize(); placeHead(); };

  // typography answers discovery: the statement steps back and makes room for what was found
  let isCompact = false;
  function placeHead(animate = false) {
    const top0 = h1.offsetTop, s = mob() ? .72 : .5, ty = (mob() ? 70 : 96) - top0;
    who.style.setProperty('--hh', h1.offsetHeight + 18 + 'px');
    if (mob()) { gsap.to(h1, { y: isCompact ? -12 : 0, autoAlpha: isCompact ? 0 : 1, duration: animate && !reduce ? .7 : 0, ease: 'power2.inOut' }); return; }   // on a phone the statement yields the stage entirely
    gsap.to(h1, { x: 0, y: isCompact ? ty : 0, scale: isCompact ? s : 1, duration: animate && !reduce ? 1.3 : 0, ease: 'power3.inOut', transformOrigin: '0 0' });
    gsap.to(who, { autoAlpha: isCompact ? 0 : 1, duration: animate && !reduce ? .6 : 0 });
  }
  function compact(on) { if (on === isCompact) return; isCompact = on; placeHead(true); if (!mob()) gsap.to(L.layout, { cx: on ? .52 : .58, duration: reduce ? 0 : 1.4, ease: 'power3.inOut' }); }
  lay(); addEventListener('resize', lay);

  // the story, on scroll
  const S = L.S, track = $('#track');
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  tl.to(S, { color: 1, duration: 1.1, ease: 'power1.inOut' }, 2.2)
    .to(S, { cent: 1, duration: 2.2 }, 2.3)
    .to(S, { cam: 1, duration: 1.9, ease: 'power2.inOut' }, 4.6)
    .to(S, { dial: 0, duration: .8, ease: 'power1.inOut' }, 5.2)
    .to(S, { hist: 1, duration: 1.1, ease: 'power2.out' }, 5.7)
    .to(S, { labels: 1, duration: .7 }, 6.2)
    .to(S, { planes: 1, duration: 1.1, ease: 'power2.out' }, 7.3)
    .to(S, { arr: 1, duration: 1.4 }, 8.2)
    .to(S, { labels: 0, arr: 0, planes: 0, hist: 0, cent: 0, duration: .8, ease: 'power1.in' }, 10.2)
    .to(S, { exit: 1, duration: 1.4, ease: 'power2.inOut' }, 10.4);
  ScrollTrigger.create({ trigger: track, start: 'top top', end: 'bottom bottom', scrub: reduce ? true : 1.2, animation: tl });
  const BEATS = [0, 2.2, 4.6, 7.3, 10.2].map(t => t / tl.duration());
  $('#show').addEventListener('click', () => L.found('system'));
  $$('[data-go]').forEach(b => b.addEventListener('click', () => {
    const p = [.04, .27, .48, .7][+b.dataset.go], top = track.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + p * (track.offsetHeight - innerHeight), behavior: reduce ? 'auto' : 'smooth' });
  }));

  let beat = -1;
  gsap.ticker.add(() => {
    const r = track.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight || document.hidden) return;   // nothing renders offscreen
    const pr = tl.progress(), b = BEATS.reduce((a, s, i) => (pr >= s - .002 ? i : a), 0);
    const o = L.frame(b); window.__renders = (window.__renders || 0) + 1;
    if (b !== beat) {
      beat = b;
      $$('.beat').forEach((el, i) => el.classList.toggle('on', i === b));
      $$('.progress li').forEach((li, i) => { li.classList.toggle('on', i === b); li.classList.toggle('done', i < b); });
      root.classList.toggle('exiting', b === 4);
      compact(b >= 1 || S.found > 0);
    }
    if (b === 0 && S.found === 0 && !root.classList.contains('found') && o.hint && performance.now() - L.lastTouch < 4000) hint.textContent = o.hint;
  });
}
window.__lens = L; window.__go = p => { const t = document.getElementById('track'); scrollTo(0, t.offsetTop + p * (t.offsetHeight - innerHeight)); };

function fillMethod(D, coef) {
  const pct = v => (v * 100).toFixed(1).replace(/\.0$/, '') + '%';
  document.getElementById('method').innerHTML = [
    ['Data', `${D.N.toLocaleString('en-CA')} synthetic customers, three measures (visits a month, average spend, tenure). Three groups were planted along a direction that mixes all three, with shared spread everywhere else.`],
    ['Gauge', 'Every frame: the best between-group to within-group variance ratio over 16 directions in the current view, as a share of the best possible.'],
    ['Clustering', `k-means, k = 3, k-means++ starts, best of 6. Settles in ${D.H.length} steps.`],
    ['Direction', `Through the outer two centres: <code>${coef}</code>. Separation along it: ${D.SEP.toFixed(1)}× between / within.`],
    ['Rule', `Two thresholds on that direction, midway between neighbouring centres. Tested on ${D.HOLD.length} newly generated customers: ${pct(D.ACC)} correct. Best single column (${D.BEST1C}): ${Math.round(D.BEST1 * 100)}%.`],
  ].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
}
