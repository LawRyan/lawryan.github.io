/**
 * V5 hero C · Landscape.
 * 360 synthetic weeks for a made-up online shop: discount, ad spend and profit. Most weeks sit where the shop habitually
 * operates. A quadratic surface is fitted by least squares; its peak is found analytically; the prediction's uncertainty
 * is computed from the fit, so the planner says how sure it is, and it is least sure exactly where the peak is.
 */
import { cl, lerp, smooth, ease, reduce, C, rng, canvas2d, camera, orbit, rail, fmt } from '../v5-lib/lib.js';

const MOB = innerWidth < 860, R = rng(13);
const truth = (x, y) => 18 + 1.6 * x - .05 * x * x + 2.4 * y - .085 * y * y - .02 * x * y;   // profit, $k
const OBS = [];
for (let i = 0; i < 360; i++) {
  const habit = R() < .74;
  const x = cl(habit ? 6 + R.g() * 3 : R() * 30, 0, 30), y = cl(habit ? 6 + R.g() * 2.4 : R() * 20, 0, 20);
  OBS.push({ x, y, f: truth(x, y) + R.g() * 3.2 });
}
// ── least squares: f ≈ b0 + b1 x + b2 y + b3 x² + b4 y² + b5 xy
const feat = (x, y) => [1, x, y, x * x, y * y, x * y];
function solve(A, b) { const n = b.length, M = A.map((r, i) => [...r, b[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; for (let r = 0; r < n; r++) if (r !== c) { const k = M[r][c] / M[c][c]; for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j]; } } return M.map((r, i) => r[n] / r[i]); }
function inv(A) { const n = A.length; return [...Array(n)].map((_, j) => solve(A, [...Array(n)].map((_, i) => (i === j ? 1 : 0)))).reduce((M, col, j) => { col.forEach((v, i) => { M[i][j] = v; }); return M; }, [...Array(n)].map(() => Array(n).fill(0))); }
const X = OBS.map(o => feat(o.x, o.y)), XtX = [...Array(6)].map((_, i) => [...Array(6)].map((_, j) => X.reduce((s, r) => s + r[i] * r[j], 0)));
const Xty = [...Array(6)].map((_, i) => X.reduce((s, r, k) => s + r[i] * OBS[k].f, 0));
const B = solve(XtX, Xty), XtXi = inv(XtX);
const fit = (x, y) => feat(x, y).reduce((s, v, i) => s + v * B[i], 0);
const RES = OBS.map(o => o.f - fit(o.x, o.y)), S2 = RES.reduce((s, r) => s + r * r, 0) / (OBS.length - 6), SE = Math.sqrt(S2);
const FM = OBS.reduce((s, o) => s + o.f, 0) / OBS.length, R2 = 1 - RES.reduce((s, r) => s + r * r, 0) / OBS.reduce((s, o) => s + (o.f - FM) ** 2, 0);
const seAt = (x, y) => { const v = feat(x, y); let q = 0; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) q += v[i] * XtXi[i][j] * v[j]; return Math.sqrt(S2 * q); };
// the peak: where both slopes are zero
const [PX, PY] = (() => { const a = 2 * B[3], b = B[5], c = 2 * B[4], d1 = -B[1], d2 = -B[2], det = a * c - b * b; return [cl((d1 * c - b * d2) / det, 0, 30), cl((a * d2 - b * d1) / det, 0, 20)]; })();
const PF = fit(PX, PY), PSE = seAt(PX, PY);
const HX = OBS.reduce((s, o) => s + o.x, 0) / OBS.length, HY = OBS.reduce((s, o) => s + o.y, 0) / OBS.length, HF = fit(HX, HY), HSE = seAt(HX, HY);
const near = (x, y) => OBS.filter(o => Math.abs(o.x - x) <= 3 && Math.abs(o.y - y) <= 2).length;
const NP = near(PX, PY), NH = near(HX, HY);

// ── world: discount → X, ad spend → Z, profit → Y
const WX = x => x / 30 * 6 - 3, WZ = y => y / 20 * 6 - 3, WY = f => (f - 8) / 44 * 3.2;
const cv = document.getElementById('cv'), S = canvas2d(cv), cam = camera(), ctl = orbit(cv, cam);
cam.ty = 1.0; cam.yaw = .75; cam.pitch = .42; cam.dist = 13;
const DUR = [6.5, 7, 8, Infinity];
const CAP = [
  `<b>360 weeks</b> of a made-up shop: how much discount, how much on ads, and the profit that followed. Most weeks cluster where the shop always operates. The rest scatter.`,
  `Fit one smooth surface through all of it (least squares, six terms). It explains <b>${Math.round(R2 * 100)}%</b> of the variation; the stems show what it misses, week by week.`,
  `From above, the contours point to a peak: <span class="a">${PX.toFixed(0)}% discount, $${PY.toFixed(1)}k on ads → $${PF.toFixed(1)}k</span>. It sits where the shop has spent only <b>${NP} week${NP === 1 ? '' : 's'}</b>, so the model is least sure exactly there.`,
  `The surface becomes a <span class="t">planner</span>. Point anywhere on the floor for a forecast and an honest range. The next step isn't “do it”; it's a small test at the peak.`,
];
const setRail = rail(document.querySelector('.copy'), CAP);
const st = { phase: 0, t: 0 }; let probe = null, probeAuto = 0;
function go(p) { st.phase = p; st.t = 0; setRail(p); ctl.touched = -1e9; probe = null; }
document.querySelectorAll('.rail button').forEach(b => b.addEventListener('click', () => go(+b.dataset.p)));
document.getElementById('replay').addEventListener('click', () => go(0));
document.getElementById('peak').addEventListener('click', () => { if (st.phase !== 3) go(3); probe = { x: PX, y: PY, auto: false }; });
let mouse = null;
cv.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); mouse = [e.clientX - r.left, e.clientY - r.top, performance.now()]; });
cv.addEventListener('pointerleave', () => { mouse = null; });
go(0);
const ro = document.getElementById('ro'), ph = document.getElementById('ph'); let rk = '';
function readout(pr) {
  const rows = st.phase === 0 ? [['weeks', '360'], ['inputs', 'discount, ad spend'], ['outcome', 'weekly profit'], ['weeks near usual spot', `${NH}`]]
    : st.phase === 1 ? [['model', 'quadratic, 6 terms'], ['R²', R2.toFixed(2)], ['typical miss (σ)', `$${SE.toFixed(1)}k`], ['fitted on', '360 weeks']]
    : st.phase === 2 ? [['peak', `${PX.toFixed(1)}% · $${PY.toFixed(1)}k ads`], ['predicted profit', `$${PF.toFixed(1)}k ± ${(1.96 * PSE).toFixed(1)}k`], ['usual spot', `$${HF.toFixed(1)}k ± ${(1.96 * HSE).toFixed(1)}k`], ['weeks near the peak', `${NP} (vs ${NH} at the usual spot)`]]
    : [['discount', `${pr.x.toFixed(1)}%`], ['ad spend', `$${pr.y.toFixed(1)}k`], ['forecast profit', `$${fit(pr.x, pr.y).toFixed(1)}k`], ['95% range (mean)', `± $${(1.96 * seAt(pr.x, pr.y)).toFixed(1)}k`], ['weeks of evidence nearby', String(near(pr.x, pr.y))]];
  const key = JSON.stringify(rows); if (key === rk) return; rk = key; ro.innerHTML = rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join(''); ph.textContent = ['complexity', 'structure', 'insight', 'creation'][st.phase];
}

// contours of the fitted surface (marching squares), computed once
const G = 40, grid = [...Array(G + 1)].map((_, i) => [...Array(G + 1)].map((_, j) => fit(i / G * 30, j / G * 20)));
const LEVELS = []; for (let v = 20; v < PF; v += 4) LEVELS.push(v);
const CONT = LEVELS.map(L => { const seg = []; for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
  const q = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], v = q.map(([a, b]) => grid[a][b]), pts = [];
  for (let e = 0; e < 4; e++) { const a = v[e] - L, b = v[(e + 1) % 4] - L; if ((a < 0) !== (b < 0)) { const t = a / (a - b), p0 = q[e], p1 = q[(e + 1) % 4]; pts.push([lerp(p0[0], p1[0], t) / G * 30, lerp(p0[1], p1[1], t) / G * 20]); } }
  if (pts.length >= 2) seg.push([pts[0], pts[1]]); if (pts.length === 4) seg.push([pts[2], pts[3]]); } return { L, seg }; });

const wrap = a => Math.atan2(Math.sin(a), Math.cos(a)), tmp = [0, 0, 0, 0];
const CAMS = [{ yaw: .75, pitch: .42, d: 13 }, { yaw: .45, pitch: .36, d: 12.5 }, { yaw: .02, pitch: 1.36, d: 13.5 }, { yaw: .62, pitch: .5, d: 12.5 }];
const P = (x, y, f) => cam.p(WX(x), WY(f), WZ(y), []);
const SEMAX = seAt(30, 20);
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  st.t += dt; if (!reduce && st.t > DUR[st.phase]) go(st.phase + 1);
  const ctx = S.ctx, w = S.W, h = S.H, tp = st.phase;
  cam.cx = MOB ? w / 2 : w * .6; cam.cy = MOB ? h * .52 : h * .5; cam.scale = Math.min(w * (MOB ? .36 : .2), h * .34);
  const k = ease(st.t / 3), from = CAMS[Math.max(0, tp - 1)], to = CAMS[tp], sway = reduce || tp === 2 ? 0 : Math.sin(now / 4500) * .18;
  ctl.step();
  if (ctl.idle()) { const a = reduce ? 1 : 1 - Math.pow(.03, dt); cam.yaw += wrap(lerp(from.yaw, to.yaw, k) + sway - cam.yaw) * a; cam.pitch += (lerp(from.pitch, to.pitch, k) - cam.pitch) * a; cam.dist += (lerp(from.d, to.d, k) * (MOB ? 1.2 : 1) - cam.dist) * a; }
  cam.ty = lerp(cam.ty, tp === 2 ? 0 : 1.0, .04); cam.basis();
  ctx.clearRect(0, 0, w, h);
  const surfK = tp === 0 ? 0 : tp === 1 ? ease((st.t - .4) / 2.6) : 1;
  // the floor: grid, axes and ticks
  ctx.lineWidth = 1; ctx.strokeStyle = C.hair; ctx.beginPath();
  for (let i = 0; i <= 6; i++) { const a = P(i * 5, 0, 8), b = P(i * 5, 20, 8); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  for (let j = 0; j <= 4; j++) { const a = P(0, j * 5, 8), b = P(30, j * 5, 8); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  ctx.stroke();
  ctx.fillStyle = C.text3; ctx.font = '10.5px "Geist Mono", monospace';
  for (let i = 0; i <= 6; i++) { const a = P(i * 5, 20, 8); ctx.fillText(`${i * 5}%`, a[0] - 8, a[1] + 16); }
  for (let j = 0; j <= 4; j++) { const a = P(30, j * 5, 8); ctx.fillText(`$${j * 5}k`, a[0] + 8, a[1] + 4); }
  { const a = P(15, 20, 8), b = P(30, 10, 8); ctx.fillStyle = C.text2; ctx.fillText('discount', a[0] - 22, a[1] + 32); ctx.fillText('ad spend', b[0] + 40, b[1] + 4); }
  // where the evidence is: a density wash on the floor
  ctx.fillStyle = 'rgba(169,182,196,.07)';
  OBS.forEach(o => { const v = P(o.x, o.y, 8); ctx.beginPath(); ctx.arc(v[0], v[1], Math.max(2, v[3] * .05), 0, 6.283); ctx.fill(); });
  // contours on the floor (insight onward)
  const cK = tp >= 2 ? smooth((st.t - (tp === 2 ? 1.4 : 0)) / 1.6) : 0;
  if (cK > 0) CONT.forEach(({ L, seg }, li) => {
    const hot = L > PF - 5; ctx.strokeStyle = hot ? `rgba(242,163,58,${.8 * cK})` : `rgba(47,184,172,${(.22 + li / LEVELS.length * .4) * cK})`; ctx.lineWidth = hot ? 1.4 : 1; ctx.beginPath();
    seg.forEach(([a, b]) => { const p = P(a[0], a[1], 8), q = P(b[0], b[1], 8); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }); ctx.stroke();
    if (tp === 2 && seg.length) { const s = seg[Math.floor(seg.length * .3)], p = P(s[0][0], s[0][1], 8); ctx.fillStyle = `rgba(167,175,185,${cK})`; ctx.fillText(`$${L}k`, p[0] + 3, p[1] - 3); }
  });
  // the fitted surface as a mesh, rising from flat; coloured by height, or by uncertainty when it matters
  if (surfK > 0) {
    const N = 22, sK = tp === 2 ? 1 - .75 * cK : 1, unc = tp >= 2 ? cK : 0;
    const val = (x, y) => lerp(FM, fit(x, y), surfK);
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i <= N; i++) {
      let prev = null;
      for (let j = 0; j <= N; j++) {
        const x = (pass ? j : i) / N * 30, y = (pass ? i : j) / N * 20, v = P(x, y, val(x, y));
        if (prev) { const f = (val(x, y) - 20) / (PF - 20), u = seAt(x, y) / SEMAX;
          const r = lerp(lerp(120, 47, cl(f)), 242, unc * u), g = lerp(lerp(135, 184, cl(f)), 163, unc * u), b = lerp(lerp(150, 172, cl(f)), 58, unc * u);
          ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${(.28 + .45 * cl(f)) * surfK * sK})`; ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(v[0], v[1]); ctx.stroke(); }
        prev = v;
      }
    }
  }
  // the weeks themselves: points, with a stem to the floor, then to the surface
  const ptK = tp === 3 ? .35 : tp === 2 ? 1 - cK * .6 : 1;
  OBS.forEach((o, i) => {
    const v = P(o.x, o.y, o.f), base = surfK > .05 ? P(o.x, o.y, lerp(8, fit(o.x, o.y), surfK)) : P(o.x, o.y, 8);
    const above = o.f > fit(o.x, o.y);
    ctx.strokeStyle = surfK > .05 ? (above ? `rgba(47,184,172,${.5 * ptK})` : `rgba(169,182,196,${.4 * ptK})`) : `rgba(240,237,231,${.09 * ptK})`;
    ctx.beginPath(); ctx.moveTo(v[0], v[1]); ctx.lineTo(base[0], base[1]); ctx.stroke();
    ctx.fillStyle = `rgba(240,237,231,${.85 * ptK})`; ctx.beginPath(); ctx.arc(v[0], v[1], Math.max(1.2, v[3] * .022), 0, 6.283); ctx.fill();
  });
  // the peak, and its uncertainty
  if (tp >= 2) {
    const pk = smooth((st.t - (tp === 2 ? 2.6 : 0)) / 1);
    if (pk > 0) {
      const v = P(PX, PY, 8), top = P(PX, PY, PF), hv = P(HX, HY, 8);
      ctx.globalAlpha = pk; ctx.strokeStyle = C.amber; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(v[0], v[1], 10, 0, 6.283); ctx.moveTo(v[0] - 18, v[1]); ctx.lineTo(v[0] + 18, v[1]); ctx.moveTo(v[0], v[1] - 18); ctx.lineTo(v[0], v[1] + 18); ctx.stroke();
      if (tp === 3) { ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(v[0], v[1]); ctx.lineTo(top[0], top[1]); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = C.amber; ctx.font = '12px "Geist Mono", monospace'; ctx.fillText(MOB ? 'peak' : `peak · $${PF.toFixed(1)}k ± ${(1.96 * PSE).toFixed(1)}k`, v[0] + 16, v[1] - 14);
      ctx.fillStyle = C.text2; if (!MOB) ctx.fillText(`${NP} weeks of evidence here`, v[0] + 16, v[1] + 2);
      ctx.strokeStyle = 'rgba(240,237,231,.6)'; ctx.beginPath(); ctx.arc(hv[0], hv[1], 7, 0, 6.283); ctx.stroke();
      ctx.fillStyle = C.text2; if (!MOB) ctx.fillText(`usual spot · $${HF.toFixed(1)}k ± ${(1.96 * HSE).toFixed(1)}k`, hv[0] + 12, hv[1] + 18);
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }
  }
  // the planner: a probe on the floor
  let pr = { x: HX, y: HY };
  if (tp === 3) {
    if (mouse && performance.now() - mouse[2] < 6000 && !ctl.down) {   // nearest floor point under the cursor
      let best = 1e9; for (let i = 0; i <= 30; i++) for (let j = 0; j <= 20; j++) { const v = P(i, j, 8, tmp); const d = (v[0] - mouse[0]) ** 2 + (v[1] - mouse[1]) ** 2; if (d < best) { best = d; pr = { x: i, y: j }; } }
      if (best > 3000) pr = probe || pr; probe = { ...pr, auto: false };
    } else if (probe && !probe.auto) pr = probe;
    else { const u = reduce ? 1 : (Math.sin(now / 3200 - 1.57) + 1) / 2; pr = { x: lerp(HX, PX, u), y: lerp(HY, PY, u) }; }
    const v0 = P(pr.x, pr.y, 8), v1 = P(pr.x, pr.y, fit(pr.x, pr.y)), e = 1.96 * seAt(pr.x, pr.y), a = P(pr.x, pr.y, fit(pr.x, pr.y) + e), b = P(pr.x, pr.y, fit(pr.x, pr.y) - e);
    // slices through the probe, along each input
    ctx.lineWidth = 2; ctx.strokeStyle = C.teal; ctx.beginPath(); for (let i = 0; i <= 30; i++) { const v = P(i, pr.y, fit(i, pr.y)); i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]); } ctx.stroke();
    ctx.beginPath(); for (let j = 0; j <= 20; j++) { const v = P(pr.x, j, fit(pr.x, j)); j ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]); } ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(240,237,231,.5)'; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(v0[0], v0[1]); ctx.lineTo(v1[0], v1[1]); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = C.text; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = C.text; ctx.beginPath(); ctx.arc(v1[0], v1[1], 4, 0, 6.283); ctx.fill();
    ctx.font = '12px "Geist Mono", monospace'; ctx.fillText(`$${fit(pr.x, pr.y).toFixed(1)}k ± ${e.toFixed(1)}k`, v1[0] + 12, v1[1] - 8);
    ctx.fillStyle = C.text3; ctx.fillText(`${pr.x.toFixed(0)}% · $${pr.y.toFixed(1)}k`, v0[0] + 10, v0[1] + 16);
  }
  document.querySelector('.rail li.on')?.style.setProperty('--p', (DUR[tp] === Infinity ? 100 : cl(st.t / DUR[tp]) * 100) + '%');
  readout(pr);
  requestAnimationFrame(frame);
}
document.fonts.ready.then(() => requestAnimationFrame(frame));
window.__go = go;
