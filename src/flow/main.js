/**
 * CREATIVE UNIVERSE V10 · THE FLOW, WITH THE WAVE
 * Two waves of data (cool and warm) meet and pour into one stream of light. It wraps a glass globe whose land is
 * drawn in points (Analyze), weaves down through three glass plates and the tools around them (Build) and flows into
 * a glass screen on a pedestal (L//IOS) that shows the real L//IOS screenshots. The page scrolls normally; damped scroll progress moves
 * the camera down the stream, so every scene is joined to the next. three.js 0.169 + bloom, drawn live.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { lios } from '../content';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import AnalystLab from '../lab/AnalystLab';
import LAND from './land.json';

const root = document.documentElement, $ = id => document.getElementById(id), $$ = s => [...document.querySelectorAll(s)];
const reduce = root.classList.contains('rm');
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = t => (t = clamp(t), t * t * (3 - 2 * t));
const shot = s => (window.__SHOTS && window.__SHOTS[s]) || s + '.webp';
const PORTRAIT = () => innerWidth < 900 && innerWidth / innerHeight < 1.05;
let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const glsl = c => `vec3(${c.r.toFixed(3)}, ${c.g.toFixed(3)}, ${c.b.toFixed(3)})`;
const C = { cyan: new THREE.Color('#47c6ff'), blue: new THREE.Color('#2a5cff'), violet: new THREE.Color('#8a5cff'), orange: new THREE.Color('#ff8a2a'), ice: new THREE.Color('#cfeeff') };

// where each scene sits on the way down (world units)
const S = { orb: new THREE.Vector3(22, 0, 0), orbR: 2.2, px: 42, plates: [1.15, 0, -1.15], tab: new THREE.Vector3(62, -.2, 0), ped: -2.1 };

// ── renderer
const canvas = $('gl');
let renderer = null;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!window.__capture }); if (!renderer.getContext()) renderer = null; } catch (e) { renderer = null; }
if (!renderer) root.classList.add('nogl');
const scene = new THREE.Scene(); scene.background = new THREE.Color('#02040a'); scene.fog = new THREE.Fog('#02040a', 18, 52);
const camera = new THREE.PerspectiveCamera(40, 1, .05, 200);
let composer, dpr = Math.min(devicePixelRatio || 1, 1.75);
if (renderer) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), .95, .45, .3)); composer.addPass(new OutputPass());
}
scene.add(new THREE.HemisphereLight('#9fb4d8', '#05070b', .9));
const key = new THREE.DirectionalLight('#ffffff', 1.5); key.position.set(-4, 6, 8); scene.add(key);

const U = { uT: { value: 0 }, uPix: { value: 1 }, uIn: { value: 1 }, uGB: { value: 0 }, uPulse: { value: -1 }, uEnd: { value: 0 } };
// Each scene builds itself the first time the camera arrives: v runs 0 → 1 over dur seconds.
const BUILD = [{ t: -1, v: 0, dur: 1.6 }, { t: -1, v: 0, dur: 2.6 }, { t: -1, v: 0, dur: 2.2 }, { t: -1, v: 0, dur: 2.4 }];
const built = { bars: [], wire: null };
const POINT_FS = `varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .0, d); a *= a; if (a < .01) discard; gl_FragColor = vec4(vC * a * vA, 1.); }`;
const LINE_FS = `varying vec3 vC; varying float vA; void main(){ gl_FragColor = vec4(vC * vA, 1.); }`;
const add = (vs, fs = POINT_FS) => new THREE.ShaderMaterial({ uniforms: U, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
const geo = attrs => { const g = new THREE.BufferGeometry(); for (const [k, [a, n]] of Object.entries(attrs)) g.setAttribute(k, new THREE.BufferAttribute(a, n)); return g; };
const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.2, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const glow = (col, sx, sy, o) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: col, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false })); m.scale.set(sx, sy, 1); return m; };
const basic = (col, o, extra = {}) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, ...extra });


// ═════════════ 01 · EXPLORE: two waves of data, one cool and one warm, roll in from the left and become one stream
const floaters = [];
const NECK = new THREE.Vector3(10.5, .4, .3);
// a sheet of points that folds like fabric. u runs from the outer edge to the neck, v across the sheet.
// Brighter rows every few lines give it the dotted ridge lines; the top edge carries the light.
// data flows sideways: the dots slide along each sheet from left to right, and the crests travel the same way
const waveUpd = [];
function wave(curvePts, NU, NV, width, cols, dir) {
  const curve = new THREE.CatmullRomCurve3(curvePts.map(p => new THREE.Vector3(...p))), N = NU * NV, SN = 1200;
  const smp = new Float32Array(SN * 7), p = new THREE.Vector3(), t = new THREE.Vector3(), A = new THREE.Vector3();
  for (let i = 0; i < SN; i++) { const u = i / (SN - 1); curve.getPointAt(u, p); curve.getTangentAt(u, t);
    A.set(0, .45 + .35 * u, -1 + .6 * u).normalize(); A.addScaledVector(t, -A.dot(t)).normalize(); smp.set([p.x, p.y, p.z, A.x, A.y, A.z, width(u)], i * 7); }
  const a = new Float32Array(N * 3), b = new Float32Array(N * 2), u0 = new Float32Array(N), vv = new Float32Array(N), r = new Float32Array(N);
  for (let i = 0, k = 0; i < NU; i++) for (let j = 0; j < NV; j++, k++) { u0[k] = (i + (j % 2) * .5) / NU; vv[k] = j / (NV - 1) - .5; r[k] = rnd(); }
  const g = geo({ position: [a, 3], uv: [b, 2], rnd: [r, 1] });
  const place = time => { const sh = time * .028 * -dir;
    for (let k = 0; k < N; k++) { let u = (u0[k] + sh) % 1; if (u < 0) u += 1; const o = Math.min(SN - 1, Math.round(u * (SN - 1))) * 7, v = vv[k], w = smp[o + 6] * v;
      a[k * 3] = smp[o] + smp[o + 3] * w; a[k * 3 + 1] = smp[o + 1] + smp[o + 4] * w; a[k * 3 + 2] = smp[o + 2] + smp[o + 5] * w; b[k * 2] = u; b[k * 2 + 1] = v; }
    g.attributes.position.needsUpdate = true; g.attributes.uv.needsUpdate = true; };
  place(0); waveUpd.push(place);
  const m = new THREE.Points(g, add(`uniform float uT, uPix; attribute float rnd; varying vec3 vC; varying float vA;
    void main(){ float u = uv.x, v = uv.y; float fold = 1. - u; vec3 p0 = position;
      // crests that travel left to right across the screen (phase runs with world x)
      float h = sin(p0.x * .55 - uT * 1.1 + v * 4.) * .9 + sin(p0.x * .22 - uT * .55 - v * 2.5) * .75 + cos(v * 8. + p0.x * .3 - uT * .8) * .25;
      vec3 p = p0 + vec3(0., 1., 0.) * h * (.2 + .8 * pow(fold, .8));
      vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
      vec3 col = mix(${glsl(cols[0])}, ${glsl(cols[1])}, smoothstep(.0, .55, u)); col = mix(col, ${glsl(cols[2])}, smoothstep(.6, .95, u));
      float row = smoothstep(.72, 1., abs(fract(v * ${(NV / 4).toFixed(1)}) - .5) * 2.);
      float crest = smoothstep(.5, 1.5, h);
      float pulse = pow(fract(p0.x * .07 - uT * .22 + v * .15), 12.);                                         // bright packets moving right
      float top = smoothstep(.36, .5, v); float tw = pow(rnd, 26.) * 2.;
      vC = col * (.7 + row * 1.1 + crest * 2. + top * 1. + pulse * 2.2) * (1. + tw * 1.5) + vec3(1.) * (crest * .1 + pulse * .25 + tw * .4);
      vA = (.6 + row * .5 + top * .3 + crest * .3) * smoothstep(.0, .14, u) * (1. - smoothstep(.8, 1., u) * .85) * (1. - smoothstep(.47, .5, abs(v)) * .5) * smoothstep(44., 7., -mv.z);
      gl_PointSize = (1.9 + row * .9 + crest * 1.1 + pulse * 1.4 + top * .6 + tw * 2.4) * uPix * 10. / -mv.z; }`));
  m.frustumCulled = false; scene.add(m);
}
wave([[-19, 1.4, -3.5], [-13, 2.6, -1.8], [-7.5, .3, -.4], [-2.5, 1.6, .1], [2.5, .5, .3], [7, .7, .3], [NECK.x, NECK.y, NECK.z]], 340, 54, u => .35 + 3.6 * Math.pow(1 - u, 1.2), [C.blue, C.cyan, C.violet], -1);
wave([[-19, 3.2, -7], [-13, 1.6, -4.4], [-7.5, 3.0, -2.4], [-2.5, 1.6, -.9], [2.5, 1.4, -.2], [7, .5, .2], [NECK.x, NECK.y, NECK.z]], 340, 54, u => .35 + 3.2 * Math.pow(1 - u, 1.2), [C.orange, new THREE.Color('#ff7a2e'), C.violet], -1);
// low waves of glowing dots along the bottom of each scene: blue to the left, orange to the right
// one long low wave of glowing dots runs under the whole journey
function band(y, z, amp = .6) {
  const X0 = -26, X1 = 72, NX = 1500, NZ = 11, N = NX * NZ, a = new Float32Array(N * 3), r = new Float32Array(N);
  for (let j = 0, k = 0; j < NZ; j++) for (let i = 0; i < NX; i++, k++) { a.set([X0 + i / (NX - 1) * (X1 - X0), y, z + 2.4 - j * .7], k * 3); r[k] = rnd(); }
  const m = new THREE.Points(geo({ position: [a, 3], rnd: [r, 1] }), add(`uniform float uT, uPix; attribute float rnd; varying vec3 vC; varying float vA;
    void main(){ vec3 p = position; float ph = p.x * .2 + p.z * .6 - uT * .6; p.y += sin(ph) * ${amp.toFixed(2)} + sin(p.x * .47 - uT * .4 + p.z * 1.3) * ${(amp * .5).toFixed(2)};
      vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; float tw = pow(rnd, 20.) * 2.; float k = .5 + .5 * sin(p.x * .09 + 1.);
      vec3 c = mix(${glsl(C.blue)}, ${glsl(C.violet)}, k); c = mix(c, ${glsl(C.orange)}, smoothstep(.75, 1., .5 + .5 * sin(p.x * .05 - 1.2)) * .8);
      float crest = smoothstep(-.2, .6, sin(ph));
      vC = c * (.9 + crest * 1.) * (1. + tw); vA = 1.05 * (.3 + crest * .6) * smoothstep(40., 6., -mv.z);
      gl_PointSize = (1.6 + crest * 1.4 + tw * 2.) * uPix * 10. / -mv.z; }`));
  m.frustumCulled = false; scene.add(m);
}
band(-3.3, .5, .8);

// ═════════════ the stream: from the meeting of the waves, around the globe, through the plates, into L//IOS
const pts = [[NECK.x, NECK.y, NECK.z], [13, 1.2, .8], [15.8, -.4, 1.0], [18.2, .6, .8]];
// around the globe: one and a quarter turns as it passes from left to right
for (let i = 0; i <= 14; i++) { const f = i / 14, x = S.orb.x - 2.7 + f * 5.4, r = Math.sqrt(Math.max(.3, S.orbR * S.orbR - Math.pow(x - S.orb.x, 2))) + .38, a = .7 + f * Math.PI * 2.5;
  pts.push([x, S.orb.y + Math.cos(a) * r, S.orb.z + Math.sin(a) * r]); }
// then a long natural wave, in and out between the plates, on into the screen
pts.push([27.4, -.7, .9], [30.4, .9, .8], [33.4, -.5, .9], [36.2, 1.5, .7], [38.6, .58, .6], [41, -.58, .8], [43.4, .58, .7], [45.8, -.62, .8], [48.8, .9, .7], [51.8, -.3, .8], [54.6, .7, .6], [57.4, .35, .3], [58.9, .25, .12]);
const path = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', .5);
const SEG = 1600, P = path.getSpacedPoints(SEG), T = P.map((_, i) => path.getTangentAt(i / SEG)), side = [], nrm = [];
{ const up = new THREE.Vector3(), a = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i <= SEG; i++) { up.copy(a); const s = new THREE.Vector3().crossVectors(T[i], up).normalize(); if (s.lengthSq() < .1) s.set(1, 0, 0); side.push(s); nrm.push(new THREE.Vector3().crossVectors(s, T[i]).normalize()); } }
// threads: cyan and blue on one side, violet in the middle, orange on the other
const colAt = `vec3 colAt(float s, float k){ vec3 c = k < .42 ? mix(${glsl(C.cyan)}, ${glsl(C.blue)}, k / .42) : (k < .78 ? ${glsl(C.violet)} : ${glsl(C.orange)});
  return mix(c, ${glsl(C.violet)}, smoothstep(.7, 1., s) * .45); }`;
{
  const NS = 64, pos = new Float32Array(NS * (SEG + 1) * 3), sa = new Float32Array(NS * (SEG + 1)), ka = new Float32Array(NS * (SEG + 1)), idx = [], v = new THREE.Vector3();
  for (let k = 0; k < NS; k++) { const kk = k / (NS - 1), off = kk - .5, jit = rnd() * 6, amp = .03 + rnd() * .06;
    for (let i = 0; i <= SEG; i++) { const s = i / SEG, w = (1.05 - .4 * Math.exp(-Math.pow((s - .3) / .14, 2))) * (1 - smooth((s - .93) / .07) * .7), tw = s * Math.PI * 5 + Math.sin(s * 12) * .6;
      const o = off * w, c = Math.cos(tw), sn = Math.sin(tw), wob = Math.sin(s * 70 + jit) * amp;
      v.copy(P[i]).addScaledVector(side[i], o * c + wob).addScaledVector(nrm[i], o * sn * .5 + wob * .6);
      const j = k * (SEG + 1) + i; pos.set([v.x, v.y, v.z], j * 3); sa[j] = s; ka[j] = kk; if (i) idx.push(j - 1, j); } }
  const g = geo({ position: [pos, 3], s: [sa, 1], k: [ka, 1] }); g.setIndex(idx);
  const L = new THREE.LineSegments(g, add(`uniform float uT, uPulse, uEnd; attribute float s, k; varying vec3 vC; varying float vA; ${colAt}
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; float head = pow(fract(s * 12. - uT * .2 + k * .43), 10.);
      float pk = exp(-pow((s - uPulse) * 70., 2.)) * step(0., uPulse), en = uEnd * smoothstep(.8, .99, s) * (.5 + .5 * pow(fract(s * 30. - uT * 1.2 + k), 6.));
      vC = colAt(s, k) * (.14 + head * .9 + pk * 3. + en * 1.4) + vec3(1.) * (head * .12 + pk * .8 + en * .3); vA = smoothstep(.0, .04, s) * (1. - smoothstep(.99, 1., s)) * smoothstep(40., 8., -mv.z); }`, LINE_FS));
  L.frustumCulled = false; scene.add(L);
  const NP = 14000, pp = new Float32Array(NP * 3), pr = new Float32Array(NP * 2);
  for (let n = 0; n < NP; n++) { const i = Math.floor(rnd() * SEG), s = i / SEG, kk = rnd(), o = (kk - .5) * 1.2, tw = s * Math.PI * 5 + Math.sin(s * 12) * .6;
    v.copy(P[i]).addScaledVector(side[i], o * Math.cos(tw)).addScaledVector(nrm[i], o * Math.sin(tw) * .5 + (rnd() - .5) * .1); pp.set([v.x, v.y, v.z], n * 3); pr.set([s, kk], n * 2); }
  const Pt = new THREE.Points(geo({ position: [pp, 3], q: [pr, 2] }), add(`uniform float uT, uPix, uPulse, uEnd; attribute vec2 q; varying vec3 vC; varying float vA; ${colAt}
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; float head = pow(fract(q.x * 12. - uT * .2 + q.y * .43), 8.); float tw = pow(fract(q.y * 91.7), 30.) * 2.;
      float pk = exp(-pow((q.x - uPulse) * 60., 2.)) * step(0., uPulse), en = uEnd * smoothstep(.8, .99, q.x);
      vC = colAt(q.x, q.y) * (.35 + head * 1.1 + pk * 3. + en) + vec3(1.) * (tw + pk); vA = .6 * smoothstep(40., 6., -mv.z) * (1. - smoothstep(.99, 1., q.x)); gl_PointSize = (1.1 + tw * 2. + head) * uPix * 7. / -mv.z; }`));
  Pt.frustumCulled = false; scene.add(Pt);
}

// ═════════════ 02 · ANALYZE: a glass globe with the land drawn in points, an orbit, and four small chart cards
const orbits = [];
// ── the scene follows what is being read: role beads on the stream, metric points on the orbit, a tower per project
const react = { roles: [], metrics: [], towers: [] };
{
  const g = new THREE.Group(); g.position.copy(S.orb); g.rotation.set(.32, -.4, .12); scene.add(g); floaters.push({ o: g, spin: .05 });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(S.orbR, 96, 64), new THREE.ShaderMaterial({ uniforms: { cA: { value: C.blue }, cB: { value: C.cyan } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vN, vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 cA, cB; varying vec3 vN, vV; void main(){ float f = pow(1. - abs(dot(vN, vV)), 3.); gl_FragColor = vec4(mix(cA, cB, f) * (f * .55 + .015), 1.); }` })));
  // land: points on a 2.2° grid where the globe is land (from a global land mask), plus a faint ocean grid
  const N = LAND.length, M = 2600, a = new Float32Array((N + M) * 3), r = new Float32Array(N + M), land = new Float32Array(N + M);
  const put = (lat, lon, i, R) => { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; a.set([Math.cos(la) * Math.cos(lo) * R, Math.sin(la) * R, -Math.cos(la) * Math.sin(lo) * R], i * 3); };
  LAND.forEach(([lat, lon], i) => { put(lat, lon, i, S.orbR * 1.003); r[i] = rnd(); land[i] = 1; });
  for (let i = 0; i < M; i++) { const y = 1 - (i + .5) / M * 2, lat = Math.asin(y) * 180 / Math.PI, lon = (i * 137.508) % 360 - 180; put(lat, lon, N + i, S.orbR * .995); r[N + i] = rnd(); land[N + i] = 0; }
  const shell = new THREE.Points(geo({ position: [a, 3], rnd: [r, 1], land: [land, 1] }), add(`uniform float uT, uPix, uGB; attribute float rnd, land; varying vec3 vC; varying float vA;
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; vec3 n = normalize(normalMatrix * position); float face = n.z; float rim = pow(1. - abs(n.z), 2.);
      float tw = pow(rnd, 18.) * (.5 + .5 * sin(uT * 2. + rnd * 40.)) * land; vC = mix(${glsl(C.blue)}, ${glsl(C.cyan)}, land * .7 + rim * .3) + vec3(1.) * tw * 1.4;
      vA = (land * 1.3 + (1. - land) * .12) * smoothstep(-.35, .25, face) + rim * .2; gl_PointSize = (1. + land * 1.5 + tw * 2.) * uPix * 7. / -mv.z;
      // build: points appear in a sweep around the globe, the newest ones flaring as they land
      float lon = (atan(position.z, position.x) + 3.14159) / 6.28318, edge = uGB * 1.2 - .1 - rnd * .08 - lon;
      vA *= step(0., edge); vC += vec3(.6, .9, 1.) * (1. - smoothstep(0., .06, edge)) * step(0., edge) * (1. - step(1., uGB)); }`));
  g.add(shell); g.add(glow(C.blue, 6.6, 6.6, .1));
  { // the construction grid: meridians and parallels, drawn first, then fading as the land arrives
    const L = [], R = S.orbR * 1.012, seg = 96;
    for (let m = 0; m < 12; m++) { const lo = m / 12 * Math.PI * 2; for (let i = 0; i < seg; i++) { const a1 = -Math.PI / 2 + i / seg * Math.PI, a2 = -Math.PI / 2 + (i + 1) / seg * Math.PI;
      L.push(Math.cos(a1) * Math.cos(lo) * R, Math.sin(a1) * R, Math.cos(a1) * Math.sin(lo) * R, Math.cos(a2) * Math.cos(lo) * R, Math.sin(a2) * R, Math.cos(a2) * Math.sin(lo) * R); } }
    for (let pl = 1; pl < 8; pl++) { const la = -Math.PI / 2 + pl / 8 * Math.PI, rr = Math.cos(la) * R, y = Math.sin(la) * R; for (let i = 0; i < seg; i++) { const b1 = i / seg * Math.PI * 2, b2 = (i + 1) / seg * Math.PI * 2;
      L.push(Math.cos(b1) * rr, y, Math.sin(b1) * rr, Math.cos(b2) * rr, y, Math.sin(b2) * rr); } }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(L, 3));
    built.wire = new THREE.LineSegments(wg, basic('#8fdcff', 0)); g.add(built.wire);
  }
  const o = new THREE.Group(); o.position.copy(S.orb); o.rotation.set(1.36, 0, .16); scene.add(o);
  o.add(new THREE.Mesh(new THREE.TorusGeometry(3.25, .007, 6, 260), basic('#a9c8ff', .55)));
  o.add(new THREE.Mesh(new THREE.TorusGeometry(3.9, .004, 6, 260), basic('#a98bff', .28)));
  const d1 = glow(C.orange, .45, .45, .95), d2 = glow(C.cyan, .32, .32, .8); o.add(d1, d2); orbits.push({ r: 3.25, d1, d2, sp: .12 });
  for (let i = 0; i < 4; i++) { const a = .5 + i * Math.PI / 2, m = glow(i === 3 ? C.orange : C.cyan, 1.2, 1.2, 0); m.position.set(Math.cos(a) * 3.25, Math.sin(a) * 3.25, 0); o.add(m); react.metrics.push({ m, v: 0 }); }
  // chart cards: shapes only, no numbers (they stand for the kind of view, not for data)
  const card = (draw, w, h, pos, ry) => { const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const x = c.getContext('2d');
    x.fillStyle = 'rgba(14,22,40,.82)'; x.strokeStyle = 'rgba(170,200,255,.55)'; x.lineWidth = 2; x.beginPath(); x.roundRect(2, 2, c.width - 4, c.height - 4, 22); x.fill(); x.stroke();
    x.fillStyle = 'rgba(200,215,240,.35)'; x.fillRect(28, 26, 90, 8); draw(x, c.width, c.height);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
    m.position.copy(S.orb).add(new THREE.Vector3(...pos)); m.rotation.y = ry; scene.add(m); floaters.push({ o: m, base: m.position.y, ph: rnd() * 6 }); };
  const series = n => { const s = []; let v = .4; for (let i = 0; i < n; i++) { v = clamp(v + (rnd() - .45) * .18, .1, .95); s.push(v); } return s; };
  card((x, W, H) => { const s = series(28), gr = x.createLinearGradient(0, 50, 0, H); gr.addColorStop(0, 'rgba(150,110,255,.6)'); gr.addColorStop(1, 'rgba(150,110,255,0)'); x.beginPath(); x.moveTo(28, H - 26);
    s.forEach((v, i) => x.lineTo(28 + i * (W - 56) / 27, H - 26 - v * (H - 80))); x.lineTo(W - 28, H - 26); x.fillStyle = gr; x.fill(); x.beginPath(); s.forEach((v, i) => x[i ? 'lineTo' : 'moveTo'](28 + i * (W - 56) / 27, H - 26 - v * (H - 80))); x.strokeStyle = '#b9a4ff'; x.lineWidth = 3; x.stroke(); }, 1.9, 1.1, [-3.7, 1.7, -.6], .35);
  card((x, W, H) => { const s = series(9).map((v, i) => .2 + v * .4 + i * .05); s.forEach((v, i) => { const bw = (W - 80) / 9; x.fillStyle = i > 6 ? '#7fe0ff' : '#3f8cff'; x.fillRect(40 + i * bw + 6, H - 26 - v * (H - 80), bw - 12, v * (H - 80)); }); }, 2.0, 1.15, [3.55, 1.75, -.6], -.35);
  card((x, W, H) => { for (let i = 0; i < 46; i++) { const px = 40 + rnd() * (W - 80), py = 60 + rnd() * (H - 90); x.fillStyle = rnd() < .2 ? '#ff9a3c' : 'rgba(127,200,255,.9)'; x.beginPath(); x.arc(px, py, 4, 0, 7); x.fill(); } }, 1.8, 1.05, [-3.5, -1.9, -.3], .3);
  card((x, W, H) => { const cx = 120, cy = H / 2 + 14, R = Math.min(70, H / 2 - 30); x.lineWidth = 18; [[0, 2.2, '#47c6ff'], [2.3, 3.9, '#8a5cff'], [4, 5.6, '#2a5cff']].forEach(([a0, a1, c]) => { x.strokeStyle = c; x.beginPath(); x.arc(cx, cy, R, a0, a1); x.stroke(); });
    for (let i = 0; i < 4; i++) { x.fillStyle = ['#47c6ff', '#8a5cff', '#2a5cff', '#ff9a3c'][i]; x.fillRect(230, cy - 46 + i * 28, 10, 10); x.fillStyle = 'rgba(200,215,240,.4)'; x.fillRect(252, cy - 44 + i * 28, 150 - i * 20, 6); } }, 1.95, 1.15, [3.6, -1.8, -.3], -.3);
}

// ═════════════ 03 · BUILD: three glass plates (orange bars, cyan bars, a circuit), and the tools around them
// where each scene sits along the stream (0 = where the waves meet, 1 = the L//IOS screen)
const sNear = t => { let bi = 0, bd = 1e9; P.forEach((q, i) => { const d = q.distanceToSquared(t); if (d < bd) { bd = d; bi = i; } }); return bi / SEG; };
const ST_S = [.03, sNear(S.orb), sNear(new THREE.Vector3(S.px, 0, .8)), .985];
const pulse = { t0: -1, from: 0, to: 0 }, firePulse = k => { pulse.t0 = performance.now(); pulse.to = ST_S[k]; pulse.from = Math.max(0, ST_S[k] - .16); };
// seven role beads on the stretch of stream that wraps the globe
for (let i = 0; i < 7; i++) { const sv = ST_S[1] - .075 + i / 6 * .15, q = P[Math.round(sv * SEG)], hal = glow(C.cyan, 1.5, 1.5, 0), core = glow('#ffffff', .32, .32, 0);
  hal.position.copy(q); core.position.copy(q); scene.add(hal, core); react.roles.push({ hal, core, v: 0 }); }
const plates = [];
{
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#0f1a2e', metalness: 0, roughness: .08, transparent: true, opacity: .26, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const W = 5.4, D = 3.4;
  const circuit = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 640; const x = c.getContext('2d'); x.lineWidth = 3; x.lineCap = 'round';
    for (let i = 0; i < 46; i++) { let px = rnd() * 1024, py = rnd() * 640; x.strokeStyle = rnd() < .45 ? 'rgba(255,150,70,.9)' : 'rgba(110,200,255,.8)'; x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 4; k++) { if (k % 2) px += (rnd() - .5) * 260; else py += (rnd() - .5) * 200; x.lineTo(px, py); } x.stroke(); x.fillStyle = x.strokeStyle; x.beginPath(); x.arc(px, py, 6, 0, 7); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  S.plates.forEach((y, li) => {
    const g = new THREE.Group(); g.position.set(S.px, y, 0); g.rotation.y = -.5; scene.add(g);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(W, .06, D), glassM));
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, .06, D)), new THREE.LineBasicMaterial({ color: li === 2 ? '#ffb27a' : '#b4d6ff', transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false })));
    const sheen = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ map: li === 2 ? circuit : dotTex, color: li === 2 ? '#ffffff' : '#3a7cff', transparent: true, opacity: li === 2 ? .55 : .16, blending: THREE.AdditiveBlending, depthWrite: false }));
    sheen.rotation.x = -Math.PI / 2; sheen.position.y = .035; g.add(sheen);
    if (li < 2) {
      const NX = 14, NZ = 2, N = NX * NZ, bars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }), N);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(), x0 = li === 0 ? .4 : -1.6;
      for (let i = 0, k = 0; i < NX; i++) for (let j = 0; j < NZ; j++, k++) { const h = .12 + Math.pow(rnd(), 1.5) * (.3 + .55 * (i / NX)), x = x0 + (i / (NX - 1) - .5) * 2.2, z = (j - .5) * .42 - .6;
        m.compose(new THREE.Vector3(x, .03 + h / 2, z), q, new THREE.Vector3(.11, h, .11)); bars.setMatrixAt(k, m); col.copy(li === 0 ? C.orange : C.cyan).multiplyScalar(.7 + h); bars.setColorAt(k, col); }
      g.add(bars); built.bars.push({ bars, li });
    }
    plates.push({ g });
    if (li === 2) { const n = document.querySelectorAll('.proj li').length;
      for (let i = 0; i < n; i++) { const h = .35 + ((i * 37) % 11) / 11 * .75, t = new THREE.Mesh(new THREE.BoxGeometry(.12, 1, .12), new THREE.MeshBasicMaterial({ color: i % 3 === 2 ? C.orange : C.cyan, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
        t.position.set((i / Math.max(1, n - 1) - .5) * 4.2, .04, .95); t.scale.y = .001; g.add(t); react.towers.push({ t, h, v: 0 }); } }
  });
  // the tools: six tiles with line icons, three on each side
  const icon = draw => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.fillStyle = 'rgba(14,22,40,.85)'; x.strokeStyle = 'rgba(170,200,255,.6)'; x.lineWidth = 3; x.beginPath(); x.roundRect(4, 4, 248, 248, 36); x.fill(); x.stroke();
    x.strokeStyle = '#d6ecff'; x.fillStyle = '#d6ecff'; x.lineWidth = 9; x.lineCap = 'round'; x.lineJoin = 'round'; x.translate(128, 128); draw(x);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const ICONS = [
    x => { for (const dy of [-26, 0, 26]) { x.beginPath(); x.moveTo(-50, dy); x.lineTo(0, dy - 22); x.lineTo(50, dy); x.lineTo(0, dy + 22); x.closePath(); x.stroke(); } },       // layers
    x => { x.beginPath(); x.moveTo(-26, -40); x.lineTo(-62, 0); x.lineTo(-26, 40); x.moveTo(26, -40); x.lineTo(62, 0); x.lineTo(26, 40); x.moveTo(12, -54); x.lineTo(-12, 54); x.stroke(); }, // code
    x => { x.beginPath(); x.arc(0, 0, 20, 0, 7); x.stroke(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; x.beginPath(); x.moveTo(Math.cos(a) * 38, Math.sin(a) * 38); x.lineTo(Math.cos(a) * 56, Math.sin(a) * 56); x.stroke(); } x.beginPath(); x.arc(0, 0, 40, 0, 7); x.stroke(); }, // gear
    x => { const P2 = [[0, -46], [-46, 30], [46, 30], [0, 6]]; x.beginPath(); [[0, 3], [1, 3], [2, 3], [0, 1], [0, 2]].forEach(([a, b]) => { x.moveTo(...P2[a]); x.lineTo(...P2[b]); }); x.stroke(); P2.forEach(p => { x.beginPath(); x.arc(p[0], p[1], 11, 0, 7); x.fill(); }); }, // nodes
    x => { x.beginPath(); x.ellipse(0, -40, 46, 14, 0, 0, 7); x.stroke(); x.beginPath(); x.moveTo(-46, -40); x.lineTo(-46, 40); x.ellipse(0, 40, 46, 14, 0, Math.PI, 0, true); x.lineTo(46, -40); x.stroke(); x.beginPath(); x.ellipse(0, 0, 46, 14, 0, 0, Math.PI); x.stroke(); }, // database
    x => { x.beginPath(); x.moveTo(12, -62); x.lineTo(-34, 8); x.lineTo(2, 8); x.lineTo(-10, 62); x.lineTo(36, -10); x.lineTo(0, -10); x.closePath(); x.stroke(); },                         // bolt
  ];
  ICONS.forEach((d, i) => { const left = i < 3, row = i % 3, m = new THREE.Mesh(new THREE.PlaneGeometry(.85, .85), new THREE.MeshBasicMaterial({ map: icon(d), transparent: true, depthWrite: false, toneMapped: false }));
    m.position.set(S.px + (left ? -4.3 : 4.2), S.plates[0] + .5 - row * 1.35, .6); m.rotation.y = left ? .25 : -.25; scene.add(m); floaters.push({ o: m, base: m.position.y, ph: i * 1.3 });
    const gl2 = glow(C.cyan, 1.6, 1.6, .08); gl2.position.copy(m.position).add(new THREE.Vector3(0, 0, -.05)); scene.add(gl2); });
}

// ═════════════ 04 · L//IOS: a glass screen on a pedestal of light, the real screens on it
const screenCanvas = document.createElement('canvas'); screenCanvas.width = 2048; screenCanvas.height = 1280;
const screenTex = new THREE.CanvasTexture(screenCanvas); screenTex.colorSpace = THREE.SRGBColorSpace; screenTex.anisotropy = 4;
const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, color: '#ffffff', toneMapped: false, depthTest: false, depthWrite: false });
// the screen is drawn after the glow pass, so its text stays sharp instead of blooming like the light streams
const screenScene = new THREE.Scene(), screenTop = [];
const ripples = [];
{
  const g = new THREE.Group(); g.position.copy(S.tab); g.rotation.set(-.3, -.22, 0); scene.add(g);
  const W = 5.6, H = 3.5;
  const body = new THREE.Mesh(new THREE.BoxGeometry(W + .24, H + .24, .1), new THREE.MeshBasicMaterial({ color: '#0b1222', transparent: true, opacity: .6, depthWrite: false })); body.position.z = -.06; g.add(body);
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W + .24, H + .24, .1)), new THREE.LineBasicMaterial({ color: '#b8a4ff', transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false })));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ color: '#05080f' })); face.position.z = .002; g.add(face);
  const faceTop = new THREE.Mesh(face.geometry, screenMat); faceTop.matrixAutoUpdate = false; screenScene.add(faceTop); screenTop.push([face, faceTop]);
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec2 vU; void main(){ float s = smoothstep(.0, .5, vU.y - vU.x * .45 + .1) * (1. - smoothstep(.5, 1., vU.y - vU.x * .45 + .1)); gl_FragColor = vec4(vec3(.06, .08, .12) * s, 1.); }` }));
  sheen.material.depthTest = false; sheen.position.z = .006; g.add(sheen); sheen.visible = false;
  const sheenTop = new THREE.Mesh(sheen.geometry, sheen.material); sheenTop.matrixAutoUpdate = false; screenScene.add(sheenTop); screenTop.push([sheen, sheenTop]);
  const top = glow(C.cyan, 3.2, .7, .08); top.position.set(0, H / 2 + .1, .05); g.add(top);
  // pedestal
  const p = new THREE.Group(); p.position.set(S.tab.x, S.ped, 0); scene.add(p);
  const Rp = 3.9, Hp = .42;
  p.add(new THREE.Mesh(new THREE.CylinderGeometry(Rp, Rp, Hp, 160), new THREE.MeshPhysicalMaterial({ color: '#0e1830', roughness: .1, transparent: true, opacity: .3, clearcoat: 1, depthWrite: false })));
  for (const [y, c, o, r] of [[Hp / 2, C.violet, .95, Rp], [-Hp / 2, C.cyan, .7, Rp], [Hp / 2 + .01, C.cyan, .3, Rp * .8]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, .014, 8, 240), basic(c, o)); t.rotation.x = Math.PI / 2; t.position.y = y; p.add(t); }
  const pool = new THREE.Mesh(new THREE.CircleGeometry(5.5, 64), new THREE.MeshBasicMaterial({ map: dotTex, color: '#5a5cff', transparent: true, opacity: .4, blending: THREE.AdditiveBlending, depthWrite: false })); pool.rotation.x = -Math.PI / 2; pool.position.y = -Hp / 2 - .02; p.add(pool);
  const hot = glow('#ffb47a', 3, 1, .55); hot.position.set(0, Hp / 2 + .05, .8); p.add(hot);
  for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(.985, 1, 200), basic(C.cyan, .2, { side: THREE.DoubleSide })); r.rotation.x = -Math.PI / 2; r.position.y = -Hp / 2 - .01; p.add(r); ripples.push(r); }
  const wide = new THREE.Mesh(new THREE.RingGeometry(6.6, 6.63, 256), basic('#8aa8ff', .3, { side: THREE.DoubleSide })); wide.rotation.x = -Math.PI / 2; wide.position.y = -Hp / 2 - .02; p.add(wide);
}

// ── the real L//IOS screens on the glass
const cache = {};
const loadImg = src => cache[src] ??= new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = shot(src); });
let screenPulse = 0;
const fullCanvas = document.createElement('canvas'); fullCanvas.width = screenCanvas.width; fullCanvas.height = screenCanvas.height;
const scr = { p: 1, dur: 1, t: -1 };
function drawScreen(p) {   // p: 0 → 1, how much of the screen has rendered
  const x = screenCanvas.getContext('2d'), W = screenCanvas.width, H = screenCanvas.height, y = Math.round(p * H);
  x.fillStyle = '#05080f'; x.fillRect(0, 0, W, H);
  if (p < 1) { x.strokeStyle = 'rgba(111,211,242,.18)'; x.lineWidth = 1; for (let gx = 0; gx <= W; gx += 64) { x.beginPath(); x.moveTo(gx + .5, 0); x.lineTo(gx + .5, H); x.stroke(); }
    for (let gy = 0; gy <= H; gy += 64) { x.beginPath(); x.moveTo(0, gy + .5); x.lineTo(W, gy + .5); x.stroke(); } }
  if (y > 0) x.drawImage(fullCanvas, 0, 0, W, y, 0, 0, W, y);
  if (p < 1) { const gr = x.createLinearGradient(0, y - 90, 0, y); gr.addColorStop(0, 'rgba(111,211,242,0)'); gr.addColorStop(1, 'rgba(111,211,242,.35)'); x.fillStyle = gr; x.fillRect(0, y - 90, W, 90);
    x.fillStyle = 'rgba(220,245,255,.95)'; x.fillRect(0, y - 3, W, 4); }
  screenTex.needsUpdate = true;
}
async function paintScreen(app) {
  const Sx = lios.pillars[app].shots, x = fullCanvas.getContext('2d'), W = fullCanvas.width, H = fullCanvas.height;
  x.fillStyle = '#07090d'; x.fillRect(0, 0, W, H);
  if (Sx[0].device !== 'phone') { const im = await loadImg(Sx[0].src); if (im) x.drawImage(im, 0, 0, W, W * im.height / im.width); }
  else { const ph = H * .9, pw = ph * 540 / 1170, gap = pw * .22, n = 3, x0 = (W - (n * pw + (n - 1) * gap)) / 2;
    for (let j = 0; j < n; j++) { const im = await loadImg(Sx[j % Sx.length].src); if (!im) continue; const dx = x0 + j * (pw + gap); x.save(); x.beginPath(); x.roundRect(dx, H * .05, pw, ph, 30); x.clip(); x.drawImage(im, dx, H * .05, pw, ph); x.restore(); } }
  // the first paint waits for the camera to arrive and builds slowly; later tab changes re-render quickly
  if (BUILD[3].t < 0 && !reduce) { scr.p = 0; drawScreen(0); } else { scr.dur = reduce ? 0 : .9; scr.t = reduce ? -1 : performance.now(); scr.p = reduce ? 1 : 0; drawScreen(scr.p); }
  screenPulse = 1;
}
(function tabs() {
  const el = document.querySelector('.apps'); el.innerHTML = lios.pillars.map((p, i) => `<button role="tab" type="button" aria-selected="${i === 0}" tabindex="${i ? -1 : 0}">${p.short}<i>${p.status}</i></button>`).join('');
  const tb = [...el.children];
  const pick = i => { const p = lios.pillars[i], s = p.shots[0];
    tb.forEach((b, k) => { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    $('lx-line').textContent = `${p.name} · ${p.line}`; $('lx-proof').innerHTML = p.proof.slice(0, 3).map(t => `<li>${t.replace(/</g, '&lt;')}</li>`).join('');
    $('lx-cap').textContent = `On the screen: ${s.alt}. ${s.caption}`; paintScreen(i); };
  tb.forEach((b, i) => { b.addEventListener('click', () => pick(i));
    b.addEventListener('keydown', e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; e.preventDefault(); const n = (i + d + tb.length) % tb.length; tb[n].focus(); pick(n); }); });
  pick(0);
})();

// ── camera: it follows the stream down. One key per section; between keys the camera keeps descending
const KEYS = {
  d: [{ c: [-.4, 2.3, 15], t: [.4, .9, 0] }, { c: [20.2, .9, 13.5], t: [20.6, 0, 0] }, { c: [40.2, 2.8, 13.5], t: [40.6, -.3, 0] }, { c: [60.2, 1.4, 12.5], t: [60.6, -.4, 0] }],
  m: [{ c: [2, 1, 22], t: [2, 2.8, 0] }, { c: [S.orb.x, .6, 21], t: [S.orb.x, 3, 0] }, { c: [S.px, 2, 20], t: [S.px, 3.4, 0] }, { c: [S.tab.x, .4, 19], t: [S.tab.x, 3.4, 0] }],
};
const secs = ['explore', 'analyze', 'build', 'lios'].map($), allSecs = $$('main > section');
// scroll → journey. Each scene holds while its chapter is read (the camera drifts on slowly), then travels to the next scene.
const J = { g: 0, d: 0 };
function journey() {
  const vh = innerHeight, y = scrollY + vh * .5, c = secs.map(s => s.offsetTop + Math.min(s.offsetHeight, vh) * .5), end = document.documentElement.scrollHeight - vh * .5;
  if (y <= c[0]) return (J.g = 0, J.d = 0, J);
  for (let k = 0; k < 3; k++) { const s0 = Math.max(c[k] + 1, secs[k + 1].offsetTop - vh * 1.05);
    if (y < s0) return (J.g = k, J.d = clamp((y - c[k]) / (s0 - c[k])), J);
    if (y < c[k + 1]) return (J.g = k + (y - s0) / (c[k + 1] - s0), J.d = 0, J); }
  return (J.g = 3, J.d = clamp((y - c[3]) / Math.max(1, end - c[3])), J);
}
const target = () => journey().g;
const v3 = new THREE.Vector3(), pc = new THREE.Vector3(), pt = new THREE.Vector3(), ptr = { x: 0, y: 0, tx: 0, ty: 0 };
const ease = t => (t = clamp(t), t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const DRIFT = 2.6;
function pose(g, d) {
  const K = KEYS[PORTRAIT() ? 'm' : 'd'], i = Math.min(2, Math.floor(g)), f = ease(g - i), a = K[i], b = K[i + 1];
  pc.set(...a.c).lerp(v3.set(...b.c), f); pt.set(...a.t).lerp(v3.set(...b.t), f);
  // while a chapter is read the camera keeps drifting along the stream; the next leg starts from where the drift left off
  const off = (g % 1 > 1e-4 && g < 3 ? 1 - f : d) * DRIFT; pc.x += off; pt.x += off;
  // while a section is read, the scene slides right, into the space beside the text, so its reactions stay in view
  const sh = PORTRAIT() ? 0 : 4.4 * dimV; pc.x -= sh; pt.x -= sh;
  // a gentle arc on the way down, so the camera swings past the stream rather than sliding
  pc.y += Math.sin(f * Math.PI) * .9; pc.z += Math.sin(f * Math.PI) * 2.2;   // lift and pull back a little while travelling along the stream
  camera.position.copy(pc); camera.position.x += ptr.x * .6; camera.position.y -= ptr.y * .35; camera.lookAt(pt);
}
function resize() {
  const w = innerWidth, h = innerHeight; camera.aspect = w / h;
  camera.fov = w / h < 1 ? Math.min(64, 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(44) / 2) / (w / h) * .6) * 180 / Math.PI) : 40; camera.updateProjectionMatrix();
  U.uPix.value = h * dpr / 900 * 1.6;
  if (!renderer) return; renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); composer.setPixelRatio(dpr); composer.setSize(w, h);
}

// ── page bits: reveals, the index menu, anchors, the stepper
const rv = $$('.sc .copy'); rv.forEach(e => e.classList.add('reveal'));
const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('in', e.isIntersecting)), { threshold: .2 }); rv.forEach(e => io.observe(e));
const io2 = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io2.unobserve(e.target); } }), { threshold: .08 }); $$('.cs .reveal').forEach(e => io2.observe(e));
// ── the build: the first time a section comes into view it is drawn as a blueprint (each block outlined and
// labelled with its real size), a cursor places the blocks in reading order, and the content fills in.
if (!reduce && 'IntersectionObserver' in window) {
  root.classList.add('bp');
  const SEL = '.cs-head h2, .cs-head .lede, .two > *, .arc, .xp-row, .edu, .metrics li, .case, .legend, .kit > section, .proj li, .principles li, .pillar, .tech, .cs .links, .contact-links li, #lab-root';
  const NAME = el => el.matches('h2') ? 'heading' : el.matches('.lede') ? 'intro' : el.matches('.prose') ? 'text' : el.matches('.why') ? 'quote' : el.matches('.arc') ? 'timeline'
    : el.matches('.xp-row') ? 'role' : el.matches('.edu') ? 'education' : el.matches('.metrics li') ? 'metric' : el.matches('.case') ? 'case study' : el.matches('.legend') ? 'legend'
    : el.matches('.kit > section') ? 'skills' : el.matches('.proj li') ? 'project' : el.matches('.principles li') ? 'principle' : el.matches('.loop') ? 'loop' : el.matches('.pillar') ? 'app'
    : el.matches('.lphilo, .roadmap') || el.querySelector('.lphilo, .roadmap') ? 'list' : el.matches('.tech') ? 'stack' : el.matches('.links') ? 'links' : el.matches('.contact-links li') ? 'contact'
    : el.matches('#lab-root') ? 'lab' : 'block';
  $$('.cs').forEach(sec => sec.querySelectorAll(SEL).forEach(el => el.classList.add('bp-b')));
  const build = sec => { firePulse(+sec.dataset.station); setTimeout(() => buildNow(sec), 280); };
  // about a second per section: the first few blocks are drawn as blueprints and placed by the cursor; the rest fade straight in
  const BLUEPRINTS = 4;
  const buildNow = sec => {
    const blocks = [...sec.querySelectorAll('.bp-b')].filter(b => !b.classList.contains('bp-in')), drawn = blocks.slice(0, BLUEPRINTS), rest = blocks.slice(BLUEPRINTS);
    const cur = document.createElement('div'); cur.className = 'bp-cur'; cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<svg viewBox="0 0 16 20" width="16" height="20"><path d="M1 1l13 10-6 1.2L5.4 19z"/></svg><b></b>'; sec.appendChild(cur);
    const tag = cur.querySelector('b'), step = 150;
    drawn.forEach((b, i) => setTimeout(() => {
      const r = b.getBoundingClientRect(), sr = sec.getBoundingClientRect(), x = r.left - sr.left, y = r.top - sr.top;
      const box = document.createElement('div'); box.className = 'bp-box'; box.setAttribute('aria-hidden', 'true');
      box.style.cssText = `left:${x}px;top:${y}px;width:${r.width}px;height:${r.height}px`;
      box.innerHTML = `<i></i><i></i><i></i><i></i><span class="bp-lab">${NAME(b)}</span>`; sec.appendChild(box);
      cur.style.transform = `translate(${x + Math.min(r.width - 10, 26)}px, ${y + Math.min(r.height - 8, 18)}px)`; tag.textContent = NAME(b);
      setTimeout(() => b.classList.add('bp-in'), 180);
      setTimeout(() => { box.classList.add('out'); setTimeout(() => box.remove(), 600); }, 520);
      if (i === drawn.length - 1) setTimeout(() => { cur.classList.add('out'); setTimeout(() => cur.remove(), 500); }, 480);
    }, i * step));
    rest.forEach((b, i) => setTimeout(() => b.classList.add('bp-in'), drawn.length * step + 60 + Math.min(i * 45, 400)));
  };

  // a section builds once its top is a quarter of the way up the screen; a fraction-of-section threshold never fires on a tall section on a phone
  const bo = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { bo.unobserve(e.target); build(e.target); } }), { threshold: 0, rootMargin: '0px 0px -25% 0px' });
  $$('.cs').forEach(sec => bo.observe(sec));
  // safety net: any block that sits on screen without having been built shows itself after a moment
  const bb = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { bb.unobserve(e.target); setTimeout(() => e.target.classList.add('bp-in'), 1400); } }), { threshold: 0 });
  $$('.bp-b').forEach(b => bb.observe(b));
  // anything left hidden (a jump far down the page, a section never scrolled through) still shows: never hold content back
  addEventListener('hashchange', () => $$('.bp-b').forEach(b => b.classList.add('bp-in')));
}
const menu = $('menu'), idx = $('index');
const setMenu = o => { idx.hidden = !o; menu.setAttribute('aria-expanded', String(o)); if (o) idx.querySelector('a').focus(); };
menu.addEventListener('click', e => { e.stopPropagation(); setMenu(idx.hidden); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !idx.hidden) { setMenu(false); menu.focus(); } });
addEventListener('click', e => { if (!idx.hidden && !idx.contains(e.target)) setMenu(false); });
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => { const t = document.querySelector(a.getAttribute('href')); if (!t) return; e.preventDefault(); if (!idx.hidden) setMenu(false);
  t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); history.replaceState(null, '', a.getAttribute('href')); }));
const steps = $$('#steps a'), navA = $$('.nav a');
const RD = { roles: $$('.xp-row'), metrics: $$('.metrics li'), projs: $$('.proj li'), contact: $('contact') };
const seen = list => { const line = innerHeight * .62; let n = 0; for (const el of list) if (el.getBoundingClientRect().top < line) n++; return n; };
let lastSec = null, veilV = 0, dimV = 0, dd = 0;
// the real Intelligence Lab from the live site, mounted when its section comes near
{ const el = $('lab-root'); let done = false; const mount = () => { if (done) return; done = true; el.innerHTML = ''; createRoot(el).render(createElement(AnalystLab)); };
  if (location.hash === '#lab' || !('IntersectionObserver' in window)) mount();
  else { const o = new IntersectionObserver(([x]) => { if (x.isIntersecting) { o.disconnect(); mount(); } }, { rootMargin: '900px 0px' }); o.observe(el); } }

// ── the loop
let g = 0, time = 0, last = performance.now(), running = false, slow = 0;
function frame(dt) {
  const jt = journey(), gT = jt.g, k = Math.pow(.012, dt); g = reduce ? gT : gT + (g - gT) * k; if (Math.abs(g - gT) < 1e-4) g = gT; dd = reduce ? jt.d : jt.d + (dd - jt.d) * k;
  time = reduce ? 16 : time + dt; U.uT.value = time;
  ptr.x += (ptr.tx - ptr.x) * (1 - Math.pow(.04, dt)); ptr.y += (ptr.ty - ptr.y) * (1 - Math.pow(.04, dt));
  orbits.forEach(o => { const a = time * o.sp * 3; o.d1.position.set(Math.cos(a) * o.r, Math.sin(a) * o.r, 0); o.d2.position.set(Math.cos(a + 2.6) * o.r, Math.sin(a + 2.6) * o.r, 0); });
  plates.forEach((p, li) => p.g.position.y = S.plates[li] + (reduce ? 0 : Math.sin(time * .5 + li) * .04));
  waveUpd.forEach(f => f(time));
  floaters.forEach(f => { if (f.spin) f.o.rotation.y = -.4 + time * f.spin; else f.o.position.y = f.base + (reduce ? 0 : Math.sin(time * .6 + f.ph) * .06); });
  ripples.forEach((r, i) => { const f = (time * .08 + i / ripples.length) % 1; r.scale.setScalar(1 + f * 6); r.material.opacity = .22 * (1 - f); });
  // the stream's packet, then what the reader has reached: lights accumulate and stay lit
  if (pulse.t0 > 0) { const q = (performance.now() - pulse.t0) / 480; U.uPulse.value = q < 1 ? pulse.from + (pulse.to - pulse.from) * ease(q) : -1; if (q >= 1) pulse.t0 = -1; }
  { const kr = reduce ? 1 : 1 - Math.pow(.015, dt), nr = seen(RD.roles), nm = seen(RD.metrics), np = seen(RD.projs), ct = RD.contact.getBoundingClientRect().top < innerHeight * .7 ? 1 : 0;
    react.roles.forEach((r, i) => { r.v += ((i < nr ? 1 : 0) - r.v) * kr; r.hal.material.opacity = r.v; r.core.material.opacity = r.v; r.hal.scale.setScalar(.5 + r.v * .5 + (reduce ? 0 : Math.sin(time * 2 + i) * .06 * r.v)); });
    react.metrics.forEach((r, i) => { r.v += ((i < nm ? 1 : 0) - r.v) * kr; r.m.material.opacity = r.v; r.m.scale.setScalar((.3 + r.v * .9) * (1 + (reduce ? 0 : .12 * Math.sin(time * 2.4 + i)))); });
    react.towers.forEach((r, i) => { r.v += ((i < np ? 1 : 0) - r.v) * kr; r.t.scale.y = Math.max(.001, r.v * r.h); r.t.position.y = .04 + r.t.scale.y / 2; });
    U.uEnd.value += (ct - U.uEnd.value) * kr; if (ct) screenPulse = Math.max(screenPulse, .35 + .25 * Math.sin(time * 2)); }
  screenPulse *= Math.pow(.03, dt); screenMat.color.setScalar(.84 + screenPulse * .16);
  pose(g, dd);
  const now = performance.now(), st0 = Math.round(g);
  if (Math.abs(g - st0) < .3 && BUILD[st0].t < 0) { BUILD[st0].t = now; if (st0 === 3) { scr.dur = 1.8; scr.t = now; } }
  BUILD.forEach(b => { b.v = reduce ? 1 : b.t < 0 ? 0 : clamp((now - b.t) / 1000 / b.dur); });
  U.uGB.value = BUILD[1].v; built.wire.material.opacity = .5 * smooth(BUILD[1].v * 4) * (1 - smooth((BUILD[1].v - .55) / .45)) + .04 * BUILD[1].v;
  built.bars.forEach(({ bars, li }) => { bars.scale.y = Math.max(.001, ease(clamp(BUILD[2].v * 1.5 - li * .35))); });
  if (scr.t > 0) { scr.p = clamp((now - scr.t) / 1000 / scr.dur); drawScreen(ease(scr.p)); if (scr.p >= 1) scr.t = -1; }
  // which section is being read: content sections dim the scene, the L//IOS panel gets its side shade
  const yc = scrollY + innerHeight * .5; let cur = allSecs[0]; for (const sc of allSecs) if (sc.offsetTop <= yc) cur = sc;
  const kd = reduce ? 0 : Math.pow(.02, dt), isCs = cur.classList.contains('cs');
  dimV = (isCs ? 1 : 0) + (dimV - (isCs ? 1 : 0)) * kd; veilV = (cur.id === 'lios' ? 1 : 0) + (veilV - (cur.id === 'lios' ? 1 : 0)) * kd;
  $('dim').style.opacity = dimV.toFixed(3); $('veil').style.opacity = veilV.toFixed(3);
  if (cur !== lastSec) { lastSec = cur; const st = +cur.dataset.station; steps.forEach((s, i) => s.setAttribute('aria-current', String(i === st)));
    let set = false; navA.forEach(a => { const on = !set && (a.getAttribute('href') === '#' + cur.id || (+a.dataset.st === st && !navA.some(b => b.getAttribute('href') === '#' + cur.id))); if (on) set = true; on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'); }); }
  if (renderer) { composer.render(dt);
    screenTop.forEach(([a, b]) => { a.parent.updateWorldMatrix(true, false); a.updateMatrix(); b.matrix.multiplyMatrices(a.parent.matrixWorld, a.matrix); b.matrixWorld.copy(b.matrix); });
    renderer.autoClear = false; renderer.render(screenScene, camera); renderer.autoClear = true; }
}
function loop(now) {
  const dt = clamp((now - last) / 1000, 0, .1); last = now; frame(dt);
  if (dt > .045) { if (++slow > 40 && dpr > 1) { dpr = Math.max(1, dpr - .25); slow = 0; resize(); } } else slow = Math.max(0, slow - 1);
  if (!document.hidden && !window.__manual) requestAnimationFrame(loop); else running = false;
}
function wake() { if (running || window.__manual) return; running = true; last = performance.now(); requestAnimationFrame(loop); }
document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
addEventListener('pointermove', e => { if (reduce) return; ptr.tx = e.clientX / innerWidth - .5; ptr.ty = e.clientY / innerHeight - .5; }, { passive: true });
addEventListener('resize', resize);
canvas.setAttribute('aria-label', 'One stream of light winds across a landscape of data, wraps a glass sphere, weaves through glass plates of bars and flows into a screen showing L//IOS.');
window.__step = (ms = 16, n = 1) => { for (let i = 0; i < n; i++) frame(ms / 1000); };
window.__api = { state: () => ({ g, target: target(), drift: dd, sec: lastSec && lastSec.id, dpr, gl: !!renderer }) };
resize(); frame(0); wake();
