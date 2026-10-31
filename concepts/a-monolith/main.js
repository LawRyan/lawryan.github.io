/**
 * Concept A, the Monolith.
 * One physical object, built from 44 machined laminations split down a lit seam. Scroll choreographs it:
 * closed → fanned (layers) → banded and scanned (checked) → aligned with light running through it (automated)
 * → separated into the seven roles of a career, climbed by the camera. Act II returns to the closed object,
 * splits it open, and the camera passes through the light into a white room where the L//IOS screens stand.
 */
import {
  ACESFilmicToneMapping, AmbientLight, BoxGeometry, CanvasTexture, Color, DirectionalLight, Fog, Group, HemisphereLight,
  InstancedMesh, MathUtils, Matrix4, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Object3D,
  PerspectiveCamera, PlaneGeometry, PMREMGenerator, PointLight, Quaternion, Scene, SpotLight, SRGBColorSpace, Texture,
  Vector2, Vector3, WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const root = document.documentElement;
const reduce = root.classList.contains('rm');
const phone = () => innerWidth < 760;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const ease = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const bell = (t, k) => smooth(1 - Math.abs(t - k));
const V = (x, y, z) => new Vector3(x, y, z);

// ── the object
const N = 44, LH = 0.074, PITCH = 0.088, W = 1.5, D = 0.95, SEAM = 0.036;
const HW = (W - SEAM) / 2;
const TOP = N * PITCH;
const CAREER = [
  ['2015', 2.0], ['2017', 1.0], ['2018', 1.08], ['2019', 0.67], ['2020', 1.33], ['2021', 4.0], ['2025', 0.9],
];
const bandOf = (() => {   // layers per role, proportional to time in the role
  const total = CAREER.reduce((a, c) => a + c[1], 0), out = []; let acc = 0, k = 0;
  for (let i = 0; i < N; i++) { while (k < CAREER.length - 1 && i >= Math.round((acc + CAREER[k][1]) / total * N)) { acc += CAREER[k][1]; k++; } out.push(k); }
  return out;
})();
const FLAGGED = [6, 15, 27, 36];

function webgl() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(0,0,0,.9)'); g.addColorStop(.45, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new CanvasTexture(c);
}
function poolTexture() {   // the light pool on the floor
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,240,220,.22)'); g.addColorStop(.5, 'rgba(255,240,220,.06)'); g.addColorStop(1, 'rgba(255,240,220,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new CanvasTexture(c);
}

// ── UI that works with or without WebGL: product tabs and screen buttons
const products = [...document.querySelectorAll('.sheet')];
const tabs = [...document.querySelectorAll('.ptabs [role="tab"]')];
let active = 0; const shotIdx = [0, 0, 0];
const onShot = [];   // listeners (the 3D screens)
function selectProduct(i, focus) {
  active = i;
  tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
  products.forEach((p, k) => { p.hidden = k !== i; });
  if (focus) tabs[i].focus();
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => { selectProduct(i); goProduct(i); });
  t.addEventListener('keydown', e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); const n = (i + d + 3) % 3; selectProduct(n, true); goProduct(n); } });
});
products.forEach((p, pi) => {
  const btns = [...p.querySelectorAll('.s-shots button')];
  btns.forEach((b, k) => b.addEventListener('click', () => {
    btns.forEach((x, j) => x.setAttribute('aria-pressed', String(j === k))); shotIdx[pi] = k; onShot.forEach(f => f(pi, k));
  }));
});
let goProduct = () => {};

// ── scroll model
const act1 = document.getElementById('act1'), act2 = document.getElementById('lios');
const WEIGHTS = [1, 1, 1.25, 1, 2.0];               // hero, layers, checked, automated, career
const SEG = (() => { const s = WEIGHTS.reduce((a, b) => a + b, 0); let a = 0; return WEIGHTS.map(w => { const r = [a / s, (a + w) / s]; a += w; return r; }); })();
const state = { t: 0, sub: [0, 0, 0, 0, 0], q: 0, tT: 0, qT: 0 };
function actProgress(el) { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); }
function readScroll() {
  const p = actProgress(act1);
  let t = 0; const sub = [0, 0, 0, 0, 0];
  SEG.forEach(([a, b], i) => {
    const u = clamp((p - a) / (b - a));
    if (p >= a) { if (i > 0 && u < .3) t = i - 1 + smooth(u / .3); else t = i; }
    sub[i] = i === 0 ? u : clamp((u - .3) / .7);
  });
  state.tT = reduce ? Math.round(t) : t; state.sub = sub;
  state.qT = actProgress(act2);
}

// ── chapter navigation: the strata
const ticks = document.querySelector('.ticks'), navLinks = [...document.querySelectorAll('.strata a')];
for (let i = 0; i < N; i++) ticks.appendChild(document.createElement('i'));
const tickEls = [...ticks.children];
function anchorY(go) {
  const top = el => el.getBoundingClientRect().top + scrollY;
  if (go <= 4) { const h = act1.offsetHeight - innerHeight; return top(act1) + (SEG[go][0] + (SEG[go][1] - SEG[go][0]) * (go ? .42 : 0)) * h; }
  if (go === 5) return top(document.getElementById('leadership'));
  if (go === 6) return top(act2) + .02 * (act2.offsetHeight - innerHeight);
  return top(document.getElementById('contact'));
}
const PROD_Q = [[.40, .60], [.60, .80], [.80, 1]];
goProduct = i => { const h = act2.offsetHeight - innerHeight; scrollTo({ top: act2.offsetTop + (PROD_Q[i][0] + .06) * h, behavior: reduce ? 'auto' : 'smooth' }); };
navLinks.forEach(a => a.addEventListener('click', e => { e.preventDefault(); scrollTo({ top: anchorY(+a.dataset.go), behavior: reduce ? 'auto' : 'smooth' }); }));
ticks.addEventListener('click', e => { const r = ticks.getBoundingClientRect(); const f = phone() ? (e.clientX - r.left) / r.width : (e.clientY - r.top) / r.height; scrollTo({ top: f * (document.documentElement.scrollHeight - innerHeight), behavior: reduce ? 'auto' : 'smooth' }); });
function layoutNav() {
  const H = document.documentElement.scrollHeight - innerHeight, th = ticks.getBoundingClientRect().height;
  navLinks.forEach(a => { a.parentElement.style.top = (clamp(anchorY(+a.dataset.go) / H) * th + 6) + 'px'; });
}
function updateNav() {
  const H = document.documentElement.scrollHeight - innerHeight, g = clamp(scrollY / H), now = Math.round(g * (N - 1));
  tickEls.forEach((t, i) => { t.className = i === now ? 'now' : i < now ? 'done' : ''; });
  let on = 0; navLinks.forEach((a, k) => { if (scrollY + innerHeight * .5 >= anchorY(+a.dataset.go)) on = k; });
  navLinks.forEach((a, k) => a.classList.toggle('on', k === on));
}

// ── copy blocks: opacity per chapter
const C = [...document.querySelectorAll('.act-1 .c')], D0 = document.querySelector('.d0'), prodEl = document.getElementById('products');
const bands = [...document.querySelectorAll('.bands li')];
function copy(t, q) {
  C.forEach((el, i) => { const o = clamp(1 - Math.abs(t - i) * 2.2) * (i === 0 ? 1 - clamp(state.sub[0] * 1.6 - .3) * 0 : 1); el.style.setProperty('--o', o.toFixed(3)); el.style.visibility = o > .01 ? 'visible' : 'hidden'; });
  root.style.setProperty('--o0', String(clamp(1 - t * 3)));
  const d = clamp(q / .04) * (1 - clamp((q - .14) / .05));
  D0.style.setProperty('--o', d.toFixed(3)); D0.style.visibility = d > .01 ? 'visible' : 'hidden';
  const po = clamp((q - .38) / .05);
  prodEl.style.setProperty('--po', po.toFixed(3)); prodEl.classList.toggle('on', po > .3);
}

function boot() {
  readScroll(); layoutNav(); updateNav(); copy(0, 0);
  if (!webgl()) { root.classList.add('no-gl'); addEventListener('scroll', () => { readScroll(); updateNav(); }, { passive: true }); return; }

  const canvas = document.getElementById('stage');
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  let dpr = Math.min(devicePixelRatio || 1, phone() ? 1.6 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = SRGBColorSpace;
  const scene = new Scene();
  const BLACK = new Color(0x000000), WHITE = new Color(0xECEDEA);
  scene.background = BLACK.clone();
  scene.fog = new Fog(0x000000, 14, 40);
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;
  const camera = new PerspectiveCamera(phone() ? 46 : 32, 1, 0.1, 120);

  // lights: a key from above, two rims, and the warm light inside the seam
  const key = new SpotLight(0xfff4e6, 170, 0, 0.36, 1, 1.6); key.position.set(2.5, 10, 6); scene.add(key, key.target); key.target.position.set(0, 1.8, 0);
  const rimL = new DirectionalLight(0xcfe0ff, 2.4); rimL.position.set(-7, 4, -5); scene.add(rimL);
  const rimR = new DirectionalLight(0xffe2c4, 1.6); rimR.position.set(7, 2.5, -4); scene.add(rimR);
  const hemi = new HemisphereLight(0xffffff, 0xdddddd, 0); scene.add(hemi);
  const amb = new AmbientLight(0xffffff, 0); scene.add(amb);
  const inner = [new PointLight(0xffd29a, 0, 6, 1.6), new PointLight(0xffd29a, 0, 6, 1.6)];
  inner[0].position.set(0, 1.2, -0.3); inner[1].position.set(0, 2.8, -0.3); scene.add(...inner);

  // floor, light pool and contact shadow
  const floorMat = new MeshStandardMaterial({ color: 0x050505, roughness: .85, metalness: 0 });
  const floor = new Mesh(new PlaneGeometry(240, 240), floorMat); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const pool = new Mesh(new PlaneGeometry(9, 9), new MeshBasicMaterial({ map: poolTexture(), transparent: true, depthWrite: false })); pool.rotation.x = -Math.PI / 2; pool.position.y = .003; scene.add(pool);
  const shTex = shadowTexture();
  const shadow = new Mesh(new PlaneGeometry(3.2, 2.4), new MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: .9 })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .005; scene.add(shadow);

  // the monolith: two halves of 44 laminations, a seam, a core of light
  const mono = new Group(); scene.add(mono);
  const metal = new MeshPhysicalMaterial({ color: 0x1b1c1f, metalness: 1, roughness: .3, clearcoat: .35, clearcoatRoughness: .25 });
  const slab = new RoundedBoxGeometry(HW, LH, D, 2, .018);
  const halves = [new InstancedMesh(slab, metal, N), new InstancedMesh(slab, metal, N)];
  mono.add(...halves);
  const edgeMat = new MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const edges = new InstancedMesh(new BoxGeometry(1, .006, .006), edgeMat, N * 2); mono.add(edges);
  for (let i = 0; i < N * 2; i++) edges.setColorAt(i, new Color(0, 0, 0));
  const coreMat = new MeshBasicMaterial({ color: 0xffd9a8, toneMapped: false });
  const core = new Mesh(new BoxGeometry(.012, TOP, .5), coreMat); core.position.y = TOP / 2; mono.add(core);
  // the validation gate: a thin frame of light that passes down through the stack
  const scanMat = new MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0, depthWrite: false });
  const scan = new Group();
  [[2.4, .008, .008, 0, .8], [2.4, .008, .008, 0, -.8], [.008, .008, 1.6, 1.2, 0], [.008, .008, 1.6, -1.2, 0]].forEach(([w, h, d, x, z]) => { const b = new Mesh(new BoxGeometry(w, h, d), scanMat); b.position.set(x, 0, z); scan.add(b); });
  mono.add(scan);

  // Act II: the screens in the white room (textures come from the page's own <img> elements)
  const room = new Group(); room.visible = false; scene.add(room);
  const bezelMat = new MeshPhysicalMaterial({ color: 0x18191c, metalness: .9, roughness: .35, clearcoat: .6 });
  const SCREENS = [{ w: 3.7, h: 2.31, x: 0 }, { w: 3.7, h: 2.31, x: 6.2 }, { w: 1.06, h: 2.3, x: 11.6, phone: true }];
  const screenMats = SCREENS.map(() => new MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
  const panels = SCREENS.map((s, i) => {
    const g = new Group(); g.position.set(s.x, 0, 0);
    const bezel = new Mesh(new RoundedBoxGeometry(s.w + .1, s.h + .1, .07, 3, s.phone ? .09 : .035), bezelMat);
    const scr = new Mesh(new PlaneGeometry(s.w, s.h), screenMats[i]); scr.position.z = .0361;
    // monitors stand on a stem and foot; the phone rests on a low plinth
    const foot = new Mesh(new BoxGeometry(s.phone ? .62 : 1.1, s.phone ? .5 : .02, .4), bezelMat); foot.position.y = s.phone ? -s.h / 2 - .31 : -s.h / 2 - .55;
    const stem = new Mesh(new BoxGeometry(.04, s.phone ? .001 : .5, .04), bezelMat); stem.position.y = -s.h / 2 - .3;
    const sh = new Mesh(new PlaneGeometry(s.w * 1.2, 1.4), new MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: .35 })); sh.rotation.x = -Math.PI / 2; sh.position.y = -s.h / 2 - .56 + .002;
    const face = new Group(); face.add(bezel, scr, foot, stem); g.add(face, sh); g.userData = { face, s };
    room.add(g); return g;
  });
  const texCache = new Map();
  function texFor(img) {
    const src = img.dataset.full || img.src;
    if (texCache.has(src)) return texCache.get(src);
    const t = new Texture(); t.colorSpace = SRGBColorSpace; t.anisotropy = 4;
    const im = new Image(); im.decoding = 'async'; im.onload = () => { t.image = im; t.needsUpdate = true; }; im.src = src;
    texCache.set(src, t); return t;
  }
  const setScreen = (pi, k) => { const img = products[pi].querySelectorAll('.s-shots img')[k]; screenMats[pi].map = texFor(img); screenMats[pi].needsUpdate = true; };
  [0, 1, 2].forEach(pi => setScreen(pi, 0));
  onShot.push(setScreen);

  // post: bloom only on the light (the seam, the edges, the core)
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new Vector2(256, 256), .75, .5, .9); composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const resize = () => { renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.fov = phone() ? 46 : 32; camera.updateProjectionMatrix(); layoutNav(); };
  resize(); addEventListener('resize', resize);
  const onScroll = () => { readScroll(); updateNav(); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const pointer = new Vector2(), pointerT = new Vector2();
  addEventListener('pointermove', e => pointerT.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), { passive: true });

  // ── camera keys (Act I): position, look target
  const KEYS = {
    d: [[V(0, 1.2, 14.5), V(0, 1.5, 0)], [V(4.4, 4.1, 7.6), V(-.5, 2.0, 0)], [V(-5.2, 2.3, 6.4), V(.9, 1.95, 0)], [V(-.8, .45, 7.4), V(1.5, 2.35, 0)]],
    m: [[V(0, 2.4, 11.6), V(0, 1.0, 0)], [V(3.6, 4.6, 9.4), V(0, 1.0, 0)], [V(-4.6, 3.0, 8.6), V(0, .9, 0)], [V(-.4, 1.0, 8.8), V(0, 1.2, 0)]],
  };
  const careerKey = (m, s) => { const y = lerp(.55, TOP + .9, ease(s)); return m ? [V(2.6, y + .6, 7.2), V(1.45, y - 1.3, 0)] : [V(3.1, y + .35, 5.0), V(-.9, y, 0)]; };
  const keyAt = (k, m) => k === 4 ? careerKey(m, state.sub[4]) : KEYS[m ? 'm' : 'd'][k];
  const YAW = [0, .55, -.45, .12, .35];

  const M = new Matrix4(), Q = new Quaternion(), S = new Vector3(1, 1, 1), P = new Vector3(), E = new Object3D();
  const col = new Color();
  let clockT = 0, last = performance.now(), visible = true, frames = 0, ft = 0;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible && !window.__manual) { last = performance.now(); requestAnimationFrame(loop); } });
  const t0 = performance.now();

  function frame(dt, draw = true) {
    clockT += dt / 1000;
    const k = reduce ? 1 : 1 - Math.pow(.002, dt / 1000);
    state.t += (state.tT - state.t) * k; state.q += (state.qT - state.q) * k;
    pointer.lerp(pointerT, reduce ? 0 : .05);
    const t = state.t, q = state.q, m = phone(), time = reduce ? 0 : clockT;
    const intro = reduce ? 1 : ease(clamp((clockT - .2) / 2.4));
    copy(t, q);

    // which act is on screen
    const r1 = act1.getBoundingClientRect(), r2 = act2.getBoundingClientRect();
    const inAct1 = r1.bottom > 0 && r1.top < innerHeight, inAct2 = r2.bottom > 0 && r2.top < innerHeight;
    if (!inAct1 && !inAct2) return false;
    const actII = inAct2 && (!inAct1 || r2.top < innerHeight * .5);

    // ── Act II phases
    const split = actII ? ease(clamp((q - .12) / .16)) : 0;          // halves part
    const dive = actII ? ease(clamp((q - .2) / .12)) : 0;            // camera passes into the light
    const flash = actII ? clamp((q - .27) / .05) * (1 - clamp((q - .33) / .06)) : 0;
    const white = actII ? smooth((q - .31) / .03) : 0;
    root.style.setProperty('--flash', flash.toFixed(3));
    document.body.classList.toggle('white', white > .5);

    // ── object state
    const a1 = actII ? 0 : bell(t, 1), a2 = actII ? 0 : bell(t, 2), a3 = actII ? 0 : bell(t, 3), a4 = actII ? 0 : clamp(t - 3);
    const scanY = lerp(TOP + .3, .15, state.sub[2]);
    const camY = actII ? 0 : careerKey(m, state.sub[4])[1].y;
    const bandGap = .16 * a4;
    for (let i = 0; i < N; i++) {
      const f = i / (N - 1);
      let y = i * PITCH + LH / 2;
      y += i * .045 * a1;                                             // fanned: the stack loosens
      y += (Math.floor(i / 11) - 1.5) * .34 * a2 + .51 * a2;          // checked: four bands
      y += bandOf[i] * bandGap;                                       // career: seven roles
      const rot = (i - N / 2) * .066 * a1 + Math.sin(i * 1.7) * .05 * a1;
      // checked: flagged layers slide out as the scan passes, then come back corrected
      let out = 0, amber = 0;
      if (FLAGGED.includes(i) && a2 > 0) {
        const d = y - scanY; out = smooth(d / .3) - smooth((d - .9) / .4); amber = out;
      }
      const taper = 1 - f * .07;
      const topCut = clamp((i - (N - 9)) / 8);                        // the top is cut back at an angle
      const depth = 1 - topCut * .5;
      for (let h = 0; h < 2; h++) {
        const sgn = h ? 1 : -1;
        const x = sgn * (SEAM / 2 + HW * taper / 2 + split * 1.55 + a3 * .03) + out * .55 * sgn;
        P.set(x, y, -topCut * D * .25);
        Q.setFromAxisAngle(V(0, 1, 0), rot);
        P.applyQuaternion(Q);
        S.set(taper, 1, depth);
        M.compose(P, Q, S); halves[h].setMatrixAt(i, M);
        // light along the front edge of each lamination
        let e = 0; col.setRGB(1, .86, .65);
        if (a3 > 0) { const wave = Math.max(0, Math.sin(f * 9 - time * 3.2)); e = a3 * (.15 + Math.pow(wave, 6) * 2.2); }
        if (amber > 0) { col.setRGB(1, .62, .18); e = Math.max(e, amber * 3); }
        if (a4 > 0) { const d = Math.abs(y - camY); const lit = bandOf[i] === litBand; e = Math.max(e, a4 * (lit ? 1.6 : .12) * clamp(1.4 - d * .5)); }
        e *= intro;
        E.position.set(x, y - LH / 2 + .004, D * depth / 2 - topCut * D * .25 + .002); E.position.applyQuaternion(Q);
        E.quaternion.copy(Q); E.scale.set(HW * taper * .96, 1, 1); E.updateMatrix(); edges.setMatrixAt(i * 2 + h, E.matrix);
        edges.setColorAt(i * 2 + h, col.clone().multiplyScalar(e));
      }
    }
    halves.forEach(h => { h.instanceMatrix.needsUpdate = true; });
    edges.instanceMatrix.needsUpdate = true; edges.instanceColor.needsUpdate = true;
    const coreI = intro * (.55 + 1.6 * a3 + 4 * split + .25 * Math.sin(time * 1.3) * (1 - a3));
    coreMat.color.setRGB(1, .85, .62).multiplyScalar(coreI);
    core.scale.y = 1 + bandGap * 6 / TOP + a2 * .5 + a1 * 2; core.position.y = (TOP * core.scale.y) / 2;
    inner.forEach(l => { l.intensity = (0.4 + 30 * split) * intro * (1 - white); });
    scanMat.opacity = a2 * clamp((state.sub[2] - .02) / .05) * (1 - clamp((state.sub[2] - .9) / .08)) * 1.4;
    scan.position.y = scanY;
    mono.visible = white < 1;
    mono.rotation.y = actII ? 0 : (lerp(YAW[Math.floor(t)] ?? 0, YAW[Math.min(4, Math.floor(t) + 1)], ease(t - Math.floor(t))) + Math.sin(time * .2) * .16 * bell(t, 0));
    shadow.scale.set(1 + a1 * .8 + split * 1.2, 1 + a1 * .4, 1);

    // ── environment: black stage → white room
    scene.background.copy(BLACK).lerp(WHITE, white);
    scene.fog.color.copy(scene.background); scene.fog.near = lerp(14, 18, white); scene.fog.far = lerp(40, 70, white);
    floorMat.color.setRGB(lerp(.02, .86, white), lerp(.02, .865, white), lerp(.02, .85, white));
    scene.environmentIntensity = lerp(.32, .9, white);
    key.intensity = 170 * intro * (1 - white * .6); rimL.intensity = 2.4 * intro * (1 - white); rimR.intensity = 1.6 * intro * (1 - white);
    hemi.intensity = 2.2 * white; amb.intensity = .4 * white;
    pool.material.opacity = (1 - white) * intro; renderer.toneMappingExposure = lerp(1, .95, white);
    bloom.strength = lerp(.75, 0, white); bloom.enabled = white < .99;

    // ── the white room: screens rise, the camera tracks the selected product
    room.visible = white > 0;
    const pq = clamp((q - .36) / (1 - .36));
    const pIdx = q < PROD_Q[0][1] ? 0 : q < PROD_Q[1][1] ? 1 : 2;
    if (actII && pIdx !== active && white > .5) selectProduct(pIdx);
    // each product holds; the camera travels in the first third of the next product's range
    let trackE = 0; PROD_Q.forEach(([a, b], i) => { if (i && q >= a) { const u = (q - a) / (b - a); trackE = u < .3 ? i - 1 + ease(u / .3) : i; } });
    panels.forEach((g, i) => {
      const rise = ease(clamp((q - .34 - i * .015) / .06));
      const s = g.userData.s;
      g.position.y = lerp(-s.h - 1, s.h / 2 + .62, rise);
      g.userData.face.rotation.y = (i - trackE) * -.18 + pointer.x * .05;
      g.userData.face.rotation.x = -pointer.y * .03;
    });

    // ── camera
    let p, l;
    if (!actII) {
      const i = Math.min(3, Math.floor(t)), f = ease(t - i), A = keyAt(i, m), B = keyAt(Math.min(4, i + 1), m);
      p = A[0].clone().lerp(B[0], f); l = A[1].clone().lerp(B[1], f);
      p.z += (1 - intro) * 6; p.y += (1 - intro) * -.6;
    } else if (white < .5) {
      p = V(0, m ? 2.2 : 1.95, lerp(m ? 12.5 : 10, .35, dive)); l = V(0, m ? 1.4 : 2.05, -2);
    } else {
      const x = lerp(SCREENS[0].x, SCREENS[2].x, trackE / 2) + (trackE > 1.5 ? 0 : 0);
      const ph = smooth((trackE - 1.4) / .6);   // the phone is taller and narrower
      p = V(x, m ? lerp(2.6, 2.6, ph) : lerp(1.6, 1.9, ph), (m ? lerp(10.5, 9.4, ph) : lerp(8.4, 6.8, ph)) + (1 - smooth((q - .33) / .08)) * 4);
      l = V(x, m ? lerp(.2, .15, ph) : lerp(1.05, 1.55, ph), 0);
    }
    if (!reduce) { p.x += pointer.x * .25; p.y += pointer.y * .12; }
    camera.position.copy(p); camera.lookAt(l);

    // ── career labels, anchored beside each role's band
    bands.forEach((b, k) => {
      let mid = 0, n = 0; for (let i = 0; i < N; i++) if (bandOf[i] === k) { mid += i * PITCH + LH / 2 + i * 0 + k * bandGap; n++; }
      const v = V(m ? HW + .1 : HW + .25, mid / n, D / 2).applyAxisAngle(V(0, 1, 0), mono.rotation.y).project(camera);
      const o = a4 * clamp(1.2 - Math.abs(mid / n - camY) * .55) * (v.z < 1 ? 1 : 0);
      b.style.opacity = o.toFixed(3); b.classList.toggle('lit', k === litBand);
      if (o > .01) b.style.transform = `translate3d(${(v.x + 1) / 2 * innerWidth}px, ${(1 - v.y) / 2 * innerHeight}px, 0) translateY(-50%)`;
    });
    litBand = bandOf[clamp(Math.round((camY - k4) / PITCH), 0, N - 1)];

    if (draw) composer.render();
    return true;
  }
  let litBand = -1; const k4 = 0;

  function adapt(dt) {
    frames++; ft += dt; if (frames < 60) return; const avg = ft / frames; frames = 0; ft = 0;
    if (avg > 26 && dpr > 1) { dpr = Math.max(1, dpr - .25); renderer.setPixelRatio(dpr); composer.setPixelRatio?.(dpr); resize(); }
  }
  function loop(now) {
    if (!visible || window.__manual) return;
    const dt = Math.min(50, now - last); last = now; adapt(dt);
    frame(dt);
    requestAnimationFrame(loop);
  }
  // capture hook: a fixed clock for frame-accurate recordings
  window.__step = (ms, draw = true) => { readScroll(); updateNav(); frame(ms, draw); };
  if (!window.__manual) requestAnimationFrame(loop);
  requestAnimationFrame(() => root.classList.add('ready'));
}

if (document.fonts?.ready) Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1200))]).then(boot); else boot();
