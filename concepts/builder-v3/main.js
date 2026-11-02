import { bootEngine } from './engine.js';
import { initDemo } from './demo.js';

const root = document.documentElement, reduce = root.classList.contains('rm');
const steps = [...document.querySelectorAll('.steps li')], stepsEl = document.querySelector('.steps'), note = document.querySelector('.note');
const navs = [...document.querySelectorAll('.nav a')], work = document.getElementById('work'), next = document.getElementById('next');
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
let lastStep = -2, lastNav = -1;

function setNav(i) { if (i === lastNav) return; lastNav = i; navs.forEach((a, k) => { const on = k === i; a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'); }); }
function onScroll() {
  document.body.classList.toggle('past', scrollY > 40);
  const mid = innerHeight * .5;
  if (next.getBoundingClientRect().top < mid) setNav(5);
  else if (work.getBoundingClientRect().top < mid) setNav(2);
}
function onStage(p) {
  const show = clamp(Math.min(p - 1.4, 5.6 - p) * 3);
  stepsEl.style.setProperty('--so', show.toFixed(3));
  note.style.setProperty('--no', clamp(Math.min(p - .6, 5.6 - p) * 3).toFixed(3));
  document.querySelector('.m2').style.setProperty('--mo', clamp(Math.min(p - .6, 5.5 - p) * 3).toFixed(3));
  steps.forEach((li, k) => li.style.setProperty('--f', clamp(p - 1.5 - k).toFixed(3)));
  const s = p < 1.5 ? -1 : Math.min(3, Math.round(p) - 2);
  if (s !== lastStep) { lastStep = s; steps.forEach((li, k) => { li.classList.toggle('on', k === s); li.classList.toggle('done', k < s); }); }
  if (work.getBoundingClientRect().top >= innerHeight * .5) setNav(p < .5 ? 0 : 1);
}

addEventListener('scroll', onScroll, { passive: true });
document.querySelectorAll('[data-go]').forEach(a => a.addEventListener('click', e => {
  if (root.classList.contains('no-gl')) return;
  e.preventDefault(); const t = document.getElementById('track');
  scrollTo({ top: t.offsetTop + +a.dataset.go * (t.offsetHeight - innerHeight), behavior: reduce ? 'auto' : 'smooth' });
}));
onScroll();
initDemo(reduce);
const start = () => bootEngine({ onStage });
(document.fonts?.ready ?? Promise.resolve()).then(start, start);
