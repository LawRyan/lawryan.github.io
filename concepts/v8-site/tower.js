/** 01 · The Transformation: 9,000 straight members that tumble in chaos and assemble into a ruled, curved tower. */
import { Scene, PerspectiveCamera, BufferGeometry, BufferAttribute, LineSegments, ShaderMaterial, AdditiveBlending, Vector2 } from 'three';
export function createTower({ mob, reduce }) {
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
  const scene = new Scene(), cam = new PerspectiveCamera(32, 1, .1, 100); scene.add(new LineSegments(geo, mat));
  const st = { lift: 0, build: 0, offX: mob ? 0 : -.1, offY: mob ? .1 : 0 };
  return { scene, cam, st, mat,
    resize(w, h) { cam.aspect = w / h; cam.setViewOffset(w, h, st.offX * w, st.offY * h, w, h); cam.updateProjectionMatrix(); mat.uniforms.uAsp.value = cam.aspect; },
    pointer(x, y) { mat.uniforms.uPtr.value.set(x, y); },
    update(t) { mat.uniforms.uTime.value = t; mat.uniforms.uBuild.value = st.build;
      const yaw = t * (reduce ? 0 : .09), d = mob ? 30 : 18.5; const L = st.lift, e = L * L * (3 - 2 * L), dd = d * (1 + e * .6);   // leaving: the camera rises until it looks straight down, like the map that follows
      cam.position.set(Math.sin(yaw) * dd * (1 - e * .92), 1.6 + Math.sin(t * .2) * .4 + e * 26, Math.cos(yaw) * dd * (1 - e * .92)); cam.lookAt(0, .2 - e * 2, 0); } };
}
