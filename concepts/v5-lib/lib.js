/** Shared pieces for the V5 hero concepts: seeded data, a small 3D camera for canvas, damping and the phase rail. */
export const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => { t = cl(t); return t * t * (3 - 2 * t); };
export const ease = t => { t = cl(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const C = { bg: '#101318', text: '#F0EDE7', text2: '#A7AFB9', text3: '#6E7782', teal: '#2FB8AC', amber: '#F2A33A', silver: '#A9B6C4', hair: 'rgba(240,237,231,.08)' };

export function rng(seed = 7) { let s = seed; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); r.g = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }; return r; }

/** canvas sized to its box at device pixel ratio */
export function canvas2d(cv) {
  const ctx = cv.getContext('2d'); let W = 0, H = 0, dpr = 1;
  const fit = () => { dpr = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  fit(); addEventListener('resize', fit);
  return { ctx, get W() { return W; }, get H() { return H; }, fit };
}

/** An orbit camera: yaw/pitch around a target, perspective projection to a canvas centre. */
export function camera() {
  const c = { yaw: .6, pitch: .35, roll: 0, dist: 9, fov: 34, tx: 0, ty: 0, tz: 0, cx: 0, cy: 0, scale: 1 };
  c.basis = () => {
    const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    // eye direction from target; right and up vectors
    c.f = [-sy * cp, -sp, -cy * cp]; const r = [cy, 0, -sy], u = [-sy * sp, cp, -cy * sp], cr = Math.cos(c.roll), sr = Math.sin(c.roll);
    c.r = [r[0] * cr + u[0] * sr, r[1] * cr + u[1] * sr, r[2] * cr + u[2] * sr]; c.u = [u[0] * cr - r[0] * sr, u[1] * cr - r[1] * sr, u[2] * cr - r[2] * sr];
    c.e = [c.tx - c.f[0] * c.dist, c.ty - c.f[1] * c.dist, c.tz - c.f[2] * c.dist];
    c.k = c.scale / Math.tan(c.fov * Math.PI / 360);
  };
  /** world → [screen x, screen y, depth, size factor] */
  c.p = (x, y, z, out = [0, 0, 0, 0]) => {
    const dx = x - c.e[0], dy = y - c.e[1], dz = z - c.e[2];
    const X = dx * c.r[0] + dy * c.r[1] + dz * c.r[2], Y = dx * c.u[0] + dy * c.u[1] + dz * c.u[2], Z = dx * c.f[0] + dy * c.f[1] + dz * c.f[2];
    const s = c.k / Math.max(.1, Z);
    out[0] = c.cx + X * s; out[1] = c.cy - Y * s; out[2] = Z; out[3] = s; return out;
  };
  c.basis();
  return c;
}

/** drag to orbit, with inertia; returns state the scene can read */
export function orbit(el, cam, { onDrag } = {}) {
  const st = { down: false, vx: 0, vy: 0, last: 0, touched: -1e9 };
  el.addEventListener('pointerdown', e => { st.down = true; st.x = e.clientX; st.y = e.clientY; st.touched = performance.now(); el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => {
    if (!st.down) return; const dx = e.clientX - st.x, dy = e.clientY - st.y; st.x = e.clientX; st.y = e.clientY;
    cam.yaw -= dx * .006; cam.pitch = cl(cam.pitch + dy * .004, -.2, 1.45); st.vx = -dx * .006; st.vy = dy * .004; st.touched = performance.now(); onDrag?.();
  });
  el.addEventListener('pointerup', () => { st.down = false; });
  st.step = () => { if (st.down) return; cam.yaw += st.vx; cam.pitch = cl(cam.pitch + st.vy, -.2, 1.45); st.vx *= .92; st.vy *= .92; };
  st.idle = () => performance.now() - st.touched > 5000;
  return st;
}

/** the four-stage rail: complexity → structure → insight → creation */
export function rail(root, captions) {
  const lis = [...root.querySelectorAll('.rail li')], cap = root.querySelector('.caption');
  let cur = -1;
  return i => { if (i === cur) return; cur = i; lis.forEach((l, k) => { l.classList.toggle('on', k === i); l.classList.toggle('done', k < i); l.querySelector('button')?.setAttribute('aria-pressed', k === i); }); cap.classList.remove('in'); void cap.offsetWidth; cap.innerHTML = captions[i]; cap.classList.add('in'); };
}
export const fmt = (n, d = 0) => n.toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d });
