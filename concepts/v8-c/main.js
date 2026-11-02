/**
 * Concept C · The Living System. 180 contour rings × 360 points around a form, displaced by a 3D noise field.
 * The pointer is ray-cast onto the form; each touch sends a travelling wave across the surface. Holding (or the button)
 * moves the field from turbulence to a harmonic order: the same system, organised.
 */
import { WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute, LineSegments, ShaderMaterial, AdditiveBlending, Vector3, Vector4, Raycaster, Vector2, Sphere } from 'three';
import gsap from 'gsap';
const mob = innerWidth < 860, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const RINGS = mob ? 120 : 180, SEG = mob ? 240 : 360;
const pos = [], uv = [];
for (let r = 0; r < RINGS; r++) {
  const v = (r + .5) / RINGS, phi = v * Math.PI;
  for (let s = 0; s < SEG; s++) for (const k of [s, s + 1]) { const th = k / SEG * Math.PI * 2; pos.push(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)); uv.push(k / SEG, v); }
}
const geo = new BufferGeometry(); geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3)); geo.setAttribute('aUv', new BufferAttribute(new Float32Array(uv), 2));
const NOISE = `vec4 perm(vec4 x){ return mod(((x * 34.) + 1.) * x, 289.); }
float noise(vec3 p){ vec3 a = floor(p); vec3 d = p - a; d = d * d * (3. - 2. * d);
  vec4 b = a.xxyy + vec4(0., 1., 0., 1.); vec4 k1 = perm(b.xyxy); vec4 k2 = perm(k1.xyxy + b.zzww);
  vec4 c = k2 + a.zzzz; vec4 k3 = perm(c); vec4 k4 = perm(c + 1.);
  vec4 o1 = fract(k3 * (1. / 41.)); vec4 o2 = fract(k4 * (1. / 41.));
  vec4 o3 = o2 * d.z + o1 * (1. - d.z); vec2 o4 = o3.yw * d.x + o3.xz * (1. - d.x); return o4.y * d.y + o4.x * (1. - d.y); }`;
const mat = new ShaderMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending,
  uniforms: { uTime: { value: 0 }, uOrder: { value: 0 }, uHits: { value: [0, 1, 2, 3].map(() => new Vector4(0, 0, 0, -99)) }, uGrow: { value: 0 } },
  vertexShader: `${NOISE}
  uniform float uTime, uOrder, uGrow; uniform vec4 uHits[4]; attribute vec2 aUv; varying vec3 vC; varying float vA;
  float field(vec3 n){
    float chaos = noise(n * 1.6 + vec3(0., uTime * .18, 0.)) * .9 + noise(n * 3.4 - uTime * .12) * .45;
    float order = .5 + .5 * sin(n.y * 9. + uTime * .6) * .55 + .25 * sin(atan(n.z, n.x) * 6.) * sin(n.y * 3.);
    return mix(chaos, order, uOrder);
  }
  void main(){
    vec3 n = normalize(position); float f = field(n);
    float wave = 0.;
    for (int i = 0; i < 4; i++){ vec4 h = uHits[i]; float age = uTime - h.w; float d = acos(clamp(dot(n, normalize(h.xyz + 1e-4)), -1., 1.));
      wave += sin((d - age * 1.6) * 14.) * exp(-pow((d - age * 1.6) * 3.2, 2.)) * exp(-age * .9) * step(0., age); }
    float r = (1.15 + f * .55 + wave * .16) * uGrow;
    vec3 p = n * r * vec3(1., 1.18, 1.);
    vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
    float t = clamp(f, 0., 1.);
    vec3 cool = vec3(.18, .72, .68), mid = vec3(.66, .71, .77), warm = vec3(.95, .64, .23);
    vC = t < .55 ? mix(cool, mid, t / .55) : mix(mid, warm, (t - .55) / .45);
    vC += abs(wave) * vec3(.9, .8, .6);
    float rim = pow(1. - abs(dot(normalize(-mv.xyz), normalize(mat3(modelViewMatrix) * n))), 1.4);
    vA = (.1 + .55 * rim);
  }`,
  fragmentShader: `varying vec3 vC; varying float vA; void main(){ gl_FragColor = vec4(vC * vA, 1.); }` });
const canvas = document.getElementById('gl'), renderer = new WebGLRenderer({ canvas, antialias: true }); renderer.setClearColor(0x0B0D11);
const scene = new Scene(), cam = new PerspectiveCamera(30, 1, .1, 100), form = new LineSegments(geo, mat); scene.add(form);
function resize() { renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.setViewOffset(innerWidth, innerHeight, mob ? 0 : -innerWidth * .15, mob ? innerHeight * .14 : 0, innerWidth, innerHeight); cam.updateProjectionMatrix(); }
resize(); addEventListener('resize', resize);
const st = { order: 0, grow: reduce ? 1 : 0 }; let hi = 0;
if (!reduce) gsap.to(st, { grow: 1, duration: 2.6, ease: 'power3.out', delay: .3 });
const rc = new Raycaster(), sph = new Sphere(new Vector3(), 1.4), hitP = new Vector3(), nd = new Vector2();
function touch(x, y) { nd.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); rc.setFromCamera(nd, cam); if (rc.ray.intersectSphere(sph, hitP)) { const local = form.worldToLocal(hitP.clone()).normalize(); mat.uniforms.uHits.value[hi++ % 4].set(local.x, local.y, local.z, mat.uniforms.uTime.value); } }
let lastT = 0; addEventListener('pointermove', e => { const now = performance.now(); if (now - lastT > 260) { lastT = now; touch(e.clientX, e.clientY); } });
let hold; addEventListener('pointerdown', e => { touch(e.clientX, e.clientY); hold = gsap.to(st, { order: 1, duration: 2.4, ease: 'power2.inOut' }); });
addEventListener('pointerup', () => { if (hold) { hold.kill(); gsap.to(st, { order: 0, duration: 3, ease: 'power2.inOut' }); } });
const tg = document.getElementById('tg');
tg.onclick = e => { e.stopPropagation(); const on = st.order < .5; gsap.to(st, { order: on ? 1 : 0, duration: 2.6, ease: 'power2.inOut' }); tg.textContent = on ? 'Let it run' : 'Bring it to order'; };
tg.addEventListener('pointerdown', e => e.stopPropagation());
gsap.ticker.add(t => { mat.uniforms.uTime.value = t; mat.uniforms.uOrder.value = st.order; mat.uniforms.uGrow.value = st.grow;
  form.rotation.y = t * (reduce ? 0 : .07); form.rotation.x = .25;
  cam.position.set(0, .2, mob ? 11.5 : 9.2); cam.lookAt(0, 0, 0); renderer.render(scene, cam); });
window.__set = o => { gsap.killTweensOf(st); st.order = o; st.grow = 1; };
window.__touch = (x, y) => touch(x, y);
