/**
 * V5 hero B · Relationships.
 * 36 synthetic stores, 104 weeks each. Three different seasonal behaviours are mixed together and one store breaks.
 * The page computes all 630 correlations, clusters them (average linkage), reorders the matrix, stacks each group to show
 * its shared shape, finds the store that stops behaving like its group, and turns the groups into a forecast and a monitor.
 */
import { cl, lerp, smooth, ease, reduce, C, rng, canvas2d, camera, orbit, rail, fmt } from '../v5-lib/lib.js';

const MOB = innerWidth < 860, R = rng(5), T = 104, NS = 36, BREAK = 70;
// ── the data
const GROUPS = [14, 12, 10];
const shape = (g, t) => { const w = t % 52;
  return g === 0 ? 1 + .28 * Math.sin(2 * Math.PI * (t - 10) / 52)
    : g === 1 ? 1 + .05 * Math.sin(2 * Math.PI * t / 52) + .55 * Math.exp(-((w - 49) ** 2) / 6) + .35 * Math.exp(-((w - 47) ** 2) / 3)
    : (1 + .0065 * t) * (1 + .04 * Math.sin(2 * Math.PI * (t + 20) / 52)); };
let stores = [];
GROUPS.forEach((n, g) => { for (let k = 0; k < n; k++) { const L = 80 + R() * 120; stores.push({ g, y: [...Array(T)].map((_, t) => L * shape(g, t) * (1 + R.g() * .055)) }); } });
stores[3].y = stores[3].y.map((v, t) => t >= BREAK ? v * .62 : v);        // one store breaks (a closure, a missing feed: the data can't say which)
stores = stores.sort(() => R() - .5).map((s, i) => ({ ...s, id: 'S' + String(i + 1).padStart(2, '0') }));
const z = a => { const m = a.reduce((s, v) => s + v, 0) / a.length, sd = Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length); return a.map(v => (v - m) / sd); };
stores.forEach(s => { s.z = z(s.y); const lo = Math.min(...s.y), hi = Math.max(...s.y); s.n = s.y.map(v => (v - lo) / (hi - lo)); });
// ── every pair
const corr = stores.map(a => stores.map(b => a.z.reduce((s, v, t) => s + v * b.z[t], 0) / T));
// average-linkage clustering on 1 − r, cut at three groups
let cl3 = stores.map((_, i) => [i]);
while (cl3.length > 3) {
  let bi = 0, bj = 1, bd = 1e9;
  for (let i = 0; i < cl3.length; i++) for (let j = i + 1; j < cl3.length; j++) { let s = 0; cl3[i].forEach(a => cl3[j].forEach(b => { s += 1 - corr[a][b]; })); s /= cl3[i].length * cl3[j].length; if (s < bd) { bd = s; bi = i; bj = j; } }
  cl3[bi] = cl3[bi].concat(cl3[bj]); cl3.splice(bj, 1);
}
cl3.sort((a, b) => b.length - a.length);
cl3.forEach((c, k) => c.forEach(i => { stores[i].k = k; }));
// within each group, order by similarity to the group (so the matrix reads as blocks)
const ORDER = [];
cl3.forEach(c => { const m = c.map(i => [i, c.reduce((s, j) => s + corr[i][j], 0)]); m.sort((a, b) => b[1] - a[1]); m.forEach(([i]) => ORDER.push(i)); });
const POS = []; ORDER.forEach((i, r) => { POS[i] = r; });
const within = cl3.map(c => { let s = 0, n = 0; c.forEach(a => c.forEach(b => { if (a < b) { s += corr[a][b]; n++; } })); return s / n; });
let across = 0, na = 0; stores.forEach((a, i) => stores.forEach((b, j) => { if (i < j && a.k !== b.k) { across += corr[i][j]; na++; } })); across /= na;
// the group's shared shape, and who strays from it
const mean = cl3.map(c => [...Array(T)].map((_, t) => c.reduce((s, i) => s + stores[i].n[t], 0) / c.length));
stores.forEach((s, i) => {
  const others = cl3[s.k].filter(j => j !== i), ref = [...Array(T)].map((_, t) => others.reduce((a, j) => a + stores[j].z[t], 0) / others.length);
  const res = s.z.map((v, t) => v - ref[t]); let best = 0, at = 0;
  for (let t = 8; t < T - 8; t++) { const a = res.slice(0, t).reduce((x, y) => x + y, 0) / t, b = res.slice(t).reduce((x, y) => x + y, 0) / (T - t); if (Math.abs(b - a) > best) { best = Math.abs(b - a); at = t; } }
  const sd = Math.sqrt(res.reduce((x, y) => x + y * y, 0) / T);
  s.shift = best; s.at = at; s.sd = sd; s.ref = ref;
});
const ANOM = stores.reduce((b, s, i) => (s.shift > stores[b].shift ? i : b), 0), A = stores[ANOM];
// size of the break in sales terms: the store's share of its group's sales, after vs before
const gsum = t => cl3[A.k].filter(j => j !== ANOM).reduce((s, j) => s + stores[j].y[t], 0);
const share = (a, b) => { let x = 0, y = 0; for (let t = a; t < b; t++) { x += A.y[t]; y += gsum(t); } return x / y; };
const DROP = share(A.at, T) / share(0, A.at) - 1;
const NEXT = Math.max(...stores.filter((_, i) => i !== ANOM).map(s => s.shift)), TIMES = A.shift / NEXT;   // how much bigger than any other store's break
// forecast: the same weeks last year, scaled by how this year compares
const H = 12;
const FC = mean.map(m => { const ratio = m.slice(T - 12).reduce((a, b) => a + b) / m.slice(T - 64, T - 52).reduce((a, b) => a + b); return [...Array(H)].map((_, h) => m[T - 52 + h] * ratio); });
const NAMES = ['summer peak', 'holiday spike', 'steady growth'];
const shapeOf = k => {   // named from the group's own raw sales: how peaky, and how much it grew
  const raw = [...Array(T)].map((_, t) => cl3[k].reduce((s, i) => s + stores[i].y[t], 0)), sorted = [...raw].sort((a, b) => a - b), med = sorted[T >> 1];
  const peak = Math.max(...raw) / med, growth = raw.slice(T - 26).reduce((a, b) => a + b) / raw.slice(0, 26).reduce((a, b) => a + b);
  return peak > 1.6 ? 'holiday spike' : growth > 1.3 ? 'steady growth' : 'summer peak'; };
const KNAME = cl3.map((_, k) => shapeOf(k));
const COL = [C.teal, C.silver, C.amber];

// ── layouts (tile centres in world units)
const TW = 1.0, TH = .58;
const L0 = stores.map((_, i) => [((i % 6) - 2.5) * 1.18, (2.5 - Math.floor(i / 6)) * .78, 0]);
const BLOCK = [[3, 5], [3, 4], [2, 5]], BX = [-2.4, 1.25, 4.3];
const L1 = []; cl3.forEach((c, k) => { const [cols] = BLOCK[k]; ORDER.filter(i => stores[i].k === k).forEach((i, j) => { L1[i] = [BX[k] + ((j % cols) - (cols - 1) / 2) * 1.12, (1.9 - Math.floor(j / cols) * .72), 0]; }); });
const L2 = []; cl3.forEach((c, k) => { ORDER.filter(i => stores[i].k === k).forEach((i, j) => { L2[i] = [BX[k] - .2, .4, -j * .1]; }); });
L2[ANOM] = [BX[A.k] - .2 + .4, -1.1, 1.6];
const HM = { x: -1.9, y: -2.5, z: 1.4, s: 3.6 };     // the correlation matrix, on the floor in front of the wall

const cv = document.getElementById('cv'), S = canvas2d(cv), cam = camera(), ctl = orbit(cv, cam);
cam.tx = MOB ? 1 : 0; cam.ty = -.2; cam.yaw = .34; cam.pitch = .34; cam.dist = MOB ? 19 : 17;
const DUR = [6.5, 7.5, 8.5, Infinity];
const CAP = [
  `<b>36 stores</b>, two years of weekly sales. Every line is different; side by side, nothing lines up. The matrix on the left compares every pair: <b>630</b> of them.`,
  `Cluster on the correlations and the matrix falls into <b>three blocks</b>. Inside a block, stores move together (r ≈ ${within.map(v => v.toFixed(2)).join(', ')}); across blocks, r ≈ ${across.toFixed(2)}.`,
  `Stack each group and its shape appears: ${KNAME.map((n, k) => `<span style="color:${COL[k]}">${n}</span>`).join(', ')}. One store leaves its group: <span class="a">${A.id} falls ${Math.round(-DROP * 100)}% from week ${A.at}</span>, ${TIMES.toFixed(1)}× bigger than any other store’s break.`,
  `Three shapes become a <span class="t">forecast</span> for the next ${H} weeks and a <span class="t">monitor</span>: any store that leaves its group is flagged, with the week it happened. Check the data before calling it a business event.`,
];
const setRail = rail(document.querySelector('.copy'), CAP);
const st = { phase: 0, t: 0 }; let hover = -1;
function go(p) { st.phase = p; st.t = 0; setRail(p); ctl.touched = -1e9; }
document.querySelectorAll('.rail button').forEach(b => b.addEventListener('click', () => go(+b.dataset.p)));
document.getElementById('replay').addEventListener('click', () => go(0));
go(0);
const ro = document.getElementById('ro'), ph = document.getElementById('ph'); let rk = '';
function readout() {
  let rows;
  if (hover >= 0 && st.phase > 0) { const s = stores[hover], r = cl3[s.k].filter(j => j !== hover).reduce((a, j) => a + corr[hover][j], 0) / (cl3[s.k].length - 1); rows = [['store', s.id], ['group', `<span style="color:${COL[s.k]}">${KNAME[s.k]}</span>`], ['avg r with its group', r.toFixed(2)], ['biggest break', `week ${s.at} · ${(s.shift / s.sd).toFixed(1)} sd`]]; }
  else rows = st.phase === 0 ? [['series', '36'], ['weeks', fmt(T)], ['points', fmt(NS * T)], ['pairs compared', '630']]
    : st.phase === 1 ? [['method', 'average linkage on 1 − r'], ['groups', '3'], ...cl3.map((c, k) => [`<span style="color:${COL[k]}">●</span> group ${k + 1}`, `${c.length} stores · r ${within[k].toFixed(2)}`])]
    : st.phase === 2 ? [['outlier', A.id], ['from week', String(A.at)], ['change vs its group', `${Math.round(DROP * 100)}%`], ['vs next-largest break', `${TIMES.toFixed(1)}×`]]
    : [['forecast horizon', `${H} weeks`], ...cl3.map((_, k) => [`<span style="color:${COL[k]}">●</span> ${KNAME[k]}`, `next 12 wks ${(FC[k].reduce((a, b) => a + b) / mean[k].slice(T - 12).reduce((a, b) => a + b) * 100 - 100).toFixed(0)}% vs last 12`]), ['alerts', `1 · ${A.id}`]];
  const key = JSON.stringify(rows); if (key === rk) return; rk = key; ro.innerHTML = rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join(''); ph.textContent = ['complexity', 'structure', 'insight', 'creation'][st.phase];
}
cv.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); mouse = [e.clientX - r.left, e.clientY - r.top]; });
cv.addEventListener('pointerleave', () => { mouse = null; });
let mouse = null;

const wrap = a => Math.atan2(Math.sin(a), Math.cos(a)), tmp = [0, 0, 0, 0];
const CAMS = [{ yaw: .34, pitch: .34, d: 17 }, { yaw: .16, pitch: .4, d: 16.5 }, { yaw: .74, pitch: .26, d: 15.5 }, { yaw: .08, pitch: .1, d: 15 }];
function quad(c, w, h) { return [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([a, b]) => cam.p(c[0] + a * w / 2, c[1] + b * h / 2, c[2], [])); }
const inQuad = (q, x, y) => { let s = 0; for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4]; const c = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]); if (c !== 0) { if (s && Math.sign(c) !== s) return false; s = Math.sign(c); } } return true; };
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  st.t += dt; if (!reduce && st.t > DUR[st.phase]) go(st.phase + 1);
  const ctx = S.ctx, w = S.W, h = S.H, tp = st.phase;
  cam.cx = MOB ? w / 2 : w * .61; cam.cy = MOB ? h * .48 : h * .45; cam.scale = Math.min(w * (MOB ? .5 : .32), h * .5);
  const k = smooth(st.t / 2.6), from = CAMS[Math.max(0, tp - 1)], to = CAMS[tp], sway = reduce ? 0 : Math.sin(now / 5000) * .06;
  ctl.step();
  if (ctl.idle()) { const a = reduce ? 1 : 1 - Math.pow(.03, dt); cam.yaw += wrap(lerp(from.yaw, to.yaw, k) + sway - cam.yaw) * a; cam.pitch += (lerp(from.pitch, to.pitch, k) - cam.pitch) * a; cam.dist += (lerp(from.d, to.d, k) * (MOB ? 1.15 : 1) - cam.dist) * a; }
  cam.tx = lerp(cam.tx, MOB ? 1 : tp >= 2 ? 1.2 : 0, .04); cam.ty = lerp(cam.ty, tp >= 2 ? .4 : -.2, .04); cam.basis();
  ctx.clearRect(0, 0, w, h);

  // the correlation matrix: unordered, then reordered into blocks (desktop)
  {
    const ordK = tp === 0 ? 0 : tp === 1 ? ease((st.t - .6) / 2.4) : 1, hmA = tp >= 2 ? (tp === 2 ? 1 - smooth(st.t / 2) * .7 : .3) : 1, cs = HM.s / NS;
    const origin = cam.p(HM.x, HM.y, HM.z, []), ex = cam.p(HM.x + HM.s, HM.y, HM.z, []), ey = cam.p(HM.x, HM.y, HM.z + HM.s, []);
    const ux = [(ex[0] - origin[0]) / NS, (ex[1] - origin[1]) / NS], uy = [(ey[0] - origin[0]) / NS, (ey[1] - origin[1]) / NS];
    for (let i = 0; i < NS; i++) for (let j = 0; j < NS; j++) {
      const r = corr[i][j], pi = lerp(i, POS[i], ordK), pj = lerp(j, POS[j], ordK);
      const x = origin[0] + ux[0] * pj + uy[0] * pi, y = origin[1] + ux[1] * pj + uy[1] * pi;
      const v = Math.max(0, r), same = stores[i].k === stores[j].k && ordK > .5;
      ctx.fillStyle = same && tp >= 1 ? `rgba(${stores[i].k === 2 ? '242,163,58' : stores[i].k === 0 ? '47,184,172' : '169,182,196'},${(v * .9 * hmA).toFixed(3)})` : `rgba(240,237,231,${(v * .55 * hmA).toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ux[0], y + ux[1]); ctx.lineTo(x + ux[0] + uy[0], y + ux[1] + uy[1]); ctx.lineTo(x + uy[0], y + uy[1]); ctx.fill();
    }
    ctx.fillStyle = C.text3; ctx.font = '11px "Geist Mono", monospace'; ctx.fillText(tp === 0 ? 'r, every pair · as recorded' : 'r, every pair · clustered', origin[0], origin[1] - 10);
  }
  // tiles
  const lay = [];
  stores.forEach((s, i) => {
    const d = (POS[i] / NS) * .5;
    let p;
    if (tp === 0) p = L0[i];
    else if (tp === 1) { const q = ease((st.t - 1.2 - d * 2) / 1.6); p = L0[i].map((v, a) => lerp(v, L1[i][a], q)); }
    else if (tp === 2) { const q = ease((st.t - .3 - d) / 1.8); p = L1[i].map((v, a) => lerp(v, L2[i][a], q)); }
    else { const q = ease(st.t / 1.6); p = L2[i].map((v, a) => lerp(v, i === ANOM ? L2[i][a] : [BX[s.k] - .2, .4, 0][a], q)); }
    lay[i] = p;
  });
  const order = stores.map((_, i) => i).sort((a, b) => cam.p(...lay[b], tmp)[2] - cam.p(...lay[a], [])[2]);
  const colK = tp === 0 ? 0 : tp === 1 ? smooth((st.t - 2.4) / 1.2) : 1;
  const stackK = tp >= 2 ? smooth((st.t - .5) / 1.5) : 0;
  let hov = -1;
  const scaleT = tp === 3 ? 1 + .7 * ease(st.t / 1.6) : 1;
  for (const i of order) {
    const s = stores[i], c = lay[i], isA = i === ANOM, big = tp === 3 ? (isA ? 1.25 : scaleT) : tp === 2 ? 1 + (isA ? .3 : .5) * stackK : 1;
    const q = quad(c, TW * big, TH * big);
    const solo = tp < 2 || isA;
    ctx.beginPath(); q.forEach((v, j) => j ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1])); ctx.closePath();
    ctx.fillStyle = solo ? 'rgba(22,26,32,.88)' : `rgba(22,26,32,${(.88 - stackK * .8).toFixed(3)})`; ctx.fill();
    ctx.strokeStyle = isA && tp >= 2 ? 'rgba(242,163,58,.7)' : solo ? 'rgba(240,237,231,.12)' : `rgba(240,237,231,${(.12 - stackK * .1).toFixed(3)})`; ctx.lineWidth = 1; ctx.stroke();
    if (mouse && tp > 0 && inQuad(q, mouse[0], mouse[1])) hov = i;
    // the series, drawn on the tile
    const col = isA && tp >= 2 ? C.amber : colK > .5 ? COL[s.k] : C.silver;
    ctx.strokeStyle = col; ctx.globalAlpha = (hover === i ? 1 : solo ? .9 : .9 - stackK * .72); ctx.lineWidth = hover === i ? 1.8 : 1.1; ctx.beginPath();
    const pad = .08, ww = TW * big * (1 - pad * 2), hh = TH * big * (1 - pad * 3);
    for (let t = 0; t < T; t++) { const v = cam.p(c[0] - ww / 2 + ww * t / (T - 1), c[1] - hh / 2 + hh * s.n[t], c[2], tmp); t ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]); }
    ctx.stroke(); ctx.globalAlpha = 1;
    if (tp < 2 || isA) { const v = cam.p(c[0] - TW * big / 2 + .04, c[1] + TH * big / 2 - .05, c[2], tmp); ctx.fillStyle = isA && tp >= 2 ? C.amber : C.text3; ctx.font = `${Math.max(8, Math.min(11, v[3] * .1))}px "Geist Mono", monospace`; ctx.fillText(s.id, v[0], v[1] + 9); }
    if (isA && tp >= 2) {   // where it broke
      const v = cam.p(c[0] - ww / 2 + ww * A.at / (T - 1), c[1] - hh / 2 - .02, c[2], []), v2 = cam.p(c[0] - ww / 2 + ww * A.at / (T - 1), c[1] + hh / 2, c[2], []);
      ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(242,163,58,.8)'; ctx.beginPath(); ctx.moveTo(v[0], v[1]); ctx.lineTo(v2[0], v2[1]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.amber; ctx.font = '11px "Geist Mono", monospace'; ctx.fillText(`week ${A.at} · ${Math.round(DROP * 100)}%`, v[0] + 6, v[1] + 14);
    }
  }
  hover = hov;
  // the shared shape of each group (insight), then its forecast (creation)
  if (tp >= 2) cl3.forEach((_, k) => {
    const c = [BX[k] - .2, .4, 0], big = tp === 3 ? scaleT : 1 + .5 * stackK, ww = TW * big * .84, hh = TH * big * .76, gk = smooth((st.t - (tp === 2 ? 1.6 : 0)) / 1.2);
    if (gk <= 0) return;
    ctx.globalAlpha = gk; ctx.strokeStyle = COL[k]; ctx.lineWidth = 2.2; ctx.beginPath();
    const span = tp === 3 ? T + H : T, xs = t => c[0] - ww / 2 + ww * t / (span - 1);
    for (let t = 0; t < T; t++) { const v = cam.p(xs(t), c[1] - hh / 2 + hh * mean[k][t], c[2] + .02, tmp); t ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]); }
    ctx.stroke();
    if (tp === 3) {
      const fk = smooth((st.t - 1.4) / 1.4); ctx.globalAlpha = fk; ctx.setLineDash([4, 4]); ctx.beginPath();
      for (let j = -1; j < H; j++) { const val = j < 0 ? mean[k][T - 1] : FC[k][j], v = cam.p(xs(T + j), c[1] - hh / 2 + hh * val, c[2] + .02, tmp); j < 0 ? ctx.moveTo(v[0], v[1]) : ctx.lineTo(v[0], v[1]); }
      ctx.stroke(); ctx.setLineDash([]);
      const v0 = cam.p(xs(T - 1), c[1] - hh / 2, c[2], []), v1 = cam.p(xs(T - 1), c[1] + hh / 2, c[2], []);
      ctx.strokeStyle = 'rgba(240,237,231,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(v0[0], v0[1]); ctx.lineTo(v1[0], v1[1]); ctx.stroke();
    }
    const lv = cam.p(c[0] - TW * big / 2, c[1] + TH * big / 2 + .12, c[2], []);
    ctx.globalAlpha = gk; ctx.fillStyle = COL[k]; ctx.font = '12px "Geist Mono", monospace'; ctx.fillText(`${KNAME[k]} · ${cl3[k].length} stores${tp === 3 ? ' · forecast →' : ''}`, lv[0], lv[1]);
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  });
  if (tp === 3) { const c = lay[ANOM], v = cam.p(c[0] + TW * .62, c[1] + TH * .62, c[2], []), pulse = reduce ? 1 : .6 + .4 * Math.sin(now / 300); ctx.fillStyle = C.amber; ctx.globalAlpha = pulse; ctx.beginPath(); ctx.arc(v[0], v[1], 4, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; ctx.font = '11px "Geist Mono", monospace'; ctx.fillText('alert · left its group', v[0] + 9, v[1] + 4); }
  document.querySelector('.rail li.on')?.style.setProperty('--p', (DUR[tp] === Infinity ? 100 : cl(st.t / DUR[tp]) * 100) + '%');
  readout();
  requestAnimationFrame(frame);
}
document.fonts.ready.then(() => requestAnimationFrame(frame));
window.__go = go;
