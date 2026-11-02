/**
 * A small WebGL layer: just what the intro needs (one instanced record mesh, a sky quad, line sets),
 * plus the vector and matrix math for the camera and for projecting labels. Replaces three.js (540 KB).
 */
export class V3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new V3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; this.z += (v.z - this.z) * t; return this; }
  rotateY(a) { const c = Math.cos(a), s = Math.sin(a), x = this.x, z = this.z; this.x = c * x + s * z; this.z = -s * x + c * z; return this; }
}
export class V2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  set(x, y) { this.x = x; this.y = y; return this; }
  copy(v) { this.x = v.x; this.y = v.y; return this; }
  lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; return this; }
}

export function perspective(fovDeg, aspect, near, far) {
  const f = 1 / Math.tan(fovDeg * Math.PI / 360), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}
export function lookAt(eye, target, out = new Float32Array(16)) {
  let zx = eye.x - target.x, zy = eye.y - target.y, zz = eye.z - target.z;
  let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
  let xx = zz, xy = 0, xz = -zx;   // up = (0,1,0) × z
  l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  out.set([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * eye.x + xy * eye.y + xz * eye.z), -(yx * eye.x + yy * eye.y + yz * eye.z), -(zx * eye.x + zy * eye.y + zz * eye.z), 1]);
  return out;
}
/** world point → normalized device coordinates (x, y in −1..1; z < 1 means in front) */
export function project(v, view, proj, out) {
  const x = v.x, y = v.y, z = v.z;
  const vx = view[0] * x + view[4] * y + view[8] * z + view[12], vy = view[1] * x + view[5] * y + view[9] * z + view[13], vz = view[2] * x + view[6] * y + view[10] * z + view[14];
  const cx = proj[0] * vx, cy = proj[5] * vy, cz = proj[10] * vz + proj[14], cw = -vz;
  out.x = cx / cw; out.y = cy / cw; out.z = cz / cw; return out;
}

export class GL {
  constructor(canvas) {
    const opts = { antialias: true, powerPreference: 'high-performance', alpha: false };
    this.gl2 = true; this.gl = canvas.getContext('webgl2', opts);
    if (!this.gl) { this.gl2 = false; this.gl = canvas.getContext('webgl', opts); this.ext = this.gl?.getExtension('ANGLE_instanced_arrays'); }
    if (!this.gl) throw new Error('no webgl');
    this.canvas = canvas;
    this.gl.enable(this.gl.DEPTH_TEST); this.gl.depthFunc(this.gl.LEQUAL);
  }
  size(w, h, dpr) { this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr); this.gl.viewport(0, 0, this.canvas.width, this.canvas.height); }
  program(vs, fs) {
    const gl = this.gl, mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
    return { p, u, attr: name => gl.getAttribLocation(p, name) };
  }
  buffer(data, target = this.gl.ARRAY_BUFFER) { const gl = this.gl, b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, gl.STATIC_DRAW); return b; }
  attrib(loc, buf, size, divisor = 0) {
    const gl = this.gl; if (loc < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    if (this.gl2) gl.vertexAttribDivisor(loc, divisor); else this.ext.vertexAttribDivisorANGLE(loc, divisor);
  }
  drawInstanced(count, instances) { const gl = this.gl; if (this.gl2) gl.drawElementsInstanced(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0, instances); else this.ext.drawElementsInstancedANGLE(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0, instances); }
}

/** a unit box: 24 vertices with flat normals, 36 indices */
export function boxGeometry() {
  const P = [], Nn = [], I = [];
  const faces = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  faces.forEach(([nx, ny, nz], f) => {
    const u = nx ? [0, 1, 0] : [1, 0, 0], v = nz ? [0, 1, 0] : nx ? [0, 0, 1] : [0, 0, 1];
    const base = f * 4;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      P.push(.5 * (nx + a * u[0] + b * v[0]), .5 * (ny + a * u[1] + b * v[1]), .5 * (nz + a * u[2] + b * v[2])); Nn.push(nx, ny, nz);
    }
    I.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
  return { position: new Float32Array(P), normal: new Float32Array(Nn), index: new Uint16Array(I) };
}
