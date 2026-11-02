/**
 * The Lens engine, V7. One dataset, one camera, three art-direction treatments that differ in what the scene draws
 * and how the gauge is embodied:
 *   t1 Observatory: full-bleed instrument; the cloud casts its projections onto the three far walls of its frame
 *                   (each wall is two of the columns); the gauge is a dial around the instrument.
 *   t2 Screen:      a projection screen stands behind the cloud and receives exactly what the eye sees; a live histogram
 *                   along the screen's lower edge is the gauge.
 *   t3 Filaments:   every customer is a fine stroke that points toward the centre it belongs to; as structure becomes
 *                   visible the strokes swing from the one shared centre to their own. The typography is the frame.
 * State S is the single source of truth; GSAP (or the lab harness) writes it, the frame reads it.
 */
import { WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute, Points, LineSegments, ShaderMaterial, Mesh, PlaneGeometry, MeshBasicMaterial, LineBasicMaterial, EdgesGeometry, Group, Vector3, Quaternion, Matrix4, DoubleSide } from 'three';
import gsap from 'gsap';
import { build, norm, cross, dot, add, rng, FEAT } from '../v6-hero/data.js';

const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
export const COLORS = [[47, 184, 172], [169, 182, 196], [242, 163, 58]], HEX = ['#2FB8AC', '#A9B6C4', '#F2A33A'];
const BG = [16 / 255, 19 / 255, 24 / 255];

export function createLens({ canvas, overlay, svg, treatment = 't1', mobile = () => innerWidth < 860, reduce = false, onFound } = {}) {
  const DATA = build({ small: innerWidth < 860 }), { P, N, U, D, MEAN, H, seg, THR, tOf } = DATA;
  // a tighter frame than min/max: the 1st and 99th percentile of each column
  const pct = (a, q) => { const v = P.map(p => p.p[a]).sort((x, y) => x - y); return v[Math.floor(q * (N - 1))]; };
  const lo = [0, 1, 2].map(a => pct(a, .01) - .25), hi = [0, 1, 2].map(a => pct(a, .99) + .25), ctr = lo.map((v, a) => (v + hi[a]) / 2);

  // ── orientation
  const basis = o => { const cy = Math.cos(o.yaw), sy = Math.sin(o.yaw), cp = Math.cos(o.pitch), sp = Math.sin(o.pitch), cr = Math.cos(o.roll), sr = Math.sin(o.roll);
    const f = [-sy * cp, -sp, -cy * cp], r0 = [cy, 0, -sy], u0 = [-sy * sp, cp, -cy * sp]; return { f, r: add(r0.map(v => v * cr), u0, sr), u: add(u0.map(v => v * cr), r0, -sr) }; };
  const anglesOf = f => ({ pitch: Math.asin(cl(-f[1], -1, 1)), yaw: Math.atan2(-f[0], -f[2]), roll: 0 });
  const V0 = anglesOf(U);
  const c0 = norm(cross(D, [0, 1, 0])); let w0 = cross(D, c0); if (w0[1] > 0) w0 = w0.map(v => -v);
  let V1 = anglesOf(norm(add(c0.map(v => v * Math.cos(.3)), w0, Math.sin(.3))));
  if (dot(basis(V1).r, D) < 0) V1 = anglesOf(norm(add(c0.map(v => -v * Math.cos(.3)), w0, Math.sin(.3))));
  { const b = basis(V1); V1.roll = Math.atan2(dot(D, b.u), dot(D, b.r)); }

  // ── the gauge: the best separation visible in the image plane, over 16 directions; also its best direction
  const PX = new Float32Array(N), PY = new Float32Array(N), PZ = new Float32Array(N), A = new Float32Array(N), Bv = new Float32Array(N);
  P.forEach((q, i) => { PX[i] = q.p[0]; PY[i] = q.p[1]; PZ[i] = q.p[2]; });
  function visible(o, want) {
    const { r, u } = basis(o); let best = 0, bk = 0;
    for (let i = 0; i < N; i++) { A[i] = PX[i] * r[0] + PY[i] * r[1] + PZ[i] * r[2]; Bv[i] = PX[i] * u[0] + PY[i] * u[1] + PZ[i] * u[2]; }
    for (let k = 0; k < 16; k++) {
      const c = Math.cos(k * Math.PI / 16), s = Math.sin(k * Math.PI / 16); let s0 = 0, s1 = 0, s2 = 0, q0 = 0, q1 = 0, q2 = 0, n0 = 0, n1 = 0, n2 = 0;
      for (let i = 0; i < N; i++) { const t = A[i] * c + Bv[i] * s, g = seg[i]; if (g === 0) { s0 += t; q0 += t * t; n0++; } else if (g === 1) { s1 += t; q1 += t * t; n1++; } else { s2 += t; q2 += t * t; n2++; } }
      const m0 = s0 / n0, m1 = s1 / n1, m2 = s2 / n2, all = (s0 + s1 + s2) / N;
      const wv = (q0 - n0 * m0 * m0 + q1 - n1 * m1 * m1 + q2 - n2 * m2 * m2) / N, bv = (n0 * (m0 - all) ** 2 + n1 * (m1 - all) ** 2 + n2 * (m2 - all) ** 2) / N;
      const v = bv / wv; if (v > best) { best = v; bk = k; }
    }
    if (want) { const c = Math.cos(bk * Math.PI / 16), s = Math.sin(bk * Math.PI / 16); want.dir = add(r.map(v => v * c), u, s); want.c = c; want.s = s; }
    return cl(best / DATA.SEP);
  }

  // ── renderer
  let renderer; try { renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch { return null; }
  const scene = new Scene(), camera = new PerspectiveCamera(30, 1, .1, 120);
  const tvals = P.map(q => tOf(q.p)), tmin = Math.min(...tvals), tmax = Math.max(...tvals), R = rng(3);
  const CENT = DATA.FIN.c, rankOf = j => DATA.seg[DATA.FIN.lab.indexOf(j)], centreByRank = [0, 1, 2].map(r => CENT[[0, 1, 2].find(j => rankOf(j) === r)]);

  // points: final position, a "raw measurement" position (one column at a time, laid along the frame's edges), colour, stagger
  const pos = new Float32Array(N * 3), raw = new Float32Array(N * 3), col = new Float32Array(N * 3), stag = new Float32Array(N), sd = new Float32Array(N);
  P.forEach((q, i) => {
    pos.set(q.p, i * 3); col.set(COLORS[seg[i]].map(v => v / 255), i * 3); stag[i] = (tvals[i] - tmin) / (tmax - tmin); sd[i] = R();
    const a = i % 3, rp = [lo[0], lo[1], lo[2]]; rp[a] = cl(q.p[a], lo[a], hi[a]); rp[(a + 1) % 3] -= .12 + R() * .12; raw.set(rp, i * 3);
  });
  const attrs = g => { g.setAttribute('aRaw', new BufferAttribute(raw, 3)); g.setAttribute('aCol', new BufferAttribute(col, 3)); g.setAttribute('aStag', new BufferAttribute(stag, 1)); g.setAttribute('aSeed', new BufferAttribute(sd, 1)); return g; };
  const geo = attrs(new BufferGeometry()); geo.setAttribute('position', new BufferAttribute(pos, 3));

  const COMMON = `
  uniform float uColor, uArrive, uAlpha, uNear, uFar, uTime, uPulse, uFlat, uFlatD; uniform vec3 uFlatN, uBg;
  attribute vec3 aRaw, aCol; attribute float aStag, aSeed;
  varying vec3 vCol; varying float vA;
  vec3 placeOf(vec3 p, out float k){
    k = clamp(uArrive * 1.7 - aSeed * .7, 0., 1.); k = k * k * (3. - 2. * k);
    vec3 q = mix(aRaw, p, k);
    if (uFlat > .5) q -= uFlatN * (dot(q, uFlatN) - uFlatD);
    return q;
  }
  void shade(vec4 mv, float k){
    float fog = smoothstep(uNear, uFar, -mv.z);
    float c = clamp(uColor * 1.7 - aStag * .7, 0., 1.);
    vec3 base = mix(vec3(.82, .85, .88), aCol, c);
    float pulse = uPulse * exp(-pow((aStag - fract(uTime * .32)) * 8., 2.));
    vCol = mix(base, uBg, fog * .62) + pulse * .22;
    vA = uAlpha * mix(1., .32, fog) * mix(.55, 1., k);
  }`;
  const PV = `uniform float uSize, uScale; ${COMMON}
  void main(){ float k; vec3 q = placeOf(position, k); vec4 mv = modelViewMatrix * vec4(q, 1.); gl_Position = projectionMatrix * mv; shade(mv, k);
    float fog = smoothstep(uNear, uFar, -mv.z); gl_PointSize = uSize * uScale / -mv.z * mix(1.12, .72, fog); }`;
  const PF = `varying vec3 vCol; varying float vA;
  void main(){ float d = length(gl_PointCoord - .5); float a = vA * smoothstep(.5, .2, d); if (a < .008) discard; gl_FragColor = vec4(vCol + (1. - smoothstep(0., .2, d)) * .12, a); }`;
  const uni = (o = {}) => ({ uSize: { value: .05 }, uScale: { value: 800 }, uColor: { value: 0 }, uArrive: { value: reduce ? 1 : 0 }, uAlpha: { value: 1 }, uNear: { value: 10 }, uFar: { value: 18 }, uTime: { value: 0 }, uPulse: { value: 0 }, uFlat: { value: 0 }, uFlatD: { value: 0 }, uFlatN: { value: new Vector3(0, 0, 1) }, uBg: { value: new Vector3(...BG) }, ...o });
  const pointMat = o => new ShaderMaterial({ vertexShader: PV, fragmentShader: PF, transparent: true, depthWrite: false, uniforms: uni(o) });
  const mats = [];
  const cloudMat = pointMat(); mats.push(cloudMat);
  const cloud = new Points(geo, cloudMat);

  // ── treatment layers
  const T = treatment, layers = {};
  const frameMat = new LineBasicMaterial({ color: 0xF0EDE7, transparent: true, opacity: 0, depthWrite: false });
  const box = new LineSegments(new BufferGeometry(), frameMat);
  { const g = new BufferGeometry(), v = []; const C = [lo, hi];
    // twelve edges of the frame, drawn as fine lines
    for (let a = 0; a < 3; a++) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const p0 = [0, 0, 0], p1 = [0, 0, 0]; p0[a] = lo[a]; p1[a] = hi[a]; const b = (a + 1) % 3, c = (a + 2) % 3; p0[b] = p1[b] = C[i][b]; p0[c] = p1[c] = C[j][c]; v.push(...p0, ...p1); }
    g.setAttribute('position', new BufferAttribute(new Float32Array(v), 3)); box.geometry = g; }
  // ticks along the three measuring axes from the near-low corner
  const tickMat = new LineBasicMaterial({ color: 0xF0EDE7, transparent: true, opacity: 0, depthWrite: false });
  { const v = []; for (let a = 0; a < 3; a++) { const span = hi[a] - lo[a]; for (let k = 0; k <= 10; k++) { const p = [lo[0], lo[1], lo[2]], q = [lo[0], lo[1], lo[2]]; p[a] = q[a] = lo[a] + span * k / 10; const b = a === 1 ? 0 : 1; q[b] -= k % 5 ? .07 : .16; v.push(...p, ...q); } }
    const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(v), 3)); layers.ticks = new LineSegments(g, tickMat); }
  scene.add(box, layers.ticks);

  if (T === 't1') {   // walls: grid + the cloud's shadow on each of the three far walls
    layers.walls = [0, 1, 2].map(a => {
      const b = (a + 1) % 3, c = (a + 2) % 3, v = [], step = .6;
      for (let x = lo[b]; x <= hi[b] + 1e-6; x += step) { const p = [0, 0, 0], q = [0, 0, 0]; p[b] = q[b] = x; p[c] = lo[c]; q[c] = hi[c]; v.push(...p, ...q); }
      for (let y = lo[c]; y <= hi[c] + 1e-6; y += step) { const p = [0, 0, 0], q = [0, 0, 0]; p[c] = q[c] = y; p[b] = lo[b]; q[b] = hi[b]; v.push(...p, ...q); }
      const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(v), 3));
      const gm = new LineBasicMaterial({ color: 0xF0EDE7, transparent: true, opacity: 0, depthWrite: false }), grid = new LineSegments(g, gm);
      const sm = pointMat({ uSize: { value: .028 }, uAlpha: { value: .0 }, uFlat: { value: 1 } }); sm.uniforms.uFlatN.value.set(a === 0 ? 1 : 0, a === 1 ? 1 : 0, a === 2 ? 1 : 0); mats.push(sm);
      const shadow = new Points(geo, sm); scene.add(grid, shadow);
      return { a, grid, gm, sm };
    });
  }
  if (T === 't2') {   // the screen behind the cloud, and the flattened cloud on it
    const g = new Group(), v = [], Wd = 4.8, Hd = 3.2;
    for (let x = -Wd; x <= Wd + 1e-6; x += .8) v.push(x, -Hd, 0, x, Hd, 0);
    for (let y = -Hd; y <= Hd + 1e-6; y += .8) v.push(-Wd, y, 0, Wd, y, 0);
    const gg = new BufferGeometry(); gg.setAttribute('position', new BufferAttribute(new Float32Array(v), 3));
    const gm = new LineBasicMaterial({ color: 0xF0EDE7, transparent: true, opacity: 0, depthWrite: false });
    const pm = new MeshBasicMaterial({ color: 0x0C0F13, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide });
    g.add(new Mesh(new PlaneGeometry(Wd * 2, Hd * 2), pm)); g.add(new LineSegments(gg, gm)); scene.add(g);
    const sm = pointMat({ uSize: { value: .04 }, uAlpha: { value: 0 }, uFlat: { value: 1 } }); mats.push(sm);
    scene.add(new Points(geo, sm));
    layers.screen = { g, gm, pm, sm, Wd, Hd };
  }
  if (T === 't3') {   // filaments: each customer a stroke pointing at its centre
    const fpos = new Float32Array(N * 6), fside = new Float32Array(N * 2), fg = new Float32Array(N * 6), fc = new Float32Array(N * 6);
    const fraw = new Float32Array(N * 6), fcol = new Float32Array(N * 6), fst = new Float32Array(N * 2), fsd = new Float32Array(N * 2);
    P.forEach((q, i) => {
      const toG = norm(add(MEAN, q.p, -1)), toC = norm(add(centreByRank[seg[i]], q.p, -1));
      for (let s = 0; s < 2; s++) { const k = i * 2 + s; fpos.set(q.p, k * 3); fside[k] = s; fg.set(toG, k * 3); fc.set(toC, k * 3); fraw.set(raw.subarray(i * 3, i * 3 + 3), k * 3); fcol.set(col.subarray(i * 3, i * 3 + 3), k * 3); fst[k] = stag[i]; fsd[k] = sd[i]; }
    });
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(fpos, 3)); g.setAttribute('aSide', new BufferAttribute(fside, 1)); g.setAttribute('aG', new BufferAttribute(fg, 3)); g.setAttribute('aC', new BufferAttribute(fc, 3));
    g.setAttribute('aRaw', new BufferAttribute(fraw, 3)); g.setAttribute('aCol', new BufferAttribute(fcol, 3)); g.setAttribute('aStag', new BufferAttribute(fst, 1)); g.setAttribute('aSeed', new BufferAttribute(fsd, 1));
    const fm = new ShaderMaterial({ transparent: true, depthWrite: false, uniforms: uni({ uLen: { value: .2 }, uAlign: { value: 0 } }),
      vertexShader: `uniform float uLen, uAlign; attribute float aSide; attribute vec3 aG, aC; ${COMMON}
        void main(){ float k; vec3 q = placeOf(position, k); vec3 d = normalize(mix(aG, aC, uAlign) + vec3(1e-4)); q += d * uLen * aSide * k;
          vec4 mv = modelViewMatrix * vec4(q, 1.); gl_Position = projectionMatrix * mv; shade(mv, k); vA *= mix(.9, .35, aSide); }`,
      fragmentShader: `varying vec3 vCol; varying float vA; void main(){ gl_FragColor = vec4(vCol, vA); }` });
    mats.push(fm); scene.add(new LineSegments(g, fm)); layers.fil = fm;
    cloudMat.uniforms.uSize.value = .026;
  }
  scene.add(cloud);

  // ── the rule (creation): two boundaries, and new customers
  const planes = THR.map(th => {
    const g = new Group(), m1 = new MeshBasicMaterial({ color: 0xF0EDE7, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false }), m2 = new LineBasicMaterial({ color: 0xF0EDE7, transparent: true, opacity: 0 });
    const pg = new PlaneGeometry(3.4, 2.8); g.add(new Mesh(pg, m1)); g.add(new LineSegments(new EdgesGeometry(pg), m2));
    g.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...D))); g.position.set(...add(MEAN, D, th)); scene.add(g); return { m1, m2 };
  });
  const AN = 18, aGeo = new BufferGeometry(), aPos = new Float32Array(AN * 3).fill(999), aCol = new Float32Array(AN * 3);
  aGeo.setAttribute('position', new BufferAttribute(aPos, 3)); aGeo.setAttribute('aCol', new BufferAttribute(aCol, 3)); aGeo.setAttribute('aRaw', new BufferAttribute(aPos, 3)); aGeo.setAttribute('aStag', new BufferAttribute(new Float32Array(AN), 1)); aGeo.setAttribute('aSeed', new BufferAttribute(new Float32Array(AN), 1));
  const aMat = pointMat({ uSize: { value: .12 }, uColor: { value: 1 }, uArrive: { value: 1 } }); mats.push(aMat);
  scene.add(new Points(aGeo, aMat));
  const arrivals = [], AR = rng(77);

  // ── overlay elements
  const mk = (cls, html) => { const e = document.createElement('div'); e.className = cls; if (html) e.innerHTML = html; overlay.append(e); return e; };
  const crosses = [0, 1, 2].map(j => { const e = mk('cross'); e.style.color = HEX[rankOf(j)]; return e; });
  const segLabs = [0, 1, 2].map(r => mk('lab seg', `<b style="color:${HEX[r]}">Segment ${r + 1}</b><span>${DATA.SEG[r].n.toLocaleString('en-CA')} customers · ${DATA.SEG[r].desc}</span>`));
  const axisLabs = FEAT.map(f => mk('lab axis', f));
  const arrLabs = [...Array(4)].map(() => mk('lab arr', ''));
  const HB = 56, T0 = -3.3, T1 = 3.3, BINS = [0, 1, 2].map(() => new Array(HB).fill(0));
  tvals.forEach((t, i) => { const b = Math.floor((t - T0) / (T1 - T0) * HB); if (b >= 0 && b < HB) BINS[seg[i]][b]++; });
  const BMAX = Math.max(...BINS[0].map((_, b) => BINS[0][b] + BINS[1][b] + BINS[2][b]));
  const coef = D.map((v, i) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)} ${['visits', 'spend', 'tenure'][i]}`).join('  ');

  // ── state
  const S = { arrive: reduce ? 1 : 0, color: 0, found: 0, cent: 0, cam: 0, hist: 0, labels: 0, planes: 0, arr: 0, frame: reduce ? 1 : 0 };
  const cur = { ...V0 }; let foundBy = '', lastTouch = -1e9, dragging = false, vYaw = 0, vPitch = 0;
  function found(by) {
    if (S.found > 0) return; foundBy = by;
    lastTouch = performance.now() + 2600;
    gsap.to(cur, { yaw: cur.yaw + wrap(V1.yaw - cur.yaw), pitch: V1.pitch, roll: cur.roll + wrap(V1.roll - cur.roll), duration: reduce ? 0 : by === 'you' ? 1.2 : 2.2, ease: 'power3.inOut' });
    gsap.to(S, { found: 1, duration: reduce ? 0 : 1.6, ease: 'power2.inOut', delay: reduce ? 0 : .25 });
    if (!reduce) gsap.fromTo(cloudMat.uniforms.uPulse, { value: 1 }, { value: 0, duration: 3.4, ease: 'power1.out', delay: .4 });
    onFound?.(by);
  }
  if (!reduce) { gsap.to(S, { frame: 1, duration: .9, ease: 'power2.out', delay: .1 }); gsap.to(S, { arrive: 1, duration: 2.4, ease: 'power3.inOut', delay: .55 }); }

  // ── interaction: drag with measured velocity and exponential damping; arrow keys
  let px = 0, py = 0, pt = 0;
  canvas.addEventListener('pointerdown', e => { dragging = true; px = e.clientX; py = e.clientY; pt = performance.now(); vYaw = vPitch = 0; canvas.setPointerCapture(e.pointerId); gsap.killTweensOf(cur); });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return; const now = performance.now(), dt = Math.max(8, now - pt) / 1000, k = 3.2 / Math.min(innerWidth, innerHeight * 1.4);
    const dy = -(e.clientX - px) * k, dp = (e.clientY - py) * k * .8;
    cur.yaw += dy; cur.pitch = cl(cur.pitch + dp, -1.35, 1.35);
    vYaw = lerp(vYaw, dy / dt, .5); vPitch = lerp(vPitch, dp / dt, .5); px = e.clientX; py = e.clientY; pt = now; lastTouch = now;
  });
  const up = () => { if (performance.now() - pt > 90) { vYaw = 0; vPitch = 0; } dragging = false; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('keydown', e => {
    const k = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!k) return;
    e.preventDefault(); gsap.killTweensOf(cur); vYaw = k[0] * 1.1; vPitch = k[1] * .8; lastTouch = performance.now();
  });

  // ── sizing
  let W = 0, Hh = 0, dpr = Math.min(devicePixelRatio || 1, 1.75);
  const layout = { cx: .5, cy: .5, dist: 13 };
  function resize() {
    W = innerWidth; Hh = innerHeight; renderer.setPixelRatio(dpr); renderer.setSize(W, Hh, false); camera.aspect = W / Hh;
    camera.setViewOffset(W, Hh, -(layout.cx - .5) * W, -(layout.cy - .5) * Hh, W, Hh); camera.updateProjectionMatrix();
    const sc = Hh * dpr / (2 * Math.tan(camera.fov * Math.PI / 360)); mats.forEach(m => { m.uniforms.uScale.value = sc; });
  }
  const v3 = new Vector3(), toScreen = p => { v3.set(p[0], p[1], p[2]).project(camera); return [(v3.x + 1) / 2 * W, (1 - v3.y) / 2 * Hh, v3.z]; };
  const place = (el, x, y, o) => { el.style.opacity = o.toFixed(3); if (o > .01) el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; };

  // ── frame
  let visS = 0, last = performance.now(), frames = 0, ft = 0, spawnAt = 0;
  const want = {}, out = { vis: 0, beat: 0, hint: '' };
  const m4 = new Matrix4();
  function frame(beatHint) {
    const now = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now;
    const k = Math.max(S.cam, S.found), sway = reduce || k > .02 ? 0 : 1;
    const script = { yaw: V0.yaw + wrap(V1.yaw - V0.yaw) * k + Math.sin(now / 4600) * .2 * sway + (S.planes > 0 && !reduce ? Math.sin(now / 5400) * .1 * S.planes : 0), pitch: lerp(V0.pitch, V1.pitch, k) + Math.sin(now / 6000) * .06 * sway, roll: V1.roll * k };
    if (!dragging) { const damp = Math.exp(-dt * 3.4); cur.yaw += vYaw * dt; cur.pitch = cl(cur.pitch + vPitch * dt, -1.35, 1.35); vYaw *= damp; vPitch *= damp; }
    if (!dragging && now - lastTouch > 4200 && !gsap.isTweening(cur)) { const a = reduce ? 1 : 1 - Math.exp(-dt * 1.6); cur.yaw += wrap(script.yaw - cur.yaw) * a; cur.pitch += (script.pitch - cur.pitch) * a; cur.roll += wrap(script.roll - cur.roll) * a; }
    const { f, r, u } = basis(cur), dist = layout.dist;
    camera.position.set(MEAN[0] - f[0] * dist, MEAN[1] - f[1] * dist, MEAN[2] - f[2] * dist); camera.up.set(...u); camera.lookAt(MEAN[0], MEAN[1], MEAN[2]); camera.updateMatrixWorld();
    const vis = visible(cur, want); visS += (vis - visS) * (1 - Math.exp(-dt * 12)); out.vis = visS;
    if (beatHint === 0 && vis > .82 && S.found === 0 && now - lastTouch < 4000) found('you');

    const colorK = Math.max(S.color, S.found);
    mats.forEach(m => { const U = m.uniforms; U.uNear.value = dist - 2.6; U.uFar.value = dist + 3.6; U.uTime.value = now / 1000; if (m !== aMat) { U.uColor.value = colorK; U.uArrive.value = S.arrive; } });
    cloudMat.uniforms.uAlpha.value = 1 - .45 * S.planes;
    frameMat.opacity = .12 * S.frame * (1 - .4 * S.planes); tickMat.opacity = .32 * S.frame;
    if (layers.walls) layers.walls.forEach(w => {
      const a = w.a, camC = camera.position.getComponent(a), at = camC > ctr[a] ? lo[a] : hi[a];
      w.grid.position.setComponent(a, at); w.gm.opacity = .055 * S.frame * (1 - .7 * S.hist);
      w.sm.uniforms.uFlatD.value = at; w.sm.uniforms.uAlpha.value = .3 * S.arrive * (1 - .8 * S.hist);
    });
    if (layers.screen) {
      const s = layers.screen, cpos = add(MEAN, f, 3.6);
      m4.makeBasis(new Vector3(...r), new Vector3(...u), new Vector3(-f[0], -f[1], -f[2])); s.g.quaternion.setFromRotationMatrix(m4); s.g.position.set(...cpos);
      s.gm.opacity = .07 * S.frame * (1 - .5 * S.hist); s.pm.opacity = .55 * S.frame;
      s.sm.uniforms.uFlatN.value.set(...f); s.sm.uniforms.uFlatD.value = dot(cpos, f); s.sm.uniforms.uAlpha.value = .5 * S.arrive * (1 - .7 * S.hist);
    }
    if (layers.fil) { layers.fil.uniforms.uAlign.value = cl(Math.max(visS * 1.1, S.found, S.cent)); }
    planes.forEach(p => { p.m1.opacity = .04 * S.planes; p.m2.opacity = .32 * S.planes; });
    if (S.arr > .05 && now > spawnAt) { spawnAt = now + (reduce ? 1e9 : 1150); const a = DATA.arrival(AR); arrivals.push({ ...a, t0: now }); if (arrivals.length > AN) arrivals.shift(); }
    if (S.arr <= .01) arrivals.length = 0;
    for (let i = 0; i < AN; i++) { const a = arrivals[i]; if (!a) { aPos[i * 3] = 999; continue; } const age = (now - a.t0) / 1000, fk = reduce ? 1 : 1 - Math.pow(1 - cl(age / .9), 3); aPos.set([a.p[0], a.p[1] + (1 - fk) * 3, a.p[2]], i * 3); aCol.set(COLORS[a.seg].map(v => v / 255), i * 3); }
    aGeo.attributes.position.needsUpdate = true; aGeo.attributes.aCol.needsUpdate = true;
    renderer.render(scene, camera);

    // overlay: axis names on the measuring edges
    axisLabs.forEach((el, a) => { const p = [lo[0], lo[1], lo[2]]; p[a] = hi[a]; const s = toScreen(p); place(el, s[0] + 6, s[1] + 6, S.frame * .9 * (1 - S.hist * .7)); });
    const it = S.cent * (H.length - 1), i0 = Math.floor(it), i1 = Math.min(H.length - 1, i0 + 1), fr = it - i0, co = cl(S.cent * 5) * (1 - S.labels * .5);
    crosses.forEach((el, j) => { const c = H[i0].c[j].map((v, a) => lerp(v, H[i1].c[j][a], fr)), s = toScreen(c); place(el, s[0], s[1], co); });
    if (S.labels > .01) {
      const top = [1e9, 1e9, 1e9], cx = [0, 0, 0], n = [0, 0, 0];
      for (let i = 0; i < N; i += 3) { const s = toScreen(P[i].p), g = seg[i]; if (s[1] < top[g]) top[g] = s[1]; cx[g] += s[0]; n[g]++; }
      const L = [0, 1, 2].map(rk => ({ r: rk, x: cx[rk] / n[rk], y: Math.max(90, top[rk] - 52) })).sort((a, b) => a.x - b.x);
      for (let i = 1; i < 3; i++) if (L[i].x - L[i - 1].x < 200 && Math.abs(L[i].y - L[i - 1].y) < 44) L[i].y = L[i - 1].y - 44;
      L.forEach(l => place(segLabs[l.r], l.x - 80, l.y, S.labels));
    } else segLabs.forEach(el => place(el, 0, 0, 0));
    const recent = arrivals.filter(a => now - a.t0 > 900 && now - a.t0 < 2600).slice(-4);
    arrLabs.forEach((el, i) => { const a = recent[i]; if (!a) { place(el, 0, 0, 0); return; } const s = toScreen(a.p); el.innerHTML = `<b style="color:${HEX[a.seg]}">Segment ${a.seg + 1}</b>`; place(el, s[0] + 10, s[1] - 22, 1 - (now - a.t0 - 900) / 1700); });

    // svg: the treatment's gauge, and the histogram along the separating direction (insight)
    let s = '';
    const centre = toScreen(MEAN);
    if (T === 't1' && S.hist < .98) {   // the dial
      const R0 = Math.min(W * (mobile() ? .44 : .3), Hh * .38), ang = -Math.PI / 2, o = (1 - S.hist) * S.frame;
      for (let t = 0; t < 72; t++) { const a = ang + t / 72 * Math.PI * 2, big = t % 6 === 0, r1 = R0 + (big ? 10 : 5); s += `<line x1="${(centre[0] + Math.cos(a) * R0).toFixed(1)}" y1="${(centre[1] + Math.sin(a) * R0).toFixed(1)}" x2="${(centre[0] + Math.cos(a) * r1).toFixed(1)}" y2="${(centre[1] + Math.sin(a) * r1).toFixed(1)}" stroke="rgba(240,237,231,${big ? .34 : .16})"/>`; }
      const v = Math.max(visS, S.found), a1 = ang + v * Math.PI * 2 * .999, large = v > .5 ? 1 : 0, Rr = R0 - 8;
      s += `<circle cx="${centre[0].toFixed(1)}" cy="${centre[1].toFixed(1)}" r="${Rr.toFixed(1)}" fill="none" stroke="rgba(240,237,231,.08)" stroke-width="2"/>`;
      if (v > .002) s += `<path d="M${(centre[0] + Math.cos(ang) * Rr).toFixed(1)},${(centre[1] + Math.sin(ang) * Rr).toFixed(1)} A${Rr.toFixed(1)},${Rr.toFixed(1)} 0 ${large} 1 ${(centre[0] + Math.cos(a1) * Rr).toFixed(1)},${(centre[1] + Math.sin(a1) * Rr).toFixed(1)}" fill="none" stroke="${S.found > .5 ? '#2FB8AC' : '#A9B6C4'}" stroke-width="2" stroke-linecap="round"/>`;
      const m = .82, am = ang + m * Math.PI * 2; s += `<line x1="${(centre[0] + Math.cos(am) * (Rr - 7)).toFixed(1)}" y1="${(centre[1] + Math.sin(am) * (Rr - 7)).toFixed(1)}" x2="${(centre[0] + Math.cos(am) * (Rr + 7)).toFixed(1)}" y2="${(centre[1] + Math.sin(am) * (Rr + 7)).toFixed(1)}" stroke="#F2A33A" stroke-width="1.5"/>`;
      s += `<text x="${centre[0].toFixed(1)}" y="${(centre[1] - R0 - 24).toFixed(1)}" text-anchor="middle" fill="${S.found > .5 ? '#2FB8AC' : '#A7AFB9'}" font-family="Mona Sans, sans-serif" font-size="13">Structure visible  ${Math.round(Math.max(visS, S.found) * 100)}%</text>`;
      s = `<g opacity="${o.toFixed(3)}">${s}</g>`;
    }
    if (T === 't2' && layers.screen && S.hist < .98) {   // live histogram along the screen's lower edge
      const sc = layers.screen, cpos = add(MEAN, f, 3.6), bl = toScreen(add(add(cpos, r, -sc.Wd), u, -sc.Hd)), br = toScreen(add(add(cpos, r, sc.Wd), u, -sc.Hd));
      const NB = 48, bins = [0, 1, 2].map(() => new Float32Array(NB)); let mn = 1e9, mx = -1e9; const ts = new Float32Array(N);
      for (let i = 0; i < N; i++) { const t = A[i] * want.c + Bv[i] * want.s; ts[i] = t; if (t < mn) mn = t; if (t > mx) mx = t; }
      for (let i = 0; i < N; i++) { const b = Math.min(NB - 1, Math.floor((ts[i] - mn) / (mx - mn + 1e-9) * NB)); bins[seg[i]][b]++; }
      let bmax = 0; for (let b = 0; b < NB; b++) bmax = Math.max(bmax, bins[0][b] + bins[1][b] + bins[2][b]);
      const x0 = bl[0] + 30, x1 = br[0] - 30, yb = bl[1] - 18, hp = Math.min(90, Hh * .1) * S.frame, cK = Math.max(S.color, S.found);
      for (let b = 0; b < NB; b++) { let y = yb; const xa = lerp(x0, x1, b / NB), xb = lerp(x0, x1, (b + 1) / NB);
        for (let g = 0; g < 3; g++) { const hh = bins[g][b] / bmax * hp; if (hh < .3) continue; const c = cK > .5 ? HEX[g] : '#A9B6C4'; s += `<rect x="${(xa + .5).toFixed(1)}" y="${(y - hh).toFixed(1)}" width="${Math.max(1, xb - xa - 1.4).toFixed(1)}" height="${hh.toFixed(1)}" fill="${c}" opacity="${cK > .5 ? .85 : .5}"/>`; y -= hh; } }
      s += `<line x1="${x0.toFixed(1)}" x2="${x1.toFixed(1)}" y1="${yb.toFixed(1)}" y2="${yb.toFixed(1)}" stroke="rgba(240,237,231,.3)"/>`;
      s = `<g opacity="${(1 - S.hist).toFixed(3)}">${s}</g>`;
    }
    if (S.hist > .005) {   // the histogram along the separating direction, under the cloud
      const at = t => toScreen(add(MEAN, D, t))[0], yb = Math.min(Hh - (mobile() ? 250 : 110), centre[1] + Hh * (mobile() ? .19 : .26)), hpx = Math.min(110, Hh * .13) * S.hist, x0 = at(T0), x1 = at(T1); let g = '';
      for (let b = 0; b < HB; b++) { const xa = lerp(x0, x1, b / HB), xb = lerp(x0, x1, (b + 1) / HB); let y = yb; for (let rr = 0; rr < 3; rr++) { const hh = BINS[rr][b] / BMAX * hpx; if (hh < .2) continue; g += `<rect x="${(xa + .5).toFixed(1)}" y="${(y - hh).toFixed(1)}" width="${Math.max(1, xb - xa - 1.2).toFixed(1)}" height="${hh.toFixed(1)}" fill="${HEX[rr]}" opacity=".9"/>`; y -= hh; } }
      g += `<line x1="${x0.toFixed(1)}" x2="${x1.toFixed(1)}" y1="${yb.toFixed(1)}" y2="${yb.toFixed(1)}" stroke="rgba(240,237,231,.3)"/>`;
      THR.forEach(th => { const x = lerp(x0, x1, (th - T0) / (T1 - T0)); g += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${(yb + 6).toFixed(1)}" y2="${(yb - hpx - 16).toFixed(1)}" stroke="rgba(240,237,231,${(.25 + .45 * S.planes).toFixed(2)})" stroke-dasharray="3 4"/>`; });
      g += `<text x="${x0.toFixed(1)}" y="${(yb + 24).toFixed(1)}" fill="#6E7782" font-family="Geist Mono, monospace" font-size="11.5">${coef}</text>`;
      s += `<g opacity="${cl(S.hist * 1.5).toFixed(3)}">${g}</g>`;
    }
    svg.innerHTML = s;
    // probe four small turns for the "warmer" hint
    if (beatHint === 0 && S.found === 0 && now - lastTouch < 4000 && (frames % 12 === 0)) {
      const d = .14, c = [['left', { ...cur, yaw: cur.yaw + d }], ['right', { ...cur, yaw: cur.yaw - d }], ['down', { ...cur, pitch: cur.pitch + d }], ['up', { ...cur, pitch: cur.pitch - d }]].map(([n, o]) => [n, visible(o)]).sort((a, b) => b[1] - a[1]);
      out.hint = c[0][1] > vis + .004 ? `Warmer: turn it ${c[0][0]}.` : 'Close. Try a small turn.';
    }
    frames++; ft += dt * 1000; if (frames % 90 === 0) { if (ft / 90 > 24 && dpr > 1) { dpr = Math.max(1, dpr - .25); resize(); } ft = 0; }
    return out;
  }
  return { S, DATA, frame, found, resize, layout, cur, get foundBy() { return foundBy; }, get lastTouch() { return lastTouch; }, arrivals, coef };
}
