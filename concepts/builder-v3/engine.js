/**
 * Ryan Law, the builder: the engine behind chapters 01 and 02.
 * One unit, the record tile, rearranged. One instanced draw; every tile keeps its identity through six arrangements,
 * and the GPU interpolates between them on scroll (damped, reversible):
 *   0  the sculpture      a stack of glass blocks, each filled with records and lit from within: structure and possibility
 *   1  complexity         the floors come apart into a dense, layered information system
 *   2  understanding      related records sort themselves into bands; two of them stand out
 *   3  simplification     everything else recedes; what matters tightens into one clean grid
 *   4  building           that grid becomes a working system: rules run, exceptions are held and resolved
 *   5  improvement        the result: 95% of the manual reporting effort freed and redeployed (a real figure)
 */
import { GL, V2, V3, boxGeometry, lookAt, perspective, project } from './gl.js';

const root = document.documentElement;
const reduce = root.classList.contains('rm');
const MOB = innerWidth < 760;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const ease = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const V = (x, y, z) => new V3(x, y, z);

// ── record counts and layouts
const N = MOB ? 5000 : 12000;
// 0 · the sculpture: glass blocks stacked like a small skyline; [grid x, grid z, level, size] in block units
const GU = MOB ? .92 : 1.3, SY = MOB ? -.55 : -1.95, HX = MOB ? .1 : -.35, HZ = MOB ? 0 : -.4;
const CUBES = [
  [-1, 0, 0, 1], [0, 0, 0, 1], [1, 0, 0, 1], [-1, -1, 0, 1], [0, -1, 0, 1], [1, -1, 0, 1], [2, -1, 0, 1], [-2, .1, 0, .62], [1.9, .45, 0, .5],
  [0, 0, 1, 1], [-1, -1, 1, 1], [0, -1, 1, 1], [1, -1, 1, 1], [.5, -.5, 2, 1], [0, -1, 2.35, .7], [-1.15, .15, 1.2, .55], [2.05, -1, 1, .62],
].map(([gx, gz, lv, k]) => { const sz = GU * .96 * k; return [HX + gx * GU, SY + lv * GU + sz / 2, HZ + gz * GU, sz]; });
const STOP = Math.max(...CUBES.map(c => c[1] + c[3] / 2)) - SY;            // height of the stack
const CORE = [HX + .15, SY + GU * .9, HZ - .55];                            // where the light sits
// 2 · understanding: a matrix sorted into six bands (columns per band)
const U = MOB ? { C: 25, R: 40, L: 5, sx: .15, sy: .08, sz: .9, bands: [5, 4, 4, 5, 4, 3], gap: .22 } : { C: 60, R: 40, L: 5, sx: .17, sy: .08, sz: .9, bands: [12, 9, 12, 9, 9, 9], gap: .32 };
const KEEP = [1, 3];                                   // the two bands that matter
// 3–4 · the kept records as one clean grid, which becomes the machine
const K = MOB ? { C: 20, R: 30, L: 3, sx: .17, sy: .09, sz: .9 } : { C: 40, R: 30, L: 3, sx: .2, sy: .095, sz: .9 };
const KN = K.C * K.R * K.L;
const KW = (K.C - 1) * K.sx, KH = (K.R - 1) * K.sy;
const BLOCK = MOB ? 4 : 5;
const QC = MOB ? 3 : 5, QX = MOB ? .15 : .17, QY = .075, Q0 = KW / 2 + (MOB ? .45 : .7);
// 5 · the result: one column, 100 rows = the manual reporting effort before automation
const PER = N / 100, CX = MOB ? 25 : 40, CZ = PER / CX;
const CP = MOB ? .05 : .046, RH = MOB ? .036 : .043, CDZ = .07;
const CW = CX * CP, CH = 100 * RH;
const WX = MOB ? .9 : 4.6, WY = MOB ? -.2 : -1.3, WZ = MOB ? 3.2 : 3.4;
// 1 · complexity: tables of records at different levels
const AP = MOB ? { x: .15, z: .09 } : { x: .165, z: .09 };
const SLABS = (MOB ? [
  { x: 0, y: -1.9, z: 0, cols: 26, w: 2.6, levels: 2 }, { x: -.9, y: -1.05, z: -1.4, cols: 18, w: 1.3 }, { x: 1.1, y: -.25, z: -.3, cols: 15, w: 1.1 },
  { x: -.4, y: .55, z: -2.2, cols: 22, w: 1.3, levels: 2 }, { x: 1.0, y: 1.35, z: -1.2, cols: 12, w: .7 }, { x: -1.2, y: 1.0, z: .9, cols: 10, w: .6 }, { x: .2, y: 2.15, z: -.4, cols: 14, w: .8 },
] : [
  { x: 0, y: -1.75, z: 0, cols: 64, w: 3.0, levels: 2 }, { x: -2.7, y: -.9, z: -1.3, cols: 40, w: 1.6 }, { x: 2.5, y: -.1, z: -.4, cols: 34, w: 1.4 },
  { x: -.7, y: .65, z: -2.7, cols: 50, w: 1.6, levels: 3 }, { x: 3.3, y: 1.4, z: -2.1, cols: 26, w: .9 }, { x: -3.7, y: 1.05, z: .9, cols: 24, w: .8 }, { x: .5, y: 2.1, z: -.6, cols: 30, w: 1.0 },
]);

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function records() {
  const A = k => new Float32Array(N * k);
  const aSc = A(4), aArch = A(3), aSeed = A(4), aUnd = A(3), aMat = A(3), aQ = A(3), aWaf = A(3), aInfo = A(4), aMeta = A(4);
  for (let i = 0; i < N * 4; i++) aSeed[i] = rnd();

  // 0 · sculpture: every block holds a lattice of records (in proportion to its volume); w = heat (light from the core) + 2 if on the block's skin
  { const vol = CUBES.reduce((a, c) => a + c[3] ** 3, 0); let i = 0;
    CUBES.forEach((c, ci) => {
      const cnt = ci === CUBES.length - 1 ? N - i : Math.round(N * c[3] ** 3 / vol), n = Math.ceil(Math.cbrt(cnt * 1.12)), cell = c[3] / n;
      const cells = [...Array(n * n * n).keys()].sort(() => rnd() - .5).slice(0, cnt);
      for (const q of cells) {
        const x = q % n, y = Math.floor(q / n) % n, z = Math.floor(q / (n * n));
        const P = [c[0] + (x - (n - 1) / 2) * cell, c[1] + (y - (n - 1) / 2) * cell, c[2] + (z - (n - 1) / 2) * cell];
        const d2 = (P[0] - CORE[0]) ** 2 + ((P[1] - CORE[1]) * 1.3) ** 2 + (P[2] - CORE[2]) ** 2;
        const skin = x === 0 || y === 0 || z === 0 || x === n - 1 || y === n - 1 || z === n - 1;
        aSc.set([P[0], P[1], P[2], Math.min(.999, Math.exp(-d2 / (MOB ? .7 : 1.4))) + (skin ? 2 : 0)], i * 4);
        aMeta[i * 4 + 2] = cell; i++;
      }
    });
  }

  // 1 · complexity: the tables, filled in proportion, with gaps
  const tw = SLABS.reduce((a, t) => a + t.w, 0); let at = 0;
  const order = [...Array(N).keys()].sort((a, b) => aSeed[a * 4 + 2] - aSeed[b * 4 + 2]);
  SLABS.forEach((t, si) => {
    const n = si === SLABS.length - 1 ? N - at : Math.round(N * t.w / tw), lv = t.levels || 1;
    t.rows = Math.ceil(n * 1.05 / t.cols / lv);
    let placed = 0, cell = 0;
    while (placed < n) {
      const c = cell % t.cols, r = Math.floor(cell / t.cols) % t.rows, l = Math.floor(cell / (t.cols * t.rows)); cell++;
      if (rnd() < .045 && cell < t.cols * t.rows * lv) continue;
      const i = order[at + placed++];
      aArch.set([t.x + (c - (t.cols - 1) / 2) * AP.x, t.y + l * .045 + (rnd() - .5) * .012, t.z + (r - (t.rows - 1) / 2) * AP.z], i * 3);
      aInfo[i * 4 + 3] = si; aMeta[i * 4 + 1] = r / Math.max(1, t.rows - 1);
    }
    at += n;
  });

  // 2 · understanding: six categories, each a band of columns; bands 1 and 3 are what matters
  const per = U.R * U.L, cats = [];
  U.bands.forEach((w, b) => { for (let k = 0; k < w * per; k++) cats.push(b); });
  const shuffled = [...Array(N).keys()].sort((a, b) => aSeed[a * 4 + 1] - aSeed[b * 4 + 1]);
  const UW = (U.C - 1) * U.sx + U.gap * (U.bands.length - 1), UH = (U.R - 1) * U.sy;
  let col0 = 0; const bandStart = U.bands.map(w => { const s = col0; col0 += w; return s; });
  const fill = U.bands.map(() => 0), kept = [];
  shuffled.forEach((i, k) => {
    const b = cats[k], q = fill[b]++, c = bandStart[b] + Math.floor(q / per), r = q % U.R, l = Math.floor((q % per) / U.R);
    aUnd.set([c * U.sx + b * U.gap - UW / 2, r * U.sy - UH / 2, (l - (U.L - 1) / 2) * U.sz], i * 3);
    aInfo[i * 4 + 1] = b;
    if (KEEP.includes(b)) { aInfo[i * 4 + 2] = 1; kept.push(i); }
  });

  // 3–4 · the kept records, one clean grid, ordered as they sat in their bands
  kept.sort((a, b) => aUnd[a * 3] - aUnd[b * 3] || aUnd[a * 3 + 1] - aUnd[b * 3 + 1]);
  kept.forEach((i, k) => {
    const c = k % K.C, r = Math.floor(k / K.C) % K.R, l = Math.floor(k / (K.C * K.R));
    aMat.set([c * K.sx - KW / 2, r * K.sy - KH / 2, (l - (K.L - 1) / 2) * K.sz], i * 3);
  });
  // everything else recedes: a faint wall far behind, keeping its band order
  for (let i = 0; i < N; i++) if (!aInfo[i * 4 + 2]) aMat.set([aUnd[i * 3] * 1.55, aUnd[i * 3 + 1] * 1.4 + .4, -7.5 + aUnd[i * 3 + 2] * .6], i * 3);
  // exceptions among the kept records, queued in the order the rules find them
  const E = Math.round(KN * .024), exc = new Set(); while (exc.size < E) exc.add(kept[Math.floor(rnd() * KN)]);
  [...exc].sort((a, b) => aMat[a * 3] - aMat[b * 3] || aMat[b * 3 + 1] - aMat[a * 3 + 1]).forEach((i, q) => {
    aInfo[i * 4] = 1; aQ.set([Q0 + (q % QC) * QX, KH / 2 - Math.floor(q / QC) * QY, 0], i * 3); aMeta[i * 4 + 3] = q / (E - 1);
  });

  // 5 · the column, filled one row (1%) at a time
  const byX = [...Array(N).keys()].sort((a, b) => aMat[a * 3] - aMat[b * 3] || aMat[a * 3 + 1] - aMat[b * 3 + 1]);
  byX.forEach((i, k) => {
    const row = Math.floor(k / PER), j = k % PER;
    aWaf.set([WX + ((j % CX) - (CX - 1) / 2) * CP, WY + row * RH + RH / 2, WZ + (Math.floor(j / CX) - (CZ - 1) / 2) * CDZ], i * 3);
    aMeta[i * 4] = row;
  });
  return { aSc, aArch, aSeed, aUnd, aMat, aQ, aWaf, aInfo, aMeta, E };
}

const VERT = /* glsl */`
precision highp float;
uniform mat4 projectionMatrix, viewMatrix;
attribute vec3 position, normal;
attribute vec4 aSc; attribute vec3 aArch; attribute vec4 aSeed; attribute vec3 aUnd; attribute vec3 aMat; attribute vec3 aQ; attribute vec3 aWaf; attribute vec4 aInfo; attribute vec4 aMeta;
uniform float uP, uTime, uWave, uRes, uCut, uIntro, uLens, uMirror;
uniform vec2 uPointer;
varying vec3 vN; varying vec3 vCol; varying float vEm; varying vec3 vW; varying vec3 vLoc, vSz;
const vec3 AMBER = vec3(1.,.7,.28), TEAL = vec3(.25,.83,.78), DIM = vec3(.17,.2,.25), LIT = vec3(.62,.8,.82), SILVER = vec3(.66,.71,.77);
vec3 band(float b){ return b < .5 ? vec3(.40,.44,.51) : b < 1.5 ? vec3(.47,.74,.76) : b < 2.5 ? vec3(.52,.56,.63) : b < 3.5 ? vec3(.40,.68,.72) : b < 4.5 ? vec3(.34,.38,.45) : vec3(.58,.62,.68); }
vec3 sculpt(out float em, out vec3 col){
  float heat = fract(aSc.w), skin = step(1.5, aSc.w);
  float h = (aSc.y - ${SY.toFixed(2)})/${STOP.toFixed(2)};
  float breath = .5 + .5*sin(uTime*.35);
  vec3 p = aSc.xyz + vec3(0., h*.06*breath, 0.);
  float pulse = exp(-pow((h - fract(uTime*.09)*1.3 + .15)*6., 2.));
  float flick = .75 + .25*sin(uTime*1.3 + aSeed.x*40.);
  col = mix(vec3(.13,.16,.21), vec3(.55,.62,.7), skin*.55);
  col = mix(col, AMBER, smoothstep(.05, .7, heat));
  em = heat*heat*1.6*flick + skin*.04 + pulse*.35*(1. - heat);
  col = mix(col, TEAL, pulse*.5*(1. - heat));
  return p;
}
void state(float i, out vec3 p, out vec3 T, out vec3 Nn, out vec3 sc, out vec3 col, out float em){
  T = vec3(1.,0.,0.); Nn = vec3(0.,1.,0.);
  float ex = aInfo.x, cat = aInfo.y, kept = aInfo.z;
  if(i < .5){
    p = sculpt(em, col); Nn = vec3(0.,0.,1.); sc = vec3(aMeta.z*mix(.34, .5, step(1.5, aSc.w)));
  } else if(i < 1.5){
    float sl = aInfo.w;
    float batch = exp(-pow((aMeta.y - fract(uTime*.06 + sl*.31))*16., 2.));
    float tt = fract(uTime*.045 + aSeed.x*7.);
    float go = (smoothstep(.05, .32, tt) - smoothstep(.55, .82, tt)) * step(.985, aSeed.y);
    vec3 xf = aArch + vec3((aSeed.z - .5)*3., .9, (aSeed.w - .5)*1.6);
    p = mix(aArch, xf, go*.5) + vec3(0., .035*sin(uTime*.42 + sl*1.7) + batch*.07 + 4.*go*(1. - go)*.65, 0.);
    Nn = vec3(0.,0.,1.); sc = vec3(.132, .064, .016);
    col = mix(vec3(.40,.45,.53), vec3(.74,.80,.87), sl/6.);
    col = mix(col, vec3(.55,.85,.85), batch*.4);
    em = batch*.1 + go*.4;
  } else if(i < 2.5){
    p = aUnd; sc = vec3(.135, .056, .014);
    col = band(cat); em = .02 + kept*(.1 + .06*sin(uTime*.8 + aUnd.y*3.));
  } else if(i < 4.5){
    // 3: the grid, clean and still; 4: the same grid becomes the machine
    p = aMat; sc = vec3(${(K.sx * .8).toFixed(3)}, ${(K.sy * .7).toFixed(3)}, .016);
    if(kept < .5){ sc *= .7; col = vec3(.12,.14,.18); em = 0.; return; }
    col = mix(LIT, vec3(.72,.86,.88), .3); em = .05;
    if(i > 3.5){
      float colI = floor((aMat.x + ${(KW / 2).toFixed(4)})/${K.sx} + .5);
      float bx = (floor(colI/${BLOCK}.)*${BLOCK}. + ${((BLOCK - 1) / 2).toFixed(1)})*${K.sx} - ${(KW / 2).toFixed(4)};
      float dw = uWave - bx;
      float passed = smoothstep(-.04, .1, dw), pulse = exp(-pow(dw*2.6, 2.));
      col = mix(DIM, LIT, passed); em = pulse*.55 + passed*.05;
      if(ex > .5){
        float detach = smoothstep(.1, 1.2, dw);
        float back = smoothstep(.35, 1., clamp(uRes*1.7 - aMeta.w*.7, 0., 1.));
        vec3 slot = p + vec3(0., 0., .35*passed), qp = aQ;
        vec3 mid = mix(slot, qp, .5) + vec3(0., .25, .9);
        float d2 = detach*detach*(3. - 2.*detach);
        vec3 toQ = mix(mix(slot, mid, d2), mix(mid, qp, d2), d2);
        vec3 mid2 = mix(qp, p, .5) + vec3(0., .2, .8);
        p = mix(mix(toQ, mid2, back), mix(mid2, p, back), back);
        col = mix(mix(col, AMBER, passed), LIT, back);
        em += passed*(1. - back)*.3;
        sc *= mix(1. + passed*.2, .75, detach*(1. - back));
      }
    }
  } else {
    // the result: 95 rows lift off, top first, and stream back into the system; 5 stay, amber
    float keep5 = 1. - step(4.5, aMeta.x);
    float mv = (1. - keep5) * smoothstep(0., 1., clamp(uCut*1.9 - (99. - aMeta.x)/95.*.55 - aSeed.x*.35, 0., 1.));
    float ang = aSeed.y*6.2832 + mv*5.;
    vec3 p0 = aWaf, p3 = aArch;
    vec3 p1 = vec3(${WX.toFixed(2)}, aWaf.y + 2.4 + aSeed.z*1.6, ${WZ.toFixed(2)}) + vec3(cos(ang), 0., sin(ang))*(.6 + aSeed.w*.9);
    vec3 p2 = p3 + vec3((aSeed.w - .5)*1.6, 2.6 + aSeed.z*1.2, (aSeed.y - .5)*1.6);
    float u = mv, v = 1. - u;
    p = v*v*v*p0 + 3.*v*v*u*p1 + 3.*v*u*u*p2 + u*u*u*p3;
    float landed = smoothstep(.96, 1., mv), sl = aInfo.w;
    float sweep = exp(-pow((aArch.x - mix(-9., 9., fract(uTime*.07 + sl*.19)))*1.1, 2.));
    p.y += landed*.03*sin(uTime*.42 + sl*1.7);
    Nn = normalize(mix(vec3(0.,1.,0.), vec3(0.,0.,1.), smoothstep(.55, 1., mv)) + vec3(0., 1e-3, 0.));
    sc = mix(vec3(${(CP * .82).toFixed(4)}, ${(RH * .78).toFixed(4)}, ${(CDZ * .8).toFixed(4)}), vec3(.132, .064, .016), smoothstep(.5, 1., mv));
    float flying = sin(clamp(mv, 0., 1.)*3.14159);
    col = mix(SILVER, vec3(.4,.86,.82), smoothstep(.0, .3, mv));
    col = mix(col, mix(vec3(.26,.58,.6), vec3(.58,.84,.86), sl/6.), landed);
    col = mix(col, AMBER, keep5*uCut);
    em = keep5*uCut*.35 + flying*.5 + landed*(.05 + sweep*.25) + .03;
  }
}
void main(){
  float a = floor(clamp(uP, 0., 4.999)), f = uP - a;
  vec3 pA, tA, nA, sA, cA; float eA; vec3 pB, tB, nB, sB, cB; float eB;
  state(a, pA, tA, nA, sA, cA, eA); state(a + 1., pB, tB, nB, sB, cB, eB);
  float d = a < .5 ? (1. - (aSc.y - ${SY.toFixed(2)})/${STOP.toFixed(2)})*.34 + aSeed.w*.14
          : a < 1.5 ? (1. - aInfo.w/6.)*.3 + aSeed.w*.14
          : a < 2.5 ? (1. - aInfo.z)*.25 + aSeed.w*.15
          : a < 3.5 ? aSeed.w*.1
          : (aMat.x/${(KW / 2 + .01).toFixed(3)}*.5 + .5)*.3 + aSeed.w*.14;
  float k = smoothstep(0., 1., clamp(f*1.55 - d, 0., 1.));
  vec3 lift = a < .5 ? vec3((aSeed.y - .5)*1.2, .3 + aSeed.z*.9, (aSeed.w - .5)*1.2)
            : a < 2.5 ? vec3((aSeed.y - .5)*.5, .35 + aSeed.z*.5, (aSeed.w - .5)*.5)
            : a < 3.5 ? vec3(0., .1, 0.)
            : vec3((aSeed.y - .5)*.6, .3 + aSeed.z*.6, .4 + aSeed.w*.6);
  vec3 ctrl = mix(pA, pB, .5) + lift;
  vec3 p = mix(mix(pA, ctrl, k), mix(ctrl, pB, k), k);
  vec3 T = normalize(mix(tA, tB, k) + vec3(1e-4));
  vec3 Nn = normalize(mix(nA, nB, k) + vec3(0., 1e-4, 0.));
  vec3 B = normalize(cross(T, Nn)); Nn = cross(B, T);
  vec3 sc = mix(sA, sB, k), col = mix(cA, cB, k);
  float em = mix(eA, eB, k) + sin(k*3.14159)*.1;
  // intro: the sculpture fills from the floor up
  float intro = clamp(uIntro*1.7 - (aSc.y - ${SY.toFixed(2)})/${STOP.toFixed(2)}*.5 - aSeed.x*.2, 0., 1.);
  intro = intro*intro*(3. - 2.*intro);
  sc *= intro; p.y -= (1. - intro)*1.2;
  // the cursor: the floors nearest it lift and catch the light
  vec4 clip = projectionMatrix * viewMatrix * vec4(p, 1.);
  float lens = uLens * smoothstep(.3, 0., distance(clip.xy/clip.w*vec2(1., .72), uPointer*vec2(1., .72)));
  p += normalize(p - vec3(${CORE.map(v => v.toFixed(2)).join(', ')}) + 1e-4)*lens*.12; em += lens*.3; col = mix(col, vec3(.6,.92,.9), lens*.25);
  mat3 R = mat3(T, Nn, B);
  vec3 w = p + R*(position*sc);
  if(uMirror > .5) w.y = ${(2 * SY).toFixed(3)} - w.y;
  vN = R*normal; vCol = col; vEm = em; vW = w; vLoc = position; vSz = sc;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.);
}`;
const FRAG = /* glsl */`
precision mediump float;
uniform vec3 uCam, uFog; uniform float uFogNear, uFogFar; uniform highp float uMirror;
varying vec3 vN; varying vec3 vCol; varying float vEm; varying vec3 vW; varying vec3 vLoc, vSz;
void main(){
  vec3 N = normalize(vN), Vv = normalize(uCam - vW);
  if(dot(N, Vv) < 0.) N = -N;
  vec3 L = normalize(vec3(-.45, .85, .55)), L2 = normalize(vec3(.7, .2, -.6));
  float diff = max(dot(N, L), 0.), back = max(dot(N, L2), 0.), hemi = .5 + .5*N.y;
  float spec = pow(max(dot(N, normalize(L + Vv)), 0.), 40.), fres = pow(1. - max(dot(N, Vv), 0.), 3.);
  vec3 dd = (.5 - abs(vLoc))*vSz;
  float mx = max(dd.x, max(dd.y, dd.z)), mn = min(dd.x, min(dd.y, dd.z)), mid = dd.x + dd.y + dd.z - mx - mn;
  float edge = 1. - smoothstep(.0012, .0065, mid);
  vec3 c = vCol*(.06 + .36*diff + .12*hemi) + vec3(.4,.55,.7)*back*.1 + spec*vec3(.95,.97,1.)*.35 + fres*vec3(.45,.6,.72)*.16 + vCol*vEm
         + mix(vCol, vec3(.85,.93,1.), .45)*edge*(.42 + vEm*1.5);
  if(uMirror > .5){ gl_FragColor = vec4(vCol*vEm*.5*(uMirror - 1.)*exp(-(${SY.toFixed(3)} - vW.y)*1.6)*.4, 1.); return; }
  gl_FragColor = vec4(mix(c, uFog, smoothstep(uFogNear, uFogFar, length(uCam - vW))), 1.);
}`;

// glass: the blocks of the sculpture, then a case around the working grid and around the result column. Additive, lit by the core.
const GLASS_V = /* glsl */`
precision highp float;
uniform mat4 projectionMatrix, viewMatrix;
uniform vec4 uGA; uniform float uOut, uMirror, uTime;
attribute vec3 position, normal; attribute vec4 gPos; attribute vec3 gSize;
varying vec3 vL, vN, vW, vS; varying float vA;
void main(){
  float grp = gPos.w, a = grp < .5 ? uGA.x : grp < 1.5 ? uGA.y : grp < 2.5 ? uGA.z : uGA.w;
  vec3 c = gPos.xyz;
  if(grp < .5){
    c.y += (c.y - ${SY.toFixed(3)})/${STOP.toFixed(3)}*.06*(.5 + .5*sin(uTime*.35));
    vec3 dir = c - vec3(${CORE.map(v => v.toFixed(3)).join(", ")});
    c += dir*uOut*1.6 + vec3(0., uOut*1.4, 0.);
  }
  vec3 w = c + position*gSize;
  if(uMirror > .5) w.y = ${(2 * SY).toFixed(3)} - w.y;
  vL = position; vN = normal; vW = w; vS = gSize; vA = a;
  gl_Position = projectionMatrix*viewMatrix*vec4(w, 1.);
}`;
const GLASS_F = /* glsl */`
precision mediump float;
uniform vec3 uCam; uniform highp float uMirror;
varying vec3 vL, vN, vW, vS; varying float vA;
void main(){
  vec3 dd = (1. - abs(vL)*2.)*vS*.5;                                         // distance to each pair of faces, in world units
  float mx = max(dd.x, max(dd.y, dd.z)), mn = min(dd.x, min(dd.y, dd.z)), mid = dd.x + dd.y + dd.z - mx - mn;
  float edge = 1. - smoothstep(.004, .02, mid);
  vec3 N = normalize(vN), V = normalize(uCam - vW);
  float fres = pow(1. - abs(dot(N, V)), 2.2);
  vec3 nC = max(vec3(1.), floor(vS/.31)), f = fract((vL + .5)*nC), gw = min(f, 1. - f)/nC*vS;
  vec3 gm = mix(gw, vec3(9.), abs(N));
  float grid = 1. - smoothstep(.002, .008, min(gm.x, min(gm.y, gm.z)));
  vec3 q = vW - vec3(${CORE.map(v => v.toFixed(3)).join(", ")});
  float core = exp(-dot(q, q)*${MOB ? '.9' : '.42'});
  vec3 col = vec3(.6,.72,.84)*(edge*.75 + grid*.08 + fres*.16) + vec3(.2,.5,.8)*max(N.x, 0.)*.05
           + vec3(1.,.6,.24)*core*(.1 + edge*1.1 + grid*.3 + fres*.35);
  float k = vA;
  if(uMirror > .5) k *= .3*exp(-(${SY.toFixed(3)} - vW.y)*1.3);
  gl_FragColor = vec4(col*k, 1.);
}`;

// six arrangements; [hold start, hold end] in track progress
const STOPS = [[0, .08], [.17, .25], [.34, .42], [.5, .56], [.64, .78], [.88, 1]];
function progress(g) {
  let p = 0; const sub = STOPS.map(() => 0);
  for (let i = 0; i < STOPS.length; i++) {
    const [a, b] = STOPS[i];
    if (g >= a) { p = i; sub[i] = clamp((g - a) / (b - a)); }
    if (i < STOPS.length - 1 && g > b && g < STOPS[i + 1][0]) { p = i + smooth((g - b) / (STOPS[i + 1][0] - b)); sub[i] = 1; }
  }
  return { p, sub };
}
function webgl() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

export function bootEngine({ onStage } = {}) {
  const $ = id => document.getElementById(id);
  const track = $('track'), copies = [...document.querySelectorAll('.track .copy')];
  const gOf = () => clamp(-track.getBoundingClientRect().top / Math.max(1, track.offsetHeight - innerHeight));
  const fail = () => { root.classList.add('no-gl'); requestAnimationFrame(() => root.classList.add('ready')); };
  if (!webgl()) return fail();
  const canvas = $('engine');
  let G3; try { G3 = new GL(canvas); } catch { return fail(); }
  const gl = G3.gl, R = records();
  let dpr = Math.min(devicePixelRatio || 1, MOB ? 1.6 : 1.75);
  const FOV = MOB ? 50 : 38; let proj = perspective(FOV, 1, .1, 80); const view = new Float32Array(16);

  const skyP = G3.program('attribute vec2 p; varying vec2 v; void main(){ v = p*.5 + .5; gl_Position = vec4(p, 0., 1.); }',
    `precision mediump float; varying vec2 v; uniform float uA, uWarm; void main(){ vec2 p = (v - vec2(.66, .95))*vec2(uA, 1.);
      vec3 c = mix(vec3(.07,.085,.11), vec3(.035,.04,.05), smoothstep(.0, 1.2, length(p)));
      c += vec3(.06,.045,.02)*uWarm*smoothstep(.7, 0., length((v - vec2(.72, .3))*vec2(uA, 1.)));
      gl_FragColor = vec4(c, 1.); }`);
  const quad = G3.buffer(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
  const box = boxGeometry(), recP = G3.program(VERT, FRAG);
  const bufs = { position: G3.buffer(box.position), normal: G3.buffer(box.normal) };
  const idx = G3.buffer(box.index, gl.ELEMENT_ARRAY_BUFFER);
  const inst = [['aSc', 4], ['aArch', 3], ['aSeed', 4], ['aUnd', 3], ['aMat', 3], ['aQ', 3], ['aWaf', 3], ['aInfo', 4], ['aMeta', 4]].map(([k, n]) => [recP.attr(k), G3.buffer(R[k]), n]);
  const Un = { uP: 0, uTime: 0, uWave: -99, uRes: 0, uCut: 0, uIntro: reduce ? 1 : 0, uLens: 0, uPointer: new V2(9, 9), uCam: new V3(), uFog: [.05, .058, .072], uFogNear: 9, uFogFar: 26 };
  const lineP = G3.program('precision highp float; uniform mat4 projectionMatrix, viewMatrix; attribute vec3 position; void main(){ gl_Position = projectionMatrix*viewMatrix*vec4(position, 1.); }',
    'precision mediump float; uniform vec4 uColor; void main(){ gl_FragColor = uColor; }');
  const lineSet = (arr, color) => ({ buf: G3.buffer(new Float32Array(arr)), n: arr.length / 3, color, opacity: 0 });
  // band brackets (understanding), the machine's frame and queue, the result column
  const UW = (U.C - 1) * U.sx + U.gap * (U.bands.length - 1), UH = (U.R - 1) * U.sy;
  const br = []; let c0 = 0;
  U.bands.forEach((w, b) => { const x0 = c0 * U.sx + b * U.gap - UW / 2 - .07, x1 = (c0 + w - 1) * U.sx + b * U.gap - UW / 2 + .07, y = UH / 2 + .14; br.push(x0, y - .06, 0, x0, y, 0, x0, y, 0, x1, y, 0, x1, y, 0, x1, y - .06, 0); c0 += w; });
  const brackets = lineSet(br, [.6, .68, .76]);
  const fr = []; for (let l = 0; l < K.L; l++) { const z = (l - (K.L - 1) / 2) * K.sz, x0 = -KW / 2 - .14, x1 = KW / 2 + .14, y0 = -KH / 2 - .1, y1 = KH / 2 + .1; fr.push(x0, y0, z, x1, y0, z, x1, y0, z, x1, y1, z, x1, y1, z, x0, y1, z, x0, y1, z, x0, y0, z); }
  const mframe = lineSet(fr, [.6, .68, .76]);
  const qb = [Q0 - .12, KH / 2 + .1, Q0 + (QC - 1) * QX + .12, KH / 2 - (Math.ceil(R.E / QC) - 1) * QY - .1];
  const qframe = lineSet([qb[0], qb[1], 0, qb[2], qb[1], 0, qb[2], qb[1], 0, qb[2], qb[3], 0, qb[2], qb[3], 0, qb[0], qb[3], 0, qb[0], qb[3], 0, qb[0], qb[1], 0], [1, .72, .3]);
  const fx0 = WX - CW / 2 - .06, fx1 = WX + CW / 2 + .06, fy0 = WY - .04, fy1 = WY + CH + .04, fz = WZ + CZ * CDZ / 2 + .06;
  const cframe = lineSet([fx0, fy0, fz, fx1, fy0, fz, fx1, fy0, fz, fx1, fy1, fz, fx1, fy1, fz, fx0, fy1, fz, fx0, fy1, fz, fx0, fy0, fz], [.6, .68, .76]);
  const lines = [brackets, qframe];
  const glassP = G3.program(GLASS_V, GLASS_F);
  const GD = [...CUBES.map(c => [c[0], c[1], c[2], 0, c[3], c[3], c[3]]),
    [0, 0, 0, 1, KW + .42, KH + .34, (K.L - 1) * K.sz + .3],
    [WX, WY + CH / 2, WZ, 2, CW + .1, CH + .07, CZ * CDZ + .12],
    ...SLABS.map(t => [t.x, t.y + ((t.levels || 1) - 1) * .0225, t.z, 3, t.cols * AP.x + .12, ((t.levels || 1) - 1) * .045 + .1, t.rows * AP.z + .12])];
  const gPos = G3.buffer(new Float32Array(GD.flatMap(g => g.slice(0, 4)))), gSize = G3.buffer(new Float32Array(GD.flatMap(g => g.slice(4))));
  const GA = new Float32Array(4); let gOut = 0;
  const floorP = G3.program(`precision highp float; uniform mat4 projectionMatrix, viewMatrix; attribute vec2 p; varying vec2 v; void main(){ v = p*14.; gl_Position = projectionMatrix*viewMatrix*vec4(v.x + ${CORE[0].toFixed(3)}, ${(SY - .003).toFixed(3)}, v.y + ${CORE[2].toFixed(3)}, 1.); }`,
    `precision mediump float; varying vec2 v; uniform float uA, uT;
     void main(){ float r = length(v*vec2(1., 1.25));
       vec3 c = vec3(1.,.6,.24)*exp(-r*r*${MOB ? '.5' : '.22'})*.2*(.92 + .08*sin(uT*1.1)) + vec3(.3,.55,.75)*exp(-r*.28)*.035;
       float lines = (1. - smoothstep(.0, .02, abs(fract(v.x/${GU.toFixed(3)} + .5) - .5)*${GU.toFixed(3)}))*exp(-r*.3)*.025;
       gl_FragColor = vec4((c + lines)*uA, 1.); }`);
  const glowP = G3.program('attribute vec2 p; uniform vec2 uC, uR; varying vec2 v; void main(){ v = p; gl_Position = vec4(uC + p*uR, 0., 1.); }',
    'precision mediump float; varying vec2 v; uniform vec3 uCol; void main(){ float d = dot(v, v); gl_FragColor = vec4(uCol*exp(-d*5.)*(1. - smoothstep(.6, 1., d)), 1.); }');
  let floorA = 0, mirrorA = 0, glowA = 0;
  const coreV = V(...CORE);
  function drawGlass(mirror) {
    gl.useProgram(glassP.p);
    gl.uniformMatrix4fv(glassP.u.projectionMatrix, false, proj); gl.uniformMatrix4fv(glassP.u.viewMatrix, false, view);
    gl.uniform4fv(glassP.u.uGA, GA); gl.uniform1f(glassP.u.uOut, gOut); gl.uniform1f(glassP.u.uMirror, mirror); gl.uniform1f(glassP.u.uTime, Un.uTime);
    gl.uniform3f(glassP.u.uCam, Un.uCam.x, Un.uCam.y, Un.uCam.z);
    G3.attrib(glassP.attr('position'), bufs.position, 3); G3.attrib(glassP.attr('normal'), bufs.normal, 3);
    const a1 = glassP.attr('gPos'), a2 = glassP.attr('gSize');
    G3.attrib(a1, gPos, 4, 1); G3.attrib(a2, gSize, 3, 1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx);
    G3.drawInstanced(36, mirror ? CUBES.length : GD.length);
    for (const loc of [a1, a2]) if (loc >= 0) { if (G3.gl2) gl.vertexAttribDivisor(loc, 0); else G3.ext.vertexAttribDivisorANGLE(loc, 0); }
  }
  function drawRecords(mirror) {
    gl.useProgram(recP.p);
    G3.attrib(recP.attr('position'), bufs.position, 3); G3.attrib(recP.attr('normal'), bufs.normal, 3);
    for (const [loc, b, n] of inst) G3.attrib(loc, b, n, 1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx);
    gl.uniformMatrix4fv(recP.u.projectionMatrix, false, proj); gl.uniformMatrix4fv(recP.u.viewMatrix, false, view);
    for (const k of ['uP', 'uTime', 'uWave', 'uRes', 'uCut', 'uIntro', 'uLens', 'uFogNear', 'uFogFar']) gl.uniform1f(recP.u[k], Un[k]);
    gl.uniform1f(recP.u.uMirror, mirror);
    gl.uniform2f(recP.u.uPointer, Un.uPointer.x, Un.uPointer.y); gl.uniform3f(recP.u.uCam, Un.uCam.x, Un.uCam.y, Un.uCam.z); gl.uniform3fv(recP.u.uFog, Un.uFog);
    G3.drawInstanced(36, N);
    for (const [loc] of inst) if (loc >= 0) { if (G3.gl2) gl.vertexAttribDivisor(loc, 0); else G3.ext.vertexAttribDivisorANGLE(loc, 0); }
  }

  let warm = 0;
  function render() {
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    gl.useProgram(skyP.p); gl.uniform1f(skyP.u.uA, innerWidth / innerHeight); gl.uniform1f(skyP.u.uWarm, warm); G3.attrib(skyP.attr('p'), quad, 2); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    if (floorA > .003) {   // the floor: a pool of light under the stack, and its reflection
      gl.useProgram(floorP.p); gl.uniformMatrix4fv(floorP.u.projectionMatrix, false, proj); gl.uniformMatrix4fv(floorP.u.viewMatrix, false, view);
      gl.uniform1f(floorP.u.uA, floorA); gl.uniform1f(floorP.u.uT, Un.uTime); G3.attrib(floorP.attr('p'), quad, 2); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (mirrorA > .003) { Un.uMirrorA = mirrorA; gl.enable(gl.DEPTH_TEST); gl.clear(gl.DEPTH_BUFFER_BIT); gl.depthMask(false); drawRecords(1 + mirrorA); drawGlass(1); gl.depthMask(true); }
    }
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST); gl.clear(gl.DEPTH_BUFFER_BIT);
    drawRecords(0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
    if (GA[0] + GA[1] + GA[2] + GA[3] > .003) drawGlass(0);
    if (glowA > .003) {
      project(coreV, view, proj, tmp);
      gl.disable(gl.DEPTH_TEST); gl.useProgram(glowP.p);
      gl.uniform2f(glowP.u.uC, tmp.x, tmp.y); gl.uniform2f(glowP.u.uR, (MOB ? .9 : .55) * innerHeight / innerWidth, MOB ? .5 : .55);
      gl.uniform3f(glowP.u.uCol, .5 * glowA, .27 * glowA, .08 * glowA); G3.attrib(glowP.attr('p'), quad, 2); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.enable(gl.DEPTH_TEST);
    }
    gl.depthMask(true);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    gl.useProgram(lineP.p); gl.uniformMatrix4fv(lineP.u.projectionMatrix, false, proj); gl.uniformMatrix4fv(lineP.u.viewMatrix, false, view);
    const posLoc = lineP.attr('position');
    for (const L of lines) { if (L.opacity < .003) continue; gl.uniform4f(lineP.u.uColor, L.color[0], L.color[1], L.color[2], L.opacity); G3.attrib(posLoc, L.buf, 3); gl.drawArrays(gl.LINES, 0, L.n); }
    gl.depthMask(true);
  }

  // labels anchored in the scene
  const labelLayer = $('labels'), mkLab = (t, cls) => { const el = document.createElement('div'); el.className = 'lab ' + cls; el.textContent = t; labelLayer.appendChild(el); return el; };
  const lMatter = mkLab('What matters', 'teal'), lQueue = mkLab(MOB ? 'Exceptions' : 'Exceptions, held for review', 'amber');
  const lBefore = mkLab(MOB ? 'Manual reporting, before' : 'Manual reporting effort, before', 'quiet'), lFreed = mkLab(MOB ? '95% back into the system' : '95% of the effort, redeployed to other work', 'teal'), lKept = mkLab(MOB ? '5% manual' : '5% still manual', 'amber');
  const bandX = b => { let s = 0; for (let k = 0; k < b; k++) s += U.bands[k]; return (s + U.bands[b] / 2 - .5) * U.sx + b * U.gap - UW / 2; };

  // camera: one key per arrangement (the machine travels along its rule run)
  const cam = [
    s => MOB ? [V(1.0, .2, 12.6), V(.15, -1.75, 0)] : [V(-2.3 - s * .6, .9, 12.6), V(-3.1, -.05, 0)],
    s => MOB ? [V(-3.4, 5.0, 12.6), V(0, -1.5, -.8)] : [V(-11.6, 4.6, 10.6), V(-4.6, -1.2, -.9)],
    s => MOB ? [V(0, .6 - s * .2, 12.6), V(0, -.9, 0)] : [V(-2.4 + s * .8, 1.3, 14.2 - s * .6), V(-1.9, -.7, 0)],
    s => MOB ? [V(0, .5, 10.2), V(0, -.9, 0)] : [V(-3.2, 1.4, 12.6), V(-2.1, -.5, 0)],
    s => { const K2 = MOB ? [[0, V(-1.4, .6, 10.2), V(.2, -.6, 0)], [1, V(1.2, .5, 10.6), V(.6, -.6, 0)]]
      : [[0, V(-3.2, 1.4, 14.2), V(-1.5, -.3, 0)], [.6, V(-.4, 1.1, 13.8), V(-1.1, -.2, 0)], [1, V(-1.2, 1.3, 14.8), V(-1.4, -.25, 0)]];
      let j = 0; while (j < K2.length - 2 && s > K2[j + 1][0]) j++; const t = ease((s - K2[j][0]) / (K2[j + 1][0] - K2[j][0])); return [K2[j][1].clone().lerp(K2[j + 1][1], t), K2[j][2].clone().lerp(K2[j + 1][2], t)]; },
    s => { const w = smooth((s - .12) / .62);
      const close = MOB ? [V(WX - .6, WY + 2.4, WZ + 7.4), V(WX, WY + 1.4, WZ)] : [V(WX - 2.8, WY + 2.3, WZ + 10.6), V(WX - 1.8, WY + 1.9, WZ)];
      const wide = MOB ? [V(-2.6, 6.4, 14.6), V(.4, .2, -.2)] : [V(-9.8, 6.0, 14.4), V(-3.1, -.7, -.4)];
      return [close[0].clone().lerp(wide[0], w), close[1].clone().lerp(wide[1], w)]; },
  ];
  const resize = () => { G3.size(innerWidth, innerHeight, dpr); proj = perspective(FOV, innerWidth / innerHeight, .1, 80); };
  resize(); addEventListener('resize', resize);
  const pointer = new V2(9, 9), pointerT = new V2(9, 9); let lastMove = -1e9;
  const setP = (x, y) => { pointerT.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); lastMove = performance.now(); };
  addEventListener('pointermove', e => setP(e.clientX, e.clientY), { passive: true });
  addEventListener('touchmove', e => { const t = e.touches[0]; if (t) setP(t.clientX, t.clientY); }, { passive: true });
  const tmp = new V3();
  const place = (el, v, o, al = '-50%') => { project(v, view, proj, tmp); el.style.opacity = (tmp.z < 1 ? o : 0).toFixed(3); if (o > .01) el.style.transform = `translate3d(${((tmp.x + 1) / 2 * innerWidth).toFixed(1)}px, ${((1 - tmp.y) / 2 * innerHeight).toFixed(1)}px, 0) translate(${al}, -50%)`; };
  const near = (p, k, w = 2.4) => clamp(1 - Math.abs(p - k) * w);
  let g = gOf(), clock = 0, visible = true, onscreen = true, last = performance.now(), frames = 0, ft = 0;

  function frame(dt, draw = true) {
    clock += dt / 1000;
    g += (gOf() - g) * (reduce ? 1 : 1 - Math.pow(.004, dt / 1000));
    const { p, sub } = progress(g), t = reduce ? 0 : clock;
    const vis = clamp(track.getBoundingClientRect().bottom / innerHeight * 1.4 - .1);
    canvas.style.opacity = vis.toFixed(3); labelLayer.style.opacity = vis.toFixed(3);
    copies.forEach(el => { const o = near(p, +el.dataset.k, 3) * vis; el.style.setProperty('--o', o.toFixed(3)); el.style.visibility = o > .01 ? 'visible' : 'hidden'; });
    onStage?.(p, g);
    if (vis <= 0) return;
    Un.uP = p; Un.uTime = t; Un.uIntro = reduce ? 1 : ease(clamp((clock - .15) / 2.8));
    const s4 = p < 4 ? 0 : p > 4.001 ? 1 : sub[4];
    Un.uWave = p < 4 ? -KW / 2 - 1 : lerp(-KW / 2 - .5, KW / 2 + .5, smooth((s4 - .04) / .56));
    Un.uRes = smooth((s4 - .66) / .28);
    Un.uCut = p < 5 ? 0 : smooth((sub[5] - .05) / .55);
    warm = near(p, 5, 1.5) * .8 + near(p, 0, 2) * .35;
    if (!reduce && performance.now() - lastMove > 4000) pointerT.set(Math.sin(t * .31) * .4 + .25, Math.sin(t * .43 + 1) * .3);
    pointer.lerp(pointerT, .07); Un.uPointer.copy(pointer);
    Un.uLens = (reduce ? 0 : 1) * clamp(1 - p * 2.5) * clamp((clock - 2.8) / 1.2);
    const i = Math.min(4, Math.floor(p)), f = ease(p - i), A = cam[i](sub[i]), B = cam[i + 1](sub[i + 1]);
    const cp = A[0].clone().lerp(B[0], f), cl = A[1].clone().lerp(B[1], f);
    if (!reduce) {   // the sculpture turns slowly on its own, and with scroll; the pointer tilts the view
      const hero = clamp(1 - p);
      cp.sub(cl).rotateY((Math.sin(t * .07) * .14 + sub[0] * .5) * hero).add(cl);
      cp.x += pointer.x * (.45 * hero + .25); cp.y += pointer.y * (.3 * hero + .15);
    }
    lookAt(cp, cl, view); Un.uCam.copy(cp);
    gOut = reduce ? (p > .5 ? 1 : 0) : smooth(p * 1.1);
    GA[0] = clamp(1 - p * 1.25) * vis; GA[1] = .5 * Math.max(near(p, 3, 2), near(p, 4, 2)) * vis; GA[2] = .55 * near(p, 5, 2) * vis; GA[3] = .6 * near(p, 1, 1.6) * vis;
    floorA = clamp(1 - p * 1.6) * vis; mirrorA = floorA; glowA = clamp(1 - p * 2) * vis * (reduce ? 1 : Un.uIntro);
    brackets.opacity = .35 * near(p, 2, 2);
    mframe.opacity = .22 * Math.max(near(p, 3, 2), near(p, 4, 2));
    qframe.opacity = .45 * near(p, 4, 2) * smooth((s4 - .08) / .1) * (1 - Un.uRes);
    cframe.opacity = .4 * near(p, 5, 2) * smooth(Un.uCut * 2);
    if (draw) {
      place(lMatter, V(bandX(KEEP[0]) / 2 + bandX(KEEP[1]) / 2, UH / 2 + .38, 0), near(p, 2, 3) * vis);
      place(lQueue, V(Q0 + (QC - 1) * QX / 2, KH / 2 + .32, 0), near(p, 4, 3) * smooth((s4 - .1) / .1) * (1 - Un.uRes) * vis);
      place(lBefore, V(WX, WY + CH + .22, fz), near(p, 5, 3) * (1 - smooth(Un.uCut * 2 - .9)) * vis);
      place(lFreed, MOB ? V(-.2, 2.9, -1.2) : V(.4, 3.1, -1.8), near(p, 5, 3) * smooth(Un.uCut * 1.5 - .7) * vis);
      place(lKept, V(WX, WY - .22, fz), near(p, 5, 3) * smooth(Un.uCut * 1.6 - .5) * vis);
      render();
    }
  }
  function adapt(dt) { frames++; ft += dt; if (frames < 60) return; const avg = ft / frames; frames = 0; ft = 0; if (avg > 26 && dpr > 1) { dpr = Math.max(1, dpr - .25); resize(); } }
  function loop(now) { if (!visible || !onscreen || window.__manual) return; const dt = Math.min(50, now - last); last = now; adapt(dt); frame(dt); requestAnimationFrame(loop); }
  const restart = () => { if (visible && onscreen && !window.__manual) { last = performance.now(); requestAnimationFrame(loop); } };
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; restart(); });
  new IntersectionObserver(es => { const was = onscreen; onscreen = es[0].isIntersecting; if (onscreen && !was) restart(); }).observe(track);
  window.__step = (ms, draw = true) => frame(ms, draw);
  window.__mouse = setP;
  if (!window.__manual) requestAnimationFrame(loop);
  requestAnimationFrame(() => root.classList.add('ready'));
}
