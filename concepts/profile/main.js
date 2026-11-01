/**
 * Profile: a short record-engine intro (three moves), then the resume.
 *   0  data architecture   tables of records, alive with batch writes and transfers
 *   1  validation          a matrix; rules run in column groups; breaks detach to a queue and are resolved
 *   2  95%                 the records form 100 blocks of reporting effort; 95 fall away, 5 remain
 * Only real, approved figures are shown (300+ rules, ~100–150K records, 95%). The motion is illustrative.
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

const G = MOB ? { C: 25, R: 40, L: 5, sx: .15, sy: .08, sz: .95 } : { C: 60, R: 40, L: 5, sx: .17, sy: .08, sz: .95 };
const N = G.C * G.R * G.L;
const MW = (G.C - 1) * G.sx, MH = (G.R - 1) * G.sy;
const BLOCK = MOB ? 5 : 6;
const QC = MOB ? 4 : 6, QX = MOB ? .13 : .15, QY = .066, Q0 = MW / 2 + (MOB ? .45 : .75);
// the 95% column: 100 rows of records, one row = 1% of the manual reporting effort before automation
const PER = N / 100, CX = MOB ? 25 : 40, CZ = PER / CX;              // records per row: CX across, CZ deep
const CP = MOB ? .05 : .046, RH = MOB ? .036 : .043, CDZ = .07;        // pitch across, row height, depth pitch
const CW = CX * CP, CH = 100 * RH;                                     // column width and height
// the column stands in front of the data architecture; the freed 95% flies back into it
const WX = MOB ? .9 : 4.6, WY = MOB ? -.2 : -1.3, WZ = MOB ? 3.2 : 3.4;   // column centre x, bottom y, z

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
  const aArch = A(3), aXfer = A(3), aSeed = A(4), aMat = A(3), aQ = A(3), aWaf = A(3), aDest = A(3), aInfo = A(4), aMeta = A(4);
  for (let i = 0; i < N * 4; i++) aSeed[i] = rnd();
  const slot = i => ({ c: i % G.C, r: Math.floor(i / G.C) % G.R, l: Math.floor(i / (G.C * G.R)) });
  for (let i = 0; i < N; i++) { const { c, r, l } = slot(i); aMat.set([c * G.sx - MW / 2, r * G.sy - MH / 2, (l - (G.L - 1) / 2) * G.sz], i * 3); }
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
  for (let i = 0; i < N; i++) {
    const to = SLABS[(aInfo[i * 4 + 3] + 1 + Math.floor(aSeed[i * 4 + 3] * 5)) % SLABS.length];
    aXfer.set([to.x + (rnd() - .5) * to.cols * AP.x * .8, to.y + .06, to.z + (rnd() - .5) * to.rows * AP.z * .8], i * 3);
  }
  // breaks found by the rules (illustrative; no counts are shown)
  const E = Math.round(N * .024), excSet = new Set(); while (excSet.size < E) excSet.add(Math.floor(rnd() * N));
  [...excSet].sort((a, b) => slot(a).c - slot(b).c || slot(b).r - slot(a).r).forEach((i, q) => {
    aInfo[i * 4] = 1; aQ.set([Q0 + (q % QC) * QX, MH / 2 - Math.floor(q / QC) * QY, 0], i * 3); aMeta[i * 4 + 3] = q / (E - 1);
  });
  // the column: records, swept left to right through the matrix, stack up one row (1%) at a time
  const byCol = [...Array(N).keys()].sort((a, b) => slot(a).c - slot(b).c || slot(a).r - slot(b).r || slot(a).l - slot(b).l);
  byCol.forEach((i, k) => {
    const row = Math.floor(k / PER), j = k % PER;
    const x = WX + ((j % CX) - (CX - 1) / 2) * CP, z = WZ + (Math.floor(j / CX) - (CZ - 1) / 2) * CDZ;
    aWaf.set([x, WY + row * RH + RH / 2, z], i * 3); aMeta[i * 4] = row;
    // where this record's capacity goes: back into the wider system, its own place in the data architecture
    aDest.set([aArch[i * 3], aArch[i * 3 + 1], aArch[i * 3 + 2]], i * 3);
  });
  return { aArch, aXfer, aSeed, aMat, aQ, aWaf, aDest, aInfo, aMeta };
}

const VERT = /* glsl */`
precision highp float;
uniform mat4 projectionMatrix, viewMatrix;
attribute vec3 position, normal;
attribute vec3 aArch; attribute vec3 aXfer; attribute vec4 aSeed; attribute vec3 aMat; attribute vec3 aQ; attribute vec3 aWaf; attribute vec3 aDest; attribute vec4 aInfo; attribute vec4 aMeta;
uniform float uP, uTime, uWave, uRes, uCut, uIntro, uLens;
uniform vec2 uPointer;
varying vec3 vN; varying vec3 vCol; varying float vEm; varying vec3 vW;
const vec3 AMBER = vec3(.98,.64,.26), DIM = vec3(.19,.22,.27), LIT = vec3(.64,.80,.84);
void state(float i, out vec3 p, out vec3 T, out vec3 Nn, out vec3 sc, out vec3 col, out float em){
  T = vec3(1.,0.,0.); Nn = vec3(0.,1.,0.);
  float ex = aInfo.x;
  if(i < .5){
    float sl = aInfo.w;
    float batch = exp(-pow((aMeta.y - fract(uTime*.06 + sl*.31))*16., 2.));
    float tt = fract(uTime*.045 + aSeed.x*7.);
    float go = (smoothstep(.05, .32, tt) - smoothstep(.55, .82, tt)) * step(.985, aSeed.y);
    float hop = 4.*go*(1. - go);
    p = mix(aArch, aXfer, go) + vec3(0., .035*sin(uTime*.42 + sl*1.7) + batch*.07 + hop*.65, 0.);
    Nn = vec3(0.,0.,1.); sc = vec3(.132, .064, .016);
    col = mix(vec3(.40,.45,.53), vec3(.74,.80,.87), sl/6.);
    col = mix(col, vec3(.48,.90,.88), max(batch*.45, step(.001, hop)*.85));
    em = batch*.12 + hop*.5;
  } else if(i < 1.5){
    float colI = floor((aMat.x + ${(MW / 2).toFixed(4)})/${G.sx} + .5);
    float bx = (floor(colI/${BLOCK}.)*${BLOCK}. + ${((BLOCK - 1) / 2).toFixed(1)})*${G.sx} - ${(MW / 2).toFixed(4)};
    float dw = uWave - bx;
    float passed = smoothstep(-.04, .1, dw), pulse = exp(-pow(dw*2.6, 2.));
    p = aMat; sc = vec3(.135, .056, .014);
    col = mix(DIM, LIT, passed); em = pulse*.5 + passed*.04;
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
      em += passed*(1. - back)*.25;
      sc *= mix(1. + passed*.2, .72, detach*(1. - back));
    }
  } else {
    // one column, 100 rows = the manual reporting effort before automation. The top 95 rows lift off, top first,
    // swirl up out of the column and stream back into the data architecture, re-energising every table they land in.
    // The bottom 5 stay behind, gold: the manual reporting that remains.
    float kept = 1. - step(4.5, aMeta.x);
    float mv = (1. - kept) * smoothstep(0., 1., clamp(uCut*1.9 - (99. - aMeta.x)/95.*.55 - aSeed.x*.35, 0., 1.));
    float ang = aSeed.y*6.2832 + mv*5.;
    vec3 p0 = aWaf, p3 = aDest;
    vec3 p1 = vec3(${WX.toFixed(2)}, aWaf.y + 2.4 + aSeed.z*1.6, ${WZ.toFixed(2)}) + vec3(cos(ang), 0., sin(ang))*(.6 + aSeed.w*.9);
    vec3 p2 = p3 + vec3((aSeed.w - .5)*1.6, 2.6 + aSeed.z*1.2, (aSeed.y - .5)*1.6);
    float u = mv, v = 1. - u;
    p = v*v*v*p0 + 3.*v*v*u*p1 + 3.*v*u*u*p2 + u*u*u*p3;
    float landed = smoothstep(.96, 1., mv);
    float sl = aInfo.w;
    float sweep = exp(-pow((aDest.x - mix(-9., 9., fract(uTime*.07 + sl*.19)))*1.1, 2.));
    float batch = exp(-pow((aMeta.y - fract(uTime*.06 + sl*.31))*16., 2.));
    p.y += landed*(batch*.06 + .03*sin(uTime*.42 + sl*1.7));
    Nn = normalize(mix(vec3(0.,1.,0.), vec3(0.,0.,1.), smoothstep(.55, 1., mv)) + vec3(0., 1e-3, 0.));
    sc = mix(vec3(${(CP * .82).toFixed(4)}, ${(RH * .78).toFixed(4)}, ${(CDZ * .8).toFixed(4)}), vec3(.132, .064, .016), smoothstep(.5, 1., mv));
    float flying = sin(clamp(mv, 0., 1.)*3.14159);
    col = mix(vec3(.66,.74,.82), vec3(.40,.88,.84), smoothstep(.0, .3, mv));
    col = mix(col, mix(vec3(.30,.62,.64), vec3(.62,.86,.90), sl/6.), landed);
    col = mix(col, vec3(.96,.82,.58), kept*uCut);
    em = kept*uCut*.35 + flying*.55 + landed*(.06 + sweep*.3 + batch*.18) + .03;
  }
}
void main(){
  float a = floor(clamp(uP, 0., 1.999)), f = uP - a;
  vec3 pA, tA, nA, sA, cA; float eA; vec3 pB, tB, nB, sB, cB; float eB;
  state(a, pA, tA, nA, sA, cA, eA); state(a + 1., pB, tB, nB, sB, cB, eB);
  float d = a < .5 ? (1. - aInfo.w/6.)*.36 + aSeed.w*.12 : (aMat.x/${(MW / 2 + .01).toFixed(3)}*.5 + .5)*.38 + aSeed.w*.14;
  float k = smoothstep(0., 1., clamp(f*1.55 - d, 0., 1.));
  vec3 lift = a < .5 ? vec3((aSeed.y - .5)*.5, .45 + aSeed.z*.7, (aSeed.w - .5)*.6) : vec3((aSeed.y - .5)*.6, .3 + aSeed.z*.6, .4 + aSeed.w*.6);
  vec3 ctrl = mix(pA, pB, .5) + lift;
  vec3 p = mix(mix(pA, ctrl, k), mix(ctrl, pB, k), k);
  vec3 T = normalize(mix(tA, tB, k) + vec3(1e-4));
  vec3 Nn = normalize(mix(nA, nB, k) + vec3(0., 1e-4, 0.));
  vec3 B = normalize(cross(T, Nn)); Nn = cross(B, T);
  vec3 sc = mix(sA, sB, k), col = mix(cA, cB, k);
  float em = mix(eA, eB, k) + sin(k*3.14159)*.12;
  float intro = clamp(uIntro*1.6 - aInfo.w/6.*.35 - aSeed.x*.25, 0., 1.);
  intro = intro*intro*(3. - 2.*intro);
  sc *= intro; p.y += (1. - intro)*1.6;
  vec4 clip = projectionMatrix * viewMatrix * vec4(p, 1.);
  float lens = uLens * smoothstep(.26, 0., distance(clip.xy/clip.w*vec2(1., .72), uPointer*vec2(1., .72)));
  p.y += lens*.28; em += lens*.35; col = mix(col, vec3(.55,.95,.92), lens*.35);
  mat3 R = mat3(T, Nn, B);
  vec3 w = p + R*(position*sc);
  vN = R*normal; vCol = col; vEm = em; vW = w;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.);
}`;
const FRAG = /* glsl */`
precision mediump float;
uniform vec3 uCam, uFog; uniform float uFogNear, uFogFar;
varying vec3 vN; varying vec3 vCol; varying float vEm; varying vec3 vW;
void main(){
  vec3 N = normalize(vN), Vv = normalize(uCam - vW);
  if(dot(N, Vv) < 0.) N = -N;
  vec3 L = normalize(vec3(-.45, .85, .55)), L2 = normalize(vec3(.7, .2, -.6));
  float diff = max(dot(N, L), 0.), back = max(dot(N, L2), 0.), hemi = .5 + .5*N.y;
  float spec = pow(max(dot(N, normalize(L + Vv)), 0.), 48.), fres = pow(1. - max(dot(N, Vv), 0.), 3.);
  vec3 c = vCol*(.1 + .62*diff + .18*hemi) + vec3(.35,.55,.75)*back*.16 + spec*vec3(.9,.95,1.)*.5 + fres*vec3(.4,.62,.78)*.24 + vCol*vEm;
  gl_FragColor = vec4(mix(c, uFog, smoothstep(uFogNear, uFogFar, length(uCam - vW))), 1.);
}`;

const STOPS = [[0, .1], [.3, .62], [.78, 1]];
function progress(g) {
  let p = 0; const sub = [0, 0, 0];
  for (let i = 0; i < STOPS.length; i++) {
    const [a, b] = STOPS[i];
    if (g >= a) { p = i; sub[i] = clamp((g - a) / (b - a)); }
    if (i < STOPS.length - 1 && g > b && g < STOPS[i + 1][0]) { p = i + smooth((g - b) / (STOPS[i + 1][0] - b)); sub[i] = 1; }
  }
  return { p, sub };
}
function webgl() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

// ── resume interactions (work without WebGL)
function resumeUI() {
  document.getElementById('print')?.addEventListener('click', () => print());
  const tabs = [...document.querySelectorAll('.ltabs [role="tab"]')];
  const panels = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
  const sel = (i, f) => { tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; panels[k].hidden = k !== i; }); if (f) tabs[i].focus(); };
  tabs.forEach((t, i) => { t.addEventListener('click', () => sel(i)); t.addEventListener('keydown', e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); sel((i + d + tabs.length) % tabs.length, true); } }); });
  panels.forEach(p => {
    const imgs = [...p.querySelectorAll('.lp-shots img')], btns = [...p.querySelectorAll('.lp-thumbs button')], cap = p.querySelector('figcaption');
    btns.forEach((b, k) => b.addEventListener('click', () => { imgs.forEach((im, j) => { im.hidden = j !== k; }); btns.forEach((x, j) => x.setAttribute('aria-pressed', String(j === k))); void cap; }));
  });
}

function boot() {
  resumeUI();
  const $ = id => document.getElementById(id);
  const track = $('track'), copies = [...document.querySelectorAll('.intro .copy')];
  const gOf = () => clamp(-track.getBoundingClientRect().top / Math.max(1, track.offsetHeight - innerHeight));
  const navLinks = [...document.querySelectorAll('.rnav a')], secs = navLinks.map(a => document.querySelector(a.getAttribute('href')));
  const onScroll = () => {
    let on = -1; secs.forEach((s, k) => { if (s.getBoundingClientRect().top < innerHeight * .4) on = k; });
    navLinks.forEach((a, k) => a.classList.toggle('on', k === on));
    root.classList.toggle('in-resume', track.getBoundingClientRect().bottom < innerHeight * .6);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (!webgl()) { root.classList.add('no-gl'); requestAnimationFrame(() => root.classList.add('ready')); return; }

  const R = records(), W2 = MW / 2;
  const canvas = $('engine');
  let G3; try { G3 = new GL(canvas); } catch { root.classList.add('no-gl'); requestAnimationFrame(() => root.classList.add('ready')); return; }
  const gl = G3.gl;
  let dpr = Math.min(devicePixelRatio || 1, MOB ? 1.6 : 1.75);
  const FOV = MOB ? 52 : 40; let proj = perspective(FOV, 1, .1, 80); const view = new Float32Array(16);
  // sky
  const skyP = G3.program('attribute vec2 p; varying vec2 v; void main(){ v = p*.5 + .5; gl_Position = vec4(p, 0., 1.); }',
    `precision mediump float; varying vec2 v; uniform float uA; void main(){ vec2 p = (v - vec2(.62, 1.05))*vec2(uA, 1.); vec3 c = mix(vec3(.055,.09,.16), vec3(.031,.043,.063), smoothstep(.0, 1.25, length(p)));
      c += vec3(.05,.08,.11)*smoothstep(.55, 0., abs((v.x - .58) + (v.y - 1.)*.42))*smoothstep(.0, .9, v.y)*.7; gl_FragColor = vec4(c, 1.); }`);
  const quad = G3.buffer(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
  // the records
  const box = boxGeometry(), recP = G3.program(VERT, FRAG);
  const bufs = { position: G3.buffer(box.position), normal: G3.buffer(box.normal) };
  const idx = G3.buffer(box.index, gl.ELEMENT_ARRAY_BUFFER);
  const inst = [['aArch', 3], ['aXfer', 3], ['aSeed', 4], ['aMat', 3], ['aQ', 3], ['aWaf', 3], ['aDest', 3], ['aInfo', 4], ['aMeta', 4]].map(([k, n]) => [recP.attr(k), G3.buffer(R[k]), n]);
  const U = { uP: 0, uTime: 0, uWave: -99, uRes: 0, uCut: 0, uIntro: reduce ? 1 : 0, uLens: 0, uPointer: new V2(9, 9), uCam: new V3(), uFog: [.035, .05, .075], uFogNear: 10, uFogFar: 28 };
  const bindRecords = () => {
    gl.useProgram(recP.p);
    G3.attrib(recP.attr('position'), bufs.position, 3); G3.attrib(recP.attr('normal'), bufs.normal, 3);
    for (const [loc, b, n] of inst) G3.attrib(loc, b, n, 1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx);
  };
  // lines
  const lineP = G3.program('precision highp float; uniform mat4 projectionMatrix, viewMatrix; attribute vec3 position; void main(){ gl_Position = projectionMatrix*viewMatrix*vec4(position, 1.); }',
    'precision mediump float; uniform vec4 uColor; void main(){ gl_FragColor = uColor; }');
  const lineSet = (arr, color) => ({ buf: G3.buffer(new Float32Array(arr)), n: arr.length / 3, color, opacity: 0 });
  const ar = [];
  SLABS.forEach((t, si) => { const hx = (t.cols - 1) / 2 * AP.x + .12, hz = (t.rows - 1) / 2 * AP.z + .08, y = t.y - .02, c = [[t.x - hx, t.z - hz], [t.x + hx, t.z - hz], [t.x + hx, t.z + hz], [t.x - hx, t.z + hz]];
    c.forEach((q, k) => { const n = c[(k + 1) % 4]; ar.push(q[0], y, q[1], n[0], y, n[1]); }); if (si) { const b = SLABS[0]; ar.push(t.x - hx, y, t.z - hz, t.x - hx, b.y, t.z - hz, t.x + hx, y, t.z + hz, t.x + hx, b.y, t.z + hz); } });
  const arch = lineSet(ar, [.62, .70, .78]);
  const fr = []; for (let l = 0; l < G.L; l++) { const z = (l - (G.L - 1) / 2) * G.sz, x0 = -W2 - .14, x1 = W2 + .14, y0 = -MH / 2 - .08, y1 = MH / 2 + .08; fr.push(x0, y0, z, x1, y0, z, x1, y0, z, x1, y1, z, x1, y1, z, x0, y1, z, x0, y1, z, x0, y0, z); }
  const mframe = lineSet(fr, [.62, .70, .78]);
  const qb = [Q0 - .12, MH / 2 + .1, Q0 + (QC - 1) * QX + .12, MH / 2 - (Math.ceil(N * .024 / QC) - 1) * QY - .1];
  const qframe = lineSet([qb[0], qb[1], 0, qb[2], qb[1], 0, qb[2], qb[1], 0, qb[2], qb[3], 0, qb[2], qb[3], 0, qb[0], qb[3], 0, qb[0], qb[3], 0, qb[0], qb[1], 0], [1, .71, .28]);
  const fx0 = WX - CW / 2 - .06, fx1 = WX + CW / 2 + .06, fy0 = WY - .04, fy1 = WY + CH + .04, fz = WZ + CZ * CDZ / 2 + .06;
  const cframe = lineSet([fx0, fy0, fz, fx1, fy0, fz, fx1, fy0, fz, fx1, fy1, fz, fx1, fy1, fz, fx0, fy1, fz, fx0, fy1, fz, fx0, fy0, fz,
  ], [.62, .70, .78]);

  const lines = [arch, mframe, qframe, cframe];
  function render() {
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    gl.useProgram(skyP.p); gl.uniform1f(skyP.u.uA, innerWidth / innerHeight); G3.attrib(skyP.attr('p'), quad, 2); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.DEPTH_TEST); gl.clear(gl.DEPTH_BUFFER_BIT);
    bindRecords();
    gl.uniformMatrix4fv(recP.u.projectionMatrix, false, proj); gl.uniformMatrix4fv(recP.u.viewMatrix, false, view);
    for (const k of ['uP', 'uTime', 'uWave', 'uRes', 'uCut', 'uIntro', 'uLens', 'uFogNear', 'uFogFar']) gl.uniform1f(recP.u[k], U[k]);
    gl.uniform2f(recP.u.uPointer, U.uPointer.x, U.uPointer.y); gl.uniform3f(recP.u.uCam, U.uCam.x, U.uCam.y, U.uCam.z); gl.uniform3fv(recP.u.uFog, U.uFog);
    G3.drawInstanced(36, N);
    for (const [loc] of inst) if (loc >= 0) { if (G3.gl2) gl.vertexAttribDivisor(loc, 0); else G3.ext.vertexAttribDivisorANGLE(loc, 0); }
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    gl.useProgram(lineP.p); gl.uniformMatrix4fv(lineP.u.projectionMatrix, false, proj); gl.uniformMatrix4fv(lineP.u.viewMatrix, false, view);
    const posLoc = lineP.attr('position');
    for (const L of lines) { if (L.opacity < .003) continue; gl.uniform4f(lineP.u.uColor, L.color[0], L.color[1], L.color[2], L.opacity); G3.attrib(posLoc, L.buf, 3); gl.drawArrays(gl.LINES, 0, L.n); }
    gl.depthMask(true);
  }
  const labelLayer = $('labels'), mkLab = (t, cls) => { const el = document.createElement('div'); el.className = 'lab ' + cls; el.textContent = t; labelLayer.appendChild(el); return el; };
  const qLab = mkLab(MOB ? 'Exceptions' : 'Exceptions, held for review', 'tray'), wLab = mkLab(MOB ? 'Manual reporting, before' : 'Manual reporting effort, before', 'seg'), wLab2 = mkLab(MOB ? '95% back into the wider system' : '95% of the effort, redeployed across other workstreams', 'free95'), wLab3 = mkLab(MOB ? '5% manual' : '5% still manual', 'keep');

  const cam = {
    raw: MOB ? [V(-3.4, 5.0, 12.6), V(0, -1.5, -.8)] : [V(-9.4, 4.2, 10.0), V(-2.6, -1.6, -.9)],
    matrix: s => { const K = MOB ? [[0, V(-2.2, .7, 11.2), V(.3, .4, 0)], [.6, V(.6, .5, 11.4), V(.8, .3, 0)], [1, V(.6, .6, 12.6), V(.6, .3, 0)]]
      : [[0, V(-6.4, 1.6, 8.6), V(-.6, -.3, 0)], [.35, V(-1.4, 1.0, 8.6), V(1.4, -.2, 0)], [.7, V(3.4, .8, 8.4), V(3.4, -.1, 0)], [1, V(1.6, 1.2, 11.6), V(1.6, -.2, 0)]];
      let j = 0; while (j < K.length - 2 && s > K[j + 1][0]) j++; const t = ease((s - K[j][0]) / (K[j + 1][0] - K[j][0])); return [K[j][1].clone().lerp(K[j + 1][1], t), K[j][2].clone().lerp(K[j + 1][2], t)]; },
    waffle: s => {
      const w = smooth((s - .12) / .62);   // pull back as the capacity flies out
      const close = MOB ? [V(WX - .6, WY + 2.4, WZ + 7.4), V(WX, WY + 1.4, WZ)] : [V(WX - 2.8, WY + 2.3, WZ + 10.6), V(WX - 1.8, WY + 1.9, WZ)];
      const wide = MOB ? [V(-2.6, 6.4, 14.6), V(.4, .2, -.2)] : [V(-8.4, 6.2, 13.2), V(-2.2, -.9, -.4)];
      return [close[0].clone().lerp(wide[0], w), close[1].clone().lerp(wide[1], w)];
    },
  };
  const keyFor = (i, sub) => i === 0 ? cam.raw : i === 1 ? cam.matrix(sub[1]) : cam.waffle(sub[2]);
  const resize = () => { G3.size(innerWidth, innerHeight, dpr); proj = perspective(FOV, innerWidth / innerHeight, .1, 80); };
  resize(); addEventListener('resize', resize);
  const pointer = new V2(9, 9), pointerT = new V2(9, 9); let lastMove = -1e9;
  addEventListener('pointermove', e => { pointerT.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); lastMove = performance.now(); }, { passive: true });
  addEventListener('touchmove', e => { const t = e.touches[0]; if (t) { pointerT.set(t.clientX / innerWidth * 2 - 1, -(t.clientY / innerHeight) * 2 + 1); lastMove = performance.now(); } }, { passive: true });
  const tmp = new V3();
  const place = (el, v, o, al = '-50%') => { project(v, view, proj, tmp); el.style.opacity = (tmp.z < 1 ? o : 0).toFixed(3); if (o > .01) el.style.transform = `translate3d(${((tmp.x + 1) / 2 * innerWidth).toFixed(1)}px, ${((1 - tmp.y) / 2 * innerHeight).toFixed(1)}px, 0) translate(${al}, -50%)`; };
  const near = (p, k, w = 2.4) => clamp(1 - Math.abs(p - k) * w);
  let g = gOf(), clock = 0, visible = true, last = performance.now(), frames = 0, ft = 0;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible && !window.__manual) { last = performance.now(); requestAnimationFrame(loop); } });

  function frame(dt, draw = true) {
    clock += dt / 1000;
    g += (gOf() - g) * (reduce ? 1 : 1 - Math.pow(.004, dt / 1000));
    const { p, sub } = progress(g), t = reduce ? 0 : clock;
    // the canvas gives way to the resume
    const vis = clamp(track.getBoundingClientRect().bottom / innerHeight * 1.4 - .1);
    canvas.style.opacity = vis.toFixed(3); labelLayer.style.opacity = vis.toFixed(3);
    copies.forEach((el, k) => { const o = near(p, k, 3) * vis; el.style.setProperty('--o', o.toFixed(3)); el.style.visibility = o > .01 ? 'visible' : 'hidden'; });
    root.style.setProperty('--so', (clamp(p * 2) * vis).toFixed(3)); root.style.setProperty('--cue', String(clamp(1 - g * 30)));
    if (vis <= 0) return;
    U.uP = p; U.uTime = t; U.uIntro = reduce ? 1 : ease(clamp((clock - .1) / 2.6));
    const s1 = p < 1 ? 0 : p > 1.001 ? 1 : sub[1];
    U.uWave = p < 1 ? -W2 - 1 : lerp(-W2 - .5, W2 + .5, smooth((s1 - .05) / .55));
    U.uRes = smooth((s1 - .66) / .26);
    U.uCut = p < 2 ? 0 : smooth((sub[2] - .05) / .55);
    if (!reduce && performance.now() - lastMove > 4000) pointerT.set(Math.sin(t * .31) * .5 + .2, Math.sin(t * .43 + 1) * .3 - .1);
    pointer.lerp(pointerT, .08); U.uPointer.copy(pointer);
    U.uLens = (reduce ? 0 : 1) * clamp(1 - p * 2.5) * clamp((clock - 2.4) / 1.2);
    const i = Math.min(1, Math.floor(p)), f = ease(p - i), A = keyFor(i, sub), B = keyFor(i + 1, sub);
    const cp = A[0].clone().lerp(B[0], f), cl = A[1].clone().lerp(B[1], f);
    if (!reduce) { const raw = clamp(1 - p); cp.sub(cl).rotateY((Math.sin(t * .05) * .1 + sub[0] * .28) * raw).add(cl); cp.x += pointer.x * .3; cp.y += pointer.y * .16; }
    lookAt(cp, cl, view); U.uCam.copy(cp);
    const relit = near(p, 2, 2) * smooth(U.uCut * 1.6 - .6);
    arch.opacity = Math.max(.16 * near(p, 0, 1.6), .32 * relit); arch.color = relit > .01 ? [.36, .82, .80] : [.62, .70, .78];
    mframe.opacity = .2 * near(p, 1, 2);
    qframe.opacity = .45 * near(p, 1, 2) * smooth((s1 - .08) / .1) * (1 - U.uRes);
    cframe.opacity = .4 * near(p, 2, 2) * smooth(U.uCut * 2);
    if (draw) {
      place(qLab, V(Q0 + (QC - 1) * QX / 2, MH / 2 + .3, 0), near(p, 1, 3) * smooth((s1 - .1) / .1) * (1 - U.uRes) * vis);
      const fzz = WZ + CZ * CDZ / 2 + .06;
      place(wLab, V(WX, WY + CH + .22, fzz), near(p, 2, 3) * (1 - smooth(U.uCut * 2 - .9)) * vis);
      place(wLab2, MOB ? V(-.2, 2.9, -1.2) : V(.4, 3.1, -1.8), near(p, 2, 3) * smooth(U.uCut * 1.5 - .7) * vis);
      place(wLab3, V(WX, WY - .22, fzz), near(p, 2, 3) * smooth(U.uCut * 1.6 - .5) * vis);
      render();
    }
  }
  function adapt(dt) { frames++; ft += dt; if (frames < 60) return; const avg = ft / frames; frames = 0; ft = 0; if (avg > 26 && dpr > 1) { dpr = Math.max(1, dpr - .25); resize(); } }
  function loop(now) { if (!visible || window.__manual) return; const dt = Math.min(50, now - last); last = now; adapt(dt); frame(dt); requestAnimationFrame(loop); }
  window.__step = (ms, draw = true) => frame(ms, draw);
  if (!window.__manual) requestAnimationFrame(loop);
  requestAnimationFrame(() => root.classList.add('ready'));
}
if (document.fonts?.ready) Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1000))]).then(boot); else boot();
