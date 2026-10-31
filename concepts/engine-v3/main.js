/**
 * Intelligence Engine v3: raw information → validated data → actionable intelligence.
 *
 * One instanced mesh (one draw call) of records. Every record keeps its identity through five layouts, and the GPU
 * interpolates between them on scroll:
 *   0  data architecture  tables of records; batch writes run along rows, a few records are carried between tables
 *   1  validation         a matrix; rules run in column groups; failures detach into an exception queue; each is
 *                         inspected and either corrected (returns to its slot) or flagged for review
 *   2  segment towers     validated records group by client segment; tower height = the segment's revenue
 *   3  revenue surface    the towers spread across 24 months
 *   4  monthly chart      the surface resolves into a stacked monthly chart with axes, labels and one anomaly
 * The dataset is synthetic, seeded and reconciles exactly: every chart cell is one validated or corrected record.
 */
import {
  BoxGeometry, BufferAttribute, BufferGeometry, Color, InstancedBufferAttribute, InstancedBufferGeometry,
  LineBasicMaterial, LineSegments, Mesh, PerspectiveCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, Vector3, WebGLRenderer,
} from 'three';

const root = document.documentElement;
const reduce = root.classList.contains('rm');
const MOB = innerWidth < 760;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const ease = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const V = (x, y, z) => new Vector3(x, y, z);
const fmt = n => Math.round(n).toLocaleString('en-US');

// ── layout constants
const G = MOB ? { C: 25, R: 40, L: 5, sx: .15, sy: .08, sz: .95 } : { C: 60, R: 40, L: 5, sx: .17, sy: .08, sz: .95 };
const N = G.C * G.R * G.L;
const MW = (G.C - 1) * G.sx, MH = (G.R - 1) * G.sy;
const BLOCK = MOB ? 5 : 6;                                   // rules run on groups of this many columns
const QC = MOB ? 4 : 6, QX = MOB ? .13 : .15, QY = .066, Q0 = MW / 2 + (MOB ? .45 : .75);
const MX = MOB ? .19 : .34, MZ = MOB ? .42 : .6, COLS = MOB ? 4 : 6;
const TS = MX * .86 / COLS;
const SERIES_Y0 = MOB ? -1.0 : -1.7;
const TX = MOB ? 8 : 12, TXS = MOB ? .15 : .19, TZ = 3, TZS = .15, TZG = MOB ? .62 : .98;   // segment towers
const SEGS = ['Hedge funds', 'Asset managers', 'Banks', 'Corporates', 'Pensions', 'Insurers'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const NM = 24, NS = SEGS.length, ANOM = { s: 2, m: 17, k: .55 };   // a decline
const TOTAL_REV = 1840;
const monthName = m => `${MONTHS[m % 12]} Y${Math.floor(m / 12) + 1}`;

// ── the synthetic dataset
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function dataset() {
  const base = [1, .82, .66, .5, .36, .26], ph = [0, 2, 4.5, 7, 9, 1];
  const rev = [], trend = [];
  for (let s = 0; s < NS; s++) { rev.push([]); trend.push([]); for (let m = 0; m < NM; m++) {
    const t = base[s] * (1 + .012 * m) * (1 + .075 * Math.sin(2 * Math.PI * (m + ph[s]) / 12));
    rev[s].push(t * (1 + (rnd() - .5) * .08) * (s === ANOM.s && m === ANOM.m ? ANOM.k : 1)); trend[s].push(t);
  } }
  const sum = rev.flat().reduce((a, b) => a + b, 0);
  for (let s = 0; s < NS; s++) for (let m = 0; m < NM; m++) { rev[s][m] *= TOTAL_REV / sum; trend[s][m] *= TOTAL_REV / sum; }
  return { rev, trend };
}
const DATA = dataset();

// ── the data architecture (tables of records)
const AP = MOB ? { x: .15, z: .09 } : { x: .165, z: .09 };
const SLABS = (MOB ? [
  { x: 0, y: -1.9, z: 0, cols: 26, w: 2.6, levels: 2 }, { x: -.9, y: -1.05, z: -1.4, cols: 18, w: 1.3 }, { x: 1.1, y: -.25, z: -.3, cols: 15, w: 1.1 },
  { x: -.4, y: .55, z: -2.2, cols: 22, w: 1.3, levels: 2 }, { x: 1.0, y: 1.35, z: -1.2, cols: 12, w: .7 }, { x: -1.2, y: 1.0, z: .9, cols: 10, w: .6 }, { x: .2, y: 2.15, z: -.4, cols: 14, w: .8 },
] : [
  { x: 0, y: -1.75, z: 0, cols: 64, w: 3.0, levels: 2 }, { x: -2.7, y: -.9, z: -1.3, cols: 40, w: 1.6 }, { x: 2.5, y: -.1, z: -.4, cols: 34, w: 1.4 },
  { x: -.7, y: .65, z: -2.7, cols: 50, w: 1.6, levels: 3 }, { x: 3.3, y: 1.4, z: -2.1, cols: 26, w: .9 }, { x: -3.7, y: 1.05, z: .9, cols: 24, w: .8 }, { x: .5, y: 2.1, z: -.6, cols: 30, w: 1.0 },
]);

// synthetic exception detail
const PRODUCTS = ['Interest rate swap', 'Corporate bond', 'FX forward', 'Equity swap', 'Credit default swap', 'Repo'];
const RULES = [
  ['Notional within booking tolerance', (r) => [`${fmt(r * 50 + 5)}M ±0.5%`, `${fmt(r * 50 + 5)}M +${(2 + r * 6).toFixed(1)}%`]],
  ['Settlement date on or after trade date', (r) => ['T+2 or later', `T-${1 + Math.floor(r * 2)}`]],
  ['Counterparty LEI present and active', () => ['20-character LEI, active', 'Missing']],
  ['Book mapped to a trading desk', () => ['Mapped desk', 'Unmapped book']],
  ['Price within market range', (r) => ['Within 3σ of close', `${(3.4 + r * 2).toFixed(1)}σ from close`]],
  ['Trade ID unique in the period', () => ['1 occurrence', '2 occurrences']],
];

// ── per-record attributes
function records() {
  seed = 11;
  const A = k => new Float32Array(N * k);
  const aArch = A(3), aXfer = A(3), aSeed = A(4), aMat = A(3), aQ = A(3), aClu = A(3), aSurf = A(3), aSer = A(3), aInfo = A(4), aMeta = A(4);
  for (let i = 0; i < N * 4; i++) aSeed[i] = rnd();
  const E = Math.round(N * .024);
  const excSet = new Set(); while (excSet.size < E) excSet.add(Math.floor(rnd() * N));
  const slot = i => ({ c: i % G.C, r: Math.floor(i / G.C) % G.R, l: Math.floor(i / (G.C * G.R)) });
  for (let i = 0; i < N; i++) { const { c, r, l } = slot(i); aMat.set([c * G.sx - MW / 2, r * G.sy - MH / 2, (l - (G.L - 1) / 2) * G.sz], i * 3); aMeta[i * 4] = i; }

  // the architecture: tables filled in proportion to their weight, with gaps; a few records move between tables
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
      aInfo[i * 4 + 3] = si; aMeta[i * 4 + 1] = r / Math.max(1, t.rows - 1); aMeta[i * 4 + 2] = c / (t.cols - 1);
    }
    at += n;
  });
  for (let i = 0; i < N; i++) {   // transfer target: a place on another table
    const to = SLABS[(aInfo[i * 4 + 3] + 1 + Math.floor(aSeed[i * 4 + 3] * 5)) % SLABS.length];
    aXfer.set([to.x + (rnd() - .5) * to.cols * AP.x * .8, to.y + .06, to.z + (rnd() - .5) * to.rows * AP.z * .8], i * 3);
  }

  // exceptions: queued in the order the wave finds them; ~60% corrected, the rest flagged for review
  const exc = [...excSet].sort((a, b) => slot(a).c - slot(b).c || slot(b).r - slot(a).r);
  const detail = exc.map((i, q) => {
    const fixed = rnd() < .6, ru = Math.floor(rnd() * RULES.length), r = rnd();
    const [ex, ob] = RULES[ru][1](r);
    aInfo[i * 4] = fixed ? 2 : 1;
    aQ.set([Q0 + (q % QC) * QX, MH / 2 - Math.floor(q / QC) * QY, 0], i * 3);
    aMeta[i * 4 + 3] = q / Math.max(1, exc.length - 1);
    return { i, q, fixed, id: `TRD-${String(240000 + Math.floor(rnd() * 760000)).padStart(6, '0')}`, product: PRODUCTS[Math.floor(rnd() * PRODUCTS.length)], rule: RULES[ru][0], expected: ex, observed: ob, block: Math.floor(slot(i).c / BLOCK) };
  });
  const flagged = detail.filter(d => !d.fixed), corrected = detail.filter(d => d.fixed);

  // validated + corrected records carry the analytics; flagged records are held back
  const flagSet = new Set(flagged.map(d => d.i));
  const valid = [...Array(N).keys()].filter(i => !flagSet.has(i)).sort((a, b) => slot(a).c - slot(b).c || slot(a).r - slot(b).r || slot(a).l - slot(b).l);
  const Vn = valid.length, unit = TOTAL_REV / Vn;
  const cells = []; for (let m = 0; m < NM; m++) for (let s = 0; s < NS; s++) cells.push({ m, s, exact: DATA.rev[s][m] / unit });
  cells.forEach(c => { c.n = Math.floor(c.exact); });
  const left = Vn - cells.reduce((a, c) => a + c.n, 0);
  [...cells].sort((a, b) => (b.exact - b.n) - (a.exact - a.n)).slice(0, left).forEach(c => c.n++);
  const maxCell = Math.max(...cells.map(c => c.n)), plate = (MOB ? 2.0 : 2.3) / maxCell;
  const segN = new Array(NS).fill(0); cells.forEach(c => { segN[c.s] += c.n; });
  const tLevel = (MOB ? 2.0 : 2.3) / Math.ceil(Math.max(...segN) / (TX * TZ));
  const segCount = new Array(NS).fill(0), monthCount = new Array(NM).fill(0);
  let k = 0;
  for (const c of cells) for (let j = 0; j < c.n; j++) {
    const i = valid[k++];
    aInfo[i * 4 + 1] = c.s; aInfo[i * 4 + 2] = c.m;
    aSurf.set([(c.m - (NM - 1) / 2) * MX, j * plate + plate / 2, (c.s - (NS - 1) / 2) * MZ], i * 3);
    const q = monthCount[c.m]++, col = q % COLS, row = Math.floor(q / COLS);
    aSer.set([(c.m - (NM - 1) / 2) * MX + (col - (COLS - 1) / 2) * TS, SERIES_Y0 + row * TS + TS / 2, 0], i * 3);
  }
  // towers: each segment's records, month by month from the bottom
  [...valid].sort((a, b) => aInfo[a * 4 + 2] - aInfo[b * 4 + 2]).forEach(i => {
    const s = aInfo[i * 4 + 1], q = segCount[s]++;
    const x = q % TX, z = Math.floor(q / TX) % TZ, l = Math.floor(q / (TX * TZ));
    aClu.set([(x - (TX - 1) / 2) * TXS, l * tLevel + tLevel / 2, (s - (NS - 1) / 2) * TZG + (z - 1) * TZS], i * 3);
  });
  // flagged records: in the queue beside the matrix and the towers, then a tray, then a column beside the chart
  flagged.forEach((d, e) => {
    const i = d.i; aInfo[i * 4 + 1] = -1; aInfo[i * 4 + 2] = -1;
    aClu.set([0, 0, 0], i * 3);   // unused: flagged records stay in the queue (handled in the shader)
    const st = e % 4, h = Math.floor(e / 4);
    aSurf.set([(NM / 2 + .9) * MX + (st % 2) * .32, h * plate + plate / 2, ((NS - 1) / 2) * MZ + .7 + Math.floor(st / 2) * .5], i * 3);
    aSer.set([(NM / 2 + (MOB ? 2.6 : 3.4)) * MX + (e % COLS - (COLS - 1) / 2) * TS, SERIES_Y0 + Math.floor(e / COLS) * TS + TS / 2, 0], i * 3);
  });
  return { aArch, aXfer, aSeed, aMat, aQ, aClu, aSurf, aSer, aInfo, aMeta, E, Vn, unit, cells, plate, tLevel, segN, detail, flagged, corrected, maxMonth: Math.max(...monthCount) };
}

const VERT = /* glsl */`
attribute vec3 aArch; attribute vec3 aXfer; attribute vec4 aSeed; attribute vec3 aMat; attribute vec3 aQ; attribute vec3 aClu;
attribute vec3 aSurf; attribute vec3 aSer; attribute vec4 aInfo; attribute vec4 aMeta;
uniform float uP, uTime, uWave, uRes, uDone, uIntro, uLens, uAnom, uMX, uHover, uSeg, uSel;
uniform vec2 uPointer;
varying vec3 vN; varying vec3 vCol; varying float vEm; varying vec3 vW;

vec3 segCol(float s){
  if(s < .5) return vec3(.90,.93,.97);
  if(s < 1.5) return vec3(.62,.68,.77);
  if(s < 2.5) return vec3(.24,.80,.76);
  if(s < 3.5) return vec3(.36,.52,.78);
  if(s < 4.5) return vec3(.46,.51,.60);
  return vec3(.15,.48,.54);
}
const vec3 AMBER = vec3(.98,.64,.26), FLAG = vec3(.86,.42,.25), DIM = vec3(.19,.22,.27), LIT = vec3(.64,.80,.84);

void state(float i, out vec3 p, out vec3 T, out vec3 Nn, out vec3 sc, out vec3 col, out float em){
  float ex = aInfo.x;                                         // 0 valid, 1 flagged, 2 corrected
  bool anom = abs(aInfo.y - ${ANOM.s}.) < .1 && abs(aInfo.z - ${ANOM.m}.) < .1;
  T = vec3(1.,0.,0.); Nn = vec3(0.,1.,0.);
  if(i < .5){
    // data architecture
    float sl = aInfo.w;
    float batch = exp(-pow((aMeta.y - fract(uTime*.06 + sl*.31))*16., 2.));                       // a batch write runs along the rows
    float tt = fract(uTime*.045 + aSeed.x*7.);
    float go = (smoothstep(.05, .32, tt) - smoothstep(.55, .82, tt)) * step(.985, aSeed.y);
    float hop = 4.*go*(1. - go);
    p = mix(aArch, aXfer, go) + vec3(0., .035*sin(uTime*.42 + sl*1.7) + batch*.07 + hop*.65, 0.);
    Nn = vec3(0.,0.,1.);
    sc = vec3(.132, .064, .016);
    col = mix(vec3(.40,.45,.53), vec3(.74,.80,.87), sl/6.);
    col = mix(col, vec3(.48,.90,.88), max(batch*.45, step(.001, hop)*.85));
    em = batch*.12 + hop*.5;
  } else if(i < 1.5){
    // validation: rules run per column group; failures detach to the queue; resolution; completion
    float colI = floor((aMat.x + ${(MW / 2).toFixed(4)})/${G.sx} + .5);
    float bx = (floor(colI/${BLOCK}.)*${BLOCK}. + ${((BLOCK - 1) / 2).toFixed(1)})*${G.sx} - ${(MW / 2).toFixed(4)};
    float dw = uWave - bx;
    float passed = smoothstep(-.04, .1, dw);
    float pulse = exp(-pow(dw*2.6, 2.));
    p = aMat; p.z *= mix(1., .86, uDone);
    sc = vec3(.135, .056, .014);
    col = mix(DIM, LIT, passed); em = pulse*.5 + passed*.04 + uDone*.03;
    if(ex > .5){
      float detach = smoothstep(.1, 1.2, dw);
      float r = clamp(uRes*1.7 - aMeta.w*.7, 0., 1.);
      float back = ex > 1.5 ? smoothstep(.35, 1., r) : 0.;
      vec3 slot = p + vec3(0., 0., .35*passed);
      vec3 qp = aQ;
      vec3 mid = mix(slot, qp, .5) + vec3(0., .25, .9);
      float d2 = detach*detach*(3. - 2.*detach);
      vec3 toQ = mix(mix(slot, mid, d2), mix(mid, qp, d2), d2);
      vec3 mid2 = mix(qp, p, .5) + vec3(0., .2, .8);
      p = mix(mix(toQ, mid2, back), mix(mid2, p, back), back);
      col = mix(col, AMBER, passed);
      col = mix(col, ex > 1.5 ? LIT : FLAG, smoothstep(.0, .35, r));
      em += passed*(1. - back)*.25 + (ex > 1.5 ? 0. : smoothstep(.0, .35, r)*.1);
      sc *= mix(1. + passed*.2, .72, detach*(1. - back));               // queued records sit tighter
    }
  } else if(i < 2.5){
    // segment towers (flagged records stay in the queue)
    p = ex > .5 && ex < 1.5 ? aQ : aClu;
    sc = ex > .5 && ex < 1.5 ? vec3(.135, .056, .014) : vec3(${(TXS * .82).toFixed(3)}, .01, ${(TZS * .8).toFixed(3)});
    col = ex > .5 && ex < 1.5 ? FLAG : segCol(aInfo.y); em = ex > .5 && ex < 1.5 ? .1 : .04;
  } else if(i < 3.5){
    p = aSurf;
    sc = vec3(uMX*.78, .0068 + uMX*.012, uMX*1.15);
    col = segCol(aInfo.y); em = .04;
    if(anom){ col = mix(col, AMBER, uAnom); em += uAnom*.2; }
    if(ex > .5 && ex < 1.5){ col = FLAG*.85; em = .1; }
  } else {
    p = aSer;
    float t = ${TS.toFixed(4)};
    sc = vec3(t*.86, t*.86, .012);
    col = segCol(aInfo.y); em = .05;
    if(anom){ col = mix(col, AMBER, uAnom); em += uAnom*.2; }
    if(ex > .5 && ex < 1.5){ col = FLAG*.9; em = .14; }
  }
}
void main(){
  float a = floor(clamp(uP, 0., 3.999)), f = uP - a;
  vec3 pA, tA, nA, sA, cA; float eA;
  vec3 pB, tB, nB, sB, cB; float eB;
  state(a, pA, tA, nA, sA, cA, eA);
  state(a + 1., pB, tB, nB, sB, cB, eB);
  float ex = aInfo.x;
  // stagger: every transition sweeps in a direction that means something
  float d;
  if(a < .5) d = (1. - aInfo.w/6.)*.36 + aSeed.w*.12;                                // tables peel off level by level
  else if(a < 1.5) d = (ex > .5 && ex < 1.5 ? 0. : aInfo.y/5.*.34) + aSeed.w*.14;    // segment by segment
  else if(a < 2.5) d = (aInfo.z < 0. ? 1. : aInfo.z/${NM - 1}.)*.42 + aSeed.w*.1;    // month by month
  else d = aSeed.w*.18 + clamp(aSurf.y/2.3, 0., 1.)*.32;
  float k = smoothstep(0., 1., clamp(f*1.55 - d, 0., 1.));
  // controlled lift, then a magnetic snap
  vec3 lift = a < .5 ? vec3((aSeed.y - .5)*.5, .45 + aSeed.z*.7, (aSeed.w - .5)*.6)
            : a < 1.5 ? vec3((aSeed.y - .5)*.6, .35 + aSeed.z*.6, (aSeed.w - .5)*.5)
            : a < 2.5 ? vec3(0., .25 + aSeed.z*.4, 0.)
            : vec3((aSeed.y - .5)*.8, (aSeed.z - .2)*1.0, (aSeed.w - .3)*1.4);
  vec3 ctrl = mix(pA, pB, .5) + lift;
  vec3 p = mix(mix(pA, ctrl, k), mix(ctrl, pB, k), k);
  vec3 T = normalize(mix(tA, tB, k) + vec3(1e-4));
  vec3 Nn = normalize(mix(nA, nB, k) + vec3(0., 1e-4, 0.));
  vec3 B = normalize(cross(T, Nn)); Nn = cross(B, T);
  vec3 sc = mix(sA, sB, k);
  vec3 col = mix(cA, cB, k);
  float em = mix(eA, eB, k) + sin(k*3.14159)*.12;
  // intro: the tables fill, level by level
  float intro = clamp(uIntro*1.6 - aInfo.w/6.*.35 - aSeed.x*.25, 0., 1.);
  intro = intro*intro*(3. - 2.*intro);
  sc *= intro; p.y += (1. - intro)*1.6;
  // cursor: records under it lift (architecture); selection and highlighting
  vec4 clip = projectionMatrix * viewMatrix * vec4(p, 1.);
  vec2 ndc = clip.xy/clip.w;
  float lens = uLens * smoothstep(.26, 0., distance(ndc*vec2(1., .72), uPointer*vec2(1., .72)));
  p.y += lens*.28; em += lens*.35; col = mix(col, vec3(.55,.95,.92), lens*.35);
  float sel = 1. - step(.5, abs(aMeta.x - uSel));
  em += sel*.7; sc *= 1. + sel*.6;
  float chart = smoothstep(2.6, 3.0, uP);
  float hov = (1. - step(.5, abs(aInfo.z - uHover))) * chart;
  em += hov*.3;
  float segOn = step(-.5, uSeg) * chart;
  float match = 1. - step(.5, abs(aInfo.y - uSeg));
  col *= mix(1., mix(.28, 1.15, match), segOn); em *= mix(1., match, segOn);
  mat3 R = mat3(T, Nn, B);
  vec3 w = p + R*(position*sc);
  vN = R*normal; vCol = col; vEm = em; vW = w;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.);
}`;
const FRAG = /* glsl */`
uniform vec3 uCam, uFog; uniform float uFogNear, uFogFar;
varying vec3 vN; varying vec3 vCol; varying float vEm; varying vec3 vW;
void main(){
  vec3 N = normalize(vN), Vv = normalize(uCam - vW);
  if(dot(N, Vv) < 0.) N = -N;
  vec3 L = normalize(vec3(-.45, .85, .55)), L2 = normalize(vec3(.7, .2, -.6));
  float diff = max(dot(N, L), 0.), back = max(dot(N, L2), 0.);
  float hemi = .5 + .5*N.y;
  float spec = pow(max(dot(N, normalize(L + Vv)), 0.), 48.);
  float fres = pow(1. - max(dot(N, Vv), 0.), 3.);
  vec3 c = vCol*(.1 + .62*diff + .18*hemi) + vec3(.35,.55,.75)*back*.16 + spec*vec3(.9,.95,1.)*.5 + fres*vec3(.4,.62,.78)*.24;
  c += vCol*vEm;
  float fog = smoothstep(uFogNear, uFogFar, length(uCam - vW));
  gl_FragColor = vec4(mix(c, uFog, fog), 1.);
}`;

function webgl() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

// ── scroll model: five layouts; [hold start, hold end] in track progress
const STOPS = [[0, .05], [.14, .46], [.52, .565], [.635, .69], [.77, 1]];
function progress(g) {
  let p = 0; const sub = [0, 0, 0, 0, 0];
  for (let i = 0; i < STOPS.length; i++) {
    const [a, b] = STOPS[i];
    if (g >= a) { p = i; sub[i] = clamp((g - a) / (b - a)); }
    if (i < STOPS.length - 1 && g > b && g < STOPS[i + 1][0]) { p = i + smooth((g - b) / (STOPS[i + 1][0] - b)); sub[i] = 1; }
  }
  return { p, sub };
}
// validation phases inside the matrix hold
const WAVE = [.03, .5], RES = [.55, .77], DONE = [.8, .94];

function boot() {
  const $ = id => document.getElementById(id);
  const track = $('track');
  const copies = [...document.querySelectorAll('.copy')], status = document.querySelector('.status'), legend = $('legend');
  const phs = [...document.querySelectorAll('.k1 .ph')];
  const stageLinks = [...document.querySelectorAll('.stages a')];
  const gOf = () => clamp(-track.getBoundingClientRect().top / Math.max(1, track.offsetHeight - innerHeight));
  const goto = g => scrollTo({ top: track.offsetTop + g * (track.offsetHeight - innerHeight), behavior: reduce ? 'auto' : 'smooth' });
  const TARGET = [0, STOPS[1][0] + .02, STOPS[4][0] + .03];
  stageLinks.forEach(a => a.addEventListener('click', e => { e.preventDefault(); goto(TARGET[+a.dataset.g]); }));
  const R = records();
  const W2 = MW / 2;
  const waveX = s => lerp(-W2 - .5, W2 + .5, smooth((s - WAVE[0]) / (WAVE[1] - WAVE[0])));

  // ── the anomaly, measured
  const dev = (s, m) => DATA.rev[s][m] / DATA.trend[s][m] - 1;
  const devs = []; for (let s = 0; s < NS; s++) for (let m = 0; m < NM; m++) if (!(s === ANOM.s && m === ANOM.m)) devs.push(dev(s, m));
  const sd = Math.sqrt(devs.reduce((a, d) => a + d * d, 0) / devs.length);
  const aDev = dev(ANOM.s, ANOM.m), aRev = DATA.rev[ANOM.s][ANOM.m], aTr = DATA.trend[ANOM.s][ANOM.m];
  const othersMax = Math.max(...SEGS.map((_, s) => s === ANOM.s ? 0 : Math.abs(dev(s, ANOM.m))));
  const pct = Math.round(aDev * 100);
  $('anom-label').textContent = `${SEGS[ANOM.s]} ${pct}% in ${monthName(ANOM.m)}`;
  $('a-head').textContent = `${SEGS[ANOM.s]} revenue fell in ${monthName(ANOM.m)}`;
  $('a-what').textContent = `$${aRev.toFixed(1)}M, against a trend of $${aTr.toFixed(1)}M for the month.`;
  $('a-seg').textContent = `${SEGS[ANOM.s]} only. The other five segments stayed within ${Math.ceil(othersMax * 100)}% of their trend that month.`;
  $('a-size').textContent = `−$${(aTr - aRev).toFixed(1)}M, ${pct}% against trend: the largest deviation in 24 months, about ${Math.round(Math.abs(aDev) / sd)}× a typical monthly deviation.`;
  $('a-why').textContent = 'A drop this size in one segment, while the rest of the book holds steady, is unlikely to be noise and points to something specific to that client group.';

  if (!webgl()) { root.classList.add('no-gl'); return; }

  const canvas = $('engine');
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  let dpr = Math.min(devicePixelRatio || 1, MOB ? 1.6 : 1.75); renderer.setPixelRatio(dpr);
  const scene = new Scene();
  const camera = new PerspectiveCamera(MOB ? 52 : 40, 1, .1, 80);

  const skyU = { uA: { value: 1 }, uT: { value: 0 } };
  const sky = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({
    depthTest: false, depthWrite: false, uniforms: skyU,
    vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `varying vec2 v; uniform float uA, uT;
      void main(){
        vec2 p = (v - vec2(.62, 1.05))*vec2(uA, 1.);
        float r = length(p);
        vec3 c = mix(vec3(.055,.09,.16), vec3(.031,.043,.063), smoothstep(.0, 1.25, r));
        float shaft = smoothstep(.55, 0., abs((v.x - .58) + (v.y - 1.)*.42)) * smoothstep(.0, .9, v.y);
        c += vec3(.05,.08,.11)*shaft*(.6 + .4*uT);
        gl_FragColor = vec4(c, 1.);
      }`,
  }));
  sky.frustumCulled = false; sky.renderOrder = -1; scene.add(sky);

  const box = new BoxGeometry(1, 1, 1);
  const geo = new InstancedBufferGeometry();
  geo.index = box.index; geo.setAttribute('position', box.getAttribute('position')); geo.setAttribute('normal', box.getAttribute('normal'));
  for (const [k, n] of [['aArch', 3], ['aXfer', 3], ['aSeed', 4], ['aMat', 3], ['aQ', 3], ['aClu', 3], ['aSurf', 3], ['aSer', 3], ['aInfo', 4], ['aMeta', 4]]) geo.setAttribute(k, new InstancedBufferAttribute(R[k], n));
  geo.instanceCount = N;
  const U = {
    uP: { value: 0 }, uTime: { value: 0 }, uWave: { value: -99 }, uRes: { value: 0 }, uDone: { value: 0 }, uIntro: { value: reduce ? 1 : 0 }, uLens: { value: 0 },
    uAnom: { value: 0 }, uMX: { value: MX }, uHover: { value: -9 }, uSeg: { value: -9 }, uSel: { value: -9 }, uPointer: { value: new Vector2(9, 9) },
    uCam: { value: new Vector3() }, uFog: { value: new Color(.035, .05, .075) }, uFogNear: { value: 10 }, uFogFar: { value: 28 },
  };
  const mesh = new Mesh(geo, new ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: U }));
  mesh.frustumCulled = false; scene.add(mesh);

  // supporting lines
  const lineMat = (c) => new LineBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false });
  const seg = arr => { const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(arr), 3)); return g; };
  const ar = [];
  SLABS.forEach((t, si) => {
    const hx = (t.cols - 1) / 2 * AP.x + .12, hz = (t.rows - 1) / 2 * AP.z + .08, y = t.y - .02;
    const c = [[t.x - hx, t.z - hz], [t.x + hx, t.z - hz], [t.x + hx, t.z + hz], [t.x - hx, t.z + hz]];
    c.forEach((q, k) => { const n = c[(k + 1) % 4]; ar.push(q[0], y, q[1], n[0], y, n[1]); });
    if (si) { const b = SLABS[0]; ar.push(t.x - hx, y, t.z - hz, t.x - hx, b.y, t.z - hz, t.x + hx, y, t.z + hz, t.x + hx, b.y, t.z + hz); }
  });
  const arch = new LineSegments(seg(ar), lineMat(0x9fb3c8)); scene.add(arch);
  const fr = [];
  for (let l = 0; l < G.L; l++) {
    const z = (l - (G.L - 1) / 2) * G.sz, x0 = -MW / 2 - .14, x1 = MW / 2 + .14, y0 = -MH / 2 - .08, y1 = MH / 2 + .08;
    fr.push(x0, y0, z, x1, y0, z, x1, y0, z, x1, y1, z, x1, y1, z, x0, y1, z, x0, y1, z, x0, y0, z);
  }
  for (let b = 0; b <= G.C / BLOCK; b++) { const x = b * BLOCK * G.sx - G.sx / 2 - MW / 2; fr.push(x, MH / 2 + .12, 0, x, MH / 2 + .2, 0); }   // rule-group ticks
  const mframe = new LineSegments(seg(fr), lineMat(0x9fb3c8)); scene.add(mframe);
  const qrows = Math.ceil(R.E / QC);
  const qb = [Q0 - .12, MH / 2 + .1, Q0 + (QC - 1) * QX + .12, MH / 2 - (qrows - 1) * QY - .1];
  const qframe = new LineSegments(seg([qb[0], qb[1], 0, qb[2], qb[1], 0, qb[2], qb[1], 0, qb[2], qb[3], 0, qb[2], qb[3], 0, qb[0], qb[3], 0, qb[0], qb[3], 0, qb[0], qb[1], 0]), lineMat(0xffb547)); scene.add(qframe);
  const x0 = -(NM - 1) / 2 * MX - MX * .6, x1 = (NM - 1) / 2 * MX + MX * .6, sg = [];
  for (let s = 0; s < NS; s++) { const z = (s - (NS - 1) / 2) * MZ; sg.push(x0, 0, z, x1, 0, z); }
  for (let m = 0; m < NM; m += 3) { const x = (m - (NM - 1) / 2) * MX; sg.push(x, 0, -(NS / 2) * MZ, x, 0, (NS / 2) * MZ); }
  const sgrid = new LineSegments(seg(sg), lineMat(0x8fa3b8)); scene.add(sgrid);
  const tg = []; for (let s = 0; s < NS; s++) { const z = (s - (NS - 1) / 2) * MZ, hx = TX * TXS / 2 + .1; tg.push(-hx, 0, z - .3, hx, 0, z - .3, hx, 0, z - .3, hx, 0, z + .3, hx, 0, z + .3, -hx, 0, z + .3, -hx, 0, z + .3, -hx, 0, z - .3); }
  const tgrid = new LineSegments(seg(tg), lineMat(0x8fa3b8)); scene.add(tgrid);
  const perRow = COLS * R.unit, step = niceStep(R.maxMonth * R.unit / 4);
  const ax = [x0, SERIES_Y0, 0, x1, SERIES_Y0, 0], yTicks = [];
  for (let v = step; v <= R.maxMonth * R.unit * 1.02; v += step) { const y = SERIES_Y0 + v / perRow * TS; ax.push(x0, y, -.02, x1, y, -.02); yTicks.push([v, y]); }
  const axes = new LineSegments(seg(ax), lineMat(0x8fa3b8)); scene.add(axes);

  // labels (projected HTML)
  const labelLayer = $('labels'), labs = [];
  const mk = (text, cls, v, st, al = 'c', w = 3) => { const el = document.createElement('div'); el.className = 'lab ' + cls; el.textContent = text; labelLayer.appendChild(el); labs.push({ el, v, st, al, w }); return el; };
  mk('Exception queue', 'tray', V(Q0 + (QC - 1) * QX / 2, MH / 2 + .3, 0), 1);
  mk('Rules run on groups of records', 'layer', V(-W2 + 1.6, MH / 2 + .34, 0), 1);
  SEGS.forEach((s, i) => { if (!MOB || i % 1 === 0) { const el = mk('', 'seg tw', V(0, Math.ceil(R.segN[i] / (TX * TZ)) * R.tLevel + .3, (i - (NS - 1) / 2) * TZG), 2); el.innerHTML = MOB ? `<b>$${fmt(R.segN[i] * R.unit)}M</b>` : `${s}<b>$${fmt(R.segN[i] * R.unit)}M</b>`; } });
  if (!MOB) SEGS.forEach((s, i) => mk(s, 'seg', V(x0 - .12, .02, (i - (NS - 1) / 2) * MZ), 3, 'r'));
  for (let m = 0; m < NM; m += MOB ? 6 : 3) mk(m % 12 === 0 ? monthName(m) : MONTHS[m % 12], 'axis', V((m - (NM - 1) / 2) * MX, 0, (NS / 2) * MZ + .25), 3);
  mk('Flagged, held back', 'tray', V((NM / 2 + 1.05) * MX, .5, ((NS - 1) / 2) * MZ + .95), 3);
  for (let m = 0; m < NM; m += MOB ? 6 : 3) mk(m % 12 === 0 ? monthName(m) : MONTHS[m % 12], 'axis', V((m - (NM - 1) / 2) * MX, SERIES_Y0 - .2, 0), 4);
  yTicks.forEach(([v, y]) => mk(`$${Math.round(v)}M`, 'val', MOB ? V(x0, y + .09, 0) : V(x0 - .1, y, 0), 4, MOB ? 'l' : 'r'));
  let acc = 0;
  if (!MOB) SEGS.forEach((s, i) => { const c = R.cells.find(c => c.m === NM - 1 && c.s === i); const mid = acc + c.n / 2; acc += c.n; mk(s, 'seg', V(x1 + .05, SERIES_Y0 + Math.floor(mid / COLS) * TS, 0), 4, 'l'); });
  mk(MOB ? `${R.flagged.length}` : `${R.flagged.length} flagged`, 'tray', V((NM / 2 + (MOB ? 2.6 : 3.4)) * MX, SERIES_Y0 + R.flagged.length / COLS * TS + .18, 0), 4);
  // anchors for the anomaly button
  const anCell = R.cells.find(c => c.m === ANOM.m && c.s === ANOM.s);
  const below = R.cells.filter(c => c.m === ANOM.m && c.s < ANOM.s).reduce((a, c) => a + c.n, 0);
  const anSurf = V((ANOM.m - (NM - 1) / 2) * MX, anCell.n * R.plate + .25, (ANOM.s - (NS - 1) / 2) * MZ);
  const anSer = V((ANOM.m - (NM - 1) / 2) * MX + MX * .6, SERIES_Y0 + (below + anCell.n / 2) / COLS * TS, 0);

  // ── camera choreography
  const camKeys = {
    raw: MOB ? [V(-3.4, 5.0, 12.6), V(0, -1.5, -.8)] : [V(-9.4, 4.2, 10.0), V(-2.6, -1.6, -.9)],
    matrix: s => {
      const K = MOB
        ? [[0, V(-2.2, .7, 11.2), V(.3, .2, 0)], [.45, V(.4, .5, 11.4), V(.8, .1, 0)], [.66, V(2.4, .4, 7.4), V(2.8, .1, 0)], [.78, V(2.4, .4, 7.4), V(2.8, .1, 0)], [1, V(.6, .8, 13.6), V(.6, .1, 0)]]
        : [[0, V(-6.4, 1.6, 8.6), V(-.6, 0, 0)], [.28, V(-2.6, 1.1, 9.4), V(.6, 0, 0)], [.52, V(2.8, .9, 7.8), V(3.4, .1, 0)], [.7, V(4.9, .5, 6.0), V(5.4, .1, 0)], [.8, V(4.9, .5, 6.0), V(5.4, .1, 0)], [1, V(1.4, 1.5, 12.4), V(1.0, .05, 0)]];
      let j = 0; while (j < K.length - 2 && s > K[j + 1][0]) j++;
      const t = ease((s - K[j][0]) / (K[j + 1][0] - K[j][0]));
      return [K[j][1].clone().lerp(K[j + 1][1], t), K[j][2].clone().lerp(K[j + 1][2], t)];
    },
    towers: s => MOB ? [V(-11.5, 2.6 + s * .4, .2), V(0, .4, 0)] : [V(-9.6, 2.4 + s * .5, -1.6 - s * .6), V(0, 1.0, -1.5)],
    surface: s => { const a = (s - .5) * .35; const base = MOB ? V(-3.0, 5.4, 10) : V(-6.6, 5.4, 9.8); return [base.applyAxisAngle(V(0, 1, 0), a), MOB ? V(0, -.4, 0) : V(1.5, 1.3, 0)]; },
    series: () => MOB ? [V(.4, .1, 12.6), V(.4, .45, 0)] : [V(1.0, 1.2, 11.2), V(1.2, 1.15, 0)],
  };
  const keyFor = (i, sub) => i === 0 ? camKeys.raw : i === 1 ? camKeys.matrix(sub[1]) : i === 2 ? camKeys.towers(sub[2]) : i === 3 ? camKeys.surface(sub[3]) : camKeys.series();

  const resize = () => { renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); skyU.uA.value = innerWidth / innerHeight; };
  resize(); addEventListener('resize', resize);
  matchMedia(`(resolution: ${devicePixelRatio}dppx)`).addEventListener?.('change', () => { dpr = Math.min(devicePixelRatio || 1, MOB ? 1.6 : 1.75); resize(); });

  // ── input
  const pointer = new Vector2(9, 9), pointerT = new Vector2(9, 9), mouse = { x: -1, y: -1 }; let lastMove = -1e9;
  const setP = (x, y) => { mouse.x = x; mouse.y = y; pointerT.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); lastMove = performance.now(); };
  addEventListener('pointermove', e => setP(e.clientX, e.clientY), { passive: true });
  addEventListener('touchstart', e => { const t = e.touches[0]; if (t) setP(t.clientX, t.clientY); }, { passive: true });
  addEventListener('touchmove', e => { const t = e.touches[0]; if (t) setP(t.clientX, t.clientY); }, { passive: true });

  // exception inspection
  const xpanel = $('xpanel'), inspectBtn = $('inspect');
  let hoverX = null, pinnedX = null, queueVisible = [];
  const showX = d => {
    if (!d) { xpanel.hidden = true; U.uSel.value = -9; return; }
    xpanel.hidden = false; U.uSel.value = d.i;
    $('x-id').textContent = d.id; $('x-prod').textContent = d.product; $('x-rule').textContent = d.rule;
    $('x-exp').textContent = d.expected; $('x-obs').textContent = d.observed;
    const resolved = U.uRes.value * 1.7 - d.q / Math.max(1, R.E - 1) * .7 > .35;
    const st = $('x-st'); st.className = resolved ? (d.fixed ? 'fix' : 'flag') : '';
    st.textContent = !resolved ? 'Open: awaiting review' : d.fixed ? 'Corrected at source and revalidated' : 'Flagged for review by the desk';
  };
  const cycle = k => { const list = queueVisible.length ? queueVisible : R.detail; const cur = pinnedX ? list.indexOf(pinnedX) : -1; pinnedX = list[(cur + k + list.length) % list.length]; showX(pinnedX); };
  $('x-next').addEventListener('click', () => cycle(1)); $('x-prev').addEventListener('click', () => cycle(-1));
  $('x-close').addEventListener('click', () => { pinnedX = null; showX(null); inspectBtn.focus(); });
  inspectBtn.addEventListener('click', () => { cycle(1); $('x-next').focus(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') { pinnedX = null; showX(null); closeAnom(); } });
  addEventListener('click', e => { if (e.target === document.body || e.target.closest('.stage-pin') && !e.target.closest('button, .xpanel, .apanel')) { if (hoverX) { pinnedX = hoverX === pinnedX ? null : hoverX; showX(pinnedX); } } });

  // segment highlighting
  let segPinned = -9, segHover = -9;
  legend.querySelectorAll('button').forEach(b => {
    const s = +b.dataset.s;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('mouseenter', () => { segHover = s; }); b.addEventListener('mouseleave', () => { segHover = -9; });
    b.addEventListener('focus', () => { segHover = s; }); b.addEventListener('blur', () => { segHover = -9; });
    b.addEventListener('click', () => { segPinned = segPinned === s ? -9 : s; legend.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.s === segPinned))); });
  });
  // the anomaly
  const anomBtn = $('anom-btn'), apanel = $('apanel');
  const closeAnom = () => { apanel.hidden = true; anomBtn.setAttribute('aria-expanded', 'false'); };
  anomBtn.addEventListener('click', () => { const open = apanel.hidden; apanel.hidden = !open; anomBtn.setAttribute('aria-expanded', String(open)); });

  let g = gOf(), clock = 0, visible = true, last = performance.now(), frames = 0, ft = 0;
  const tip = $('tip'), tmp = new Vector3();
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible && !window.__manual) { last = performance.now(); requestAnimationFrame(loop); } });
  const near = (p, k, w = 2.4) => clamp(1 - Math.abs(p - k) * w);
  const project = v => { tmp.copy(v).project(camera); return { x: (tmp.x + 1) / 2 * innerWidth, y: (1 - tmp.y) / 2 * innerHeight, ok: tmp.z < 1 && tmp.z > -1 }; };
  const setO = (el, o) => { el.style.setProperty('--o', o.toFixed(3)); el.style.visibility = o > .01 ? 'visible' : 'hidden'; };
  const vChecked = $('v-checked'), vExc = $('v-exc'), vCor = $('v-cor'), vFlag = $('v-flag'), vDone = $('v-done');
  const qPos = new Vector3();

  function frame(dt, draw = true) {
    clock += dt / 1000;
    g += (gOf() - g) * (reduce ? 1 : 1 - Math.pow(.004, dt / 1000));
    const { p, sub } = progress(g);
    const t = reduce ? 0 : clock;
    U.uP.value = p; U.uTime.value = t;
    U.uIntro.value = reduce ? 1 : ease(clamp((clock - .1) / 2.6));
    const inM = p >= .999 && p <= 1.001;
    const s1 = p < 1 ? 0 : p > 1.001 ? 1 : sub[1];
    const wx = p < 1 ? -W2 - 1 : waveX(s1);
    const res = smooth((s1 - RES[0]) / (RES[1] - RES[0])), done = smooth((s1 - DONE[0]) / (DONE[1] - DONE[0]));
    U.uWave.value = wx; U.uRes.value = res; U.uDone.value = done;
    U.uAnom.value = smooth((p - 2.6) / .4);
    if (!reduce && performance.now() - lastMove > 4000) pointerT.set(Math.sin(t * .31) * .5 + .2, Math.sin(t * .43 + 1) * .3 - .1);
    pointer.lerp(pointerT, .08); U.uPointer.value.copy(pointer);
    U.uLens.value = (reduce ? 0 : 1) * clamp(1 - p * 2.5) * clamp((clock - 2.4) / 1.2);

    // camera
    const i = Math.min(3, Math.floor(p)), f = ease(p - i);
    const A = keyFor(i, sub), B = keyFor(i + 1, sub);
    const cp = A[0].clone().lerp(B[0], f), cl = A[1].clone().lerp(B[1], f);
    if (!reduce) {
      const raw = clamp(1 - p);
      cp.sub(cl).applyAxisAngle(V(0, 1, 0), (Math.sin(t * .05) * .1 + sub[0] * .28) * raw).add(cl);
      const par = raw + near(p, 2) * .6 + near(p, 3) * .5;
      cp.x += pointer.x * .3 * par; cp.y += pointer.y * .18 * par;
    }
    camera.position.copy(cp); camera.lookAt(cl); U.uCam.value.copy(cp);
    skyU.uT.value = Math.sin(t * .2);

    arch.material.opacity = .16 * near(p, 0, 1.6); arch.visible = arch.material.opacity > .003;
    mframe.material.opacity = .2 * near(p, 1, 2) * (1 - done * .4); mframe.visible = mframe.material.opacity > .003;
    qframe.material.opacity = .45 * near(p, 1, 2) * smooth((s1 - .08) / .1); qframe.visible = qframe.material.opacity > .003;
    tgrid.material.opacity = .2 * near(p, 2, 2); tgrid.visible = tgrid.material.opacity > .003;
    sgrid.material.opacity = .2 * near(p, 3, 2); sgrid.visible = sgrid.material.opacity > .003;
    axes.material.opacity = .22 * near(p, 4, 2); axes.visible = axes.material.opacity > .003;

    // copy, status, phase headline
    const show = [near(p, 0, 3), near(p, 1, 3), near(p, 2, 3), near(p, 3, 3), near(p, 4, 3)];
    copies.forEach((el, k) => setO(el, show[k]));
    setO(status, show[1]); setO(legend, MOB ? Math.max(show[2], show[4]) : show[4]); setO(inspectBtn, show[1] * smooth((s1 - .2) / .08) * (xpanel.hidden ? 1 : 0));
    const ph = s1 < .1 ? 0 : s1 < RES[0] ? 1 : s1 < DONE[0] ? 2 : 3;
    phs.forEach((el, k) => el.classList.toggle('on', k === ph));
    root.style.setProperty('--so', clamp(p * 2).toFixed(3)); root.style.setProperty('--cue', String(clamp(1 - g * 30)));
    const passedFrac = clamp((wx + W2) / (2 * W2));
    const found = R.detail.filter(d => ((d.block * BLOCK + (BLOCK - 1) / 2) * G.sx - W2) < wx).length;
    vChecked.textContent = fmt(N * passedFrac); vExc.textContent = fmt(found);
    vCor.textContent = res > .02 ? fmt(R.corrected.length * res) : '–';
    vFlag.textContent = res > .02 ? fmt(R.flagged.length * res) : '–';
    vDone.textContent = done > .5 ? `Complete: ${fmt(N - R.flagged.length)} records passed to reporting, ${R.flagged.length} held for review.` : '';
    stageLinks.forEach((a, k) => { const pk = k === 0 ? 0 : k === 1 ? 1 : 3; const on = k === 0 ? p < .5 : k === 1 ? p >= .5 && p < 1.5 : p >= 1.5; a.classList.toggle('on', on); a.querySelector('i').style.setProperty('--f', (k === 0 ? clamp(1 - p) : k === 1 ? clamp(p) * (p < 1.5 ? 1 : clamp(2 - p)) : clamp((p - 1.5) / 2.5)).toFixed(3)); void pk; });

    // exceptions under the pointer (in the queue only)
    hoverX = null; queueVisible = [];
    if (inM && s1 > .12) {
      let best = 18 * 18;
      for (const d of R.detail) {
        const bx = (d.block * BLOCK + (BLOCK - 1) / 2) * G.sx - W2;
        const det = smooth((wx - bx - .1) / 1.1);
        const r = clamp(res * 1.7 - d.q / Math.max(1, R.E - 1) * .7), back = d.fixed ? smooth((r - .35) / .65) : 0;
        if (det < .95 || back > .05) continue;
        queueVisible.push(d);
        if (performance.now() - lastMove > 4000) continue;
        qPos.set(R.aQ[d.i * 3], R.aQ[d.i * 3 + 1], 0);
        const s = project(qPos), dx = s.x - mouse.x, dy = s.y - mouse.y, dd = dx * dx + dy * dy;
        if (dd < best) { best = dd; hoverX = d; }
      }
    }
    if (!(inM && s1 > .12) && pinnedX) { pinnedX = null; }
    const showing = pinnedX || hoverX;
    if (showing) showX(showing); else if (!xpanel.hidden || U.uSel.value !== -9) showX(null);
    canvas.style.cursor = hoverX ? 'pointer' : '';

    // the chart: month under the pointer, segment highlight, tooltip
    let hov = -9;
    const chartOn = near(p, 4, 3) > .6;
    if (chartOn && performance.now() - lastMove < 4000) {
      const top = project(V(0, SERIES_Y0 + R.maxMonth / COLS * TS + .2, 0)), bot = project(V(0, SERIES_Y0, 0));
      if (mouse.y > top.y - 20 && mouse.y < bot.y + 20) {
        let best = 1e9;
        for (let m = 0; m < NM; m++) { const q = project(qPos.set((m - (NM - 1) / 2) * MX, 0, 0)); const d = Math.abs(q.x - mouse.x); if (d < best) { best = d; hov = m; } }
        const w = Math.abs(project(V(MX, 0, 0)).x - project(V(0, 0, 0)).x);
        if (best > w * .6) hov = -9;
      }
    }
    if (!apanel.hidden) hov = -9;
    U.uHover.value = hov;
    const segSel = segPinned >= 0 ? segPinned : segHover;
    U.uSeg.value = chartOn || near(p, 3, 3) > .6 ? segSel : -9;
    if (hov >= 0) {
      const cs = R.cells.filter(c => c.m === hov), tot = cs.reduce((a, c) => a + c.n, 0) * R.unit;
      const focus = segSel >= 0 ? cs.find(c => c.s === segSel) : cs.reduce((a, c) => c.n > a.n ? c : a);
      const share = Math.round(focus.n / cs.reduce((a, c) => a + c.n, 0) * 100);
      const vsTrend = Math.round(dev(focus.s, hov) * 100);
      tip.innerHTML = `<b>${monthName(hov)}</b><span>$${tot.toFixed(1)}M total revenue</span><span${focus.s === ANOM.s && hov === ANOM.m ? ' class="a"' : ''}>${SEGS[focus.s]}: $${(focus.n * R.unit).toFixed(1)}M, ${share}% of the month, ${vsTrend >= 0 ? '+' : ''}${vsTrend}% vs trend</span>`;
      tip.style.opacity = '1'; tip.style.transform = `translate3d(${Math.min(mouse.x + 16, innerWidth - 300)}px, ${mouse.y - 16}px, 0) translateY(-100%)`;
    } else tip.style.opacity = '0';

    // anomaly button follows its bar (surface and chart)
    const ao = Math.max(near(p, 3, 3), near(p, 4, 3)) * U.uAnom.value;
    if (ao > .02) {
      const s = project(p < 3.5 ? anSurf : anSer);
      anomBtn.style.opacity = ao.toFixed(3); anomBtn.style.visibility = 'visible';
      const bx = MOB ? Math.min(s.x + 8, innerWidth - 196) : s.x + 12;
      anomBtn.style.transform = `translate3d(${bx}px, ${s.y}px, 0) translateY(-50%)`;
      if (!apanel.hidden && !MOB) { const ph = apanel.offsetHeight || 320; apanel.style.left = `${Math.min(bx, innerWidth - 380)}px`; apanel.style.top = `${s.y + 24 + ph > innerHeight - 20 ? s.y - ph - 24 : s.y + 24}px`; }
    } else { anomBtn.style.visibility = 'hidden'; anomBtn.style.opacity = '0'; if (!apanel.hidden) closeAnom(); }

    if (draw) {
      for (const L of labs) {
        const o = near(p, L.st, L.w);
        if (o < .01) { if (L.el.style.opacity !== '0') L.el.style.opacity = '0'; continue; }
        const s = project(L.v);
        L.el.style.opacity = s.ok ? o.toFixed(3) : '0';
        const tx = L.al === 'r' ? '-100%' : L.al === 'l' ? '0' : '-50%';
        L.el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0) translate(${tx}, -50%)`;
      }
      renderer.render(scene, camera);
    }
  }
  function adapt(dt) { frames++; ft += dt; if (frames < 60) return; const avg = ft / frames; frames = 0; ft = 0; if (avg > 26 && dpr > 1) { dpr = Math.max(1, dpr - .25); resize(); } }
  function loop(now) { if (!visible || window.__manual) return; const dt = Math.min(50, now - last); last = now; adapt(dt); frame(dt); requestAnimationFrame(loop); }
  window.__step = (ms, draw = true) => frame(ms, draw);
  window.__mouse = (x, y) => setP(x, y);
  if (!window.__manual) requestAnimationFrame(loop);
  requestAnimationFrame(() => root.classList.add('ready'));
}
function niceStep(x) { const p = Math.pow(10, Math.floor(Math.log10(x))), n = x / p; return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p; }

if (document.fonts?.ready) Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1000))]).then(boot); else boot();
