/**
 * Concept A · The Transformation. 9,000 short straight members. In chaos they tumble in a turbulent cloud.
 * Assembled, they lie end to end along the rulings of three nested hyperboloids: straight lines that build a curved,
 * load-bearing form (the Shukhov tower principle). The cursor un-builds locally; the structure repairs itself.
 */
import { WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute, LineSegments, ShaderMaterial, AdditiveBlending, Vector2 } from 'three';
import gsap from 'gsap';
const mob = innerWidth < 860, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const R = (() => { let s = 9; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
// three shells: [radius at waist, radius at ends, height, lines, twist, pieces per line, colour]
const SHELLS = [[1.15, 2.3, 6.2, mob ? 72 : 120, 1.9, 9, [0.18, .72, .68]], [.62, 1.35, 5.6, mob ? 48 : 72, -1.6, 8, [.66, .71, .77]], [.26, .5, 6.6, mob ? 18 : 28, 2.4, 10, [.95, .64, .23]]];
const A = [], B = [], C = [], T = [], S = [];
SHELLS.forEach(([rw, re, h, n, tw, k, col], si) => {
  // a hyperboloid of one sheet is ruled: a line from angle a at the bottom to angle a+tw at the top; both families
  for (let fam = 0; fam < 2; fam++) for (let i = 0; i < n; i++) {
    const a0 = i / n * Math.PI * 2, a1 = a0 + (fam ? tw : -tw);
    const p0 = [Math.cos(a0) * re, -h / 2, Math.sin(a0) * re], p1 = [Math.cos(a1) * re, h / 2, Math.sin(a1) * re];
    for (let j = 0; j < k; j++) {
      const u0 = j / k, u1 = (j + 1) / k;
      for (const u of [u0, u1]) { A.push(p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u, p0[2] + (p1[2] - p0[2]) * u); }
      // chaos: same member, same length, tumbling somewhere in a turbulent volume
      const r = Math.pow(R(), .7) * 3.6, th = R() * 6.283, ph = Math.acos(2 * R() - 1), c = [Math.sin(ph) * Math.cos(th) * r * 1.3, Math.cos(ph) * r * .8, Math.sin(ph) * Math.sin(th) * r];
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]) / k, d = [R() - .5, R() - .5, R() - .5], dl = Math.hypot(...d);
      for (const s of [-.5, .5]) B.push(c[0] + d[0] / dl * len * s, c[1] + d[1] / dl * len * s, c[2] + d[2] / dl * len * s);
      const hy = (p0[1] + (p1[1] - p0[1]) * (u0 + u1) / 2) / h + .5, sd = R();
      for (let e = 0; e < 2; e++) { C.push(...col); T.push(hy); S.push(sd + si * .1); }
    }
  }
});
const geo = new BufferGeometry();
geo.setAttribute('position', new BufferAttribute(new Float32Array(A), 3)); geo.setAttribute('aChaos', new BufferAttribute(new Float32Array(B), 3));
geo.setAttribute('aCol', new BufferAttribute(new Float32Array(C), 3)); geo.setAttribute('aH', new BufferAttribute(new Float32Array(T), 1)); geo.setAttribute('aSeed', new BufferAttribute(new Float32Array(S), 1));
const mat = new ShaderMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending,
  uniforms: { uBuild: { value: 0 }, uTime: { value: 0 }, uPtr: { value: new Vector2(9, 9) }, uPow: { value: 0 }, uAsp: { value: 1 } },
  vertexShader: `uniform float uBuild, uTime, uPow, uAsp; uniform vec2 uPtr; attribute vec3 aChaos, aCol; attribute float aH, aSeed; varying vec3 vC; varying float vA;
  vec3 swirl(vec3 p, float t){ float a = t * .15 + length(p.xz) * .35 + aSeed * 6.; return vec3(p.x * cos(a) - p.z * sin(a), p.y + sin(t * .4 + aSeed * 20.) * .25, p.x * sin(a) + p.z * cos(a)); }
  void main(){
    float k = clamp(uBuild * 1.8 - (aH * .55 + aSeed * .25), 0., 1.); k = k * k * (3. - 2. * k);
    vec3 ord = position, cha = swirl(aChaos, uTime);
    // the cursor un-builds what it passes over
    vec4 cp = projectionMatrix * modelViewMatrix * vec4(ord, 1.); vec2 sp = cp.xy / cp.w;
    float near = uPow * smoothstep(.32, 0., length((sp - uPtr) * vec2(uAsp, 1.)));
    k *= 1. - near;
    vec3 mid = mix(cha, ord, .5) + vec3(0., (1. - aH) * .8, 0.);
    vec3 p = mix(mix(cha, mid, k), mix(mid, ord, k), k);
    vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
    float fog = smoothstep(13., 25., -mv.z);
    vec3 grey = vec3(.55, .58, .62);
    vC = mix(grey, aCol, k) * mix(1., .35, fog);
    float glint = pow(max(0., sin(aH * 9. - uTime * 1.2)), 24.) * k;
    vC += glint * .55;
    vA = mix(.34, .62, k) * (1. - fog * .5);
  }`,
  fragmentShader: `varying vec3 vC; varying float vA; void main(){ gl_FragColor = vec4(vC * vA, 1.); }` });
const canvas = document.getElementById('gl'), renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setClearColor(0x0B0D11);
const scene = new Scene(), cam = new PerspectiveCamera(32, 1, .1, 100), lines = new LineSegments(geo, mat); scene.add(lines);
function resize() { renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.setViewOffset(innerWidth, innerHeight, mob ? 0 : -innerWidth * .14, mob ? innerHeight * .16 : 0, innerWidth, innerHeight); cam.updateProjectionMatrix(); mat.uniforms.uAsp.value = cam.aspect; }
resize(); addEventListener('resize', resize);
const st = { build: 0, yaw: 0 }; let built = true;
if (reduce) st.build = 1; else gsap.to(st, { build: 1, duration: 4.2, ease: 'power3.inOut', delay: 1.2 });
const tg = document.getElementById('tg');
tg.onclick = () => { built = !built; gsap.to(st, { build: built ? 1 : 0, duration: built ? 3.4 : 1.6, ease: built ? 'power3.inOut' : 'power2.out' }); tg.textContent = built ? 'Break it apart' : 'Build it'; };
addEventListener('pointermove', e => { mat.uniforms.uPtr.value.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); gsap.to(mat.uniforms.uPow, { value: 1, duration: .25, overwrite: true }); gsap.to(mat.uniforms.uPow, { value: 0, duration: 1.8, delay: .6, ease: 'power2.inOut' }); });
gsap.ticker.add(t => {
  mat.uniforms.uTime.value = t; mat.uniforms.uBuild.value = st.build;
  const yaw = t * (reduce ? 0 : .09), d = mob ? 22 : 18.5;
  cam.position.set(Math.sin(yaw) * d, 1.6 + Math.sin(t * .2) * .4, Math.cos(yaw) * d); cam.lookAt(0, .2, 0);
  renderer.render(scene, cam);
});
window.__set = v => { gsap.killTweensOf(st); st.build = v; };
