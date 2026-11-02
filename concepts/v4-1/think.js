/**
 * Chapter 02, How I think: an exploded technical drawing. A generic contraption is taken apart and labelled,
 * the parts that don't belong are crossed out and leave, and what remains is rebuilt simpler, then measured.
 * Plain SVG line work: it has to read in ink on paper before anything else.
 */
const C30 = Math.cos(Math.PI / 6);
// bottom to top: [kind, w, d, h, label, short label, keep, messy offset x, messy offset z]
const PARTS = [
  ['box', 5.6, 3.8, .5, 'input: where the problem arrives', 'input', 1, 0, 0],
  ['box', 2.2, 3.2, 1.0, 'the step everyone repeats by hand', 'manual step', 1, .5, -.3],
  ['box', 2.2, 3.2, .9, 'a copy of that step, just in case', 'a copy', 0, -.9, .4],
  ['cyl', 1.0, 0, .5, 'a workaround for the workaround', 'workaround', 0, 1.1, .2],
  ['box', 3.0, 2.2, .6, 'a report nobody reads', 'unread report', 0, -.4, -.8],
  ['cyl', 1.2, 0, .6, 'the core logic: why it exists', 'core logic', 1, .2, .3],
  ['box', 4.0, 3.0, .3, 'output: the answer', 'output', 1, -.3, .1],
];
const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = t => { t = cl(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
// materials: lit from above-left; the top faces catch the light, the right faces fall away into shadow
const DEFS = `<defs>
  <linearGradient id="ft" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4C5560"/><stop offset="1" stop-color="#2C333B"/></linearGradient>
  <linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B323B"/><stop offset="1" stop-color="#1A1F26"/></linearGradient>
  <linearGradient id="fr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A1E25"/><stop offset="1" stop-color="#111419"/></linearGradient>
  <linearGradient id="fc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2A3139"/><stop offset=".38" stop-color="#3E4650"/><stop offset="1" stop-color="#15191E"/></linearGradient>
  <radialGradient id="pool"><stop offset="0" stop-color="#F0EDE7" stop-opacity=".07"/><stop offset="1" stop-color="#F0EDE7" stop-opacity="0"/></radialGradient>
  <filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
</defs>`;
export const PHASES = [0, .12, .36, .62, .84];   // whole · understand · simplify · build · improve (start of each)

export function drawing(svg, { reduce }) {
  let S = 46, OX = 0, OY = 0, mob = false, hover = -1;
  const P = (x, y, z) => [OX + (x - z) * C30 * S, OY + (x + z) * .5 * S - y * S];
  const f1 = v => v.toFixed(1);
  const poly = q => 'M' + q.map(p => f1(p[0]) + ',' + f1(p[1])).join('L') + 'Z';
  function box(cx, cy, cz, w, d, h) {
    const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, y0 = cy, y1 = cy + h;
    return [[poly([P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1), P(x1, y0, z0)]), 'url(#fr)', 'r'],
      [poly([P(x0, y1, z1), P(x1, y1, z1), P(x1, y0, z1), P(x0, y0, z1)]), 'url(#fl)', 'l'],
      [poly([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)]), 'url(#ft)', 't']];
  }
  function cyl(cx, cy, cz, r, h) {
    const [ex, ey] = P(cx, cy, cz), [tx, ty] = P(cx, cy + h, cz), rx = r * S * 1.2247, ry = r * S * .7071;
    return [[`M${f1(ex - rx)},${f1(ey)}L${f1(tx - rx)},${f1(ty)}A${f1(rx)},${f1(ry)} 0 0 1 ${f1(tx + rx)},${f1(ty)}L${f1(ex + rx)},${f1(ey)}A${f1(rx)},${f1(ry)} 0 0 1 ${f1(ex - rx)},${f1(ey)}Z`, 'url(#fc)', 'l'],
      [`M${f1(tx - rx)},${f1(ty)}A${f1(rx)},${f1(ry)} 0 1 1 ${f1(tx + rx)},${f1(ty)}A${f1(rx)},${f1(ry)} 0 1 1 ${f1(tx - rx)},${f1(ty)}Z`, 'url(#ft)', 't']];
  }
  function layout() {
    const W = svg.clientWidth, H = svg.clientHeight; mob = W < 700;
    S = mob ? Math.min(26, W / 16) : Math.min(54, W / 18, H / 12.5);
    OX = mob ? W * .4 : W * .55; OY = mob ? H * .55 : H * .8;
  }
  svg.addEventListener('pointerover', e => { const p = e.target.closest('[data-i]'); hover = p ? +p.dataset.i : -1; });
  svg.addEventListener('pointerleave', () => { hover = -1; });

  function render(g, t) {
    const apart = ease((g - PHASES[1]) / .18), cut = ease((g - PHASES[2]) / .2), back = ease((g - PHASES[3]) / .18), meas = ease((g - PHASES[4]) / .1);
    let y = 0, out = '', notes = '', yBefore = 0; const labs = [];
    PARTS.forEach(p => { yBefore += p[3]; });
    PARTS.forEach(([k, w, d, h, label, short, keep, mx, mz], i) => {
      const tidy = keep ? back : 0;                                         // the rebuild lines everything up
      const ox = mx * (1 - tidy), oz = mz * (1 - tidy);
      const gap = apart * (1 - back) * i * (mob ? .5 : .66);
      const leave = keep ? 0 : cut;
      const fx = leave * .6, fz = -leave * (mob ? 2.6 : 3.4) * (1 + i * .1);
      const bob = reduce ? 0 : Math.sin(t * .8 + i) * .035 * apart * (1 - back);
      const cy = y + gap + bob;
      const geo = k === 'box' ? box(ox + fx, cy, oz + fz, w, d, h) : cyl(ox + fx, cy, oz + fz, w, h);
      const op = keep ? 1 : (1 - leave * .9) * (1 - back);
      const dash = !keep && cut > .02 ? ' stroke-dasharray="4 4"' : '';
      const on = hover === i ? ' on' : '';
      out += `<g class="pt${on}${keep ? '' : ' x'}" data-i="${i}" opacity="${op.toFixed(3)}">` + geo.map(([dd, fill, face]) => `<path class="${face}" d="${dd}" fill="${fill}"${dash}/>`).join('') + '</g>';
      const show = apart * (1 - back) * (keep ? 1 : 1 - cut);
      if (show > .02) {
        const [ax, ay] = P(ox + fx + (k === 'box' ? w / 2 : w * .8), cy + h / 2, oz + fz - (k === 'box' ? d / 2 : 0));
        const lx = Math.max(ax + 24, OX + (mob ? 3.6 : 5.2) * S);
        const txt = (mob ? short : label) + (!keep && cut > .3 ? '  ✕' : '');
        labs.push({ ax, ay, lx, ly: ay, cls: `nt${keep ? '' : ' x'}${on}`, show, txt: `${String(i + 1).padStart(2, '0')}  ${txt}` });
      }
      y += h * (keep ? 1 : 1 - leave);
    });
    // labels never overlap: keep at least one line between them, top to bottom
    labs.sort((a, b) => a.ly - b.ly).forEach((l, k, A) => { if (k && l.ly < A[k - 1].ly + 19) l.ly = A[k - 1].ly + 19; });
    labs.forEach(l => { notes += `<g class="${l.cls}" opacity="${l.show.toFixed(3)}"><path d="M${f1(l.ax)},${f1(l.ay)}L${f1(l.lx - 14)},${f1(l.ly)}L${f1(l.lx)},${f1(l.ly)}"/><circle cx="${f1(l.ax)}" cy="${f1(l.ay)}" r="2.2"/><text x="${f1(l.lx + 8)}" y="${f1(l.ly + 4)}">${l.txt}</text></g>`; });
    // after the rebuild: the same step, now automatic
    if (back > .5) {
      const [ax, ay] = P(1.1, PARTS[0][3] + .5, -1.6), lx = OX + (mob ? 3.6 : 5.2) * S;
      notes += `<g class="nt k" opacity="${((back - .5) * 2 * (1 - meas * .6)).toFixed(3)}"><path d="M${f1(ax)},${f1(ay)}L${f1(lx)},${f1(ay)}"/><circle cx="${f1(ax)}" cy="${f1(ay)}" r="2.2"/><text x="${f1(lx + 8)}" y="${f1(ay + 4)}">02  ${mob ? 'now automatic' : 'the same step, now automatic'}</text></g>`;
    }
    // measuring it: a dimension line, before and after
    let dim = '';
    if (meas > .01) {
      const dx = mob ? 2.6 : 3.4, dz = mob ? -2.2 : -2.6, sgn = 1, anc = '';
      const [a0x, a0y] = P(dx, 0, dz), [a1x, a1y] = P(dx, y, dz), [b1x, b1y] = P(dx, yBefore, dz);
      const o = meas.toFixed(3);
      dim = `<g class="dim" opacity="${o}"><path class="ghost" d="M${f1(a0x)},${f1(a0y)}L${f1(b1x)},${f1(b1y)}"/><path d="M${f1(a0x)},${f1(a0y)}L${f1(a1x)},${f1(a1y)}"/>`
        + `<path d="M${f1(a0x - 6)},${f1(a0y)}h12M${f1(a1x - 6)},${f1(a1y)}h12M${f1(b1x - 6)},${f1(b1y)}h12" />`
        + `<text x="${f1(b1x + 14 * sgn)}" y="${f1(b1y + 4)}"${anc}>${mob ? '7 parts' : 'before · 7 parts'}</text><text class="k" x="${f1(a1x + 14 * sgn)}" y="${f1(a1y + 4)}"${anc}>${mob ? '4 parts ✓' : 'after · 4 parts, same job ✓'}</text></g>`;
    }
    const [c0x, c0y] = P(0, -.6, 0), [c1x, c1y] = P(0, yBefore + apart * (1 - back) * 4.4 + 1, 0);
    // the environment: a soft contact shadow under the object and a pool of light on the floor
    const fl = [P(-3.6, 0, -2.6), P(3.6, 0, -2.6), P(3.6, 0, 2.6), P(-3.6, 0, 2.6)], [px, py] = P(0, 0, 0);
    const lift = apart * (1 - back);
    const env = `<ellipse class="pool" cx="${f1(px)}" cy="${f1(py)}" rx="${f1(S * 9)}" ry="${f1(S * 3.4)}"/>`
      + `<path class="shadow" d="${poly(fl)}" opacity="${(.75 - lift * .35).toFixed(3)}" filter="url(#bl)"/>`;
    svg.innerHTML = DEFS + env + `<path class="axis" d="M${f1(c0x)},${f1(c0y)}L${f1(c1x)},${f1(c1y)}"/>` + out + notes + dim;
  }
  layout();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 100); });
  return { render };
}
