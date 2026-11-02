/**
 * V6 hero · Lens. Three.js renders, GSAP choreographs, the data decides.
 * One state object S is the single source of truth: a scroll-scrubbed GSAP timeline writes it, the render loop reads it.
 * The visitor can take the camera at any time; the gauge measures, every frame, how much structure the current angle shows.
 */
import { WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute, Points, ShaderMaterial, LineSegments, EdgesGeometry, BoxGeometry, LineBasicMaterial, Mesh, PlaneGeometry, MeshBasicMaterial, Vector3, Group, DoubleSide, Quaternion } from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { build, norm, cross, dot, add, rng, FEAT } from './data.js';
gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement, reduce = root.classList.contains('rm');
const MOB = () => innerWidth < 860;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const COLORS = [[47, 184, 172], [169, 182, 196], [242, 163, 58]], HEX = ['#2FB8AC', '#A9B6C4', '#F2A33A'];
const DATA = build({ small: innerWidth < 860 }), { P, N, U, D, MEAN, H, seg, THR, tOf } = DATA;
const pct = v => (v * 100).toFixed(1).replace(/\.0$/, '') + '%';
$('#b-iters').textContent = H.length; $('#b-one').textContent = Math.round(DATA.BEST1 * 100) + '%'; $('#b-hold').textContent = DATA.HOLD.length; $('#b-acc').textContent = pct(DATA.ACC);

// ── orientation: yaw / pitch / roll around the cloud's centre
function basis(o) {
  const cy = Math.cos(o.yaw), sy = Math.sin(o.yaw), cp = Math.cos(o.pitch), sp = Math.sin(o.pitch), cr = Math.cos(o.roll), sr = Math.sin(o.roll);
  const f = [-sy * cp, -sp, -cy * cp], r0 = [cy, 0, -sy], u0 = [-sy * sp, cp, -cy * sp];
  return { f, r: add(r0.map(v => v * cr), u0, sr), u: add(u0.map(v => v * cr), r0, -sr) };
}
const anglesOf = f => ({ pitch: Math.asin(cl(-f[1], -1, 1)), yaw: Math.atan2(-f[0], -f[2]), roll: 0 });
const V0 = anglesOf(U);                                    // the recorded angle: looking straight down the hidden direction
const c0 = norm(cross(D, [0, 1, 0])); let w0 = cross(D, c0); if (w0[1] > 0) w0 = w0.map(v => -v);
let f1 = norm(add(c0.map(v => v * Math.cos(.3)), w0, Math.sin(.3)));   // exactly perpendicular to D, tilted to look slightly down
let V1 = anglesOf(f1); if (dot(basis(V1).r, D) < 0) { f1 = norm(add(c0.map(v => -v * Math.cos(.3)), w0, Math.sin(.3))); V1 = anglesOf(f1); }
{ const b = basis(V1); V1.roll = Math.atan2(dot(D, b.u), dot(D, b.r)); }   // roll so the separating direction lies across the screen

// ── the gauge: the best separation visible in the current image plane (12 directions), as a share of the best possible
const PX = new Float32Array(N), PY = new Float32Array(N), PZ = new Float32Array(N); P.forEach((q, i) => { PX[i] = q.p[0]; PY[i] = q.p[1]; PZ[i] = q.p[2]; });
function visible(o) {
  const { r, u } = basis(o); let best = 0;
  const a = new Float32Array(N), b = new Float32Array(N);
  for (let i = 0; i < N; i++) { a[i] = PX[i] * r[0] + PY[i] * r[1] + PZ[i] * r[2]; b[i] = PX[i] * u[0] + PY[i] * u[1] + PZ[i] * u[2]; }
  for (let k = 0; k < 12; k++) {
    const c = Math.cos(k * Math.PI / 12), s = Math.sin(k * Math.PI / 12), sum = [0, 0, 0], sq = [0, 0, 0], n = [0, 0, 0];
    for (let i = 0; i < N; i++) { const t = a[i] * c + b[i] * s, g = seg[i]; sum[g] += t; sq[g] += t * t; n[g]++; }
    const mu = sum.map((v, g) => v / n[g]), all = (sum[0] + sum[1] + sum[2]) / N;
    const wv = sq.reduce((x, v, g) => x + v - n[g] * mu[g] * mu[g], 0) / N, bv = n.reduce((x, m, g) => x + m * (mu[g] - all) ** 2, 0) / N;
    best = Math.max(best, bv / wv);
  }
  return cl(best / DATA.SEP);
}

// ── three.js
const canvas = $('#gl');
let renderer;
try { renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch { root.classList.add('no-gl'); }
const scene = new Scene(), camera = new PerspectiveCamera(30, 1, .1, 100);
const geo = new BufferGeometry(), pos = new Float32Array(N * 3), col = new Float32Array(N * 3), stag = new Float32Array(N), seed = new Float32Array(N);
const R = rng(3), tvals = P.map(q => tOf(q.p)), tmin = Math.min(...tvals), tmax = Math.max(...tvals);
P.forEach((q, i) => { pos.set(q.p, i * 3); col.set(COLORS[seg[i]].map(v => v / 255), i * 3); stag[i] = (tvals[i] - tmin) / (tmax - tmin); seed[i] = R(); });
geo.setAttribute('position', new BufferAttribute(pos, 3)); geo.setAttribute('aCol', new BufferAttribute(col, 3)); geo.setAttribute('aStag', new BufferAttribute(stag, 1)); geo.setAttribute('aSeed', new BufferAttribute(seed, 1));
const VERT = `
uniform float uSize, uScale, uColor, uArrive, uDim, uTime, uPulse;
attribute vec3 aCol; attribute float aStag, aSeed;
varying vec3 vCol; varying float vA;
void main(){
  float k = clamp(uArrive * 1.6 - aSeed * .6, 0., 1.); k = k * k * (3. - 2. * k);
  vec3 p = position + vec3(0., -(1. - k) * 2.2, 0.);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float c = clamp(uColor * 1.7 - aStag * .7, 0., 1.);
  vCol = mix(vec3(.80, .83, .86), aCol, c);
  float depth = clamp((-mv.z - 9.) / 9., 0., 1.);
  vA = k * mix(.95, .38, depth) * uDim;
  float pulse = uPulse * exp(-pow((aStag - fract(uTime * .35)) * 9., 2.));
  gl_PointSize = uSize * uScale / -mv.z * (1. + pulse * .8);
  vCol += pulse * .25;
}`;
const FRAG = `
varying vec3 vCol; varying float vA;
void main(){ float d = length(gl_PointCoord - .5); float a = vA * smoothstep(.5, .32, d); if (a < .01) discard; gl_FragColor = vec4(vCol, a); }`;
const mat = new ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, uniforms: { uSize: { value: .048 }, uScale: { value: 800 }, uColor: { value: 0 }, uArrive: { value: reduce ? 1 : 0 }, uDim: { value: 1 }, uTime: { value: 0 }, uPulse: { value: 0 } } });
const cloud = new Points(geo, mat); scene.add(cloud);
// the measuring box
const lo = DATA.lo, hi = DATA.hi, boxGeo = new EdgesGeometry(new BoxGeometry(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]));
const boxMat = new LineBasicMaterial({ color: 0xF0EDE7, transparent: true, opacity: 0 });
const box = new LineSegments(boxGeo, boxMat); box.position.set((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2); scene.add(box);
// the rule's two boundaries
const planes = THR.map(th => {
  const g = new Group(), m1 = new MeshBasicMaterial({ color: 0xF0EDE7, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false }), m2 = new LineBasicMaterial({ color: 0xF0EDE7, transparent: true, opacity: 0 });
  const pg = new PlaneGeometry(3.4, 2.8); g.add(new Mesh(pg, m1)); g.add(new LineSegments(new EdgesGeometry(pg), m2));
  g.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...D))); g.position.set(...add(MEAN, D, th)); scene.add(g);
  return { m1, m2 };
});
// arrivals: new customers, sorted by the rule as they land
const AN = 18, aGeo = new BufferGeometry(), aPos = new Float32Array(AN * 3).fill(999), aCol = new Float32Array(AN * 3), aSt = new Float32Array(AN), aSd = new Float32Array(AN);
aGeo.setAttribute('position', new BufferAttribute(aPos, 3)); aGeo.setAttribute('aCol', new BufferAttribute(aCol, 3)); aGeo.setAttribute('aStag', new BufferAttribute(aSt, 1)); aGeo.setAttribute('aSeed', new BufferAttribute(aSd, 1));
const aMat = mat.clone(); aMat.uniforms.uSize.value = .11; aMat.uniforms.uColor.value = 1; aMat.uniforms.uArrive.value = 1;
const arrivalsPts = new Points(aGeo, aMat); scene.add(arrivalsPts);
const arrivals = []; const AR = rng(77);

// ── overlay: crosshairs for the k-means centres, segment labels, axis names, arrival labels, histogram
const LBL = $('#labels'), mk = (cls, html, color) => { const e = document.createElement('div'); e.className = cls; if (html) e.innerHTML = html; if (color) e.style.color = color; LBL.append(e); return e; };
const crosses = [0, 1, 2].map(j => mk('cross', '', HEX[DATA.seg[DATA.FIN.lab.indexOf(j)]]));
const centreRank = [0, 1, 2].map(j => DATA.seg[DATA.FIN.lab.indexOf(j)]);
crosses.forEach((c, j) => { c.style.color = HEX[centreRank[j]]; });
const segLabs = [0, 1, 2].map(r => mk('lab', `<b style="color:${HEX[r]}">Segment ${r + 1} · ${DATA.SEG[r].n.toLocaleString('en-CA')}</b><span>${DATA.SEG[r].desc}</span>`));
const axisLabs = FEAT.map(f => mk('lab axis', f));
const arrLabs = [...Array(4)].map(() => mk('lab', ''));
const SVG = $('#hist');
const B = 56, T0 = -3.3, T1 = 3.3, BINS = [0, 1, 2].map(() => new Array(B).fill(0));
tvals.forEach((t, i) => { const b = Math.floor((t - T0) / (T1 - T0) * B); if (b >= 0 && b < B) BINS[seg[i]][b]++; });
const BMAX = Math.max(...BINS[0].map((_, b) => BINS[0][b] + BINS[1][b] + BINS[2][b]));
const coef = D.map((v, i) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}·${['visits', 'spend', 'tenure'][i]}`).join(' ');

// ── state and choreography
const S = { arrive: reduce ? 1 : 0, color: 0, found: 0, cent: 0, cam: 0, hist: 0, labels: 0, planes: 0, arr: 0 };
const cur = { ...V0 }; let foundBy = '', lastTouch = -1e9, dragging = false;
const track = $('#track');
const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
tl.to(S, { color: 1, duration: 1.1, ease: 'power1.inOut' }, 2.2)
  .to(S, { cent: 1, duration: 2.2 }, 2.3)
  .to(S, { cam: 1, duration: 1.9, ease: 'power2.inOut' }, 4.6)
  .to(S, { hist: 1, duration: 1.1, ease: 'power2.out' }, 5.7)
  .to(S, { labels: 1, duration: .7 }, 6.2)
  .to(S, { planes: 1, duration: 1.1, ease: 'power2.out' }, 7.3)
  .to(S, { arr: 1, duration: 1.6 }, 8.2)
  .to({}, { duration: .2 }, 9.8);
ScrollTrigger.create({ trigger: track, start: 'top top', end: 'bottom bottom', scrub: reduce ? true : 1.2, animation: tl });
if (!reduce) gsap.to(S, { arrive: 1, duration: 2.2, ease: 'power2.out', delay: .25 });
const BEATS = [0, 2.2, 4.6, 7.3].map(t => t / tl.duration());

// found: by the visitor, or shown by the system; the camera settles the last few degrees
function found(by) {
  if (S.found > 0) return; foundBy = by;
  const tgt = { yaw: cur.yaw + wrap(V1.yaw - cur.yaw), pitch: V1.pitch, roll: cur.roll + wrap(V1.roll - cur.roll) };
  lastTouch = performance.now() + 2500;
  gsap.to(cur, { ...tgt, duration: reduce ? 0 : by === 'you' ? 1.1 : 2, ease: 'power3.inOut' });
  gsap.to(S, { found: 1, duration: reduce ? 0 : 1.4, ease: 'power2.inOut' });
  if (!reduce) gsap.fromTo(mat.uniforms.uPulse, { value: 1 }, { value: 0, duration: 3.2, ease: 'power1.out' });
  $('#show').disabled = true;
}
$('#show').addEventListener('click', () => found('system'));
$$('[data-go]').forEach(b => b.addEventListener('click', () => {
  const p = [.06, .36, .6, .9][+b.dataset.go], top = track.getBoundingClientRect().top + scrollY;
  scrollTo({ top: top + p * (track.offsetHeight - innerHeight), behavior: reduce ? 'auto' : 'smooth' });
}));

// ── interaction: drag with inertia, arrow keys; the visitor wins over the timeline
let vx = 0, vy = 0, px = 0, py = 0;
canvas.addEventListener('pointerdown', e => { dragging = true; px = e.clientX; py = e.clientY; vx = vy = 0; canvas.setPointerCapture(e.pointerId); gsap.killTweensOf(cur); });
canvas.addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY; cur.yaw -= dx * .006; cur.pitch = cl(cur.pitch + dy * .005, -1.3, 1.3); vx = -dx * .006; vy = dy * .005; lastTouch = performance.now(); });
const up = () => { dragging = false; };
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
canvas.addEventListener('keydown', e => {
  const k = { ArrowLeft: [.08, 0], ArrowRight: [-.08, 0], ArrowUp: [0, -.06], ArrowDown: [0, .06] }[e.key]; if (!k) return;
  e.preventDefault(); gsap.killTweensOf(cur); cur.yaw += k[0]; cur.pitch = cl(cur.pitch + k[1], -1.3, 1.3); lastTouch = performance.now();
});

// ── readout
const ro = $('#ro'); let roKey = '';
function readout(beat, vis) {
  const rows = beat === 0 ? [['customers', N.toLocaleString('en-CA')], ['measures', FEAT.join(', ')], ['structure visible', pct(vis)], ['found by', S.found > 0 ? (foundBy === 'you' ? 'you' : 'the system') : 'not yet']]
    : beat === 1 ? [['method', 'k-means, k = 3'], ['steps to settle', String(H.length)], ['inertia, final', H[H.length - 1].inertia.toFixed(0)], ['segments', DATA.SEG.map(s => s.n.toLocaleString('en-CA')).join(' / ')]]
    : beat === 2 ? [['separating direction', `<code>${coef}</code>`], ['separation, between / within', DATA.SEP.toFixed(1) + '×'], [`best single column (${DATA.BEST1C})`, Math.round(DATA.BEST1 * 100) + '%']]
    : [['rule accuracy on unseen customers', pct(DATA.ACC)], ...DATA.SEG.map((s, r) => [`<span style="color:${HEX[r]}">Segment ${r + 1}</span>`, s.desc]), ['latest arrival', arrivals.length ? `Segment ${arrivals[arrivals.length - 1].seg + 1}` : '—']];
  const key = JSON.stringify(rows); if (key === roKey) return; roKey = key;
  ro.innerHTML = rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
}

// ── frame
let W = 0, Hh = 0, dpr = Math.min(devicePixelRatio || 1, 1.75), onscreen = true, frames = 0, ft = 0, last = performance.now(), visS = 0, beatNow = -1, hintAt = 0, spawnAt = 0;
function resize() {
  W = innerWidth; Hh = innerHeight; if (!renderer) return;
  renderer.setPixelRatio(dpr); renderer.setSize(W, Hh, false);
  camera.aspect = W / Hh;
  // place the cloud right of the copy on desktop, above it on phones
  if (MOB()) camera.setViewOffset(W, Hh, 0, Hh * .2, W, Hh); else camera.setViewOffset(W, Hh, -W * .19, Hh * .03, W, Hh);
  camera.updateProjectionMatrix();
  mat.uniforms.uScale.value = aMat.uniforms.uScale.value = Hh * dpr / (2 * Math.tan(camera.fov * Math.PI / 360));
  mat.uniforms.uSize.value = MOB() ? .085 : .048; aMat.uniforms.uSize.value = MOB() ? .16 : .11;
}
resize(); addEventListener('resize', resize);
new IntersectionObserver(es => { onscreen = es[0].isIntersecting; }).observe(track);
const v3 = new Vector3();
const toScreen = p => { v3.set(p[0], p[1], p[2]).project(camera); return [(v3.x + 1) / 2 * W, (1 - v3.y) / 2 * Hh, v3.z]; };
const place = (el, x, y, o) => { el.style.opacity = o.toFixed(3); if (o > .01) el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; };

function frame(t, dtMs) {
  if (!onscreen || !renderer || document.hidden) return;
  const now = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now;
  // camera: scripted unless the visitor has it
  const k = Math.max(S.cam, S.found), sway = reduce || k > .02 ? 0 : 1;
  const script = { yaw: V0.yaw + wrap(V1.yaw - V0.yaw) * k + Math.sin(now / 4200) * .2 * sway + (S.planes > 0 && !reduce ? Math.sin(now / 5200) * .1 * S.planes : 0), pitch: lerp(V0.pitch, V1.pitch, k) + Math.sin(now / 5600) * .06 * sway, roll: V1.roll * k };
  if (!dragging) { cur.yaw += vx; cur.pitch = cl(cur.pitch + vy, -1.3, 1.3); vx *= .9; vy *= .9; }
  if (!dragging && now - lastTouch > 4000 && !gsap.isTweening(cur)) { const a = reduce ? 1 : 1 - Math.pow(.15, dt); cur.yaw += wrap(script.yaw - cur.yaw) * a; cur.pitch += (script.pitch - cur.pitch) * a; cur.roll += wrap(script.roll - cur.roll) * a; }
  const { f, u } = basis(cur), dist = MOB() ? 4.3 / (Math.tan(camera.fov * Math.PI / 360) * camera.aspect) : 14.2;
  camera.position.set(MEAN[0] - f[0] * dist, MEAN[1] - f[1] * dist, MEAN[2] - f[2] * dist); camera.up.set(...u); camera.lookAt(MEAN[0], MEAN[1], MEAN[2]);
  camera.updateMatrixWorld();
  // the gauge, every frame
  const vis = visible(cur); visS += (vis - visS) * .25;
  const beat = BEATS.reduce((b, s, i) => (tl.progress() >= s - .002 ? i : b), 0);
  if (beat === 0 && vis > .8 && S.found === 0 && now - lastTouch < 4000) found('you');
  $('#g-bar').style.width = (visS * 100).toFixed(1) + '%'; $('#g-val').textContent = Math.round(visS * 100) + '%';
  const g = $('.gauge'); g.setAttribute('aria-valuenow', Math.round(visS * 100)); g.classList.toggle('found', S.found > 0);
  if (S.found > 0) $('#g-hint').textContent = foundBy === 'you' ? 'You found it. Three groups, from one angle. Scroll on to see why.' : 'There it is: three groups, from one angle. Scroll on to see why.';
  else if (now > hintAt && now - lastTouch < 4000) {   // warmer or colder: probe four small turns
    hintAt = now + 220; const d = .14, c = [['left', { ...cur, yaw: cur.yaw + d }], ['right', { ...cur, yaw: cur.yaw - d }], ['down', { ...cur, pitch: cur.pitch + d }], ['up', { ...cur, pitch: cur.pitch - d }]].map(([n, o]) => [n, visible(o)]).sort((a, b) => b[1] - a[1]);
    $('#g-hint').textContent = c[0][1] > vis + .004 ? `Warmer: drag ${c[0][0]}.` : 'Close. Try a small turn.';
  }
  // uniforms from the state
  mat.uniforms.uColor.value = Math.max(S.color, S.found); mat.uniforms.uArrive.value = S.arrive; mat.uniforms.uTime.value = now / 1000; mat.uniforms.uDim.value = 1 - .45 * S.planes;
  boxMat.opacity = .11 * S.arrive;
  planes.forEach(p => { p.m1.opacity = .045 * S.planes; p.m2.opacity = .34 * S.planes; });
  // arrivals
  if (S.arr > .05 && now > spawnAt) { spawnAt = now + (reduce ? 1e9 : 1150); const a = DATA.arrival(AR); arrivals.push({ ...a, t0: now }); if (arrivals.length > AN) arrivals.shift(); }
  if (S.arr <= .01) arrivals.length = 0;
  for (let i = 0; i < AN; i++) {
    const a = arrivals[i];
    if (!a) { aPos[i * 3] = 999; continue; }
    const age = (now - a.t0) / 1000, fk = reduce ? 1 : 1 - Math.pow(1 - cl(age / .9), 3);
    aPos.set([a.p[0], a.p[1] + (1 - fk) * 3, a.p[2]], i * 3); aCol.set(COLORS[a.seg].map(v => v / 255), i * 3); aSd[i] = 0;
  }
  aGeo.attributes.position.needsUpdate = true; aGeo.attributes.aCol.needsUpdate = true;
  renderer.render(scene, camera);

  // overlay
  const corner = [lo[0], lo[1], lo[2]], ends = [[hi[0], lo[1], lo[2]], [lo[0], hi[1], lo[2]], [lo[0], lo[1], hi[2]]];
  axisLabs.forEach((el, i) => { const m = toScreen([(corner[0] + ends[i][0]) / 2, (corner[1] + ends[i][1]) / 2, (corner[2] + ends[i][2]) / 2]); place(el, m[0] + 8, m[1] + 6, S.arrive * (1 - S.planes * .6) * .9); });
  const it = S.cent * (H.length - 1), i0 = Math.floor(it), i1 = Math.min(H.length - 1, i0 + 1), fr = it - i0, co = cl(S.cent * 5) * (1 - S.labels * .4);
  crosses.forEach((el, j) => { const c = H[i0].c[j].map((v, a) => lerp(v, H[i1].c[j][a], fr)), s = toScreen(c); place(el, s[0], s[1], co); });
  if (S.labels > .01 || S.hist > .01) {
    // cluster tops, from the projected points
    const top = [1e9, 1e9, 1e9], cx = [0, 0, 0], n = [0, 0, 0];
    for (let i = 0; i < N; i += 2) { const s = toScreen(P[i].p), g = seg[i]; if (s[1] < top[g]) top[g] = s[1]; cx[g] += s[0]; n[g]++; }
    const L = [0, 1, 2].map(r => ({ r, x: cx[r] / n[r], y: Math.max(84, top[r] - 46) })).sort((a, b) => a.x - b.x);
    for (let i = 1; i < 3; i++) if (L[i].x - L[i - 1].x < 170 && Math.abs(L[i].y - L[i - 1].y) < 40) L[i].y = L[i - 1].y - 40;   // no collisions
    L.forEach(l => { const el = segLabs[l.r]; place(el, l.x - 70, l.y, S.labels); });
  } else segLabs.forEach(el => place(el, 0, 0, 0));
  // histogram along the separating direction, laid under the cloud
  if (S.hist > .005) {
    const at = t => toScreen(add(MEAN, D, t)), yb = Math.min(Hh - (MOB() ? 260 : 120), toScreen(MEAN)[1] + Hh * (MOB() ? .2 : .27)), hpx = Math.min(110, Hh * .13) * S.hist;
    let svg = '', x0 = at(T0)[0], x1 = at(T1)[0];
    for (let b = 0; b < B; b++) {
      const xa = lerp(x0, x1, b / B), xb = lerp(x0, x1, (b + 1) / B); let y = yb;
      for (let r = 0; r < 3; r++) { const hh = BINS[r][b] / BMAX * hpx; if (hh < .2) continue; svg += `<rect x="${(xa + .5).toFixed(1)}" y="${(y - hh).toFixed(1)}" width="${Math.max(1, xb - xa - 1.2).toFixed(1)}" height="${hh.toFixed(1)}" fill="${HEX[r]}" opacity=".9"/>`; y -= hh; }
    }
    svg += `<line x1="${x0.toFixed(1)}" x2="${x1.toFixed(1)}" y1="${yb.toFixed(1)}" y2="${yb.toFixed(1)}" stroke="rgba(240,237,231,.3)"/>`;
    THR.forEach(th => { const x = lerp(x0, x1, (th - T0) / (T1 - T0)); svg += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${(yb + 6).toFixed(1)}" y2="${(yb - hpx - 16).toFixed(1)}" stroke="rgba(240,237,231,${(.25 + .45 * S.planes).toFixed(2)})" stroke-dasharray="3 4"/>`; });
    svg += `<text x="${x0.toFixed(1)}" y="${(yb + 22).toFixed(1)}" fill="#6E7782" font-family="Geist Mono, monospace" font-size="11.5">${coef}</text>`;
    SVG.innerHTML = `<g opacity="${cl(S.hist * 1.5).toFixed(3)}">${svg}</g>`;
  } else if (SVG.firstChild) SVG.innerHTML = '';
  // arrival labels
  const recent = arrivals.filter(a => now - a.t0 > 900 && now - a.t0 < 2600).slice(-4);
  arrLabs.forEach((el, i) => { const a = recent[i]; if (!a) { place(el, 0, 0, 0); return; } const s = toScreen(a.p); el.innerHTML = `<b style="color:${HEX[a.seg]}">Segment ${a.seg + 1}</b>`; place(el, s[0] + 10, s[1] - 22, 1 - (now - a.t0 - 900) / 1700); });

  // words and progress
  if (beat !== beatNow) { beatNow = beat; $$('.beat').forEach((b, i) => b.classList.toggle('on', i === beat)); $$('.progress li').forEach((li, i) => { li.classList.toggle('on', i === beat); li.classList.toggle('done', i < beat); }); }
  readout(beat, visS);
  // adapt resolution if frames run slow
  frames++; ft += dtMs || 16; if (frames >= 90) { if (ft / frames > 24 && dpr > 1) { dpr = Math.max(1, dpr - .25); resize(); } frames = 0; ft = 0; }
}
if (renderer) { gsap.ticker.add(frame); } else { $$('.beat').forEach((b, i) => b.classList.toggle('on', i === 0)); }
window.__S = S; window.__found = found; window.__tl = tl;
