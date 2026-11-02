// Lens treatment lab: one engine, three art directions (?t=t1|t2|t3). Hooks for capture: __state(name).
import gsap from 'gsap';
import { createLens } from './engine.js';
const root = document.documentElement, T = root.dataset.t, reduce = root.classList.contains('rm'), mob = () => innerWidth < 860;
const $ = s => document.querySelector(s);
const L = createLens({ canvas: $('#gl'), overlay: $('#ov'), svg: $('#svg'), treatment: T, reduce, mobile: mob,
  onFound: by => { $('#show').disabled = true; $('#say').textContent = by === 'you' ? 'You found it: three groups, visible from one angle.' : 'There it is: three groups, visible from one angle.'; root.classList.add('found'); } });
if (!L) root.classList.add('no-gl');
const LAY = { t1: { d: [.5, .46, 12.6], m: [.5, .34, 0] }, t2: { d: [.66, .48, 13.2], m: [.5, .32, 0] }, t3: { d: [.56, .5, 12.4], m: [.5, .36, 0] } };
function lay() { const [cx, cy, dist] = LAY[T][mob() ? 'm' : 'd']; L.layout.cx = cx; L.layout.cy = cy; L.layout.dist = dist || 4.3 / (Math.tan(15 * Math.PI / 180) * (innerWidth / innerHeight)); L.resize(); }
if (L) { lay(); addEventListener('resize', lay); }
$('#show').addEventListener('click', () => L.found('system'));
let beat = 0;
window.__state = name => {
  if (name === 'found') L.found('system');
  if (name === 'insight') { beat = 2; gsap.to(L.S, { color: 1, cent: 1, cam: 1, hist: 1, labels: 1, duration: reduce ? 0 : 2.2, ease: 'power2.inOut' }); }
  if (name === 'creation') { beat = 3; gsap.to(L.S, { color: 1, cent: 1, cam: 1, hist: 1, labels: 1, planes: 1, arr: 1, duration: reduce ? 0 : 2.2, ease: 'power2.inOut' }); }
};
if (L) gsap.ticker.add(() => {
  const o = L.frame(beat);
  $('#big b').textContent = Math.round(Math.max(o.vis, L.S.found) * 100);
  if (L.S.found === 0 && o.hint && performance.now() - L.lastTouch < 4000) $('#hint').textContent = o.hint;
});
