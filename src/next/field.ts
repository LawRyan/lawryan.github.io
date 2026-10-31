/**
 * The data field: one Points cloud whose particles travel between scene layouts.
 *
 * Each scene is a target layout (vec3 per particle) plus a colour code. The vertex shader blends the two
 * neighbouring layouts by `uMorph`, with a per-particle delay so the transition pours rather than snaps.
 * Two layouts are procedural in the shader instead of stored: the validation stream (records flowing through
 * a rule gate, exceptions peeling off) is computed from each particle's seed and time.
 *
 * The cursor is a lens: points that fall under it lean toward the *next* scene's layout, so the visitor
 * literally brings order to the data under their pointer.
 */
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial,
  PerspectiveCamera, PlaneGeometry, Points, Scene, ShaderMaterial, TorusGeometry, Vector2, Vector3, WebGLRenderer,
} from 'three';

export type SceneKey = 'complexity' | 'structure' | 'validation';
export const SCENES: SceneKey[] = ['complexity', 'structure', 'validation'];
const FLOW = 2;   // index of the procedural validation stream

// colour codes (see pal() in the shader)
const ICE = 0, WARM = 1, AMBER = 2, DIM = 3, TEAL = 4, LILAC = 5;

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());

/** Business lines and sub-clusters for the Structure scene (illustrative). */
export const CLUSTERS = [
  { name: 'Rates', c: new Vector3(-3.1, 1.15, -0.6), color: ICE, share: 0.34 },
  { name: 'Credit', c: new Vector3(-0.6, -1.25, 0.9), color: TEAL, share: 0.27 },
  { name: 'FX', c: new Vector3(1.9, 1.05, -1.2), color: LILAC, share: 0.22 },
  { name: 'Equities', c: new Vector3(3.6, -0.9, 0.4), color: WARM, share: 0.17 },
];

function layouts(n: number) {
  seed = 11;
  const pos = SCENES.map(() => new Float32Array(n * 3));
  const col = SCENES.map(() => new Float32Array(n));
  const sub: Vector3[][] = CLUSTERS.map(c => Array.from({ length: 7 }, (_, k) => {
    const a = (k / 7) * Math.PI * 2 + rnd(), r = k === 0 ? 0 : 0.55 + rnd() * 0.5;
    return new Vector3(c.c.x + Math.cos(a) * r, c.c.y + Math.sin(a) * r * 0.7, c.c.z + (rnd() - 0.5) * 0.8);
  }));
  for (let i = 0; i < n; i++) {
    // ── complexity: thin, warped strata of records receding into depth, plus loose dust
    let x, y, z;
    if (rnd() < 0.88) {
      // strata: thin warped sheets of records, like a market surface seen edge-on, sweeping in from the right
      const layer = Math.floor(rnd() * 11), u = Math.pow(rnd(), 0.75) * 2 - 1, v = rnd() * 2 - 1;
      x = 3.0 + u * 8.0; z = -6 + layer * 0.95 + v * 0.35;
      y = Math.sin(u * 2.1 + layer * 0.55) * 1.0 + Math.sin(u * 5.3 - layer * 0.8) * 0.22 + (layer - 5) * 0.3 + gauss() * 0.035;
      y += 0.35 * Math.exp(-((u - 0.35) ** 2) * 8);   // one rising ridge: something in the data wants attention
      y += 1.25 - u * 0.55;                             // the field rises toward the top right, clear of the headline
    } else { x = (rnd() - 0.3) * 24; y = (rnd() - 0.5) * 11; z = -12 + rnd() * 16; }
    pos[0].set([x, y, z], i * 3); col[0][i] = rnd() < 0.06 ? WARM : rnd() < 0.65 ? ICE : DIM;

    // ── structure: business lines, each a family of sub-clusters
    let k = 0, acc = 0, r = rnd();
    for (; k < CLUSTERS.length - 1; k++) { acc += CLUSTERS[k].share; if (r < acc) break; }
    const s = sub[k][Math.floor(Math.pow(rnd(), 1.6) * 7)];
    const spread = 0.09 + rnd() * 0.1;
    pos[1].set([s.x + gauss() * spread, s.y + gauss() * spread * 0.8, s.z + gauss() * spread], i * 3);
    col[1][i] = CLUSTERS[k].color;

    // ── validation: placeholder (the shader computes the stream); keep a sensible start
    pos[2].set([(rnd() - 0.5) * 12, (rnd() - 0.5) * 2, (rnd() - 0.5) * 2], i * 3);
    col[2][i] = ICE;
  }
  // lines that connect sub-clusters to their cluster centre, and centres to each other
  const segs: number[] = [];
  sub.forEach(group => group.forEach((p, j) => { if (j) segs.push(group[0].x, group[0].y, group[0].z, p.x, p.y, p.z); }));
  for (let a = 0; a < CLUSTERS.length - 1; a++) { const p = sub[a][0], q = sub[a + 1][0]; segs.push(p.x, p.y, p.z, q.x, q.y, q.z); }
  return { pos, col, segs: new Float32Array(segs) };
}

const VERT = /* glsl */`
attribute vec3 aA; attribute vec3 aB; attribute float cA; attribute float cB; attribute vec4 aSeed;
uniform float uMorph, uTime, uIntro, uLens, uAFlow, uBFlow, uSize, uDrift, uPx, uFocus, uAperture, uScale, uGain;
uniform vec2 uPointer;
varying vec3 vColor; varying float vAlpha; varying float vSharp;

vec3 pal(float c){
  if(c<.5) return vec3(.62,.83,1.);      // ice
  if(c<1.5) return vec3(1.,.84,.63);     // warm insight
  if(c<2.5) return vec3(1.,.54,.24);     // exception amber
  if(c<3.5) return vec3(.36,.45,.58);    // dim
  if(c<4.5) return vec3(.45,.9,.86);     // teal
  return vec3(.78,.7,1.);                // lilac
}
// validation stream: records flow left → right through a rule gate at x = 0; ~3% are exceptions
vec3 flow(vec4 s, out float flag, out float passed){
  float sp = .05 + .025*s.y;
  float t = fract(s.x*7.13 + uTime*sp);
  float x = mix(-10., 9., t);
  flag = step(s.y, .03);
  passed = smoothstep(-.15, .25, x);
  // before the gate: messy, wandering lanes; after it: records travel in exact, evenly spaced lanes
  float laneI = floor(s.z*8.), laneOrdered = (laneI/7.-.5)*2.4;
  float messyY = (s.z-.5)*3.4 + .35*sin(x*1.3 + s.w*20. + uTime*.4);
  float messyZ = (s.w-.5)*3.2 + .3*cos(x*1.1 + s.z*14.);
  float pinch = smoothstep(2.6, 0., abs(x));
  vec3 messy = vec3(x, messyY*mix(1., .35, pinch), messyZ*mix(1., .2, pinch));
  vec3 ordered = vec3(x, laneOrdered*.62, 0.);
  vec3 p = mix(messy, ordered, passed*(1.-flag));
  // exceptions: after the gate they peel off and settle in a tray below
  vec3 tray = vec3(1.6 + s.z*3.2, -1.75 + s.w*.28, .4 + (s.x-.5)*.5);
  float fall = flag*smoothstep(0., 2.2, x);
  p = mix(p, tray, fall);
  return p;
}
void main(){
  float fA, pA, fB, pB;
  vec3 A = uAFlow > .5 ? flow(aSeed, fA, pA) : aA;
  vec3 B = uBFlow > .5 ? flow(aSeed, fB, pB) : aB;
  // per-particle delay, so layouts pour into each other
  float k = clamp((uMorph - aSeed.x*.4)/.6, 0., 1.); k = k*k*(3.-2.*k);
  vec3 p = mix(A, B, k);
  // in flight, a little turbulence
  p += sin(k*3.14159) * .9 * vec3(sin(aSeed.y*40.+uTime*.6), cos(aSeed.z*30.+uTime*.5), sin(aSeed.w*20.));
  // slow drift so a held scene still breathes
  p += uDrift * .05 * vec3(sin(uTime*.3 + aSeed.x*60.), cos(uTime*.25 + aSeed.y*50.), sin(uTime*.2 + aSeed.z*40.));
  // the lens: under the pointer, points lean toward the next layout
  vec4 clipA = projectionMatrix * modelViewMatrix * vec4(p, 1.);
  vec2 ndc = clipA.xy / clipA.w;
  float lens = uLens * smoothstep(.34, 0., distance(ndc*vec2(1.,.75), uPointer*vec2(1.,.75)));
  p = mix(p, B, lens * (1. - k));
  // the entrance: records arrive from deep space
  p.z -= (1. - uIntro) * (30. + aSeed.w*40.);
  p.xy *= mix(2.5, 1., uIntro);

  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;
  // depth of field: out-of-focus records grow soft and faint; the lens pulls them into focus
  float coc = clamp(abs(depth - uFocus) * uAperture, 0., 1.) * (1. - lens);
  vSharp = 1. - coc;
  gl_PointSize = min(uSize * uScale * uPx * (0.6 + aSeed.y*1.0) * (1. + coc*3.2 + lens*.6) / depth, 64. * uPx);
  vec3 ca = pal(cA), cb = pal(cB);
  if(uAFlow > .5) ca = mix(pal(0.), pal(2.), fA*pA);
  if(uBFlow > .5) cb = mix(pal(0.), pal(2.), fB*pB);
  vColor = mix(ca, cb, k);
  vColor = mix(vColor, vec3(1.,.9,.75), lens*.5);
  vAlpha = smoothstep(42., 5., depth) * (.35 + .65*uIntro) * mix(.16, 1., vSharp) * (.85 + lens*.5) * uGain;
}`;
const FRAG = /* glsl */`
varying vec3 vColor; varying float vAlpha; varying float vSharp;
void main(){
  vec2 q = gl_PointCoord - .5; float d2 = dot(q, q);
  if(d2 > .25) discard;
  // sharp records: a bright core with a soft halo (cheap bloom); soft records: an even disc (bokeh)
  float core = exp(-d2 * 70.), halo = exp(-d2 * 12.) * .35, disc = smoothstep(.25, .2, d2) * .55;
  float a = mix(disc, core + halo, vSharp);
  gl_FragColor = vec4(vColor * a * vAlpha, 1.);
}`;

export interface FieldOptions { canvas: HTMLCanvasElement; count: number; mobile: boolean; reduce: boolean }

export class Field {
  renderer: WebGLRenderer; scene = new Scene(); camera: PerspectiveCamera; mat: ShaderMaterial; geo = new BufferGeometry();
  lines: LineSegments; lineMat: LineBasicMaterial;
  attrs: { pos: BufferAttribute[]; col: BufferAttribute[] };
  pointer = new Vector2(9, 9); pointerT = new Vector2(9, 9);
  camPos = new Vector3(); camLook = new Vector3();
  dpr: number; frameTimes: number[] = [];
  constructor(private o: FieldOptions) {
    this.renderer = new WebGLRenderer({ canvas: o.canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.dpr = Math.min(devicePixelRatio || 1, o.mobile ? 1.5 : 1.75);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setClearColor(0x050a11, 1);
    // the sky: a full-screen gradient drawn first, so particle light always adds onto it (and can change per scene)
    this.sky = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({
      depthTest: false, depthWrite: false,
      uniforms: { uTint: { value: new Color(0.055, 0.125, 0.196) }, uAspect: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: `varying vec2 vUv; uniform vec3 uTint; uniform float uAspect;
        void main(){
          vec2 p = (vUv - vec2(.7, 1.)) * vec2(uAspect, 1.);
          float r = length(p);
          vec3 deep = vec3(.02, .039, .067), mid = vec3(.047, .094, .141);
          vec3 c = mix(uTint, mid, smoothstep(.0, .55, r));
          c = mix(c, deep, smoothstep(.45, 1.35, r));
          gl_FragColor = vec4(c, 1.);
        }`,
    }));
    this.sky.frustumCulled = false; this.sky.renderOrder = -1; this.scene.add(this.sky);
    this.camera = new PerspectiveCamera(o.mobile ? 62 : 48, 1, 0.1, 120);
    const L = layouts(o.count);
    this.attrs = { pos: L.pos.map(a => new BufferAttribute(a, 3)), col: L.col.map(a => new BufferAttribute(a, 1)) };
    const seeds = new Float32Array(o.count * 4); for (let i = 0; i < seeds.length; i++) seeds[i] = rnd();
    this.geo.setAttribute('position', this.attrs.pos[0]);   // three needs a position; the shader uses aA/aB
    this.geo.setAttribute('aSeed', new BufferAttribute(seeds, 4));
    this.setPair(0);
    this.mat = new ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: {
        uMorph: { value: 0 }, uTime: { value: 0 }, uIntro: { value: o.reduce ? 1 : 0 }, uLens: { value: 0 }, uAFlow: { value: 0 }, uBFlow: { value: 0 },
        uSize: { value: o.mobile ? 34 : 30 }, uFocus: { value: 9 }, uAperture: { value: 0.22 }, uScale: { value: 1 }, uGain: { value: 1 }, uDrift: { value: o.reduce ? 0 : 1 }, uPx: { value: this.dpr }, uPointer: { value: this.pointer },
      },
    });
    const pts = new Points(this.geo, this.mat); pts.frustumCulled = false; this.scene.add(pts);
    const lg = new BufferGeometry(); lg.setAttribute('position', new BufferAttribute(L.segs, 3));
    this.lineMat = new LineBasicMaterial({ color: new Color(0.62, 0.83, 1), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
    this.lines = new LineSegments(lg, this.lineMat); this.scene.add(this.lines);
    this.gateMats = [0, 1, 2].map(() => new MeshBasicMaterial({ color: new Color(0.62, 0.83, 1), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }));
    [1.95, 1.7, 1.45].forEach((r, k) => { const m = new Mesh(new TorusGeometry(r, k === 0 ? 0.012 : 0.006, 6, 160), this.gateMats[k]); m.rotation.y = Math.PI / 2; this.gate.add(m); });
    this.scene.add(this.gate);
  }
  gate = new Group(); gateMats: MeshBasicMaterial[] = []; sky: Mesh;
  pair = -1;
  setPair(i: number) {
    if (i === this.pair) return; this.pair = i;
    const j = Math.min(i + 1, SCENES.length - 1);
    this.geo.setAttribute('aA', this.attrs.pos[i]); this.geo.setAttribute('aB', this.attrs.pos[j]);
    this.geo.setAttribute('cA', this.attrs.col[i]); this.geo.setAttribute('cB', this.attrs.col[j]);
    if (this.mat) { this.mat.uniforms.uAFlow.value = i === FLOW ? 1 : 0; this.mat.uniforms.uBFlow.value = j === FLOW ? 1 : 0; }
  }
  resize(w: number, h: number) { this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); ((this.sky.material as ShaderMaterial).uniforms.uAspect.value = w / h); }
  /** Project a world point to CSS pixels (for HTML labels). */
  project(v: Vector3, w: number, h: number) { const p = v.clone().project(this.camera); return { x: (p.x + 1) / 2 * w, y: (1 - p.y) / 2 * h, visible: p.z < 1 }; }
  render(t: number, pos: number, lens: number, focus: number) {
    this.mat.uniforms.uFocus.value = focus;
    const i = Math.min(SCENES.length - 2, Math.floor(pos)), f = Math.min(1, Math.max(0, pos - i));
    this.setPair(i);
    const u = this.mat.uniforms;
    u.uAFlow.value = i === FLOW ? 1 : 0; u.uBFlow.value = i + 1 === FLOW ? 1 : 0;
    u.uMorph.value = f; u.uTime.value = t; u.uLens.value = lens;
    const SCALE = [1, .62, .8], GAIN = [1, .62, .9];
    u.uScale.value = SCALE[i] + (SCALE[i + 1] - SCALE[i]) * f; u.uGain.value = GAIN[i] + (GAIN[i + 1] - GAIN[i]) * f;
    this.pointer.lerp(this.pointerT, 0.12);
    // structure lines are visible only while the structure layout holds
    const sw = Math.max(0, 1 - Math.abs(pos - 1) * 2.2);
    this.lineMat.opacity = sw * 0.38;
    const vw = Math.max(0, 1 - Math.abs(pos - 2) * 2.2);
    this.gateMats.forEach((m, k) => { m.opacity = vw * (k === 0 ? 0.9 : 0.45); });
    this.gate.rotation.x = t * 0.15;
    this.renderer.render(this.scene, this.camera);
  }
  /** Adaptive quality: if frames run long, lower the pixel ratio (never below 1). */
  adapt(dt: number) {
    this.frameTimes.push(dt); if (this.frameTimes.length < 50) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length; this.frameTimes = [];
    if (avg > 24 && this.dpr > 1) { this.dpr = Math.max(1, this.dpr - 0.25); this.renderer.setPixelRatio(this.dpr); this.mat.uniforms.uPx.value = this.dpr; }
  }
}
