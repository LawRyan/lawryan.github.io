/**
 * The Intelligence Engine: first three scenes (proof of concept).
 *
 * One population of records, drawn as instanced, lit tiles (not points). Every tile keeps its identity through
 * four layouts, and the GPU interpolates between them on scroll:
 *   0  raw information   six ribbons of records in flight, each tile oriented along its path
 *   1  validation        a 3D record matrix; a rule wave sweeps across, passes light the tiles, exceptions step out
 *   2  revenue surface   validated records stack into plates: segment × month, each plate a slice of revenue
 *   3  time series       the surface unfolds into a stacked monthly chart you can read; one anomaly is flagged
 * The synthetic dataset is generated once and is consistent: every tile in the surface and the chart is one of the
 * validated records, and the exceptions are held back in a tray.
 */
import {
  AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, Color, DoubleSide, InstancedBufferAttribute,
  InstancedBufferGeometry, Line, LineBasicMaterial, LineSegments, Mesh, PerspectiveCamera, PlaneGeometry, Scene,
  ShaderMaterial, Vector2, Vector3, WebGLRenderer,
} from 'three';

const root = document.documentElement;
const reduce = root.classList.contains('rm');
const MOB = innerWidth < 760;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const ease = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const V = (x, y, z) => new Vector3(x, y, z);

// ── layout constants
const G = MOB ? { C: 25, R: 40, L: 5, sx: .15, sy: .08, sz: .95 } : { C: 60, R: 40, L: 5, sx: .17, sy: .08, sz: .95 };
const N = G.C * G.R * G.L;
const MW = (G.C - 1) * G.sx, MH = (G.R - 1) * G.sy;
const MX = MOB ? .19 : .34, MZ = MOB ? .42 : .6, COLS = MOB ? 4 : 6;
const TS = MX * .86 / COLS;                       // tile size in the chart
const SERIES_Y0 = MOB ? -1.0 : -1.7;
const SEGS = ['Hedge funds', 'Asset managers', 'Banks', 'Corporates', 'Pensions', 'Insurers'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const NM = 24, NS = SEGS.length, ANOM = { s: 2, m: 17, k: 1.9 };
const TOTAL_REV = 1840;                           // $M over 24 months, synthetic

// ── the synthetic dataset (seeded, deterministic)
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function dataset() {
  const base = [1, .82, .66, .5, .36, .26], ph = [0, 2, 4.5, 7, 9, 1];
  const rev = [], trend = [];
  for (let s = 0; s < NS; s++) { rev.push([]); trend.push([]); for (let m = 0; m < NM; m++) {
    const t = base[s] * (1 + .012 * m) * (1 + .075 * Math.sin(2 * Math.PI * (m + ph[s]) / 12));
    const r = t * (1 + (rnd() - .5) * .08) * (s === ANOM.s && m === ANOM.m ? ANOM.k : 1);
    rev[s].push(r); trend[s].push(t);
  } }
  const sum = rev.flat().reduce((a, b) => a + b, 0);
  for (let s = 0; s < NS; s++) for (let m = 0; m < NM; m++) { rev[s][m] *= TOTAL_REV / sum; trend[s][m] *= TOTAL_REV / sum; }
  return { rev, trend };
}
const DATA = dataset();

// ── per-record attributes
function records() {
  seed = 11;
  const aSeed = new Float32Array(N * 4), aMat = new Float32Array(N * 3), aSurf = new Float32Array(N * 3), aSer = new Float32Array(N * 3), aInfo = new Float32Array(N * 4);
  for (let i = 0; i < N * 4; i++) aSeed[i] = rnd();
  const E = Math.round(N * .024);
  const exc = new Set(); while (exc.size < E) exc.add(Math.floor(rnd() * N));
  // matrix slots: record i sits at column/row/layer
  const slot = i => ({ c: i % G.C, r: Math.floor(i / G.C) % G.R, l: Math.floor(i / (G.C * G.R)) });
  for (let i = 0; i < N; i++) {
    const { c, r, l } = slot(i);
    aMat.set([c * G.sx - MW / 2, r * G.sy - MH / 2, (l - (G.L - 1) / 2) * G.sz], i * 3);
    aInfo[i * 4 + 3] = Math.floor(aSeed[i * 4 + 1] * 6);   // stream
  }
  // validated records, swept left to right through the matrix, fill the months in order
  const valid = [...Array(N).keys()].filter(i => !exc.has(i)).sort((a, b) => slot(a).c - slot(b).c || slot(a).r - slot(b).r || slot(a).l - slot(b).l);
  const Vn = valid.length, unit = TOTAL_REV / Vn;
  // units per cell by largest remainder, so the tiles add up exactly
  const cells = []; for (let m = 0; m < NM; m++) for (let s = 0; s < NS; s++) cells.push({ m, s, exact: DATA.rev[s][m] / unit });
  cells.forEach(c => { c.n = Math.floor(c.exact); });
  let left = Vn - cells.reduce((a, c) => a + c.n, 0);
  [...cells].sort((a, b) => (b.exact - b.n) - (a.exact - a.n)).slice(0, left).forEach(c => c.n++);
  const maxCell = Math.max(...cells.map(c => c.n));
  const plate = (MOB ? 2.0 : 2.3) / maxCell;
  let k = 0; const monthCount = new Array(NM).fill(0);
  for (const c of cells) for (let j = 0; j < c.n; j++) {
    const i = valid[k++];
    aInfo.set([0, c.s, c.m], i * 4);
    aSurf.set([(c.m - (NM - 1) / 2) * MX, j * plate + plate / 2, (c.s - (NS - 1) / 2) * MZ], i * 3);
    const q = monthCount[c.m]++, col = q % COLS, row = Math.floor(q / COLS);
    aSer.set([(c.m - (NM - 1) / 2) * MX + (col - (COLS - 1) / 2) * TS, SERIES_Y0 + row * TS + TS / 2, 0], i * 3);
  }
  // exceptions: held back in a tray beside the surface, and in a column beside the chart
  [...exc].forEach((i, e) => {
    aInfo.set([1, -1, -1], i * 4);
    const st = e % 4, h = Math.floor(e / 4);
    aSurf.set([(NM / 2 + .9) * MX + (st % 2) * .32, h * plate + plate / 2, ((NS - 1) / 2) * MZ + .7 + Math.floor(st / 2) * .5], i * 3);
    aSer.set([(NM / 2 + (MOB ? 2.6 : 3.4)) * MX + (e % COLS - (COLS - 1) / 2) * TS, SERIES_Y0 + Math.floor(e / COLS) * TS + TS / 2, 0], i * 3);
  });
  return { aSeed, aMat, aSurf, aSer, aInfo, E, Vn, unit, cells, plate, maxMonth: Math.max(...monthCount) };
}

// ── the stream paths (the same function runs in GLSL)
const SSCALE = MOB ? V(.42, 1.25, 1) : V(1, 1, 1);
function path(k, u) {
  const ph = k * 1.37;
  const x = lerp(-13, 12, u);
  const y = ((k - 2.5) * .42 * (1 - .55 * u) + .9 * Math.sin(u * 2.6 + ph) * (1 - .5 * u) - .2);
  const z = -2.2 - (1 - u) * (1.2 + k * .9) + 1.1 * Math.sin(u * 3.4 + ph * 1.3);
  return V(x * SSCALE.x, y * SSCALE.y, z * SSCALE.z);
}

const VERT = /* glsl */`
attribute vec4 aSeed; attribute vec3 aMat; attribute vec3 aSurf; attribute vec3 aSer; attribute vec4 aInfo;
uniform float uP, uTime, uWave, uIntro, uLens, uExc, uAnom, uMX;
uniform vec2 uPointer; uniform vec3 uSScale;
varying vec3 vN; varying vec3 vCol; varying float vEm; varying vec3 vW;

vec3 path(float k, float u){
  float ph = k*1.37;
  float x = mix(-13., 12., u);
  float y = (k-2.5)*.42*(1.-.55*u) + .9*sin(u*2.6+ph)*(1.-.5*u) - .2;
  float z = -2.2 - (1.-u)*(1.2 + k*.9) + 1.1*sin(u*3.4 + ph*1.3);
  return vec3(x, y, z)*uSScale;
}
vec3 segCol(float s){
  if(s < .5) return vec3(.90,.93,.97);
  if(s < 1.5) return vec3(.62,.68,.77);
  if(s < 2.5) return vec3(.24,.80,.76);
  if(s < 3.5) return vec3(.36,.52,.78);
  if(s < 4.5) return vec3(.46,.51,.60);
  return vec3(.15,.48,.54);
}
// a state: position, orientation (columns T, N, B), scale, colour, emission
void state(float i, out vec3 p, out vec3 T, out vec3 Nn, out vec3 sc, out vec3 col, out float em){
  float exc = aInfo.x;
  bool anom = abs(aInfo.y - ${ANOM.s}.) < .1 && abs(aInfo.z - ${ANOM.m}.) < .1;
  if(i < .5){
    // raw information: records in flight along six ribbons
    float k = aInfo.w;
    float u = fract(aSeed.x + uTime*(.012 + .004*k));
    vec3 P = path(k, u);
    vec3 tg = normalize(path(k, u + .004) - path(k, u - .004));
    vec3 b0 = normalize(cross(tg, vec3(0., 1., 0.)));
    vec3 n0 = cross(b0, tg);
    float tw = u*3.1 + k*.8;
    vec3 n = cos(tw)*n0 + sin(tw)*b0, b = cross(tg, n);
    float w = .5 + .14*k;
    p = P + b*((aSeed.y - .5)*w*2.) + n*((aSeed.z - .5)*(.1 + .1*sin(u*9. + k)));
    T = tg; Nn = n; sc = vec3(.17, .007, .042);
    col = mix(vec3(.70,.76,.84), vec3(.30,.86,.82), step(.9, aSeed.w));
    em = step(.9, aSeed.w)*.35;
  } else if(i < 1.5){
    // validation: the matrix and the rule wave
    p = aMat; T = vec3(1.,0.,0.); Nn = vec3(0.,1.,0.); sc = vec3(.135, .056, .014);
    float passed = smoothstep(uWave + .05, uWave - .25, p.x);
    float front = exp(-pow((p.x - uWave)*4.5, 2.));
    col = mix(vec3(.30,.35,.43), vec3(.66,.76,.82), passed*(1. - exc));
    em = front*.7 + passed*(1. - exc)*.03;
    if(exc > .5){
      col = mix(col, vec3(1.,.62,.22), passed);
      em += passed*.3;
      p.z += passed*uExc*(.42 + aSeed.y*.2);
      p.y += passed*uExc*(aSeed.z - .5)*.06;
      sc *= 1. + passed*.25;
    }
  } else if(i < 2.5){
    // revenue surface: plates stacked by segment and month
    p = aSurf; T = vec3(1.,0.,0.); Nn = vec3(0.,1.,0.);
    sc = vec3(uMX*.78, .0068 + uMX*.012, uMX*1.15);
    col = segCol(aInfo.y); em = .04;
    if(anom){ col = mix(col, vec3(1.,.62,.22), uAnom); em += uAnom*.25; }
    if(exc > .5){ col = vec3(.80,.56,.26); em = .12; }
  } else {
    // time series: each record a cell in its month's column, stacked by segment
    p = aSer; T = vec3(1.,0.,0.); Nn = vec3(0.,1.,0.);
    float t = ${TS.toFixed(4)};
    sc = vec3(t*.86, t*.86, .012);
    col = segCol(aInfo.y); em = .05;
    if(anom){ col = mix(col, vec3(1.,.62,.22), uAnom); em += uAnom*.25; }
    if(exc > .5){ col = vec3(.85,.58,.25); em = .18; }
  }
}
void main(){
  float a = floor(clamp(uP, 0., 2.999)), f = uP - a;
  vec3 pA, tA, nA, sA, cA; float eA;
  vec3 pB, tB, nB, sB, cB; float eB;
  state(a, pA, tA, nA, sA, cA, eA);
  state(a + 1., pB, tB, nB, sB, cB, eB);
  // stagger: each transition sweeps in a direction that means something
  float d;
  if(a < .5) d = (aMat.x/${(MW / 2 + .01).toFixed(3)}*.5 + .5)*.45 + aSeed.w*.1;
  else if(a < 1.5) d = (aInfo.z < 0. ? 1. : aInfo.z/${NM - 1}.)*.42 + aSeed.w*.12;
  else d = aSeed.w*.18 + clamp(aSurf.y/2.3, 0., 1.)*.32;
  float k = smoothstep(0., 1., clamp(f*1.55 - d, 0., 1.));
  // an arc, not a straight line: records swing out of the plane as they travel
  vec3 ctrl = mix(pA, pB, .5) + vec3((aSeed.y - .5)*1.4, (aSeed.z - .35)*1.6, (aSeed.w - .3)*2.2) * (a < .5 ? 1.2 : .8);
  vec3 p = mix(mix(pA, ctrl, k), mix(ctrl, pB, k), k);
  vec3 T = normalize(mix(tA, tB, k) + vec3(1e-4));
  vec3 Nn = normalize(mix(nA, nB, k) + vec3(0., 1e-4, 0.));
  vec3 B = normalize(cross(T, Nn)); Nn = cross(B, T);
  vec3 sc = mix(sA, sB, k);
  vec3 col = mix(cA, cB, k);
  float em = mix(eA, eB, k) + sin(k*3.14159)*.25;
  // intro: the records arrive along their streams
  float intro = clamp(uIntro*1.5 - aSeed.x*.5, 0., 1.);
  sc *= intro; p.x -= (1. - intro)*4.;
  // the cursor: records under it lift and catch the light (raw scene only)
  vec4 clip = projectionMatrix * viewMatrix * vec4(p, 1.);
  vec2 ndc = clip.xy/clip.w;
  float lens = uLens * smoothstep(.28, 0., distance(ndc*vec2(1., .72), uPointer*vec2(1., .72)));
  p += Nn*lens*.22 + vec3(0., lens*.12, 0.);
  em += lens*.55; col = mix(col, vec3(.55,.95,.92), lens*.5);
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
  vec3 c = vCol*(.1 + .62*diff + .18*hemi) + vec3(.35,.55,.75)*back*.18 + spec*vec3(.9,.95,1.)*.55 + fres*vec3(.4,.62,.78)*.28;
  c += vCol*vEm;
  float fog = smoothstep(uFogNear, uFogFar, length(uCam - vW));
  gl_FragColor = vec4(mix(c, uFog, fog), 1.);
}`;

function webgl() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

// ── scroll model: one pinned track, four layouts, holds between them
const STOPS = [[0, .07], [.2, .52], [.64, .76], [.86, 1]];   // [hold start, hold end] per layout
function progress(g) {
  let p = 0; const sub = [0, 0, 0, 0];
  for (let i = 0; i < STOPS.length; i++) {
    const [a, b] = STOPS[i];
    if (g >= a) { p = i; sub[i] = clamp((g - a) / (b - a)); }
    if (i < STOPS.length - 1 && g > b && g < STOPS[i + 1][0]) { p = i + smooth((g - b) / (STOPS[i + 1][0] - b)); sub[i] = 1; }
  }
  return { p, sub };
}

function boot() {
  const track = document.getElementById('track');
  const copies = [...document.querySelectorAll('.copy')], hud = document.querySelector('.hud'), legend = document.querySelector('.legend');
  const stageLinks = [...document.querySelectorAll('.stages a')];
  const gOf = () => clamp(-track.getBoundingClientRect().top / Math.max(1, track.offsetHeight - innerHeight));
  const goto = g => scrollTo({ top: track.offsetTop + g * (track.offsetHeight - innerHeight), behavior: reduce ? 'auto' : 'smooth' });
  const TARGET = [.0, (STOPS[1][0] + STOPS[1][1]) / 2 - .1, (STOPS[2][0] + STOPS[2][1]) / 2];
  stageLinks.forEach(a => a.addEventListener('click', e => { e.preventDefault(); goto(TARGET[+a.dataset.g]); }));
  const R = records();
  document.getElementById('tot').textContent = N.toLocaleString('en-US');

  if (!webgl()) { root.classList.add('no-gl'); document.getElementById('exc').textContent = R.E.toLocaleString('en-US'); return; }

  const canvas = document.getElementById('engine');
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  let dpr = Math.min(devicePixelRatio || 1, MOB ? 1.6 : 1.75); renderer.setPixelRatio(dpr);
  const scene = new Scene();
  const camera = new PerspectiveCamera(MOB ? 52 : 40, 1, .1, 80);

  // sky: graphite to midnight navy, with one soft shaft of light
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

  // the records
  const box = new BoxGeometry(1, 1, 1);
  const geo = new InstancedBufferGeometry();
  geo.index = box.index; geo.setAttribute('position', box.getAttribute('position')); geo.setAttribute('normal', box.getAttribute('normal'));
  geo.setAttribute('aSeed', new InstancedBufferAttribute(R.aSeed, 4));
  geo.setAttribute('aMat', new InstancedBufferAttribute(R.aMat, 3));
  geo.setAttribute('aSurf', new InstancedBufferAttribute(R.aSurf, 3));
  geo.setAttribute('aSer', new InstancedBufferAttribute(R.aSer, 3));
  geo.setAttribute('aInfo', new InstancedBufferAttribute(R.aInfo, 4));
  geo.instanceCount = N;
  const U = {
    uP: { value: 0 }, uTime: { value: 0 }, uWave: { value: -99 }, uIntro: { value: reduce ? 1 : 0 }, uLens: { value: 0 }, uExc: { value: 1 }, uAnom: { value: 0 },
    uMX: { value: MX }, uPointer: { value: new Vector2(9, 9) }, uSScale: { value: SSCALE },
    uCam: { value: new Vector3() }, uFog: { value: new Color(.035, .05, .075) }, uFogNear: { value: 9 }, uFogFar: { value: 26 },
  };
  const mesh = new Mesh(geo, new ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: U }));
  mesh.frustumCulled = false; scene.add(mesh);

  // supporting geometry: stream guides, matrix frame, rule sheet, surface grid, chart axes
  const lineMat = (c, o) => new LineBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false });
  const guides = [];
  for (let k = 0; k < 6; k++) {
    const pts = []; for (let j = 0; j <= 160; j++) pts.push(path(k, j / 160));
    const g = new Line(new BufferGeometry().setFromPoints(pts), lineMat(0x3fe0d0, 0)); scene.add(g); guides.push(g);
  }
  const seg = (arr) => { const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(arr), 3)); return g; };
  const fr = [];
  for (let l = 0; l < G.L; l++) {
    const z = (l - (G.L - 1) / 2) * G.sz, x0 = -MW / 2 - .14, x1 = MW / 2 + .14, y0 = -MH / 2 - .08, y1 = MH / 2 + .08;
    fr.push(x0, y0, z, x1, y0, z, x1, y0, z, x1, y1, z, x1, y1, z, x0, y1, z, x0, y1, z, x0, y0, z);
    for (let c = 0; c < G.C; c += 10) { const x = c * G.sx - MW / 2; fr.push(x, y1, z, x, y1 + .07, z); }
  }
  const mframe = new LineSegments(seg(fr), lineMat(0x9fb3c8, 0)); scene.add(mframe);
  const sheetMat = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, uniforms: { uO: { value: 0 } },
    vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.); }',
    fragmentShader: 'varying vec2 v; uniform float uO; void main(){ float e = smoothstep(0., .12, v.y)*smoothstep(1., .88, v.y)*smoothstep(0., .2, v.x)*smoothstep(1., .8, v.x); gl_FragColor = vec4(vec3(.25,.88,.82)*e*uO*(.35 + .65*smoothstep(.35, .5, abs(v.x - .5))), 1.); }',
  });
  const sheet = new Mesh(new PlaneGeometry(G.L * G.sz + .6, MH + .7), sheetMat); sheet.rotation.y = Math.PI / 2; scene.add(sheet);
  const sg = [], x0 = -(NM - 1) / 2 * MX - MX * .6, x1 = (NM - 1) / 2 * MX + MX * .6;
  for (let s = 0; s < NS; s++) { const z = (s - (NS - 1) / 2) * MZ; sg.push(x0, 0, z, x1, 0, z); }
  for (let m = 0; m < NM; m += 3) { const x = (m - (NM - 1) / 2) * MX; sg.push(x, 0, -(NS / 2) * MZ, x, 0, (NS / 2) * MZ); }
  const sgrid = new LineSegments(seg(sg), lineMat(0x8fa3b8, 0)); scene.add(sgrid);
  // chart axes: baseline and value gridlines at round revenue steps
  const perRow = COLS * R.unit, step = niceStep(R.maxMonth * R.unit / 4);
  const ax = [x0, SERIES_Y0, 0, x1, SERIES_Y0, 0], yTicks = [];
  for (let v = step; v <= R.maxMonth * R.unit * 1.02; v += step) { const y = SERIES_Y0 + v / perRow * TS; ax.push(x0, y, -.02, x1, y, -.02); yTicks.push([v, y]); }
  const axes = new LineSegments(seg(ax), lineMat(0x8fa3b8, 0)); scene.add(axes);

  // labels
  const labelLayer = document.getElementById('labels');
  const labs = [];
  const mk = (text, cls, v, st, al = 'c') => { const el = document.createElement('div'); el.className = 'lab ' + cls; el.textContent = text; labelLayer.appendChild(el); labs.push({ el, v, st, al }); };
  mk('Rule wave', 'layer', V(0, MH / 2 + .32, 0), 1);
  if (!MOB) SEGS.forEach((s, i) => mk(s, 'seg', V(x0 - .12, .02, (i - (NS - 1) / 2) * MZ), 2, 'r'));
  for (let m = 0; m < NM; m += MOB ? 6 : 3) mk(MONTHS[m % 12] + (m % 12 === 0 ? ` Y${m / 12 + 1}` : ''), 'axis', V((m - (NM - 1) / 2) * MX, 0, (NS / 2) * MZ + .25), 2);
  mk('Exceptions, held back', 'tray', V((NM / 2 + 1.05) * MX, .5, ((NS - 1) / 2) * MZ + .95), 2);
  for (let m = 0; m < NM; m += MOB ? 6 : 3) mk(MONTHS[m % 12] + (m % 12 === 0 ? ` Y${m / 12 + 1}` : ''), 'axis', V((m - (NM - 1) / 2) * MX, SERIES_Y0 - .2, 0), 3);
  yTicks.forEach(([v, y]) => mk(`$${Math.round(v)}M`, 'val', MOB ? V(x0, y + .09, 0) : V(x0 - .1, y, 0), 3, MOB ? 'l' : 'r'));
  // direct labels for each segment band at the last month
  const lastM = NM - 1; let acc = 0;
  SEGS.forEach((s, i) => { const c = R.cells.find(c => c.m === lastM && c.s === i); const mid = acc + c.n / 2; acc += c.n; if (!MOB) mk(s, 'seg', V(x1 + .05, SERIES_Y0 + Math.floor(mid / COLS) * TS, 0), 3, 'l'); });
  const an = R.cells.find(c => c.m === ANOM.m && c.s === ANOM.s);
  const pct = Math.round((DATA.rev[ANOM.s][ANOM.m] / DATA.trend[ANOM.s][ANOM.m] - 1) * 100);
  const anomText = MOB ? `${SEGS[ANOM.s]} +${pct}%` : `${SEGS[ANOM.s]}, ${MONTHS[ANOM.m % 12]} Y2: +${pct}% against trend`;
  const anTop = an.n * R.plate; mk(anomText, 'anom', V((ANOM.m - (NM - 1) / 2) * MX + .2, anTop + .25, (ANOM.s - (NS - 1) / 2) * MZ), 2, 'l');
  const below = R.cells.filter(c => c.m === ANOM.m && c.s <= ANOM.s).reduce((a, c) => a + c.n, 0);
  mk(anomText, 'anom', V((ANOM.m - (NM - 1) / 2) * MX + MX * .6, SERIES_Y0 + below / COLS * TS + .1, 0), 3, 'l');
  mk(MOB ? `${R.E}` : `${R.E} exceptions`, 'tray', V((NM / 2 + (MOB ? 2.6 : 3.4)) * MX, SERIES_Y0 + R.E / COLS * TS + .18, 0), 3);

  // ── camera choreography
  const W2 = MW / 2;
  const camKeys = {
    raw: MOB ? [V(.2, .2, 11.5), V(.2, .9, -2.5)] : [V(-.4, .45, 7.4), V(1.4, -.05, -2.6)],
    matrix: s => {   // outside → inside the matrix, riding behind the wave → back out to see the result
      const wx = waveX(s), K = MOB
        ? [[0, V(-2.4, .6, 9.8), V(.2, .2, 0)], [.32, V(-2.2, .5, 6.4), V(.4, .1, 0)], [.5, V(wx - 1.1, .15, .47), V(wx + 2.5, -.1, .3)], [.78, V(wx - 1.1, .15, .47), V(wx + 2.5, -.1, .3)], [1, V(.8, 1.0, 10), V(0, .1, 0)]]
        : [[0, V(-8.6, 2.6, 7.4), V(-1.2, -.1, 0)], [.3, V(-7.4, 1.0, 3.4), V(-2.4, 0, .4)], [.46, V(wx - 1.7, .18, .47), V(wx + 3.2, -.05, .3)], [.8, V(wx - 1.7, .18, .47), V(wx + 3.2, -.05, .3)], [1, V(3.6, 2.9, 8.6), V(.6, -.2, 0)]];
      let j = 0; while (j < K.length - 2 && s > K[j + 1][0]) j++;
      const t = ease((s - K[j][0]) / (K[j + 1][0] - K[j][0]));
      return [K[j][1].clone().lerp(K[j + 1][1], t), K[j][2].clone().lerp(K[j + 1][2], t)];
    },
    surface: s => { const a = (s - .5) * .45; const base = MOB ? V(-3.0, 5.4, 10) : V(-6.6, 5.4, 9.8); return [base.applyAxisAngle(V(0, 1, 0), a), MOB ? V(0, -.4, 0) : V(1.5, 1.3, 0)]; },
    series: () => MOB ? [V(.4, .1, 12.6), V(.4, .45, 0)] : [V(1.0, 1.2, 11.2), V(1.2, 1.15, 0)],
  };
  function waveX(s) { return lerp(-W2 - .6, W2 + .6, smooth((s - .06) / .86)); }
  const keyFor = (i, sub) => i === 0 ? camKeys.raw : i === 1 ? camKeys.matrix(sub[1]) : i === 2 ? camKeys.surface(sub[2]) : camKeys.series();

  const resize = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); skyU.uA.value = innerWidth / innerHeight; };
  resize(); addEventListener('resize', resize);
  const pointer = new Vector2(9, 9), pointerT = new Vector2(9, 9); let lastMove = -1e9;
  addEventListener('pointermove', e => { pointerT.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); lastMove = performance.now(); }, { passive: true });
  addEventListener('touchmove', e => { const t = e.touches[0]; if (t) { pointerT.set(t.clientX / innerWidth * 2 - 1, -(t.clientY / innerHeight) * 2 + 1); lastMove = performance.now(); } }, { passive: true });

  let g = gOf(), clock = 0, visible = true, last = performance.now(), frames = 0, ft = 0;
  const excEl = document.getElementById('exc');
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible && !window.__manual) { last = performance.now(); requestAnimationFrame(loop); } });

  function frame(dt, draw = true) {
    clock += dt / 1000;
    const gT = gOf();
    g += (gT - g) * (reduce ? 1 : 1 - Math.pow(.004, dt / 1000));
    const { p, sub } = progress(g);
    const t = reduce ? 0 : clock;
    U.uP.value = p; U.uTime.value = t;
    U.uIntro.value = reduce ? 1 : ease(clamp((clock - .1) / 2.6));
    // wave: before the matrix it waits at the left; after, everything has passed
    const wx = p < 1 ? -W2 - 1 : p > 1.001 ? W2 + 2 : waveX(sub[1]);
    U.uWave.value = wx;
    U.uAnom.value = smooth((p - 1.6) / .4);
    if (!reduce && performance.now() - lastMove > 4000) pointerT.set(Math.sin(t * .31) * .5 + .2, Math.sin(t * .43 + 1) * .3 - .1);
    pointer.lerp(pointerT, .08); U.uPointer.value.copy(pointer);
    U.uLens.value = (reduce ? 0 : 1) * clamp(1 - p * 2.5) * clamp((clock - 2.4) / 1.2);

    // camera: blend the neighbouring keys; a breath of drift in the raw scene
    const i = Math.min(2, Math.floor(p)), f = ease(p - i);
    const A = keyFor(i, sub), B = keyFor(i + 1, sub);
    const cp = A[0].clone().lerp(B[0], f), cl = A[1].clone().lerp(B[1], f);
    if (!reduce) { const raw = clamp(1 - p); cp.x += (Math.sin(t * .17) * .3 + pointer.x * .35) * raw; cp.y += (Math.sin(t * .23) * .12 + pointer.y * .18) * raw; }
    camera.position.copy(cp); camera.lookAt(cl); U.uCam.value.copy(cp);
    skyU.uT.value = Math.sin(t * .2);

    const near = (k, w = 2.4) => clamp(1 - Math.abs(p - k) * w);
    guides.forEach(gd => { gd.material.opacity = .13 * near(0, 1.6); gd.visible = gd.material.opacity > .003; });
    mframe.material.opacity = .22 * near(1, 2); mframe.visible = mframe.material.opacity > .003;
    sheetMat.uniforms.uO.value = near(1, 3) * clamp((sub[1] - .04) / .05) * (1 - clamp((sub[1] - .93) / .05)) * .16; sheet.position.x = wx; sheet.visible = sheetMat.uniforms.uO.value > .003;
    sgrid.material.opacity = .2 * near(2, 2); sgrid.visible = sgrid.material.opacity > .003;
    axes.material.opacity = .22 * near(3, 2); axes.visible = axes.material.opacity > .003;

    // copy and HUD
    const show = [near(0, 3) * (1 - clamp(sub[0] * 0)), near(1, 3), near(2, 3), near(3, 3)];
    copies.forEach((el, k) => { el.style.setProperty('--o', show[k].toFixed(3)); el.style.visibility = show[k] > .01 ? 'visible' : 'hidden'; });
    legend.style.setProperty('--o', Math.max(show[2], show[3]).toFixed(3));
    hud.style.setProperty('--o', show[1].toFixed(3)); hud.style.visibility = show[1] > .01 ? 'visible' : 'hidden';
    root.style.setProperty('--so', clamp(p * 2).toFixed(3)); root.style.setProperty('--cue', String(clamp(1 - g * 30)));
    const passedFrac = clamp((wx + W2) / (2 * W2));
    excEl.textContent = Math.round(R.E * (p >= 1.001 ? 1 : p < .999 ? 0 : passedFrac)).toLocaleString('en-US');
    stageLinks.forEach((a, k) => { const on = Math.round(Math.min(p, 2)) === k; a.classList.toggle('on', on); a.querySelector('i').style.setProperty('--f', clamp(1 - Math.abs(Math.min(p, 2) - k)).toFixed(3)); });

    // labels
    if (draw) {
      for (const L of labs) {
        const o = near(L.st, 3);
        if (o < .01) { L.el.style.opacity = '0'; continue; }
        const s = L.v.clone().project(camera);
        const vis = s.z < 1 && s.z > -1;
        L.el.style.opacity = vis ? o.toFixed(3) : '0';
        const tx = L.al === 'r' ? '-100%' : L.al === 'l' ? '0' : '-50%';
        L.el.style.transform = `translate3d(${((s.x + 1) / 2 * innerWidth).toFixed(1)}px, ${((1 - s.y) / 2 * innerHeight).toFixed(1)}px, 0) translate(${tx}, -50%)`;
      }
      renderer.render(scene, camera);
    }
  }
  function adapt(dt) { frames++; ft += dt; if (frames < 60) return; const avg = ft / frames; frames = 0; ft = 0; if (avg > 26 && dpr > 1) { dpr = Math.max(1, dpr - .25); renderer.setPixelRatio(dpr); resize(); } }
  function loop(now) { if (!visible || window.__manual) return; const dt = Math.min(50, now - last); last = now; adapt(dt); frame(dt); requestAnimationFrame(loop); }
  window.__step = (ms, draw = true) => frame(ms, draw);
  if (!window.__manual) requestAnimationFrame(loop);
  requestAnimationFrame(() => root.classList.add('ready'));
}
function niceStep(x) { const p = Math.pow(10, Math.floor(Math.log10(x))), n = x / p; return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p; }

if (document.fonts?.ready) Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1000))]).then(boot); else boot();
