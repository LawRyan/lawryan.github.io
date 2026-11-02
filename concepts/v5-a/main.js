/**
 * V5 hero A · Perspective.
 * 1,400 synthetic customers with three behaviours. Three groups are really there, but along a direction that mixes all
 * three columns, so from the recorded angle (and on any single column) they overlap. k-means finds them; the camera turns
 * to the angle that separates them; that direction becomes a rule, tested on customers it has never seen.
 * Every number on screen is computed from the data below.
 */
import { cl, lerp, smooth, ease, reduce, C, rng, canvas2d, camera, orbit, rail, fmt } from '../v5-lib/lib.js';

const MOB = innerWidth < 860;
const R = rng(21);
const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

// ── the data: the groups differ along U only; everything else is shared spread
const U = norm([1, -.8, .55]), V = norm(cross(U, [0, 1, 0])), W = cross(U, V);
const SIZES = MOB ? [320, 350, 210] : [520, 560, 320], AT = [-1.7, 0, 1.75];
function draw(sizes, r) {
  const pts = [];
  sizes.forEach((n, k) => { for (let i = 0; i < n; i++) { const a = AT[k] + r.g() * .26, b = r.g() * .95, c = r.g() * .62; pts.push({ p: add(add(U.map(x => x * a), V, b), W, c), truth: k }); } });
  return pts;
}
const P = draw(SIZES, R).sort(() => R() - .5), N = P.length;
const HOLD = draw([200, 220, 140], rng(99));
const FEAT = ['visits / month', 'avg spend', 'tenure'];
const toFeat = p => [7 + p[0] * 2.1, 52 + p[1] * 15, Math.max(1, 20 + p[2] * 8)];

// ── k-means, every iteration kept so it can be watched
function kmeans(k = 3) {   // several starts; keep the best, as you would in practice
  let best = null;
  for (let s = 0; s < 6; s++) { const h = kmeans1(k); if (!best || h[h.length - 1].inertia < best[best.length - 1].inertia) best = h; }
  return best;
}
function kmeans1(k) {
  const cent = [P[Math.floor(R() * N)].p];
  while (cent.length < k) {          // k-means++
    const d2 = P.map(q => Math.min(...cent.map(c => (q.p[0] - c[0]) ** 2 + (q.p[1] - c[1]) ** 2 + (q.p[2] - c[2]) ** 2)));
    let s = d2.reduce((a, b) => a + b) * R(); let i = 0; while ((s -= d2[i]) > 0) i++; cent.push(P[i].p);
  }
  const hist = []; let c = cent.map(x => [...x]);
  for (let it = 0; it < 14; it++) {
    const lab = P.map(q => { let b = 0, bd = 1e9; c.forEach((x, j) => { const d = (q.p[0] - x[0]) ** 2 + (q.p[1] - x[1]) ** 2 + (q.p[2] - x[2]) ** 2; if (d < bd) { bd = d; b = j; } }); return b; });
    const inertia = P.reduce((s, q, i) => s + (q.p[0] - c[lab[i]][0]) ** 2 + (q.p[1] - c[lab[i]][1]) ** 2 + (q.p[2] - c[lab[i]][2]) ** 2, 0);
    const nc = c.map((_, j) => { const m = [0, 0, 0]; let n = 0; P.forEach((q, i) => { if (lab[i] === j) { m[0] += q.p[0]; m[1] += q.p[1]; m[2] += q.p[2]; n++; } }); return n ? m.map(v => v / n) : c[j]; });
    const moved = Math.max(...nc.map((x, j) => Math.hypot(x[0] - c[j][0], x[1] - c[j][1], x[2] - c[j][2])));
    hist.push({ c: c.map(x => [...x]), lab, inertia, moved }); c = nc;
    if (moved < 1e-4) break;
  }
  return hist;
}
const H = kmeans();
const FIN = H[H.length - 1];
// the separating direction: through the two outer centroids; order the clusters along it
let [ia, ib] = [0, 1], far = 0;
FIN.c.forEach((a, i) => FIN.c.forEach((b, j) => { const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); if (d > far) { far = d; ia = i; ib = j; } }));
let D = norm(add(FIN.c[ib], FIN.c[ia], -1));
const MEAN = [0, 1, 2].map(a => P.reduce((s, q) => s + q.p[a], 0) / N);
const order = [0, 1, 2].sort((a, b) => dot(FIN.c[a], D) - dot(FIN.c[b], D)), rank = []; order.forEach((c, r) => { rank[c] = r; });
const tOf = p => dot(add(p, MEAN, -1), D);
const ct = order.map(c => tOf(FIN.c[c]));
const THR = [(ct[0] + ct[1]) / 2, (ct[1] + ct[2]) / 2];
const rule = p => { const t = tOf(p); return t < THR[0] ? 0 : t < THR[1] ? 1 : 2; };
// how good is the rule on customers it has never seen? (each found cluster is matched to the truth it mostly contains)
const match = [0, 1, 2].map(r => { const cnt = [0, 0, 0]; P.forEach((q, i) => { if (rank[FIN.lab[i]] === r) cnt[q.truth]++; }); return cnt.indexOf(Math.max(...cnt)); });
const ACC = HOLD.filter(q => match[rule(q.p)] === q.truth).length / HOLD.length;
// and the best you can do with any single column
function oneCol(a) {
  const m = [0, 1, 2].map(r => { const xs = P.filter((q, i) => rank[FIN.lab[i]] === r).map(q => q.p[a]); return xs.reduce((s, v) => s + v, 0) / xs.length; });
  const o = [0, 1, 2].sort((x, y) => m[x] - m[y]), th = [(m[o[0]] + m[o[1]]) / 2, (m[o[1]] + m[o[2]]) / 2];
  return HOLD.filter(q => { const v = q.p[a], r = o[v < th[0] ? 0 : v < th[1] ? 1 : 2]; return match[r] === q.truth; }).length / HOLD.length;
}
const ONE = [0, 1, 2].map(oneCol), BEST1 = Math.max(...ONE), BEST1C = FEAT[ONE.indexOf(BEST1)];
// separation along D: between-group spread over within-group spread
const SEP = (() => { const ts = P.map(q => tOf(q.p)), g = [0, 1, 2].map(r => ts.filter((_, i) => rank[FIN.lab[i]] === r)); const mu = g.map(x => x.reduce((a, b) => a + b) / x.length), all = ts.reduce((a, b) => a + b) / N;
  const wv = g.reduce((s, x, r) => s + x.reduce((a, t) => a + (t - mu[r]) ** 2, 0), 0) / N, bv = g.reduce((s, x, r) => s + x.length * (mu[r] - all) ** 2, 0) / N; return bv / wv; })();
// profiles in real units
const SEG = [0, 1, 2].map(r => { const q = P.filter((_, i) => rank[FIN.lab[i]] === r).map(x => toFeat(x.p)); const m = [0, 1, 2].map(a => q.reduce((s, v) => s + v[a], 0) / q.length); return { n: q.length, m }; });
const ALL = [0, 1, 2].map(a => P.reduce((s, q) => s + toFeat(q.p)[a], 0) / N), SD = [0, 1, 2].map(a => Math.sqrt(P.reduce((s, q) => s + (toFeat(q.p)[a] - ALL[a]) ** 2, 0) / N));
const WORDS = [['occasional', 'frequent'], ['lower spend', 'higher spend'], ['newer', 'long-standing']];
SEG.forEach(s => { const z = s.m.map((v, a) => (v - ALL[a]) / SD[a]); s.desc = [0, 1, 2].sort((a, b) => Math.abs(z[b]) - Math.abs(z[a])).slice(0, 2).map(a => WORDS[a][z[a] > 0 ? 1 : 0]).join(', '); });
const COEF = D.map(v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2));
const COL = [C.teal, C.silver, C.amber], RGB = [[47, 184, 172], [169, 182, 196], [242, 163, 58]];

// ── views: the recorded angle looks straight down U (everything overlaps); the insight view puts D across the screen
const angles = f => ({ pitch: Math.asin(cl(-f[1], -1, 1)), yaw: Math.atan2(-f[0], -f[2]) });
const V0 = angles(U);
let f1 = norm(cross(D, [0, 1, 0])); f1 = norm(add(f1.map(v => v * Math.cos(.28)), [0, -1, 0], Math.sin(.28)));
let V1 = angles(f1); if (Math.cos(V1.yaw) * D[0] - Math.sin(V1.yaw) * D[2] < 0) { f1 = [-f1[0], f1[1], -f1[2]]; V1 = angles(f1); }
{ const c = camera(); c.yaw = V1.yaw; c.pitch = V1.pitch; c.basis(); V1.roll = Math.atan2(dot(D, c.u), dot(D, c.r)); }   // roll so the direction lies across the screen

// ── scene
const cv = document.getElementById('cv'), S = canvas2d(cv), cam = camera(), ctl = orbit(cv, cam);
cam.tx = MEAN[0]; cam.ty = MEAN[1]; cam.tz = MEAN[2]; cam.yaw = V0.yaw; cam.pitch = V0.pitch; cam.dist = 9.5;
const lo = [0, 1, 2].map(a => Math.min(...P.map(q => q.p[a]))), hi = [0, 1, 2].map(a => Math.max(...P.map(q => q.p[a])));
const DUR = [7, 6.5, 7.5, Infinity];
const CAP = [
  `<b>${fmt(N)} customers</b>, three behaviours each: visits, spend and tenure. Seen as recorded, it is one cloud. Nothing stands out.`,
  `k-means groups customers by distance. Watch it settle: <b>${H.length} iterations</b> until no centre moves. Three groups, still tangled from this angle.`,
  `Turn to the one angle where they separate. The difference is a <span class="a">combination of all three columns</span>: no single column shows it (best alone: ${Math.round(BEST1 * 100)}%).`,
  `The angle becomes a <span class="t">rule</span>. Tested on <b>${HOLD.length} customers it never saw</b>, it sorts <b>${(ACC * 100).toFixed(1)}%</b> correctly. New arrivals are sorted as they land.`,
];
const setRail = rail(document.querySelector('.copy'), CAP);
const st = { phase: 0, t: 0 }, arrivals = [], ro = document.getElementById('ro'), ph = document.getElementById('ph');
function go(p) { st.phase = p; st.t = 0; setRail(p); ctl.touched = -1e9; }
document.querySelectorAll('.rail button').forEach(b => b.addEventListener('click', () => go(+b.dataset.p)));
document.getElementById('replay').addEventListener('click', () => { arrivals.length = 0; go(0); });
const spawn = () => { const q = draw([[1, 0, 0], [0, 1, 0], [0, 0, 1]][Math.floor(R() * 3)], R)[0]; arrivals.push({ p: q.p, t0: performance.now(), r: rule(q.p) }); if (arrivals.length > 24) arrivals.shift(); };
document.getElementById('add').addEventListener('click', () => { if (st.phase < 3) go(3); spawn(); });
go(0);

let readKey = '';
function readout(it) {
  const rows = st.phase === 0 ? [['customers', fmt(N)], ['columns', '3'], ['groups visible', 'none'], ['view', 'as recorded']]
    : st.phase === 1 ? [['iteration', `${it + 1} / ${H.length}`], ['inertia', fmt(H[it].inertia, 1)], ['largest centre move', H[it].moved.toFixed(3)], ['groups', '3']]
    : st.phase === 2 ? [['direction', `${COEF[0]} visits`], ['', `${COEF[1]} spend`], ['', `${COEF[2]} tenure`], ['separation (between / within)', SEP.toFixed(1) + '×'], [`best single column (${BEST1C})`, Math.round(BEST1 * 100) + '%']]
    : [['rule accuracy, unseen', (ACC * 100).toFixed(1) + '%'], ...SEG.map((s, r) => [`<span style="color:${COL[r]}">●</span>&nbsp;${r + 1}&nbsp;·&nbsp;${fmt(s.n)}`, s.desc]), ['last arrival', arrivals.length ? `segment ${arrivals[arrivals.length - 1].r + 1}` : '—']];
  const key = JSON.stringify(rows); if (key === readKey) return; readKey = key;
  ro.innerHTML = rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
  ph.textContent = ['complexity', 'structure', 'insight', 'creation'][st.phase];
}

const pr = new Array(N), tmp = [0, 0, 0, 0], idx = [...Array(N).keys()];
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
let last = performance.now(), spawnAt = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  st.t += dt; if (!reduce && st.t > DUR[st.phase]) go(st.phase + 1);
  const ctx = S.ctx, w = S.W, h = S.H;
  cam.cx = MOB ? w / 2 : w * .56; cam.cy = MOB ? h * .46 : h * .44; cam.scale = Math.min(w * (MOB ? .27 : .17), h * .28);
  // camera: the story drives it unless the visitor is turning it
  const tp = st.phase, k = tp >= 2 ? ease(st.t / 3.6) : 0, sway = reduce ? 0 : 1;
  const ty = tp < 2 ? V0.yaw + Math.sin(now / 4000) * .22 * sway : V0.yaw + wrap(V1.yaw - V0.yaw) * k + (tp === 3 ? Math.sin(now / 5000) * .12 * sway : 0);
  const tpi = tp < 2 ? V0.pitch + Math.sin(now / 5500) * .07 * sway : lerp(V0.pitch, V1.pitch, k), troll = tp < 2 ? 0 : V1.roll * k;
  ctl.step();
  if (ctl.idle()) { const a = reduce ? 1 : 1 - Math.pow(.02, dt); cam.yaw += wrap(ty - cam.yaw) * a; cam.pitch += (tpi - cam.pitch) * a; cam.roll += wrap(troll - cam.roll) * a; }
  cam.dist = lerp(cam.dist, tp >= 2 ? 8.6 : 9.6, .03); cam.basis();
  const it = tp === 1 ? Math.min(H.length - 1, Math.floor(st.t / (DUR[1] - 1.2) * H.length)) : tp > 1 ? H.length - 1 : 0;
  const colorK = tp === 0 ? 0 : tp === 1 ? smooth(st.t / 1.2) : 1, lab = H[it].lab;

  ctx.clearRect(0, 0, w, h);
  // the box the data lives in, with its axes named
  const corners = [];
  for (let i = 0; i < 8; i++) corners.push(cam.p(i & 1 ? hi[0] : lo[0], i & 2 ? hi[1] : lo[1], i & 4 ? hi[2] : lo[2], []));
  ctx.strokeStyle = C.hair; ctx.lineWidth = 1; ctx.beginPath();
  [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => { ctx.moveTo(corners[a][0], corners[a][1]); ctx.lineTo(corners[b][0], corners[b][1]); });
  ctx.stroke();
  ctx.font = '11px "Geist Mono", monospace'; ctx.fillStyle = C.text3;
  [[1, 0], [2, 1], [4, 2]].forEach(([c, a]) => { const m = [(corners[0][0] + corners[c][0]) / 2, (corners[0][1] + corners[c][1]) / 2]; ctx.fillText(FEAT[a], m[0] + 6, m[1] + 14); });
  // threshold planes (creation)
  const planeK = tp === 3 ? smooth(st.t / 1.4) : 0;
  if (planeK > 0) {
    const e1 = norm(cross(D, [0, 1, 0])), e2 = cross(D, e1);
    THR.forEach(th => {
      const c0 = add(MEAN, D, th), q = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => cam.p(...add(add(c0, e1, a * 1.7), e2, b * 1.45), []));
      ctx.beginPath(); q.forEach((v, i) => i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1])); ctx.closePath();
      ctx.fillStyle = `rgba(240,237,231,${.035 * planeK})`; ctx.fill(); ctx.strokeStyle = `rgba(240,237,231,${.28 * planeK})`; ctx.stroke();
    });
  }
  // the points, far to near
  for (let i = 0; i < N; i++) pr[i] = cam.p(P[i].p[0], P[i].p[1], P[i].p[2], pr[i] || []);
  idx.sort((a, b) => pr[b][2] - pr[a][2]);
  const zs = pr.map(v => v[2]), zmin = Math.min(...zs), zmax = Math.max(...zs);
  const dim = tp === 3 ? 1 - .45 * planeK : 1, top = [1e9, 1e9, 1e9];
  for (const i of idx) {
    if (pr[i][1] < top[rank[lab[i]]]) top[rank[lab[i]]] = pr[i][1];
    const v = pr[i], depth = (v[2] - zmin) / (zmax - zmin || 1), r = Math.max(1.1, v[3] * .02);
    const c = RGB[rank[lab[i]]], s = [205, 212, 220];
    const rr = lerp(s[0], c[0], colorK), gg = lerp(s[1], c[1], colorK), bb = lerp(s[2], c[2], colorK);
    ctx.fillStyle = `rgba(${rr | 0},${gg | 0},${bb | 0},${((.95 - depth * .5) * dim).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(v[0], v[1], r, 0, 6.283); ctx.fill();
  }
  // centres, as instruments mark them
  if (tp >= 1) H[it].c.forEach((c, j) => {
    const v = cam.p(c[0], c[1], c[2], tmp), col = COL[rank[j]];
    ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(v[0], v[1], 9, 0, 6.283); ctx.moveTo(v[0] - 15, v[1]); ctx.lineTo(v[0] - 5, v[1]); ctx.moveTo(v[0] + 5, v[1]); ctx.lineTo(v[0] + 15, v[1]); ctx.moveTo(v[0], v[1] - 15); ctx.lineTo(v[0], v[1] - 5); ctx.moveTo(v[0], v[1] + 5); ctx.lineTo(v[0], v[1] + 15); ctx.stroke();
    if (tp >= 2) { const lk = smooth((st.t - (tp === 2 ? 3 : 0)) / 1); if (lk > 0) { ctx.globalAlpha = lk; ctx.fillStyle = col; ctx.font = '12px "Geist Mono", monospace'; ctx.textAlign = 'center'; const ly = Math.max(70, top[rank[j]] - 30); ctx.fillText(MOB ? `${rank[j] + 1}` : `segment ${rank[j] + 1} · ${fmt(SEG[rank[j]].n)}`, v[0], ly); ctx.fillStyle = C.text2; if (!MOB) ctx.fillText(SEG[rank[j]].desc, v[0], ly + 15); ctx.textAlign = 'left'; ctx.globalAlpha = 1; } }
  });
  // the projection onto the separating direction: a histogram laid along it, under the cloud
  const hk = tp >= 2 ? smooth((st.t - (tp === 2 ? 2.6 : -9)) / 1.4) : 0;
  if (hk > 0) {
    const B = 54, t0 = -3.2, t1 = 3.2, bins = [0, 1, 2].map(() => new Array(B).fill(0));
    P.forEach((q, i) => { const b = Math.floor((tOf(q.p) - t0) / (t1 - t0) * B); if (b >= 0 && b < B) bins[rank[FIN.lab[i]]][b]++; });
    const mx = Math.max(...bins[0].map((_, b) => bins[0][b] + bins[1][b] + bins[2][b])), yb = cam.cy + cam.scale * (MOB ? 1.05 : 1.12);
    const at = t => { const p = add(MEAN, D, t), v = cam.p(p[0], p[1], p[2], []); return [v[0], yb]; };
    const a0 = at(t0), a1 = at(t1);
    ctx.strokeStyle = 'rgba(240,237,231,.25)'; ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke();
    const hpx = Math.min(90, h * .12) * hk;
    for (let b = 0; b < B; b++) {
      const x0 = at(t0 + (t1 - t0) * b / B), x1 = at(t0 + (t1 - t0) * (b + 1) / B); let y = x0[1];
      for (let r = 0; r < 3; r++) { const hh = bins[r][b] / mx * hpx; if (!hh) continue; ctx.fillStyle = COL[r]; ctx.globalAlpha = .85; ctx.fillRect(x0[0] + .5, y - hh, Math.max(1, x1[0] - x0[0] - 1), hh); y -= hh; }
    }
    ctx.globalAlpha = 1;
    THR.forEach(th => { const v = at(th); ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(240,237,231,.55)'; ctx.beginPath(); ctx.moveTo(v[0], v[1] + 6); ctx.lineTo(v[0], v[1] - hpx - 14); ctx.stroke(); ctx.setLineDash([]); });
    ctx.fillStyle = C.text3; ctx.font = '11px "Geist Mono", monospace'; ctx.fillText(`${COEF[0]}·visits ${COEF[1]}·spend ${COEF[2]}·tenure  →`, a0[0], a0[1] + 20);
  }
  // arrivals (creation): they fall into place and are sorted by the rule
  if (tp === 3) {
    if (!reduce && now > spawnAt) { spawn(); spawnAt = now + 1300; }
    arrivals.forEach(a => {
      const age = (now - a.t0) / 1000, f = ease(age / .9), p = [a.p[0], a.p[1] + (1 - f) * 3, a.p[2]], v = cam.p(p[0], p[1], p[2], tmp);
      ctx.fillStyle = COL[a.r]; ctx.beginPath(); ctx.arc(v[0], v[1], 3.4, 0, 6.283); ctx.fill();
      if (age > .9 && age < 2.4) { const k = 1 - (age - .9) / 1.5; ctx.strokeStyle = COL[a.r]; ctx.globalAlpha = k; ctx.beginPath(); ctx.arc(v[0], v[1], 6 + (1 - k) * 14, 0, 6.283); ctx.stroke(); ctx.font = '11px "Geist Mono", monospace'; ctx.fillStyle = COL[a.r]; ctx.fillText(`→ segment ${a.r + 1}`, v[0] + 10, v[1] - 8); ctx.globalAlpha = 1; }
    });
  }
  // progress along the rail
  document.querySelector('.rail li.on')?.style.setProperty('--p', (DUR[st.phase] === Infinity ? 100 : cl(st.t / DUR[st.phase]) * 100) + '%');
  readout(it);
  requestAnimationFrame(frame);
}
document.fonts.ready.then(() => requestAnimationFrame(frame));
window.__go = go;
