/**
 * The data field: one Points cloud whose particles travel between scene layouts.
 *
 * Each scene is a layout: a position per particle and a colour code. Some layouts are stored (complexity,
 * structure, network nodes, career, L//IOS, horizon); others are procedural, computed in the vertex shader from
 * each particle's seed and time, because their meaning is motion:
 *   validation: records flow through a rule gate; afterwards they travel in ordered lanes, exceptions drop to a tray
 *   manual:     many small loops, each a report rebuilt by hand
 *   automated:  one pipeline that every record flows through
 *   network:    nodes (stored) plus pulses travelling along arcs between them (procedural)
 * The shader blends the two neighbouring layouts by uMorph with a per-particle delay, so transitions pour.
 * The cursor is a lens: under it, points lean toward the next layout and come into focus.
 */
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial,
  PerspectiveCamera, PlaneGeometry, Points, Scene, ShaderMaterial, TorusGeometry, Vector2, Vector3, WebGLRenderer,
} from 'three';

export const SCENES = ['complexity', 'structure', 'validation', 'manual', 'automated', 'network', 'career', 'lios', 'horizon'] as const;
export type SceneKey = typeof SCENES[number];
/** how each layout is produced: 0 stored, 1 validation stream, 2 manual loops, 3 automated pipeline, 4 network (nodes + arcs) */
const KIND = [0, 0, 1, 2, 3, 4, 0, 0, 0];
/** point scale and brightness per scene (dense layouts need smaller, dimmer points) */
const SCALE = [1, .62, .8, .75, .6, .7, .8, .62, .9];
const GAIN = [1, .62, .9, .85, .55, .85, .9, .75, 1];
/** sky tint per scene: deep blue, then violet for L//IOS, then a warm dawn for the horizon */
const TINT = [[.055, .125, .196], [.055, .125, .196], [.05, .11, .18], [.05, .11, .18], [.06, .12, .17], [.07, .1, .15], [.04, .09, .16], [.13, .07, .24], [.12, .09, .1]];

const ICE = 0, WARM = 1, DIM = 3, TEAL = 4, LILAC = 5, VIOLET = 6;

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());

/** Business lines for the Structure scene (illustrative). */
export const CLUSTERS = [
  { name: 'Rates', c: new Vector3(-3.1, 1.15, -0.6), color: ICE, share: 0.34 },
  { name: 'Credit', c: new Vector3(-0.6, -1.25, 0.9), color: TEAL, share: 0.27 },
  { name: 'FX', c: new Vector3(1.9, 1.05, -1.2), color: LILAC, share: 0.22 },
  { name: 'Equities', c: new Vector3(3.6, -0.9, 0.4), color: WARM, share: 0.17 },
];

/** Leadership network (from the VP role description): a hub and the groups it works with. */
export const NETWORK = {
  hub: new Vector3(0, 0, 0),
  groups: [
    { name: 'Offshore analytics and reporting team', c: new Vector3(3.6, -0.7, -0.6), nodes: 7, r: 0.95 },
    { name: 'Business leaders', c: new Vector3(-3.5, 1.3, -0.8), nodes: 4, r: 0.7 },
    { name: 'Technology partners', c: new Vector3(-2.6, -1.8, 0.6), nodes: 3, r: 0.6 },
    { name: 'Teams across regions', c: new Vector3(0.8, 2.4, -2.4), nodes: 3, r: 1.1 },
  ],
};
function networkNodes() {
  seed = 5;
  return NETWORK.groups.map(g => Array.from({ length: g.nodes }, (_, k) => {
    const a = (k / g.nodes) * Math.PI * 2 + rnd() * .4;
    return new Vector3(g.c.x + Math.cos(a) * g.r * (0.5 + rnd() * .5), g.c.y + Math.sin(a) * g.r * 0.6, g.c.z + (rnd() - .5) * .8);
  }));
}
export const NET_NODES = networkNodes();

/** Career: a path into depth with a ring of light at each move (years from LinkedIn). */
export const CAREER = [
  { year: 2015.83, when: '2015', role: 'Tax Operations Analyst' },
  { year: 2017.83, when: '2017', role: 'Client Implementation Analyst' },
  { year: 2018.83, when: '2018', role: 'Global Client Onboarding Data Analyst' },
  { year: 2019.92, when: '2019', role: 'KYC Data & Reporting Team Lead' },
  { year: 2020.58, when: '2020', role: 'Client Management & Analytics Team Lead' },
  { year: 2021.92, when: '2021', role: 'Client Intelligence Associate' },
  { year: 2025.92, when: 'Dec 2025', role: 'Vice President, Client Intelligence' },
];
export const careerU = (year: number) => 0.06 + 0.88 * (year - 2015.5) / (2026.3 - 2015.5);
export const careerPath = (u: number) => new Vector3(Math.sin(u * Math.PI * 1.4) * 2.6, -1.4 + u * 3.2, 4 - u * 44);
/** L//IOS sits just beyond the end of the career path, so the journey arrives at it */
export const LIOS_C = careerPath(1).add(new Vector3(0, -0.6, -15));

function textPoints(txt: string, n: number, width: number) {
  const c = document.createElement('canvas'), W = 1000, H = 320; c.width = W; c.height = H;
  const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  let size = 260; const font = (s: number) => `700 ${s}px "Mona Sans", system-ui, sans-serif`; x.font = font(size);
  while (x.measureText(txt).width > W * .92) x.font = font(size -= 8);
  x.fillText(txt, W / 2, H / 2);
  const d = x.getImageData(0, 0, W, H).data, pts: number[][] = [];
  for (let y = 0; y < H; y += 2) for (let xx = 0; xx < W; xx += 2) if (d[(y * W + xx) * 4 + 3] > 128) pts.push([(xx / W - .5) * width, -(y / H - .5) * width * H / W]);
  return Array.from({ length: n }, () => pts[Math.floor(rnd() * pts.length)] || [0, 0]);
}

function layouts(n: number) {
  seed = 11;
  const pos = SCENES.map(() => new Float32Array(n * 3));
  const col = SCENES.map(() => new Float32Array(n));
  const sub: Vector3[][] = CLUSTERS.map(c => Array.from({ length: 7 }, (_, k) => {
    const a = (k / 7) * Math.PI * 2 + rnd(), r = k === 0 ? 0 : 0.55 + rnd() * 0.5;
    return new Vector3(c.c.x + Math.cos(a) * r, c.c.y + Math.sin(a) * r * 0.7, c.c.z + (rnd() - 0.5) * 0.8);
  }));
  const mark = textPoints('L//IOS', n, 9.5);
  const allNodes = [NETWORK.hub, ...NET_NODES.flat()];
  for (let i = 0; i < n; i++) {
    // complexity: warped strata of records receding into depth, plus loose dust
    let x, y, z;
    if (rnd() < 0.88) {
      const layer = Math.floor(rnd() * 11), u = Math.pow(rnd(), 0.75) * 2 - 1, v = rnd() * 2 - 1;
      x = 3.0 + u * 8.0; z = -6 + layer * 0.95 + v * 0.35;
      y = Math.sin(u * 2.1 + layer * 0.55) * 1.0 + Math.sin(u * 5.3 - layer * 0.8) * 0.22 + (layer - 5) * 0.3 + gauss() * 0.035;
      y += 0.35 * Math.exp(-((u - 0.35) ** 2) * 8);
      y += 1.25 - u * 0.55;
    } else { x = (rnd() - 0.3) * 24; y = (rnd() - 0.5) * 11; z = -12 + rnd() * 16; }
    pos[0].set([x, y, z], i * 3); col[0][i] = rnd() < 0.06 ? WARM : rnd() < 0.65 ? ICE : DIM;

    // structure: business lines, each a family of sub-clusters
    let k = 0, acc = 0; const r = rnd();
    for (; k < CLUSTERS.length - 1; k++) { acc += CLUSTERS[k].share; if (r < acc) break; }
    const s = sub[k][Math.floor(Math.pow(rnd(), 1.6) * 7)];
    const spread = 0.09 + rnd() * 0.1;
    pos[1].set([s.x + gauss() * spread, s.y + gauss() * spread * 0.8, s.z + gauss() * spread], i * 3);
    col[1][i] = CLUSTERS[k].color;

    // procedural scenes keep a stored fallback
    pos[2].set([(rnd() - 0.5) * 12, (rnd() - 0.5) * 2, (rnd() - 0.5) * 2], i * 3); col[2][i] = ICE;
    pos[3].set([(rnd() - 0.5) * 10, (rnd() - 0.5) * 4, (rnd() - 0.5) * 2], i * 3); col[3][i] = ICE;
    pos[4].set([(rnd() - 0.5) * 14, 0, 0], i * 3); col[4][i] = WARM;

    // network nodes: a soft ball of light per person or group (arc particles are procedural)
    const node = rnd() < 0.18 ? NETWORK.hub : allNodes[1 + Math.floor(rnd() * (allNodes.length - 1))];
    const nr = node === NETWORK.hub ? 0.32 : 0.14;
    pos[5].set([node.x + gauss() * nr, node.y + gauss() * nr, node.z + gauss() * nr], i * 3);
    col[5][i] = node === NETWORK.hub ? WARM : rnd() < .7 ? ICE : WARM;

    // career: a ribbon of light along the path, and a ring at each move
    if (rnd() < 0.42) {
      const m = Math.floor(rnd() * CAREER.length), cp = careerPath(careerU(CAREER[m].year));
      const a = rnd() * Math.PI * 2, rr = (m === CAREER.length - 1 ? 1.5 : 1.0) + gauss() * 0.025;
      pos[6].set([cp.x + Math.cos(a) * rr, cp.y + Math.sin(a) * rr, cp.z + gauss() * 0.03], i * 3);
      col[6][i] = m === CAREER.length - 1 ? WARM : ICE;
    } else {
      const cp = careerPath(rnd());
      pos[6].set([cp.x + gauss() * 0.12, cp.y - 0.9 + gauss() * 0.04, cp.z + gauss() * 0.1], i * 3);
      col[6][i] = rnd() < .8 ? DIM : ICE;
    }

    // L//IOS: the mark, inside a tilted orbit
    if (rnd() < 0.8) { const p = mark[i]; pos[7].set([LIOS_C.x + p[0], LIOS_C.y + p[1] + 0.3, LIOS_C.z + (rnd() - .5) * .25], i * 3); col[7][i] = rnd() < .85 ? VIOLET : ICE; }
    else { const a = rnd() * Math.PI * 2, rr = 6.2 + gauss() * .05; pos[7].set([LIOS_C.x + Math.cos(a) * rr, LIOS_C.y + Math.sin(a) * rr * 0.28 - 0.2, LIOS_C.z + Math.sin(a) * 2], i * 3); col[7][i] = LILAC; }

    // horizon: everything settles into one clear line
    const hx = (rnd() - 0.5) * 30;
    pos[8].set([LIOS_C.x + hx, LIOS_C.y - 2.4 + gauss() * 0.015 * (1 + Math.abs(hx) * .05), LIOS_C.z - 4 + gauss() * 0.4], i * 3);
    col[8][i] = Math.abs(hx) < 3 ? WARM : ICE;
  }
  const segs: number[] = [];
  sub.forEach(group => group.forEach((p, j) => { if (j) segs.push(group[0].x, group[0].y, group[0].z, p.x, p.y, p.z); }));
  for (let a = 0; a < CLUSTERS.length - 1; a++) { const p = sub[a][0], q = sub[a + 1][0]; segs.push(p.x, p.y, p.z, q.x, q.y, q.z); }
  return { pos, col, segs: new Float32Array(segs) };
}

/** arcs for the network: hub → every node, and around the team */
function arcs() {
  const A: Vector3[] = [];
  NET_NODES.forEach((g, gi) => g.forEach((p, k) => { A.push(NETWORK.hub, p); if (gi === 0 && k) A.push(g[0], p); }));
  return A.slice(0, 48);
}
const ARCS = arcs();
const NARC = ARCS.length / 2;

const VERT = /* glsl */`
#define NARC ${NARC}
attribute vec3 aA; attribute vec3 aB; attribute float cA; attribute float cB; attribute vec4 aSeed;
uniform float uMorph, uTime, uIntro, uLens, uKA, uKB, uSize, uDrift, uPx, uFocus, uAperture, uScale, uGain;
uniform vec2 uPointer;
uniform vec3 uArcs[${NARC * 2}];
varying vec3 vColor; varying float vAlpha; varying float vSharp;

vec3 pal(float c){
  if(c<.5) return vec3(.62,.83,1.);      // ice
  if(c<1.5) return vec3(1.,.84,.63);     // warm insight
  if(c<2.5) return vec3(1.,.54,.24);     // exception amber
  if(c<3.5) return vec3(.36,.45,.58);    // dim
  if(c<4.5) return vec3(.45,.9,.86);     // teal
  if(c<5.5) return vec3(.78,.7,1.);      // lilac
  return vec3(.63,.55,1.);               // violet
}
// validation: messy lanes, then a rule gate, then ordered lanes; ~3% exceptions drop to a tray
vec3 flow(vec4 s, out float c){
  float t = fract(s.x*7.13 + uTime*(.05 + .025*s.y));
  float x = mix(-10., 9., t);
  float flag = step(s.y, .03), passed = smoothstep(-.15, .25, x);
  float laneOrdered = (floor(s.z*8.)/7.-.5)*2.4;
  float pinch = smoothstep(2.6, 0., abs(x));
  vec3 messy = vec3(x, ((s.z-.5)*3.4 + .35*sin(x*1.3 + s.w*20. + uTime*.4))*mix(1., .35, pinch), ((s.w-.5)*3.2 + .3*cos(x*1.1 + s.z*14.))*mix(1., .2, pinch));
  vec3 p = mix(messy, vec3(x, laneOrdered*.62, 0.), passed*(1.-flag));
  p = mix(p, vec3(1.6 + s.z*3.2, -1.75 + s.w*.28, .4 + (s.x-.5)*.5), flag*smoothstep(0., 2.2, x));
  c = flag*passed > .5 ? 2. : 0.;
  return p;
}
// manual: a grid of small loops, each a report rebuilt by hand; a few run late (warm)
vec3 loops(vec4 s, out float c){
  float k = floor(s.x*15.);
  vec2 g = vec2(mod(k, 5.), floor(k/5.));
  vec3 ctr = vec3((g.x-2.)*1.9 + sin(k*1.7)*.25, (g.y-1.)*1.55 + cos(k*2.3)*.2, sin(k*3.1)*.6);
  float a = s.y*6.2832 + uTime*(.5 + .5*fract(k*.37))*(mod(k,2.)<1.?1.:-1.);
  float r = .5 + (s.z-.5)*.08;
  c = fract(k*.61) < .2 ? 1. : 0.;
  return ctr + vec3(cos(a)*r, sin(a)*r, (s.w-.5)*.08);
}
// automated: one pipeline every record flows through
vec3 pipe(vec4 s, out float c){
  float t = fract(s.x + uTime*.07);
  float x = mix(-11., 11., t);
  vec3 axis = vec3(x, .7*sin(x*.33) - .2, .9*cos(x*.27) - .6);
  float a = s.z*6.2832 + x*.6, r = .28*sqrt(s.y);
  c = 1.;
  return axis + vec3(0., cos(a)*r, sin(a)*r);
}
// network arcs: pulses travelling between the hub and each node
vec3 arc(vec4 s){
  int i = int(floor(s.y*float(NARC)));
  vec3 a = uArcs[0], b = uArcs[1];
  for(int k=0;k<NARC;k++){ if(k==i){ a = uArcs[k*2]; b = uArcs[k*2+1]; } }
  float t = fract(s.x*3.7 + uTime*(.12 + .1*s.z));
  vec3 mid = (a+b)*.5 + vec3(0., .45 + .2*s.w, .3);
  vec3 p = mix(mix(a, mid, t), mix(mid, b, t), t);
  return p + (vec3(s.z, s.w, s.x)-.5)*.03;
}
vec3 layoutOf(float kind, vec3 stored, float storedC, out float c){
  c = storedC;
  if(kind < .5) return stored;
  if(kind < 1.5) return flow(aSeed, c);
  if(kind < 2.5) return loops(aSeed, c);
  if(kind < 3.5) return pipe(aSeed, c);
  if(aSeed.w < .38){ c = 1.; return arc(aSeed); }
  return stored;
}
void main(){
  float ca, cb;
  vec3 A = layoutOf(uKA, aA, cA, ca);
  vec3 B = layoutOf(uKB, aB, cB, cb);
  float k = clamp((uMorph - aSeed.x*.4)/.6, 0., 1.); k = k*k*(3.-2.*k);
  vec3 p = mix(A, B, k);
  p += sin(k*3.14159) * .9 * vec3(sin(aSeed.y*40.+uTime*.6), cos(aSeed.z*30.+uTime*.5), sin(aSeed.w*20.));
  p += uDrift * .05 * vec3(sin(uTime*.3 + aSeed.x*60.), cos(uTime*.25 + aSeed.y*50.), sin(uTime*.2 + aSeed.z*40.));
  vec4 clipA = projectionMatrix * modelViewMatrix * vec4(p, 1.);
  vec2 ndc = clipA.xy / clipA.w;
  float lens = uLens * smoothstep(.34, 0., distance(ndc*vec2(1.,.75), uPointer*vec2(1.,.75)));
  p = mix(p, B, lens * (1. - k));
  p.z -= (1. - uIntro) * (30. + aSeed.w*40.);
  p.xy *= mix(2.5, 1., uIntro);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;
  float coc = clamp(abs(depth - uFocus) * uAperture, 0., 1.) * (1. - lens);
  vSharp = 1. - coc;
  gl_PointSize = min(uSize * uScale * uPx * (0.6 + aSeed.y*1.0) * (1. + coc*3.2 + lens*.6) / max(depth, .5), 64. * uPx);
  vColor = mix(pal(ca), pal(cb), k);
  vColor = mix(vColor, vec3(1.,.9,.75), lens*.5);
  vAlpha = smoothstep(46., 5., depth) * smoothstep(.2, 1.2, depth) * (.35 + .65*uIntro) * mix(.16, 1., vSharp) * (.85 + lens*.5) * uGain;
}`;
const FRAG = /* glsl */`
varying vec3 vColor; varying float vAlpha; varying float vSharp;
void main(){
  vec2 q = gl_PointCoord - .5; float d2 = dot(q, q);
  if(d2 > .25) discard;
  float core = exp(-d2 * 70.), halo = exp(-d2 * 12.) * .35, disc = smoothstep(.25, .2, d2) * .55;
  gl_FragColor = vec4(vColor * mix(disc, core + halo, vSharp) * vAlpha, 1.);
}`;

export interface FieldOptions { canvas: HTMLCanvasElement; count: number; mobile: boolean; reduce: boolean }

export class Field {
  renderer: WebGLRenderer; scene = new Scene(); camera: PerspectiveCamera; mat: ShaderMaterial; geo = new BufferGeometry();
  lines: LineSegments; lineMat: LineBasicMaterial; sky: Mesh; skyTint = new Color();
  gate = new Group(); gateMats: MeshBasicMaterial[] = [];
  attrs: { pos: BufferAttribute[]; col: BufferAttribute[] };
  pointer = new Vector2(9, 9); pointerT = new Vector2(9, 9);
  dpr: number; frameTimes: number[] = []; pair = -1;
  constructor(o: FieldOptions) {
    this.renderer = new WebGLRenderer({ canvas: o.canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.dpr = Math.min(devicePixelRatio || 1, o.mobile ? 1.5 : 1.75);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setClearColor(0x050a11, 1);
    // the sky: a full-screen gradient drawn first, so particle light always adds onto it (tinted per scene)
    this.sky = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({
      depthTest: false, depthWrite: false,
      uniforms: { uTint: { value: this.skyTint }, uAspect: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: `varying vec2 vUv; uniform vec3 uTint; uniform float uAspect;
        void main(){
          vec2 p = (vUv - vec2(.7, 1.)) * vec2(uAspect, 1.);
          float r = length(p);
          vec3 deep = vec3(.02, .039, .067), mid = mix(vec3(.047, .094, .141), uTint*.75, .35);
          vec3 c = mix(uTint, mid, smoothstep(.0, .55, r));
          c = mix(c, deep, smoothstep(.45, 1.35, r));
          gl_FragColor = vec4(c, 1.);
        }`,
    }));
    this.sky.frustumCulled = false; this.sky.renderOrder = -1; this.scene.add(this.sky);
    this.camera = new PerspectiveCamera(o.mobile ? 62 : 48, 1, 0.1, 140);
    const L = layouts(o.count);
    this.attrs = { pos: L.pos.map(a => new BufferAttribute(a, 3)), col: L.col.map(a => new BufferAttribute(a, 1)) };
    const seeds = new Float32Array(o.count * 4); for (let i = 0; i < seeds.length; i++) seeds[i] = rnd();
    this.geo.setAttribute('position', this.attrs.pos[0]);
    this.geo.setAttribute('aSeed', new BufferAttribute(seeds, 4));
    this.mat = new ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: {
        uMorph: { value: 0 }, uTime: { value: 0 }, uIntro: { value: o.reduce ? 1 : 0 }, uLens: { value: 0 }, uKA: { value: 0 }, uKB: { value: 0 },
        uSize: { value: o.mobile ? 34 : 30 }, uDrift: { value: o.reduce ? 0 : 1 }, uPx: { value: this.dpr }, uPointer: { value: this.pointer },
        uFocus: { value: 9 }, uAperture: { value: 0.22 }, uScale: { value: 1 }, uGain: { value: 1 }, uArcs: { value: ARCS },
      },
    });
    this.setPair(0);
    const pts = new Points(this.geo, this.mat); pts.frustumCulled = false; this.scene.add(pts);
    const lg = new BufferGeometry(); lg.setAttribute('position', new BufferAttribute(L.segs, 3));
    this.lineMat = new LineBasicMaterial({ color: new Color(0.62, 0.83, 1), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
    this.lines = new LineSegments(lg, this.lineMat); this.scene.add(this.lines);
    this.gateMats = [0, 1, 2].map(() => new MeshBasicMaterial({ color: new Color(0.62, 0.83, 1), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }));
    [1.95, 1.7, 1.45].forEach((r, k) => { const m = new Mesh(new TorusGeometry(r, k === 0 ? 0.012 : 0.006, 6, 160), this.gateMats[k]); m.rotation.y = Math.PI / 2; this.gate.add(m); });
    this.scene.add(this.gate);
  }
  setPair(i: number) {
    if (i === this.pair) return; this.pair = i;
    const j = Math.min(i + 1, SCENES.length - 1);
    this.geo.setAttribute('aA', this.attrs.pos[i]); this.geo.setAttribute('aB', this.attrs.pos[j]);
    this.geo.setAttribute('cA', this.attrs.col[i]); this.geo.setAttribute('cB', this.attrs.col[j]);
    this.mat.uniforms.uKA.value = KIND[i]; this.mat.uniforms.uKB.value = KIND[j];
  }
  resize(w: number, h: number) { this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); (this.sky.material as ShaderMaterial).uniforms.uAspect.value = w / h; }
  project(v: Vector3, w: number, h: number) { const p = v.clone().project(this.camera); return { x: (p.x + 1) / 2 * w, y: (1 - p.y) / 2 * h, visible: p.z < 1 && p.z > -1 }; }
  render(t: number, pos: number, lens: number, focus: number, dim = 1) {
    const i = Math.min(SCENES.length - 2, Math.floor(pos)), f = Math.min(1, Math.max(0, pos - i));
    this.setPair(i);
    const u = this.mat.uniforms;
    u.uMorph.value = f; u.uTime.value = t; u.uLens.value = lens; u.uFocus.value = focus;
    u.uScale.value = SCALE[i] + (SCALE[i + 1] - SCALE[i]) * f; u.uGain.value = (GAIN[i] + (GAIN[i + 1] - GAIN[i]) * f) * dim;
    const a = TINT[i], b = TINT[i + 1]; this.skyTint.setRGB(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
    this.pointer.lerp(this.pointerT, 0.12);
    const near = (k: number) => Math.max(0, 1 - Math.abs(pos - k) * 2.2);
    this.lineMat.opacity = near(1) * 0.38; this.lines.visible = near(1) > 0.01;
    const vw = near(2);
    this.gateMats.forEach((m, k) => { m.opacity = vw * (k === 0 ? 0.9 : 0.45); });
    this.gate.visible = vw > 0.01; this.gate.rotation.x = t * 0.15;
    this.renderer.render(this.scene, this.camera);
  }
  adapt(dt: number) {
    this.frameTimes.push(dt); if (this.frameTimes.length < 50) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length; this.frameTimes = [];
    if (avg > 24 && this.dpr > 1) { this.dpr = Math.max(1, this.dpr - 0.25); this.renderer.setPixelRatio(this.dpr); this.mat.uniforms.uPx.value = this.dpr; }
  }
}
