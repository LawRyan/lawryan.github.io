/**
 * Kinetic type: a heading made of loose letters that assemble, come apart and respond to the cursor.
 * The real text stays in the heading's aria-label; the letters are decorative copies of it.
 */
const STYLES = ['k-it', 'k-mono', 'k-bold', '', '', ''];

export function kinetic(h, { pile, built = false, reduce = false, loosen = () => 0, drag = true } = {}) {
  const label = h.textContent.replace(/\s+/g, ' ').trim();
  h.setAttribute('aria-label', label);
  const L = [];
  (function split(node) {
    [...node.childNodes].forEach(n => {
      if (n.nodeType !== 3) { split(n); return; }
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(tok => {
        if (!tok) return;
        if (/^\s+$/.test(tok)) { frag.append(' '); return; }
        const w = document.createElement('span'); w.className = 'kw'; w.setAttribute('aria-hidden', 'true');
        for (const ch of tok) { const l = document.createElement('span'); l.className = 'kl'; const g = document.createElement('span'); g.textContent = ch; l.append(g); w.append(l); L.push({ el: l }); }
        frag.append(w);
      });
      n.replaceWith(frag);
    });
  })(h);

  let mode = built || reduce ? 'built' : 'pile', since = performance.now(), ptr = { x: -1e4, y: -1e4 }, grab = null, home = [], hr = { left: 0, top: 0 };
  const R = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  function measure() {
    L.forEach(o => { o.el.style.transform = 'none'; o.el.style.width = ''; o.el.classList.remove(...STYLES.filter(Boolean)); });
    const r0 = h.getBoundingClientRect();
    home = L.map(o => { const r = o.el.getBoundingClientRect(); o.el.style.width = r.width + 'px'; return { x: r.left - r0.left + r.width / 2, y: r.top - r0.top + r.height / 2 }; });
    L.forEach((o, i) => {
      const [px, py] = pile(i, L.length, R, r0);          // pile point, in viewport coordinates at measure time
      o.pile = { x: px - r0.left - home[i].x, y: py - r0.top - home[i].y, r: (R() - .5) * 170, s: .7 + R() * .7 };
      o.loose = { x: (R() - .5) * 220, y: -(30 + R() * 170), r: (R() - .5) * 70 };
      o.style = STYLES[Math.floor(R() * STYLES.length)];
      if (!o.p) o.p = mode === 'pile' ? { ...o.pile, vx: 0, vy: 0, vr: 0, vs: 0 } : { x: 0, y: 0, r: 0, s: 1, vx: 0, vy: 0, vr: 0, vs: 0 };
    });
  }
  const set = m => { if (m === mode) return; mode = m; since = performance.now(); };
  if (drag) {
    h.addEventListener('pointerdown', e => {
      const el = e.target.closest('.kl'); if (!el) return;
      const o = L.find(q => q.el === el), i = L.indexOf(o), r0 = h.getBoundingClientRect();
      grab = { o, ox: e.clientX - (r0.left + home[i].x + o.p.x), oy: e.clientY - (r0.top + home[i].y + o.p.y), i };
      el.setPointerCapture?.(e.pointerId); e.preventDefault();
    });
    addEventListener('pointerup', () => { grab = null; });
  }
  addEventListener('pointermove', e => {
    ptr = { x: e.clientX, y: e.clientY };
    if (grab) { const r0 = h.getBoundingClientRect(); grab.o.p.x = e.clientX - grab.ox - r0.left - home[grab.i].x; grab.o.p.y = e.clientY - grab.oy - r0.top - home[grab.i].y; grab.o.p.r *= .9; }
  }, { passive: true });

  function step(dt, now) {
    hr = h.getBoundingClientRect();
    const lo = reduce ? 0 : loosen(), n = L.length;
    L.forEach((o, i) => {
      const p = o.p, el = o.el;
      const go = mode === 'built' && (reduce || now - since > (i / n) * 900);    // leave the heap in reading order
      const inPile = !go;
      if (inPile !== !!o.inPile) { o.inPile = inPile; if (o.style) el.classList.toggle(o.style, inPile); }
      let tx = go ? o.loose.x * lo : o.pile.x, ty = go ? o.loose.y * lo : o.pile.y, tr = go ? o.loose.r * lo : o.pile.r, ts = go ? 1 : o.pile.s;
      if (go && !grab && !reduce) {      // curiosity: the cursor nudges what's nearby
        const dx = hr.left + home[i].x + p.x - ptr.x, dy = hr.top + home[i].y + p.y - ptr.y, d = Math.hypot(dx, dy);
        if (d < 110) { const f = (1 - d / 110) * 30; tx += dx / (d || 1) * f; ty += dy / (d || 1) * f; tr += (dx > 0 ? 1 : -1) * f * .35; }
      }
      if (grab && grab.o === o) { el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${p.r.toFixed(1)}deg)`; return; }
      if (reduce) Object.assign(p, { x: tx, y: ty, r: tr, s: ts });
      else {
        const k = go ? 170 : 70, c = go ? 19 : 12;
        p.vx += ((tx - p.x) * k - p.vx * c) * dt; p.vy += ((ty - p.y) * k - p.vy * c) * dt;
        p.vr += ((tr - p.r) * k - p.vr * c) * dt; p.vs += ((ts - p.s) * k - p.vs * c) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.s += p.vs * dt;
      }
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${p.r.toFixed(1)}deg) scale(${p.s.toFixed(3)})`;
      // height off the page: a letter that is lifted casts a longer, softer shadow
      const lift = Math.min(1, Math.hypot(p.x, p.y) / 260 + Math.abs(p.s - 1) * 1.5);
      if (Math.abs(lift - (o.lift ?? -1)) > .01) { o.lift = lift; el.style.setProperty('--lift', lift.toFixed(3)); }
    });
  }
  measure();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(measure, 120); });
  return { step, set, get mode() { return mode; }, measure };
}
