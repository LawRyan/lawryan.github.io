// THE LEDGER — Concept B. One rAF loop drives every scroll-linked piece; it sleeps when nothing moves
// and stops when the tab is hidden. No libraries.

const doc = document.documentElement;
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const motion = doc.classList.contains('motion');
RM.addEventListener?.('change', () => location.reload());

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = t => 1 - Math.pow(1 - t, 3);
const inout = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const fvs = (w, g) => `"wdth" ${w.toFixed(1)}, "wght" ${g.toFixed(0)}`;
const isDesk = () => innerWidth >= 900;
const coarse = matchMedia('(hover: none)').matches;

let W = innerWidth, H = innerHeight;

/* ------------------------------------------------------------------ loop */
let raf = 0;
const kick = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); };
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else kick(); });
addEventListener('scroll', kick, { passive: true });

/* ------------------------------------------------------------------ 1 · cover */
const cover = {
  el: $('#cover'), h1: $('.cover__name'), nm: $('.cover__name .nm'), lines: $$('.cover__name .ln'),
  chars: $$('.cover__name .ch:not(.sp)'),
  px: -0.35, target: -0.35, intro: null, ready: false, last: '', fs: [],
};
cover.chars.forEach(c => { c._ln = c.closest('.ln'); });
function coverUnits() { return isDesk() || W > 760 ? [cover.nm] : cover.lines; }
function coverMeasure() {
  const units = coverUnits();
  cover.h1.style.fontSize = ''; cover.lines.forEach(l => (l.style.fontSize = '', l.style.width = ''));
  if (units.length > 1) cover.lines.forEach(l => (l.style.width = 'max-content'));
  cover.units = units;
  cover.fs = units.map(u => parseFloat(getComputedStyle(u === cover.nm ? cover.h1 : u).fontSize));
  const cs = getComputedStyle(cover.h1);
  cover.avail = cover.el.clientWidth - parseFloat(cs.paddingLeft) - (units.length > 1 ? 12 : Math.max(8, W * .012));
  cover.dirty = true;
}
function coverRead() {
  if (!cover.ready) return;
  // letter centres, normalised within their unit
  cover.units.forEach((u, ui) => {
    const uw = u.offsetWidth || 1;
    cover.uw = cover.uw || []; cover.uw[ui] = uw;
  });
  cover.chars.forEach(c => {
    const u = cover.units.length > 1 ? c._ln : cover.nm;
    c._c = (c.offsetLeft - (cover.units.length > 1 ? 0 : 0) + c.offsetWidth / 2) / (u.offsetWidth || 1);
  });
}
function coverWrite(dt) {
  if (!cover.ready) return false;
  if (!cover.intro && coarse && motion) {
    const sp = clamp(scrollY / (H * .75));
    cover.target = lerp(1.3, -0.35, sp);
  }
  let moving = false;
  if (cover.intro) {
    const t = clamp((performance.now() - cover.intro) / 1900);
    cover.px = lerp(-0.25, 1.32, inout(t));
    if (t >= 1) { cover.intro = null; cover.target = coarse ? cover.target : 1.32; }
    moving = true;
  } else {
    const d = cover.target - cover.px;
    if (Math.abs(d) > .0008) { cover.px += d * Math.min(1, dt * 0.009); moving = true; } else cover.px = cover.target;
  }
  const key = cover.px.toFixed(4) + W;
  if (key === cover.last && !cover.dirty) return moving;
  cover.last = key;
  const sig = .15;
  cover.chars.forEach(c => {
    const d = (cover.px - (c._c ?? .5)) / sig;
    const t = Math.exp(-d * d);
    c.style.fontVariationSettings = fvs(75 + 50 * t, 800 - 500 * t);
    if (cover.introOn) c.style.opacity = clamp((cover.px - (c._c ?? .5) + .1) / .07);
  });
  if (cover.introOn && !cover.intro) { cover.introOn = false; cover.chars.forEach(c => (c.style.opacity = '')); }
  // fit each unit to the available width (uses last frame's measured width: one frame of lag)
  cover.units.forEach((u, i) => {
    const w = cover.uw?.[i]; if (!w) return;
    const fs = cover.fs[i] * (cover.avail / w);
    if (Math.abs(fs - cover.fs[i]) > .2) {
      cover.fs[i] = fs;
      (u === cover.nm ? cover.h1 : u).style.fontSize = fs.toFixed(2) + 'px';
      moving = true;
    }
  });
  cover.dirty = false;
  return moving;
}
if (!coarse) {
  cover.el.addEventListener('pointermove', e => {
    if (cover.intro || !motion) return;
    const r = cover.nm.getBoundingClientRect();
    cover.target = (e.clientX - r.left) / r.width; kick();
  });
  cover.el.addEventListener('pointerleave', () => { if (!cover.intro) { cover.target = 1.32; kick(); } });
}

/* ------------------------------------------------------------------ 2 · reconciliation */
const REPORTS = ['Client revenue by desk', 'Wallet share by client tier', 'Trade volume summary', 'Top client coverage', 'New issue allocation', 'Client profitability', 'KYC refresh status', 'Onboarding pipeline', 'Product revenue bridge', 'Sales credit summary', 'Client activity by region', 'Dormant client review', 'Regional revenue flash', 'Business head KPI pack', 'KRI exception log', 'Client tiering review', 'Coverage gap report', 'Fee capture variance', 'Margin call summary', 'Data quality exceptions', 'Global Markets scorecard', 'Client hierarchy changes', 'Desk league table', 'Quarter-to-date bridge'];
const CYCLES = [['Weekly', 'WK'], ['Monthly', 'MO'], ['Quarterly', 'QT']];
const PRODUCTS = ['Rates', 'Credit', 'FX', 'Equities'];
const REGIONS = ['Americas', 'EMEA', 'APAC', 'Global'];
const TICK = '<svg class="tick" viewBox="0 0 18 14" aria-hidden="true"><path d="M1.5 7.8 L6.6 12.4 L16.5 1.6"/></svg>';
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const rc = {
  el: $('#recon'), pin: $('.recon__pin'), rowsEl: $('.recon__rows'), head: $('.r--hd'),
  h: $('.recon__h'), n: $('.recon__h .n'), t: $('.recon__h .t'), cap: $('.recon__cap'),
  done: $('.recon__done'), total: $('.recon__total'), rows: [], p: 0, sp: -1,
};
function reconBuild() {
  if (!motion) return;
  seed = 7;
  const rh = W < 900 ? 20 : 22;
  const avail = rc.rowsEl.clientHeight || H * .8;
  let n = Math.ceil(avail / rh) + 2; if (n % 2 === 0) n++;
  const sv = (n - 1) / 2;
  let html = '';
  for (let i = 0; i < n; i++) {
    if (i === sv) {
      html += `<div class="r sv"><span class="c ref">XL-0001</span><span class="c rep"><span class="x">less manual reporting</span></span><span class="c cyc">Every cycle</span><span class="c prd">All products</span><span class="c reg">Global</span><span class="c rec"><span class="x">95%</span></span><span class="c chk">${TICK}</span><i class="strike"></i></div>`;
      continue;
    }
    const [cy, pre] = CYCLES[Math.floor(rnd() * 3)];
    const rec = Math.floor(800 + rnd() * rnd() * 140000).toLocaleString('en-US');
    html += `<div class="r"><span class="c ref">${pre}-${String(Math.floor(rnd() * 9000) + 100).padStart(4, '0')}</span><span class="c rep">${REPORTS[Math.floor(rnd() * REPORTS.length)]}</span><span class="c cyc">${cy}</span><span class="c prd">${PRODUCTS[Math.floor(rnd() * 4)]}</span><span class="c reg">${REGIONS[Math.floor(rnd() * 4)]}</span><span class="c rec">${rec}</span><span class="c chk">${TICK}</span><i class="strike"></i></div>`;
  }
  rc.rowsEl.innerHTML = html;
  rc.rh = rh;
  rc.rows = $$('.r', rc.rowsEl).map((el, i) => ({ el, i, d: Math.abs(i - sv), last: '' }));
  rc.sv = rc.rows[sv];
  // order: outside in, alternating top and bottom, so the page drains toward the line that matters
  const order = rc.rows.filter(r => r !== rc.sv).sort((a, b) => b.d - a.d || a.i - b.i);
  order.forEach((r, k) => { r.s = .05 + (k / (order.length - 1)) * .55; });
  rc.sv.s = .625;
  rc.total.textContent = n; rc.n_ = n;
  rc.sp = -1;
}
function reconMeasure() {
  if (!motion) return;
  const pr = rc.pin;
  const hx = rc.h.offsetLeft, hy = rc.h.offsetTop;
  rc.F = [rc.n, rc.t].map(e => ({ x: hx + e.offsetLeft, y: hy + e.offsetTop, w: e.offsetWidth, h: e.offsetHeight, fs: parseFloat(getComputedStyle(e).fontSize) }));
  rc.cellFs = parseFloat(getComputedStyle(rc.sv.el).fontSize);
  rc.sp = -1;
}
function reconRead() {
  const r = rc.el.getBoundingClientRect();
  rc.vis = r.bottom > 0 && r.top < H;
  rc.p = clamp(-r.top / (r.height - rc.pin.offsetHeight));
  if (rc.vis && rc.sv && rc.p > .6) {
    const pr = rc.pin.getBoundingClientRect();
    rc.S = [$('.rec .x', rc.sv.el), $('.rep .x', rc.sv.el)].map(e => { const b = e.getBoundingClientRect(); return { x: b.left - pr.left, cy: b.top - pr.top + b.height / 2 }; });
  }
}
function reconWrite() {
  if (!motion || !rc.vis || !rc.rows.length) return false;
  const target = rc.p;
  const d = target - rc.sp;
  const sp = rc.sp < 0 || Math.abs(d) < .0004 ? target : rc.sp + d * .2;
  if (sp === rc.sp && !rc.force) return false;
  rc.sp = sp; rc.force = false;
  const p = sp;
  let done = 0;
  for (const r of rc.rows) {
    const tk = seg(p, r.s, r.s + .018);
    if (r === rc.sv) {
      const k = `${tk.toFixed(3)}`;
      if (tk >= 1) done++;
      if (k !== r.last) { r.last = k; r.el.style.setProperty('--tk', tk.toFixed(3)); }
      continue;
    }
    const st = seg(p, r.s + .01, r.s + .032);
    const co = ease(seg(p, r.s + .034, r.s + .066));
    if (st >= 1) done++;
    const k = `${tk.toFixed(3)}|${st.toFixed(3)}|${co.toFixed(3)}`;
    if (k === r.last) continue;
    r.last = k;
    const s = r.el.style;
    s.setProperty('--tk', tk.toFixed(3)); s.setProperty('--st', st.toFixed(3));
    s.height = (rc.rh * (1 - co)).toFixed(2) + 'px';
    s.opacity = (1 - co * 1.4).toFixed(3);
    s.borderBottomWidth = co > .5 ? '0' : '';
  }
  rc.done.textContent = done;
  // flight: the surviving row's two cells become the headline
  const f = inout(seg(p, .69, .88));
  const flying = p > .69;
  rc.head.style.opacity = (1 - seg(p, .64, .72)).toFixed(3);
  $$('.c:not(.rec):not(.rep)', rc.sv.el).forEach(c => (c.style.opacity = (1 - seg(p, .66, .7)).toFixed(3)));
  rc.sv.el.style.opacity = flying ? '0' : '';
  rc.sv.el.style.borderBottomColor = p > .64 ? 'transparent' : '';
  [rc.n, rc.t].forEach((e, i) => {
    e.style.visibility = flying ? 'visible' : 'hidden';
    if (!flying || !rc.F || !rc.S) return;
    const F = rc.F[i], S = rc.S[i];
    const s0 = rc.cellFs / F.fs;
    const s = lerp(s0, 1, f);
    const dx = lerp(S.x - F.x, 0, f);
    const dy = lerp(S.cy - F.y - F.h * s0 / 2, 0, f);
    e.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
    const ff = clamp(f * 1.15);
    e.style.fontVariationSettings = i === 0 ? fvs(lerp(94, 75, ff), lerp(650, 800, ff)) : fvs(lerp(94, 125, ff), lerp(650, 300, ff));
  });
  rc.n.style.setProperty('--dbl', ease(seg(p, .89, .95)).toFixed(3));
  const c = ease(seg(p, .88, .96));
  rc.cap.style.clipPath = `inset(0 ${((1 - c) * 100).toFixed(2)}% 0 0)`;
  return Math.abs(target - sp) > .0004;
}

/* ------------------------------------------------------------------ 3 · figures */
const flex = $$('[data-flex]').map(el => {
  const [w, g] = el.dataset.flex.split('|').map(s => s.split(' ').map(Number));
  return { el, w, g, last: '' };
});
const ticks = $('.fig__ticks');
const tickEls = [];
if (ticks) { let h = ''; for (let i = 0; i < 300; i++) h += '<i></i>'; ticks.innerHTML = h; tickEls.push(...ticks.children); }
let tickOn = motion ? -1 : 300, tickFig = $('.fig--rules');
function figRead() {
  for (const f of flex) { const r = f.el.getBoundingClientRect(); f.vis = r.bottom > -50 && r.top < H + 50; f.v = clamp((H - r.top) / (H + r.height)); }
  if (tickFig) { const r = tickFig.getBoundingClientRect(); tickFig._v = clamp((H * .9 - r.top) / (r.height * .85)); }
}
function figWrite() {
  if (!motion) return false;
  for (const f of flex) {
    if (!f.vis) continue;
    const t = inout(f.v);
    const k = t.toFixed(3); if (k === f.last) continue; f.last = k;
    f.el.style.fontVariationSettings = fvs(lerp(f.w[0], f.w[1], t), lerp(f.g[0], f.g[1], t));
  }
  if (tickFig) {
    const on = Math.round(ease(tickFig._v) * 300);
    if (on !== tickOn) {
      const lo = Math.min(on, Math.max(tickOn, 0)), hi = Math.max(on, Math.max(tickOn, 0));
      for (let i = Math.max(0, lo - 1); i < Math.min(300, hi + 1); i++) {
        tickEls[i].style.setProperty('--k', i < on ? 1 : 0);
        tickEls[i].classList.toggle('on', i === on - 1 && on < 300);
      }
      tickOn = on;
    }
  }
  return false;
}
if (!motion) tickEls.forEach(t => t.style.setProperty('--k', 1));

/* ------------------------------------------------------------------ 5 · career */
const cr = { el: $('#career'), pin: $('.career__pin'), track: $('.career__track'), roles: $$('.role'), yrs: $$('.role__yr'), sp: -1 };
function careerMeasure() {
  cr.track.style.transform = '';
  cr.horiz = motion && isDesk();
  if (cr.horiz) {
    cr.dist = Math.max(0, cr.track.scrollWidth - W);
    cr.el.style.setProperty('--career-h', (cr.dist + H * 1.25).toFixed(0) + 'px');
    cr.offs = cr.roles.map(r => [r.offsetLeft, r.offsetWidth]);
  } else cr.el.style.removeProperty('--career-h');
  cr.sp = -1; cr.last = [];
}
function careerRead() {
  const r = cr.el.getBoundingClientRect();
  cr.vis = r.bottom > 0 && r.top < H;
  cr.p = clamp(-r.top / Math.max(1, r.height - H));
  if (!cr.horiz && cr.vis) cr.ys = cr.yrs.map(y => y.getBoundingClientRect().top);
}
function careerWrite() {
  if (!motion || !cr.vis) return false;
  let moving = false;
  if (cr.horiz) {
    const d = cr.p - cr.sp;
    const sp = cr.sp < 0 || Math.abs(d) < .0003 ? cr.p : cr.sp + d * .18;
    moving = sp !== cr.p;
    if (sp === cr.sp) return moving;
    cr.sp = sp;
    const p = clamp((sp - .06) / .88);
    const tx = -p * cr.dist;
    cr.track.style.transform = `translate3d(${tx.toFixed(1)}px,0,0)`;
    cr.yrs.forEach((y, i) => {
      const [ol, ow] = cr.offs[i];
      const cx = ol + ow * .32 + tx;
      const dd = (cx - W * .42) / (W * .32);
      const t = Math.exp(-dd * dd);
      const k = t.toFixed(3); if (cr.last[i] === k) return; cr.last[i] = k;
      if (y.closest('.role--edu')) return;
      y.style.setProperty('--yw', (75 + 37 * t).toFixed(1)); y.style.setProperty('--yg', (800 - 480 * t).toFixed(0));
    });
  } else {
    cr.yrs.forEach((y, i) => {
      if (y.closest('.role--edu')) return;
      const dd = (cr.ys[i] - H * .38) / (H * .35);
      const t = Math.exp(-dd * dd);
      const k = t.toFixed(3); if (cr.last[i] === k) return; cr.last[i] = k;
      y.style.setProperty('--yw', (75 + 50 * t).toFixed(1)); y.style.setProperty('--yg', (800 - 480 * t).toFixed(0));
    });
  }
  return moving;
}

/* ------------------------------------------------------------------ 6 · L//IOS reveal */
const lv = {
  el: $('.reveal'), pin: $('.reveal__pin'), paper: $('.reveal__paper'), night: $('.reveal__night'),
  word: $('.reveal__word'), L: $('.w-l'), S: $('.w-s'), R: $('.w-r'), bl: $('.reveal__word .bl'), pre: $('.reveal__pre'),
  shot: $('.reveal__shot'), light: $('.reveal__light'), copy: $('.reveal__copy'), tag: $('.reveal__tag'), stmt: $('.reveal__stmt'),
  sp: -1, p: 0,
};
function liosMeasure() {
  if (!motion) return;
  lv.L.style.transform = lv.R.style.transform = '';
  const pr = lv.pin.getBoundingClientRect();
  const PW = lv.pin.clientWidth, PH = lv.pin.clientHeight;
  const fs = parseFloat(getComputedStyle(lv.word).fontSize);
  const s = lv.S.getBoundingClientRect(), bl = lv.bl.getBoundingClientRect();
  let cap = fs * .72;
  try { const cx = document.createElement('canvas').getContext('2d'); cx.font = `800 ${fs}px Mona`; const m = cx.measureText('L'); if (m.actualBoundingBoxAscent > fs * .4) cap = m.actualBoundingBoxAscent; } catch {}
  const base = bl.top - pr.top, sx0 = s.left - pr.left, sx1 = s.right - pr.left;
  const k = .3, w = fs * .118;
  const ymid = base - cap / 2;
  const c1 = sx0 + (sx1 - sx0) * .3, c2 = sx0 + (sx1 - sx0) * .72;
  Object.assign(lv, { PW, PH, k, ymid, cap, base, pad: 40,
    a: [c1 - w / 2, c1 + w / 2, c2 - w / 2, c2 + w / 2] });
  // framed screenshot rectangle (end state) and full-bleed cover state
  const desk = PW >= 900;
  const copyBottom = lv.copy.offsetTop + lv.copy.offsetHeight;
  let fw, fx, fy;
  if (desk) {
    fw = Math.min(PW * .66, (PH - copyBottom - 56 - 70) / .625);
    fx = PW - fw - Math.max(24, PW * .045);
    fy = copyBottom + 40;
  } else {
    fw = PW - 32; fx = 16;
    fy = Math.min(PH - fw * .625 - 110, copyBottom + 28);
  }
  const fh = fw * .625;
  const sc = Math.max(PW / fw, PH / fh) * 1.04;
  Object.assign(lv, { fw, fx, fy, fh, sc, cx: (PW - fw * sc) / 2, cy: (PH - fh * sc) / 2 });
  lv.shot.style.setProperty('--fw', fw.toFixed(1) + 'px');
  lv.sp = -1;
}
function liosRead() {
  const r = lv.el.getBoundingClientRect();
  lv.vis = r.bottom > 0 && r.top < H;
  lv.p = clamp(-r.top / Math.max(1, r.height - lv.pin.offsetHeight));
}
function slash(lm, rm, yt, yb) {
  const { k, ymid } = lv;
  const xt = y => k * (ymid - y);
  return `M${(lm + xt(yt)).toFixed(1)} ${yt.toFixed(1)}L${(rm + xt(yt)).toFixed(1)} ${yt.toFixed(1)}L${(rm + xt(yb)).toFixed(1)} ${yb.toFixed(1)}L${(lm + xt(yb)).toFixed(1)} ${yb.toFixed(1)}Z`;
}
function liosWrite() {
  if (!motion || !lv.vis || lv.k == null) return false;
  const d = lv.p - lv.sp;
  const sp = lv.sp < 0 || Math.abs(d) < .0003 ? lv.p : lv.sp + d * .16;
  const moving = sp !== lv.p;
  if (sp === lv.sp) return moving;
  lv.sp = sp;
  const p = sp;
  const { PW, PH, k, ymid, cap, pad, a } = lv;
  const e1 = inout(seg(p, .05, .2));     // slits run the full height of the page
  const e2 = inout(seg(p, .17, .46));    // and open
  const ei = ease(clamp(e2 * 1.6));
  const yt = lerp(ymid - cap / 2, -pad, e1), yb = lerp(ymid + cap / 2, PH + pad, e1);
  const mid = (a[1] + a[2]) / 2;
  const l1 = lerp(a[0], -k * (ymid + pad) - 12, e2);
  const r1 = lerp(a[1], mid + 4, ei);
  const l2 = lerp(a[2], mid - 4, ei);
  const r2 = lerp(a[3], PW + k * (PH + pad - ymid) + 12, e2);
  if (e2 >= 1) lv.night.style.clipPath = 'none';
  else lv.night.style.clipPath = `path('${slash(l1, r1, yt, yb)}${slash(l2, r2, yt, yb)}')`;
  lv.L.style.transform = `translateX(${(l1 - a[0]).toFixed(1)}px)`;
  lv.R.style.transform = `translateX(${(r2 - a[3]).toFixed(1)}px)`;
  lv.pre.style.opacity = (1 - seg(p, .03, .12)).toFixed(3);
  lv.light.style.opacity = (.35 + .65 * e1).toFixed(3);
  // screenshot: full-bleed while the slit opens, then recedes into a lit frame
  const e3 = inout(seg(p, .56, .78));
  const s = lerp(lv.sc * lerp(1.08, 1, e2), 1, e3);
  const x = lerp(lv.cx - (lv.fw * lv.sc * .04) * (1 - e2), lv.fx, e3);
  const y = lerp(lv.cy - (lv.fh * lv.sc * .04) * (1 - e2), lv.fy, e3);
  lv.shot.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
  $('img', lv.shot).style.opacity = (.15 + .85 * seg(p, .1, .3)).toFixed(3);
  lv.shot.style.setProperty('--gloss', (Math.sin(Math.PI * seg(p, .6, .9))).toFixed(3));
  lv.shot.style.setProperty('--gx', (100 - 160 * seg(p, .6, .9)).toFixed(1) + '%');
  lv.shot.style.setProperty('--capo', seg(p, .74, .82).toFixed(3));
  const t1 = ease(seg(p, .7, .84)), t2 = ease(seg(p, .78, .92));
  lv.tag.style.opacity = t1.toFixed(3);
  lv.tag.style.fontVariationSettings = fvs(lerp(75, 125, t1), lerp(800, 300, t1));
  lv.stmt.style.opacity = t2.toFixed(3);
  lv.stmt.style.transform = `translateY(${((1 - t2) * 14).toFixed(1)}px)`;
  return moving;
}

/* ------------------------------------------------------------------ L//IOS product viewers */
$$('.prod').forEach(prod => {
  const img = $('.viewer__img', prod), frame = $('.viewer__frame', prod), alt = $('.viewer__alt', prod);
  const tabs = $$('.viewer__tabs button', prod);
  let busy = null;
  tabs.forEach(b => b.addEventListener('click', async () => {
    if (b.getAttribute('aria-pressed') === 'true') return;
    tabs.forEach(t => t.setAttribute('aria-pressed', String(t === b)));
    const src = b.dataset.src, a = b.dataset.alt;
    alt.textContent = a + '.';
    if (!motion) { img.src = src; img.alt = a; return; }
    busy?.cancel?.(); $$('.viewer__in', frame).forEach(n => n.remove());
    const nx = new Image(); nx.className = 'viewer__in'; nx.alt = ''; nx.src = src;
    try { await nx.decode(); } catch {}
    frame.appendChild(nx);
    const anim = nx.animate([
      { clipPath: 'polygon(52% 0%, 54% 0%, 48% 100%, 46% 100%)', filter: 'brightness(1.8)' },
      { clipPath: 'polygon(30% 0%, 76% 0%, 70% 100%, 24% 100%)', filter: 'brightness(1.2)', offset: .45 },
      { clipPath: 'polygon(-20% 0%, 130% 0%, 120% 100%, -30% 100%)', filter: 'brightness(1)' },
    ], { duration: 780, easing: 'cubic-bezier(.7,0,.2,1)' });
    busy = anim;
    anim.onfinish = () => { img.src = src; img.alt = a; img.decode?.().catch(() => {}).finally(() => nx.remove()); };
  }));
});

/* ------------------------------------------------------------------ folio + contents */
const folio = $('.folio'), fPg = $('.folio__pg'), fT = $('.folio__t');
const dlg = $('#contents');
const chapters = $$('[data-chapter]');
let curCh = null;
function folioRead() {
  let best = null;
  const mid = H * .5;
  for (const c of chapters) { const r = c.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) best = c; }
  folio._ch = best;
}
function folioWrite() {
  const c = folio._ch; if (!c) return;
  const top = c.closest('.chapter');
  let night = !!c.closest('.lios');
  if (night && motion && c === top && lv.p < .2) night = false;
  folio.classList.toggle('on-night', night);
  if (c !== curCh) { curCh = c; fT.textContent = c.dataset.chapter; fPg.textContent = top.dataset.page; }
}
function openContents() {
  const cur = curCh?.closest('.chapter')?.id;
  $$('.contents__list a').forEach(a => a.setAttribute('aria-current', String(a.hash === '#' + cur)));
  doc.classList.add('locked');
  dlg.showModal();
  folio.setAttribute('aria-expanded', 'true');
  ($(`.contents__list a[aria-current="true"]`) || $('.contents__list a')).focus();
}
function closeContents(then) {
  if (!dlg.open) return;
  const done = () => {
    dlg.classList.remove('closing'); dlg.close(); doc.classList.remove('locked');
    folio.setAttribute('aria-expanded', 'false');
    if (then) then(); else folio.focus();
  };
  if (!motion) return done();
  dlg.classList.add('closing');
  dlg.addEventListener('animationend', done, { once: true });
}
folio.addEventListener('click', openContents);
$('.contents__x').addEventListener('click', () => closeContents());
dlg.addEventListener('cancel', e => { e.preventDefault(); closeContents(); });
dlg.addEventListener('click', e => { if (e.target === dlg) closeContents(); });
dlg.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const f = $$('a, button', dlg); const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
$$('.contents__list a').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  const t = $(a.hash);
  closeContents(() => {
    const y = t.getBoundingClientRect().top + scrollY;
    scrollTo({ top: y, behavior: 'instant' });
    history.replaceState(null, '', a.hash);
    t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true });
    rc.sp = lv.sp = cr.sp = -1; kick();
  });
}));

/* ------------------------------------------------------------------ frame */
let lastT = performance.now();
function frame(t) {
  raf = 0;
  const dt = Math.min(64, t - lastT); lastT = t;
  // read
  coverRead(); reconRead(); figRead(); careerRead(); liosRead(); folioRead();
  // write
  let more = false;
  more = coverWrite(dt) || more;
  more = reconWrite() || more;
  more = figWrite() || more;
  more = careerWrite() || more;
  more = liosWrite() || more;
  folioWrite();
  if (more) kick();
}

function measureAll() {
  W = innerWidth; H = innerHeight;
  coverMeasure();
  if (motion) reconBuild();
  careerMeasure();
  if (motion) { reconMeasure(); liosMeasure(); }
  rc.force = true;
  kick();
}
let rzT = 0, lastW = W;
addEventListener('resize', () => {
  // ignore the mobile URL bar height wobble
  if (coarse && innerWidth === lastW && Math.abs(innerHeight - H) < 140) { H = innerHeight; kick(); return; }
  lastW = innerWidth;
  clearTimeout(rzT); rzT = setTimeout(measureAll, 120);
});

(async () => {
  try { await Promise.race([Promise.all([document.fonts.load('800 100px Mona'), document.fonts.load('300 20px Newsreader')]), new Promise(r => setTimeout(r, 2500))]); } catch {}
  measureAll();
  cover.ready = true;
  if (motion) {
    cover.introOn = true; cover.chars.forEach(c => (c.style.opacity = 0));
    requestAnimationFrame(() => {
      doc.classList.add('go');
      cover.intro = performance.now();
      if (coarse) cover.target = 1.3;
      kick();
    });
  } else { cover.px = 1.32; cover.target = 1.32; }
  kick();
  // in case a hash was given on load
  if (location.hash && $(location.hash)) $(location.hash).scrollIntoView();
})();
