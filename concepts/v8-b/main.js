/**
 * Concept B · The Intelligence World. A city of 3,200 buildings; each is one value in a synthetic dataset
 * (80 weeks × 40 series). Rows are series, the long avenue is time. Heights carry real structure: seasonality,
 * a trend, three districts that move together, and one value that breaks its row. The camera descends from a map
 * view into the avenue and follows the signal (an amber line in the street) to the anomaly.
 */
import { WebGLRenderer, Scene, PerspectiveCamera, BoxGeometry, InstancedBufferAttribute, InstancedMesh, ShaderMaterial, PlaneGeometry, Mesh, Vector2, Vector3, Matrix4, BufferGeometry, BufferAttribute, Line, LineBasicMaterial, AdditiveBlending, CatmullRomCurve3 } from 'three';
import gsap from 'gsap';
const mob = innerWidth < 860, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const R = (() => { let s = 5; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const W = 80, Hn = 40, G = 1.25;          // weeks along x, series along z, spacing
const AN = { w: 61, s: 23 };              // the anomaly
const ax = (AN.w - W / 2 + .5) * G, az = (AN.s - Hn / 2 + .5) * G + 1.6;
const off = [], hgt = [], kind = [];
for (let s = 0; s < Hn; s++) {
  const district = s < 14 ? 0 : s < 27 ? 1 : 2, base = .6 + R() * 1.2, ph = R() * .6;
  for (let w = 0; w < W; w++) {
    let v = district === 0 ? 1 + .55 * Math.sin((w / 52 + ph * .1) * Math.PI * 2) : district === 1 ? 1 + .9 * Math.exp(-(((w % 52) - 47) ** 2) / 8) : .7 + w / W * 1.2;
    v = base * v * (1 + (R() - .5) * .18);
    if (s === AN.s && w === AN.w) v = 7.5;
    // leave the avenue (between series 19 and 20) clear
    const z = (s - Hn / 2 + .5) * G + (s >= Hn / 2 ? 1.6 : -1.6);
    off.push((w - W / 2 + .5) * G, z); hgt.push(Math.max(.08, v)); kind.push(s === AN.s && w === AN.w ? 2 : district === 1 ? 1 : 0);
  }
}
const N = off.length, box = new BoxGeometry(G * .78, 1, G * .78); box.translate(0, .5, 0);
box.setAttribute('aOff', new InstancedBufferAttribute(new Float32Array(off), 2)); box.setAttribute('aH', new InstancedBufferAttribute(new Float32Array(hgt), 1)); box.setAttribute('aK', new InstancedBufferAttribute(new Float32Array(kind), 1));
const mat = new ShaderMaterial({ uniforms: { uRise: { value: 0 }, uTime: { value: 0 }, uFocus: { value: 0 }, uFog: { value: new Vector2(14, 70) } },
  vertexShader: `uniform float uRise, uTime; attribute vec2 aOff; attribute float aH, aK; varying vec3 vN, vW, vL; varying float vH, vK, vD;
  void main(){ float d = length(aOff) / 60.; float r = clamp(uRise * 1.6 - d * .6, 0., 1.); r = r * r * (3. - 2. * r);
    vec3 p = position; p.y *= aH * r * 1.4 + .002; vec4 w = modelMatrix * vec4(p + vec3(aOff.x, 0., aOff.y), 1.);
    vN = normal; vW = w.xyz; vL = position; vH = aH; vK = aK; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform float uTime, uFocus; uniform vec2 uFog; varying vec3 vN, vW, vL; varying float vH, vK, vD;
  void main(){
    vec3 L = normalize(vec3(-.5, .8, .35)); float dif = max(dot(vN, L), 0.), top = step(.5, vN.y);
    vec3 base = mix(vec3(.08, .095, .115), vec3(.15, .17, .2), clamp(vL.y, 0., 1.));
    vec3 c = base * (.55 + .7 * dif) + top * vec3(.1, .11, .12);
    // a hairline at every roof edge, the colour of what the building is
    vec2 e = abs(vL.xz) / ${(G * .39).toFixed(3)}; float edge = top * smoothstep(.9, .99, max(e.x, e.y));
    float vert = (1. - top) * smoothstep(.93, 1., max(e.x, e.y)) * smoothstep(.0, .6, vL.y);
    vec3 tint = vK > 1.5 ? vec3(.95, .64, .23) : vK > .5 ? vec3(.66, .71, .77) : vec3(.18, .72, .68);
    c += tint * (edge * .9 + vert * .12) * (.4 + .6 * clamp(vH / 3., 0., 1.));
    // floors: fine horizontal lines on the faces, like windows lit by data
    float floors = (1. - top) * step(.88, fract(vL.y * vH * 2.4)) * .06; c += tint * floors;
    if (vK > 1.5) c = mix(c, vec3(.95, .64, .23) * (.5 + .5 * dif), .55 + .25 * sin(uTime * 2.));
    float fog = smoothstep(uFog.x, uFog.y, vD); c = mix(c, vec3(.043, .051, .067), fog);
    gl_FragColor = vec4(c, 1.); }` });
const city = new InstancedMesh(box, mat, N); for (let i = 0; i < N; i++) city.setMatrixAt(i, new Matrix4()); city.frustumCulled = false;
// the ground: a fine survey grid that fades into fog
const ground = new Mesh(new PlaneGeometry(400, 400), new ShaderMaterial({ uniforms: {},
  vertexShader: `varying vec3 vW; varying float vD; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `varying vec3 vW; varying float vD; void main(){ vec2 g = abs(fract(vW.xz / ${G.toFixed(2)} - .5) - .5) / fwidth(vW.xz / ${G.toFixed(2)}); float l = 1. - min(min(g.x, g.y), 1.);
    float sg = exp(-abs(vW.z) * 1.2) * step(vW.x, ${ax.toFixed(2)}) * .05; vec3 c = vec3(.043, .051, .067) + l * vec3(.06, .07, .08) * (1. - smoothstep(10., 90., vD)) + vec3(.95, .64, .23) * sg; gl_FragColor = vec4(c, 1.); }` }));
ground.rotation.x = -Math.PI / 2;
// the signal: a line of light down the avenue that turns toward the anomaly
const sigPts = [new Vector3(-W / 2 * G - 8, .02, 0), new Vector3(ax - 6, .02, 0), new Vector3(ax - 1, .02, 0), new Vector3(ax, .02, az - G * .6)];
const curve = new CatmullRomCurve3(sigPts, false, 'catmullrom', .1), sp = curve.getPoints(220);
const sigGeo = new BufferGeometry().setFromPoints(sp), sigMat = new LineBasicMaterial({ color: 0xF2A33A, transparent: true, opacity: .9, blending: AdditiveBlending });
const signal = new Line(sigGeo, sigMat); sigGeo.setDrawRange(0, 0);
const canvas = document.getElementById('gl'), renderer = new WebGLRenderer({ canvas, antialias: true }); renderer.setClearColor(0x0B0D11);
const scene = new Scene(), cam = new PerspectiveCamera(mob ? 58 : 42, 1, .1, 300); scene.add(ground, city, signal);
function resize() { renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6)); renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
resize(); addEventListener('resize', resize);
// camera path: map → descent → street → the anomaly
const KEYS = [
  [new Vector3(-6, 95, 30), new Vector3(0, 0, 0)],
  [new Vector3(-62, 22, 26), new Vector3(-10, 0, 0)],
  [new Vector3(-58, 2.4, 0), new Vector3(0, 2.2, 0)],
  [new Vector3(ax - 9, 2.6, -1.2), new Vector3(ax, 4.5, az)],
];
const st = { rise: 0, path: 0, sig: 0 }, ptr = new Vector2(), look = new Vector2();
if (reduce) Object.assign(st, { rise: 1, path: 1.6, sig: .5 });
else gsap.timeline({ delay: .3 }).to(st, { rise: 1, duration: 3, ease: 'power2.out' }).to(st, { path: 1, duration: 3.2, ease: 'power2.inOut' }, 1.6).to(st, { path: 2, duration: 3.6, ease: 'power2.inOut' }).to(st, { sig: .55, duration: 3, ease: 'power1.inOut' }, 6.2);
const tg = document.getElementById('tg');
tg.onclick = () => { const go = st.path < 2.5; gsap.to(st, { path: go ? 3 : 1, sig: go ? 1 : .55, duration: 3.4, ease: 'power3.inOut' }); tg.textContent = go ? 'Back to the city' : 'Fly to it'; };
addEventListener('pointermove', e => ptr.set(e.clientX / innerWidth - .5, e.clientY / innerHeight - .5));
const P = new Vector3(), T = new Vector3();
gsap.ticker.add(t => {
  mat.uniforms.uTime.value = t; mat.uniforms.uRise.value = st.rise;
  const i = Math.min(2, Math.floor(st.path)), f = st.path - i, e = f * f * (3 - 2 * f);
  P.lerpVectors(KEYS[i][0], KEYS[i + 1][0], e); T.lerpVectors(KEYS[i][1], KEYS[i + 1][1], e);
  look.lerp(ptr, .05); T.x += look.x * 8; T.y -= look.y * 4;
  cam.position.copy(P); cam.lookAt(T);
  const hh = Math.max(0, P.y - 3) / 92; mat.uniforms.uFog.value.set(14 + hh * 70, 70 + hh * 90);
  sigGeo.setDrawRange(0, Math.floor(sp.length * st.sig));
  renderer.render(scene, cam);
});
window.__set = (p, s) => { gsap.killTweensOf(st); st.rise = 1; st.path = p; st.sig = s; };
