/**
 * The Lens dataset and everything computed from it. Pure: no DOM, no WebGL, so it can be tested in Node.
 * 1,400 synthetic customers with three behaviours (visits, spend, tenure). Three groups really exist, but they differ
 * along a direction that mixes all three columns, so from the recorded angle, and on any single column, they overlap.
 */
export function rng(seed = 7) { let s = seed; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); r.g = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }; return r; }
export const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

export const FEAT = ['visits a month', 'average spend', 'tenure'];
export const toFeat = p => [7 + p[0] * 2.1, 52 + p[1] * 15, Math.max(1, 20 + p[2] * 8)];

export function build({ small = false } = {}) {
  const R = rng(21);
  const U = norm([1, -.8, .55]), V = norm(cross(U, [0, 1, 0])), W = cross(U, V), AT = [-1.7, 0, 1.75];
  const draw = (sizes, r) => { const pts = []; sizes.forEach((n, k) => { for (let i = 0; i < n; i++) { const a = AT[k] + r.g() * .26, b = r.g() * .95, c = r.g() * .62; pts.push({ p: add(add(U.map(x => x * a), V, b), W, c), truth: k }); } }); return pts; };
  const P = draw(small ? [320, 350, 210] : [520, 560, 320], R).sort(() => R() - .5), N = P.length;
  const HOLD = draw([200, 220, 140], rng(99));

  // k-means with k-means++ starts; keep the best of six, and every iteration of it so it can be watched
  function once() {
    const cent = [P[Math.floor(R() * N)].p];
    while (cent.length < 3) { const d2 = P.map(q => Math.min(...cent.map(c => (q.p[0] - c[0]) ** 2 + (q.p[1] - c[1]) ** 2 + (q.p[2] - c[2]) ** 2))); let s = d2.reduce((a, b) => a + b) * R(); let i = 0; while ((s -= d2[i]) > 0) i++; cent.push(P[i].p); }
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
  let H = null; for (let s = 0; s < 6; s++) { const h = once(); if (!H || h[h.length - 1].inertia < H[H.length - 1].inertia) H = h; }
  const FIN = H[H.length - 1];

  // the separating direction: through the two outer centres; clusters ranked along it
  let ia = 0, ib = 1, far = 0;
  FIN.c.forEach((a, i) => FIN.c.forEach((b, j) => { const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); if (d > far) { far = d; ia = i; ib = j; } }));
  const D = norm(add(FIN.c[ib], FIN.c[ia], -1));
  const MEAN = [0, 1, 2].map(a => P.reduce((s, q) => s + q.p[a], 0) / N);
  const order = [0, 1, 2].sort((a, b) => dot(FIN.c[a], D) - dot(FIN.c[b], D)), rank = []; order.forEach((c, r) => { rank[c] = r; });
  const tOf = p => dot(add(p, MEAN, -1), D);
  const ct = order.map(c => tOf(FIN.c[c])), THR = [(ct[0] + ct[1]) / 2, (ct[1] + ct[2]) / 2];
  const rule = p => { const t = tOf(p); return t < THR[0] ? 0 : t < THR[1] ? 1 : 2; };
  const seg = P.map((_, i) => rank[FIN.lab[i]]);
  const match = [0, 1, 2].map(r => { const cnt = [0, 0, 0]; P.forEach((q, i) => { if (seg[i] === r) cnt[q.truth]++; }); return cnt.indexOf(Math.max(...cnt)); });
  const ACC = HOLD.filter(q => match[rule(q.p)] === q.truth).length / HOLD.length;
  const oneCol = a => { const m = [0, 1, 2].map(r => { const xs = P.filter((_, i) => seg[i] === r).map(q => q.p[a]); return xs.reduce((s, v) => s + v, 0) / xs.length; });
    const o = [0, 1, 2].sort((x, y) => m[x] - m[y]), th = [(m[o[0]] + m[o[1]]) / 2, (m[o[1]] + m[o[2]]) / 2];
    return HOLD.filter(q => { const v = q.p[a], r = o[v < th[0] ? 0 : v < th[1] ? 1 : 2]; return match[r] === q.truth; }).length / HOLD.length; };
  const ONE = [0, 1, 2].map(oneCol), BEST1 = Math.max(...ONE), BEST1C = FEAT[ONE.indexOf(BEST1)];
  // separation of any 1-D projection: between-group over within-group variance (labels from k-means)
  const sepAlong = dir => { let s = [0, 0, 0], n = [0, 0, 0], ss = [0, 0, 0];
    for (let i = 0; i < N; i++) { const t = P[i].p[0] * dir[0] + P[i].p[1] * dir[1] + P[i].p[2] * dir[2], g = seg[i]; s[g] += t; ss[g] += t * t; n[g]++; }
    const mu = s.map((v, g) => v / n[g]), all = (s[0] + s[1] + s[2]) / N;
    const wv = ss.reduce((a, v, g) => a + v - n[g] * mu[g] * mu[g], 0) / N, bv = n.reduce((a, c, g) => a + c * (mu[g] - all) ** 2, 0) / N;
    return bv / Math.max(1e-9, wv); };
  const SEP = sepAlong(D);
  const SEG = [0, 1, 2].map(r => { const q = P.filter((_, i) => seg[i] === r).map(x => toFeat(x.p)); return { n: q.length, m: [0, 1, 2].map(a => q.reduce((s, v) => s + v[a], 0) / q.length) }; });
  const ALL = [0, 1, 2].map(a => P.reduce((s, q) => s + toFeat(q.p)[a], 0) / N), SD = [0, 1, 2].map(a => Math.sqrt(P.reduce((s, q) => s + (toFeat(q.p)[a] - ALL[a]) ** 2, 0) / N));
  const WORDS = [['visits less', 'visits often'], ['spends less', 'spends more'], ['newer', 'long-standing']];
  SEG.forEach(s => { const z = s.m.map((v, a) => (v - ALL[a]) / SD[a]); s.desc = [0, 1, 2].sort((a, b) => Math.abs(z[b]) - Math.abs(z[a])).slice(0, 2).map(a => WORDS[a][z[a] > 0 ? 1 : 0]).join(', '); });
  const lo = [0, 1, 2].map(a => Math.min(...P.map(q => q.p[a]))), hi = [0, 1, 2].map(a => Math.max(...P.map(q => q.p[a])));
  const arrival = r => { const k = Math.floor(r() * 3), q = draw([0, 1, 2].map(j => (j === k ? 1 : 0)), r)[0]; return { p: q.p, seg: rule(q.p) }; };
  return { P, N, U, D, MEAN, H, FIN, seg, THR, tOf, rule, ACC, ONE, BEST1, BEST1C, SEP, sepAlong, SEG, lo, hi, arrival, HOLD };
}
