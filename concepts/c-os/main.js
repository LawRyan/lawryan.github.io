// Concept C: an intelligence operating system. Plain DOM, no libraries.
// Motion is one spring integrator; every animated state is a target the spring settles on,
// so gestures can hand their velocity to the animation and reduced motion simply jumps to the end.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const body = document.body;
const params = new URLSearchParams(location.search);
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => RM.matches || params.has('rm');
const MQ = matchMedia('(max-width: 760px)');
const isMobile = MQ.matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const wait = ms => new Promise(r => setTimeout(r, reduced() ? 0 : ms));
const svg = id => `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/* ------------------------------------------------------------------ motion */
const anims = new Map();
let rafId = 0, lastT = 0;
function frame(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000));
  lastT = now;
  for (const [key, a] of anims) if (a.step(dt)) { anims.delete(key); a.finish(); }
  rafId = anims.size ? requestAnimationFrame(frame) : 0;
}
function start(key, a) {
  const prev = anims.get(key);
  if (prev) { anims.delete(key); prev.cancel(); }
  anims.set(key, a);
  if (!rafId) { lastT = performance.now(); rafId = requestAnimationFrame(frame); }
}
function stop(key) { const a = anims.get(key); if (a) { anims.delete(key); a.cancel(); } }
/** Damped spring toward `to`. from/to may be numbers or arrays. Resolves true when settled, false if interrupted. */
function spring(key, { from, to, k = 170, c = 26, m = 1, v, onUpdate, onDone }) {
  const arr = Array.isArray(from);
  const X = arr ? [...from] : [from], T = arr ? [...to] : [to];
  const V = v == null ? X.map(() => 0) : arr ? [...v] : [v];
  const thr = X.map((x, i) => (Math.abs(x) > 2 || Math.abs(T[i]) > 2 ? 0.08 : 0.0006));
  return new Promise(res => {
    const a = {
      step(dt) {
        const n = Math.ceil(dt / (1 / 240)), h = dt / n;
        let settled = true;
        for (let i = 0; i < X.length; i++) {
          for (let j = 0; j < n; j++) { const f = -k * (X[i] - T[i]) - c * V[i]; V[i] += (f / m) * h; X[i] += V[i] * h; }
          if (Math.abs(X[i] - T[i]) > thr[i] || Math.abs(V[i]) > thr[i] * 8) settled = false;
        }
        if (settled) for (let i = 0; i < X.length; i++) X[i] = T[i];
        onUpdate && onUpdate(arr ? X : X[0], arr ? V : V[0]);
        return settled;
      },
      finish() { onDone && onDone(); res(true); },
      cancel() { res(false); },
      jump() { for (let i = 0; i < X.length; i++) X[i] = T[i]; onUpdate && onUpdate(arr ? X : X[0], arr ? V.map(() => 0) : 0); },
    };
    if (reduced()) { stop(key); a.jump(); a.finish(); return; }
    start(key, a);
  });
}
/** Timed tween with an easing curve, for things that should not overshoot (counters, opacity). */
function tween(key, { from = 0, to = 1, dur = 600, ease = t => 1 - Math.pow(1 - t, 3), onUpdate, onDone }) {
  return new Promise(res => {
    let t = 0; const t0 = performance.now();
    const a = {
      step() { t = Math.min(1, (performance.now() - t0) / dur); onUpdate && onUpdate(lerp(from, to, ease(t))); return t >= 1; },
      finish() { onDone && onDone(); res(true); }, cancel() { res(false); },
      jump() { t = 1; onUpdate && onUpdate(to); },
    };
    if (reduced()) { stop(key); a.jump(); a.finish(); return; }
    start(key, a);
  });
}
// Hidden tab: finish everything immediately so no rAF keeps running in the background.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  for (const [key, a] of anims) { anims.delete(key); a.jump(); a.finish(); }
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
});
if (params.has('rm')) root.classList.add('rm');

/* ------------------------------------------------------------------ content (from docs/concepts/BRIEF.md and src/content.ts) */
const ANALYST_NOTE = 'Real screenshot · L//IOS Analyst on its synthetic “Global Markets” sample (fictional firms)';
const MARKETS_NOTE = 'Real screenshot · L//IOS in demo mode (the app labels every value DEMO DATA)';
const MOBILE_NOTE = 'Real screen · rendered by the app’s own UI tests with sample data';

const CAREER = [
  { t: 'Tax Operations Analyst', a: [2015, 10], b: [2017, 10], d: 'Nov 2015 to Nov 2017', s: 'Tax compliance across FATCA, OECD CRS, Chapter 3/61 and HIRE Act (871m).' },
  { t: 'Client Implementation Analyst', a: [2017, 10], b: [2018, 10], d: 'Nov 2017 to Nov 2018', s: 'Helped clients and internal teams comply with regulatory margin requirements.' },
  { t: 'Global Client Onboarding Data Analyst', a: [2018, 10], b: [2019, 11], d: 'Nov 2018 to Dec 2019', s: 'Lead liaison between Global Markets and the back office for the data quality of 20,000+ clients in KYC refresh.' },
  { t: 'KYC Data & Reporting Team Lead', a: [2019, 11], b: [2020, 7], d: 'Dec 2019 to Aug 2020', s: 'Led KYC data and reporting, owning data quality and the reports senior management relied on.' },
  { t: 'Client Management & Analytics Team Lead', a: [2020, 7], b: [2021, 11], d: 'Aug 2020 to Dec 2021', s: 'Led a team producing KPIs and KRIs for the COO and Global Markets business heads.' },
  { t: 'Client Intelligence Associate', a: [2021, 11], b: [2025, 11], d: 'Dec 2021 to Dec 2025', s: 'Built the Tableau reporting for Global Markets business heads and Global Business Management across all regions.' },
  { t: 'Vice President, Client Intelligence', a: [2025, 11], b: null, d: 'Dec 2025 to present', s: 'Leads reporting, data quality and business intelligence for Capital Markets, turning complex business requirements into practical solutions.' },
];

const PILLARS = {
  analyst: {
    name: 'L//IOS Analyst', short: 'Analyst', status: 'Working', note: ANALYST_NOTE,
    line: 'Data intelligence, autonomous analysis',
    body: 'Give it files it has never seen. It works out the structure, connects the datasets safely, checks quality, builds the dashboard and investigates what changed. Every number traces back to source rows.',
    caps: [
      ['Excel, CSV, JSON, Parquet and SQLite ingestion, including messy sheets', 'Working'],
      ['Schema and meaning detection: measures, dimensions, dates, hierarchies', 'Working'],
      ['Relationship discovery with match rates; joins can never multiply rows', 'Working'],
      ['Data quality checks with stated methods and affected rows', 'Working'],
      ['Generated dashboard, driver trees and ranked findings', 'Working'],
      ['Plain-language questions answered by deterministic tools', 'Working'],
      ['Version refresh: what changed between data drops', 'Working'],
      ['PostgreSQL / SQL Server snapshots', 'Prototype'],
      ['Optional AI rephrasing and summaries, numerically guarded', 'Prototype'],
    ],
    links: [['https://lawryan.github.io/#lab', 'Try it in the Intelligence Lab'], ['https://lawryan.github.io/lios/', 'L//IOS product page']],
    screens: [
      { id: 'dashboard', label: 'Dashboard', src: '/lios-shots/analyst-dashboard.webp', alt: 'L//IOS Analyst dashboard showing KPIs, revenue by month, and a ranked list of findings' },
      { id: 'init', label: 'Initialize', src: '/lios-shots/analyst-init.webp', alt: 'L//IOS Analyst initialization: seven engines online, files, data regions, relationships and quality issues found' },
      { id: 'investigation', label: 'Investigation', src: '/lios-shots/analyst-investigation.webp', alt: 'An investigation into a finding, with data checks, a weekly chart and a driver tree' },
      { id: 'quality', label: 'Quality', src: '/lios-shots/analyst-quality.webp', alt: 'Data quality page with five scores and seven checks, each with its method' },
      { id: 'ask', label: 'Ask', src: '/lios-shots/analyst-ask.webp', alt: 'Ask L//IOS answering with FACT and INTERPRETATION labels and a driver tree' },
    ],
  },
  markets: {
    name: 'L//IOS Markets', short: 'Markets', status: 'Working', note: MARKETS_NOTE,
    line: 'Markets and research intelligence',
    body: 'Ask a question and the question builds the workspace: market data, deterministic analytics, coverage, internet-attention signals, evidence with labels, and research that remembers what changed.',
    caps: [
      ['Sector and company analysis with follow-ups (“Change this to YTD”, “Remove Intel”)', 'Working'],
      ['Relative performance, drawdown, volatility and correlation, recomputed in Verify', 'Working'],
      ['News coverage and Hacker News attention signals', 'Working'],
      ['Saved research with “What changed?” and // TODAY', 'Working'],
      ['Private datasets alongside public data', 'Working'],
      ['SEC filings and FRED macro adapters', 'Prototype'],
      ['AI research agent (off by default, evidence-guarded)', 'Prototype'],
      ['More attention sources and a knowledge graph', 'Planned'],
    ],
    links: [['https://lawryan.github.io/lios/', 'L//IOS product page']],
    screens: [
      { id: 'home', label: 'Home', src: '/lios-shots/markets-home.webp', alt: 'L//IOS home: “What do you want to understand?” with a command bar and suggested investigations' },
      { id: 'semis', label: 'Semiconductors', src: '/lios-shots/markets-semis.webp', alt: 'L//IOS semiconductors workspace: year-to-date performance, leaders and laggards, with DEMO DATA badges' },
      { id: 'research', label: 'Research', src: '/lios-shots/markets-research.webp', alt: 'L//IOS Research page: one saved Semiconductors study with its snapshot, stored locally' },
      { id: 'evidence', label: 'Evidence', src: '/lios-shots/markets-evidence.webp', alt: 'Evidence panel recomputing every return and drawdown, all matching' },
    ],
  },
  health: {
    name: 'L//IOS Health', short: 'Health', status: 'In development', note: MOBILE_NOTE,
    line: 'Personal health and training intelligence',
    body: 'A native Android app that reads Health Connect, interprets messy workout notes, tracks strength, running and body composition, and tells you what changed and what to do next, labelling every value as measured, calculated or interpreted.',
    caps: [
      ['Workout capture by paste, voice or photo, interpreted on-device', 'Working'],
      ['Strength progression, estimated 1RM and personal records', 'Working'],
      ['Running, pickleball and training load', 'Working'],
      ['Health Connect: Samsung Health and RENPHO body data (read-only)', 'Working'],
      ['Next-session planning that adapts to time, fatigue and equipment', 'Working'],
      ['Nutrition logging and food-photo estimates', 'In development'],
      ['AI assistant (off by default; key stays on the phone or a paired backend)', 'Prototype'],
      ['Link to desktop L//IOS', 'Planned'],
    ],
    links: [['https://lawryan.github.io/lios/', 'L//IOS product page']],
    screens: [
      { id: 'today', label: 'Today', src: '/lios-shots/mobile-today.webp', alt: 'L//IOS Mobile Today screen with readiness rings and the next session, labelled demo data' },
      { id: 'brief', label: 'Brief', src: '/lios-shots/mobile-brief.webp', alt: 'Brief: three things deserve your attention today' },
      { id: 'interpreted', label: 'Workout', src: '/lios-shots/mobile-interpreted.webp', alt: 'An interpreted workout read from pasted text, before saving' },
      { id: 'health', label: 'Readiness', src: '/lios-shots/mobile-health.webp', alt: 'Health readiness score with what moved it' },
      { id: 'next', label: 'Next session', src: '/lios-shots/mobile-next.webp', alt: 'Next session: a suggested lower-body strength workout and why' },
      { id: 'food', label: 'Food', src: '/lios-shots/mobile-food.webp', alt: 'A meal-photo estimate broken into foods with calorie ranges' },
    ],
  },
};

const APPS = [
  { id: 'about', title: 'About', space: 0, kw: 'profile bio role vice president responsibilities offshore team education' },
  { id: 'results', title: 'Results', space: 0, kw: 'figures impact numbers kyc automation tableau validation' },
  { id: 'career', title: 'Career', space: 0, kw: 'timeline roles history rbc experience' },
  { id: 'contact', title: 'Contact', space: 0, kw: 'email linkedin reach' },
  { id: 'analyst', title: 'L//IOS Analyst', short: 'Analyst', space: 1, kw: 'lios data intelligence analysis dashboard' },
  { id: 'markets', title: 'L//IOS Markets', short: 'Markets', space: 1, kw: 'lios research semiconductors evidence' },
  { id: 'health', title: 'L//IOS Health', short: 'Health', space: 1, kw: 'lios android mobile training phone' },
];
const APP = Object.fromEntries(APPS.map(a => [a.id, a]));
const SPACE_NAMES = ['Work', 'L//IOS'];

/* ------------------------------------------------------------------ state */
const S = {
  locked: true, space: 0, p: 0, overview: false, cmd: false, menu: false,
  focused: [null, null], z: 20, liosVisited: false, busy: false,
};
const WIN = {};
const live = msg => { $('#live').textContent = msg; };

/* ------------------------------------------------------------------ clock */
function tickClock() {
  const d = new Date();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  $('#clock').textContent = `${d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}  ${time}`;
  $('#clock').dateTime = d.toISOString();
  $('#lockTime').textContent = time;
  $('#lockDate').textContent = d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
}
tickClock();
setInterval(tickClock, 15000);
$('#cmdKbd').textContent = isMac ? '⌘K' : 'Ctrl K';

/* ------------------------------------------------------------------ window chrome */
function buildChrome(el, app) {
  const bar = document.createElement('header');
  bar.className = 'win-bar';
  bar.innerHTML = `
    <button type="button" class="win-back" aria-label="Back to home screen">${svg('back')}<span>Home</span></button>
    <span class="win-id"><span class="ico ico--xs ${app.space ? 'ico--lios' : ''}">${svg(app.id)}</span><h2 class="win-title" id="t-${app.id}">${app.title}</h2></span>
    <div class="win-tools"></div>
    <div class="win-ctl">
      <button type="button" class="ctl" data-act="min" aria-label="Minimize ${app.title}" title="Minimize">${svg('min')}</button>
      <button type="button" class="ctl" data-act="close" aria-label="Close ${app.title}" title="Close">${svg('close')}</button>
    </div>`;
  el.prepend(bar);
  el.setAttribute('aria-labelledby', `t-${app.id}`);
  el.setAttribute('role', 'region');
  return bar;
}

function statusChip(s) { return `<span class="chip" data-s="${s}">${s}</span>`; }
function inspectorHTML(id) {
  const P = PILLARS[id];
  return `<aside class="insp" aria-label="${P.short} capabilities">
    <p class="insp-line">${P.line}</p>
    <p class="insp-body">${P.body}</p>
    <h3 class="insp-h">Capabilities</h3>
    <ul class="insp-caps">${P.caps.map(([n, s]) => `<li><span>${n}</span>${statusChip(s)}</li>`).join('')}</ul>
    <p class="insp-links">${P.links.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</p>
  </aside>`;
}

/* Analyst and Markets: a native toolbar segmented control switches real screenshots. */
function buildApp(id) {
  const P = PILLARS[id], el = WIN[id].el;
  const tools = $('.win-tools', el);
  tools.innerHTML = `<div class="seg" role="tablist" aria-label="${P.short} screens">${P.screens.map((s, i) =>
    `<button type="button" role="tab" id="tab-${id}-${s.id}" aria-controls="panel-${id}" aria-selected="${i === 0}" tabindex="${i ? -1 : 0}">${s.label}</button>`).join('')}<span class="seg-thumb" aria-hidden="true"></span></div>
    <button type="button" class="tool" data-act="insp" aria-pressed="true" aria-label="Show capabilities" title="Capabilities">${svg('panel')}</button>`;
  $('.win-body', el).innerHTML = `<div class="appview">
      <figure class="stage" id="panel-${id}" role="tabpanel" aria-labelledby="tab-${id}-${P.screens[0].id}">
        <div class="shot"><img class="shot-img is-cur" alt="" decoding="async"><img class="shot-img" alt="" aria-hidden="true" decoding="async"></div>
        <figcaption><span class="cap-screen">${P.screens[0].label}</span><span class="cap-note">${P.note}</span></figcaption>
      </figure>
      ${inspectorHTML(id)}
    </div>`;
  const imgs = $$('.shot-img', el);
  imgs[0].src = P.screens[0].src; imgs[0].alt = P.screens[0].alt;
  const tabs = $$('[role=tab]', el), thumb = $('.seg-thumb', el);
  let cur = 0, front = 0;
  const placeThumb = (i, animate = true) => {
    const t = tabs[i];
    const target = [t.offsetLeft, t.offsetWidth];
    const from = WIN[id].thumb || target;
    const set = ([x, w]) => { thumb.style.transform = `translateX(${x}px)`; thumb.style.width = `${w}px`; WIN[id].thumb = [x, w]; };
    if (!animate) return set(target);
    spring(`seg-${id}`, { from, to: target, k: 380, c: 32, onUpdate: set });
  };
  WIN[id].placeThumb = () => placeThumb(cur, false);
  const select = async (i, focus) => {
    if (i === cur) return;
    const dir = i > cur ? 1 : -1;
    tabs[cur].setAttribute('aria-selected', 'false'); tabs[cur].tabIndex = -1;
    tabs[i].setAttribute('aria-selected', 'true'); tabs[i].tabIndex = 0;
    if (focus) tabs[i].focus();
    cur = i;
    placeThumb(i);
    const sc = P.screens[i];
    $('.stage', el).setAttribute('aria-labelledby', tabs[i].id);
    $('.cap-screen', el).textContent = sc.label;
    const oldI = imgs[front], newI = imgs[1 - front];
    front = 1 - front;
    newI.src = sc.src;
    try { await newI.decode(); } catch { /* still show it */ }
    if (cur !== i) return;
    oldI.alt = ''; oldI.setAttribute('aria-hidden', 'true'); oldI.classList.remove('is-cur');
    newI.alt = sc.alt; newI.removeAttribute('aria-hidden'); newI.classList.add('is-cur');
    spring(`shot-${id}`, {
      from: 0, to: 1, k: 210, c: 28, onUpdate: t => {
        const e = clamp(t, 0, 1.2);
        oldI.style.opacity = String(clamp(1 - e * 1.6));
        oldI.style.transform = `translateX(${-dir * 36 * e}px) scale(${1 - 0.03 * e})`;
        newI.style.opacity = String(clamp(e * 1.4));
        newI.style.transform = `translateX(${dir * 48 * (1 - e)}px) scale(${0.985 + 0.015 * e})`;
      },
    });
  };
  WIN[id].select = select;
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', e => {
      const n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (e.key === 'Home') { e.preventDefault(); select(0, true); }
      else if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
      else if (n) { e.preventDefault(); select((cur + n + tabs.length) % tabs.length, true); }
    });
  });
  $('[data-act=insp]', el).addEventListener('click', e => {
    const on = el.classList.toggle('no-insp');
    e.currentTarget.setAttribute('aria-pressed', String(!on));
  });
}

/* Health: the window is a phone. Its screens swipe (touch, trackpad, or mouse drag). */
function buildHealth() {
  const P = PILLARS.health, el = WIN.health.el;
  $('.win-body', el).innerHTML = `<div class="device-wrap">
      <div class="device-col">
        <div class="device"><div class="device-screen">
          <div class="track" tabindex="0" role="group" aria-roledescription="carousel" aria-label="L//IOS Health screens">
            ${P.screens.map((s, i) => `<div class="slide" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${P.screens.length}: ${s.label}"><img alt="${s.alt}" decoding="async" loading="lazy" data-src="${i}"></div>`).join('')}
          </div>
        </div></div>
        <div class="device-ctl">
          <button type="button" class="tool" data-step="-1" aria-label="Previous screen">${svg('back')}</button>
          <div class="pager" aria-hidden="true">${P.screens.map(() => '<i></i>').join('')}</div>
          <button type="button" class="tool" data-step="1" aria-label="Next screen">${svg('next')}</button>
        </div>
        <p class="device-cap"><span class="cap-screen">${P.screens[0].label}</span><span class="cap-note">${P.note}</span></p>
      </div>
      ${inspectorHTML('health')}
    </div>`;
  const imgs = $$('.slide img', el);
  imgs.forEach((im, i) => { im.src = P.screens[i].src; });
  const track = $('.track', el), dots = $$('.pager i', el), label = $('.cap-screen', el);
  let idx = 0;
  const sync = () => {
    const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    if (i === idx && dots[i].classList.contains('on')) return;
    idx = clamp(i, 0, P.screens.length - 1);
    dots.forEach((d, j) => d.classList.toggle('on', j === idx));
    label.textContent = P.screens[idx].label;
  };
  dots[0].classList.add('on');
  track.addEventListener('scroll', sync, { passive: true });
  const go = i => {
    i = clamp(i, 0, P.screens.length - 1);
    const from = track.scrollLeft, to = i * track.clientWidth;
    track.classList.add('is-driven');
    spring('health-track', { from, to, k: 220, c: 30, onUpdate: x => { track.scrollLeft = x; }, onDone: () => track.classList.remove('is-driven') });
  };
  WIN.health.go = go;
  WIN.health.idx = () => idx;
  $$('[data-step]', el).forEach(b => b.addEventListener('click', () => go(idx + Number(b.dataset.step))));
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
  });
  // Mouse drag to swipe (touch and trackpads scroll natively).
  track.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button) return;
    e.preventDefault();
    stop('health-track');
    track.setPointerCapture(e.pointerId);
    track.classList.add('is-driven');
    const x0 = e.clientX, s0 = track.scrollLeft;
    let lx = x0, lt = performance.now(), vel = 0;
    const move = ev => {
      track.scrollLeft = s0 - (ev.clientX - x0);
      const now = performance.now(); vel = (ev.clientX - lx) / Math.max(1, now - lt); lx = ev.clientX; lt = now;
    };
    const up = () => {
      track.removeEventListener('pointermove', move); track.removeEventListener('pointerup', up); track.removeEventListener('pointercancel', up);
      const w = track.clientWidth, raw = track.scrollLeft / w;
      go(Math.abs(vel) > 0.4 ? (vel < 0 ? Math.ceil(raw) : Math.floor(raw)) : Math.round(raw));
    };
    track.addEventListener('pointermove', move); track.addEventListener('pointerup', up); track.addEventListener('pointercancel', up);
  });
}

/* Career: a proportional ruler of the seven RBC roles plus a list and a reading pane. */
function buildCareer() {
  const el = WIN.career.el;
  const now = new Date();
  const t0 = 2015 + 10 / 12, t1 = now.getFullYear() + now.getMonth() / 12 + 0.15;
  const pos = ([y, m]) => ((y + m / 12 - t0) / (t1 - t0)) * 100;
  const end = r => r.b || [now.getFullYear(), now.getMonth()];
  const months = r => { const [y2, m2] = end(r); return (y2 - r.a[0]) * 12 + (m2 - r.a[1]); };
  const dur = r => { const mo = months(r), y = Math.floor(mo / 12), m = mo % 12; return [y ? `${y} year${y > 1 ? 's' : ''}` : '', m ? `${m} month${m > 1 ? 's' : ''}` : ''].filter(Boolean).join(', '); };
  const order = CAREER.map((r, i) => i).reverse();
  const years = []; for (let y = 2016; y <= now.getFullYear(); y++) years.push(y);
  $('.win-body', el).innerHTML = `<div class="career">
      <div class="ruler" aria-hidden="true">
        <div class="ruler-track">${CAREER.map((r, i) => `<span class="seg-role" data-i="${i}" style="left:${pos(r.a)}%;width:${pos(end(r)) - pos(r.a)}%"></span>`).join('')}</div>
        <div class="ruler-years">${years.map(y => `<span style="left:${pos([y, 0])}%">${y}</span>`).join('')}</div>
      </div>
      <div class="career-main">
        <div class="roles" role="tablist" aria-orientation="vertical" aria-label="Roles at RBC, newest first">
          ${order.map(i => `<button type="button" role="tab" id="role-${i}" aria-controls="role-panel" aria-selected="false" tabindex="-1" data-i="${i}"><span class="r-t">${CAREER[i].t}</span><span class="r-d">${CAREER[i].d}</span></button>`).join('')}
        </div>
        <article class="role-panel" id="role-panel" role="tabpanel" tabindex="0">
          <p class="rp-org">RBC Capital Markets</p>
          <h3 class="rp-t"></h3>
          <p class="rp-d"></p>
          <p class="rp-s"></p>
        </article>
      </div>
    </div>`;
  const tabs = $$('.roles [role=tab]', el), segs = $$('.seg-role', el), panel = $('.role-panel', el);
  let cur = -1;
  const select = (i, focus) => {
    if (i === cur) return;
    cur = i;
    tabs.forEach(t => { const on = Number(t.dataset.i) === i; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    segs.forEach(s => s.classList.toggle('on', Number(s.dataset.i) === i));
    panel.setAttribute('aria-labelledby', `role-${i}`);
    const r = CAREER[i];
    $('.rp-t', el).textContent = r.t;
    $('.rp-d', el).textContent = `${r.d}, ${dur(r)}`;
    $('.rp-s', el).textContent = r.s;
    spring('career-panel', { from: 0, to: 1, k: 260, c: 30, onUpdate: t => { panel.style.opacity = String(clamp(t)); panel.style.transform = `translateY(${(1 - t) * 8}px)`; } });
  };
  WIN.career.select = select;
  tabs.forEach((t, j) => {
    t.addEventListener('click', () => select(Number(t.dataset.i)));
    t.addEventListener('keydown', e => {
      const n = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
      if (n) { e.preventDefault(); const k = (j + n + tabs.length) % tabs.length; select(Number(tabs[k].dataset.i), true); }
    });
  });
  segs.forEach(s => s.addEventListener('click', () => select(Number(s.dataset.i))));
  select(CAREER.length - 1);
}

/* ------------------------------------------------------------------ desktop windows */
function layout() {
  const W = innerWidth, H = innerHeight, top = 52, dock = 98, avH = H - top - dock;
  const L = {};
  if (W >= 1100) {
    const aw = Math.min(600, Math.round(W * 0.4));
    L.about = { x: Math.round(Math.max(40, W * 0.05)), y: top, w: aw, h: Math.min(680, avH) };
    const rh = Math.min(492, avH - 40);
    L.results = { x: L.about.x + aw + 28, y: Math.max(top + 150, H - dock - rh), w: 440, h: rh };
    const cw = Math.min(660, W - L.results.x - 24);
    L.career = { x: W - 40 - cw, y: top, w: cw, h: Math.min(430, avH - 120) };
    L.contact = { x: W - 40 - 420, y: top + 60, w: 420, h: 300 };
    const ax = W >= 1320 ? 364 : 336;
    const aW = Math.min(1080, W - ax - 32);
    const aH = Math.min(avH + 10, Math.round(46 + (aW - 290) * 0.625 + 46));
    L.analyst = { x: ax, y: Math.round(top - 8 + Math.max(0, (avH - aH) * 0.4)), w: aW, h: aH };
    L.markets = { x: ax - 20, y: L.analyst.y + 36, w: aW, h: aH };
    const screenH = Math.min(600, avH - 44 - 150), phoneW = Math.round(screenH * 540 / 1170) + 20;
    L.health = { x: W - (phoneW + 340) - 48, y: top - 4, w: phoneW + 340, h: avH + 8, phoneW };
  } else {
    const w = Math.min(560, W - 48);
    L.about = { x: 24, y: top, w, h: Math.min(640, avH) };
    L.results = { x: W - 24 - Math.min(420, W - 48), y: top + 40, w: Math.min(420, W - 48), h: Math.min(520, avH - 40) };
    L.career = { x: 24, y: top + 80, w: Math.min(700, W - 48), h: Math.min(440, avH - 80) };
    L.contact = { x: W - 24 - 400, y: top + 20, w: 400, h: 300 };
    L.analyst = { x: 24, y: top, w: W - 48, h: Math.min(avH, Math.round(46 + (W - 348) * 0.625 + 46)) };
    L.markets = { x: 40, y: top + 30, w: W - 64, h: L.analyst.h };
    const screenH = Math.min(560, avH - 44 - 120), phoneW = Math.round(screenH * 540 / 1170) + 20;
    L.health = { x: W - (phoneW + 340) - 24, y: top, w: phoneW + 340, h: avH, phoneW };
  }
  return L;
}

function render(w) {
  w.el.style.transform = `translate3d(${(w.x + w.tx).toFixed(2)}px,${(w.y + w.ty).toFixed(2)}px,0) scale(${w.s.toFixed(4)})`;
  w.el.style.opacity = String(clamp(w.o));
}
function setGeom(w, g) {
  Object.assign(w, { x: g.x, y: g.y, w: g.w, h: g.h });
  w.el.style.width = `${g.w}px`;
  w.el.style.height = `${g.h}px`;
  if (g.phoneW) w.el.style.setProperty('--phone-w', `${g.phoneW}px`);
  render(w);
}
function animWin(w, to, opts = {}) {
  return spring(`win-${w.id}`, {
    from: [w.tx, w.ty, w.s, w.o], to, k: opts.k ?? 240, c: opts.c ?? 26, v: opts.v,
    onUpdate: ([tx, ty, s, o]) => { w.tx = tx; w.ty = ty; w.s = s; w.o = o; render(w); },
  });
}
/** Transform that maps window w onto a screen rect (origin top-left). */
function toRect(w, r, o = 0) { const s = r.width / w.w; return [r.left - w.x, r.top + r.height / 2 - (w.h * s) / 2 - w.y, s, o]; }

function setAppName() {
  const f = S.focused[S.space];
  const name = S.overview ? 'Overview' : f && f.state === 'open' ? f.app.title : SPACE_NAMES[S.space] === 'Work' ? 'Desktop' : 'L//IOS';
  const el = $('#appName');
  if (el.textContent === name) return;
  el.textContent = name;
  spring('appname', { from: 0, to: 1, k: 300, c: 28, onUpdate: t => { el.style.opacity = String(clamp(t)); el.style.transform = `translateY(${(1 - t) * 6}px)`; } });
}
function focusWin(w) {
  const sp = w.app.space;
  if (S.focused[sp] && S.focused[sp] !== w) S.focused[sp].el.classList.remove('is-focused');
  w.el.style.zIndex = String(++S.z);
  w.el.classList.add('is-focused');
  S.focused[sp] = w;
  setAppName();
}
function topWin(space, except) {
  return Object.values(WIN).filter(w => w.app.space === space && w.state === 'open' && w !== except).sort((a, b) => b.el.style.zIndex - a.el.style.zIndex)[0] || null;
}
function dockItem(id) { return $(`.dock-item[data-app="${id}"]`); }
function setRunning(w) {
  const d = dockItem(w.id);
  if (!d) return;
  d.classList.toggle('is-running', w.state !== 'closed');
  d.setAttribute('aria-label', `${w.app.title}${w.state === 'min' ? ', minimized' : w.state === 'open' ? ', open' : ''}`);
}

async function openApp(id, opts = {}) {
  if (isMobile) return mOpen(id, opts.from);
  const w = WIN[id];
  if (S.cmd) closeCmd(false);
  if (S.locked) await unlock();
  if (S.overview) await exitOverview();
  if (w.app.space !== S.space) await goSpace(w.app.space, 0, true);
  if (w.state === 'open') {
    focusWin(w);
    // a short nudge so the user sees which window answered
    spring(`nudge-${id}`, { from: 0, to: 1, k: 500, c: 18, v: 6, onUpdate: t => { w.el.style.setProperty('--nudge', String(t)); } });
    if (opts.focus !== false) w.el.focus({ preventScroll: true });
    return;
  }
  const src = (opts.from || dockItem(id)).getBoundingClientRect();
  const wasMin = w.state === 'min';
  w.el.hidden = false;
  w.state = 'open';
  if (!wasMin || w.s === 1) [w.tx, w.ty, w.s, w.o] = toRect(w, src, 0);
  render(w);
  focusWin(w);
  setRunning(w);
  if (opts.focus !== false) w.el.focus({ preventScroll: true });
  w.placeThumb && w.placeThumb();
  live(`${w.app.title} opened`);
  await animWin(w, [0, 0, 1, 1], { k: 210, c: 24 });
  if (!w.opened) { w.opened = true; w.onFirstOpen && w.onFirstOpen(); }
}
async function minimizeWin(w) {
  if (w.state !== 'open') return;
  w.state = 'min';
  setRunning(w);
  const next = topWin(w.app.space, w);
  if (next) { focusWin(next); next.el.focus({ preventScroll: true }); } else { S.focused[w.app.space] = null; setAppName(); dockItem(w.id).focus(); }
  live(`${w.app.title} minimized to the dock`);
  const ok = await animWin(w, toRect(w, dockItem(w.id).getBoundingClientRect(), 0), { k: 260, c: 30 });
  if (ok && w.state === 'min') w.el.hidden = true;
}
async function closeWin(w) {
  if (w.state !== 'open') return;
  w.state = 'closed';
  setRunning(w);
  const next = topWin(w.app.space, w);
  if (next) { focusWin(next); next.el.focus({ preventScroll: true }); } else { S.focused[w.app.space] = null; setAppName(); dockItem(w.id).focus(); }
  live(`${w.app.title} closed`);
  const ok = await animWin(w, [w.w * 0.03, w.h * 0.03 + 10, 0.94, 0], { k: 420, c: 38 });
  if (ok && w.state === 'closed') { w.el.hidden = true; w.tx = w.ty = 0; w.s = 1; }
}

function initWindows() {
  $$('.win').forEach(el => {
    const app = APP[el.dataset.app];
    const w = { id: app.id, app, el, x: 0, y: 0, w: 400, h: 300, tx: 0, ty: 0, s: 1, o: 1, state: 'closed' };
    WIN[app.id] = w;
    const bar = buildChrome(el, app);
    if (isMobile) return;
    el.addEventListener('pointerdown', () => { if (!S.overview) focusWin(w); }, true);
    el.addEventListener('focusin', () => { if (!S.overview && S.focused[app.space] !== w) focusWin(w); });
    $('[data-act=min]', bar).addEventListener('click', () => minimizeWin(w));
    $('[data-act=close]', bar).addEventListener('click', () => closeWin(w));
    bar.addEventListener('dblclick', e => { if (!e.target.closest('button')) minimizeWin(w); });
    // Drag by the title bar, with a short momentum throw that springs to rest inside the screen.
    bar.addEventListener('pointerdown', e => {
      if (e.button || e.target.closest('button, [role=tab], a') || S.overview) return;
      e.preventDefault();
      stop(`drag-${w.id}`);
      bar.setPointerCapture(e.pointerId);
      el.classList.add('is-dragging');
      const ox = e.clientX - w.x, oy = e.clientY - w.y;
      let vx = 0, vy = 0, lx = e.clientX, ly = e.clientY, lt = performance.now();
      const move = ev => {
        w.x = ev.clientX - ox; w.y = Math.max(34, ev.clientY - oy); render(w);
        const now = performance.now(), dt = Math.max(8, now - lt);
        vx = lerp(vx, (ev.clientX - lx) / dt, 0.5); vy = lerp(vy, (ev.clientY - ly) / dt, 0.5); lx = ev.clientX; ly = ev.clientY; lt = now;
      };
      const up = () => {
        bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); bar.removeEventListener('pointercancel', up);
        el.classList.remove('is-dragging');
        const tx = clamp(w.x + vx * 120, 80 - w.w, innerWidth - 80), ty = clamp(w.y + vy * 120, 34, innerHeight - 120);
        spring(`drag-${w.id}`, { from: [w.x, w.y], to: [tx, ty], v: [vx * 1000, vy * 1000], k: 120, c: 22, onUpdate: ([x, y]) => { w.x = x; w.y = y; render(w); } });
      };
      bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
    });
  });
  buildCareer();
  buildApp('analyst');
  buildApp('markets');
  buildHealth();
  WIN.results.onFirstOpen = countUp;
  if (isMobile) return;
  const L = layout();
  for (const id in WIN) setGeom(WIN[id], L[id]);
  addEventListener('resize', () => {
    if (MQ.matches !== isMobile) { location.reload(); return; }
    const L2 = layout();
    for (const id in WIN) setGeom(WIN[id], L2[id]);
    setP(S.p);
    if (S.overview) exitOverview();
  });
}

function countUp() {
  const el = WIN.results.el;
  $$('[data-count]', el).forEach((n, i) => {
    const to = Number(n.dataset.count);
    tween(`count-${i}`, { from: 0, to, dur: 800 + i * 90, onUpdate: v => { n.textContent = Math.round(v).toLocaleString('en-US'); } });
  });
  $$('.res-bar span', el).forEach((b, i) => setTimeout(() => b.classList.add('go'), reduced() ? 0 : 120 + i * 140));
}

/* ------------------------------------------------------------------ dock */
function initDock() {
  const dock = $('#dock');
  const item = a => `<button type="button" class="dock-item" data-app="${a.id}" aria-label="${a.title}"><span class="ico ${a.space ? 'ico--lios' : ''}">${svg(a.id)}</span><span class="dock-tip" aria-hidden="true">${a.short || a.title}</span></button>`;
  dock.innerHTML = `<div class="dock-group">${APPS.filter(a => !a.space).map(item).join('')}</div><span class="dock-sep" aria-hidden="true"></span><div class="dock-group dock-group--lios">${APPS.filter(a => a.space).map(item).join('')}</div>`;
  $$('.dock-item', dock).forEach(b => {
    b.addEventListener('click', () => {
      const w = WIN[b.dataset.app];
      spring(`hop-${w.id}`, { from: 0, to: 0, v: -9, k: 300, c: 14, onUpdate: t => { b.style.setProperty('--hop', String(t)); } });
      openApp(w.id);
    });
  });
}

/* ------------------------------------------------------------------ spaces: one progress value drives the whole environment */
function setP(p) {
  S.p = p;
  const W = innerWidth;
  const st = root.style;
  const ease = t => t * t * (3 - 2 * t);
  st.setProperty('--p', p.toFixed(4));
  st.setProperty('--pa', ease(clamp(p / 0.62)).toFixed(4));
  st.setProperty('--pb', ease(clamp((p - 0.18) / 0.55)).toFixed(4));
  st.setProperty('--pc', ease(clamp((p - 0.42) / 0.58)).toFixed(4));
  if (isMobile) return;
  $('#plane').style.transform = `translate3d(${(-p * W).toFixed(2)}px,0,0)`;
  const q = clamp(p, -0.2, 1.2);
  $('#space-work').style.transform = `scale(${1 - 0.05 * clamp(q)})`;
  $('#space-work').style.opacity = String(1 - 0.5 * clamp(q));
  $('#space-lios').style.transform = `scale(${0.95 + 0.05 * clamp(q)})`;
  $('#space-lios').style.opacity = String(0.5 + 0.5 * clamp(q));
}
function settleSpace(i) {
  S.space = i;
  root.dataset.env = i ? 'lios' : 'work';
  $('#space-work').inert = i !== 0;
  $('#space-lios').inert = i !== 1;
  $$('.spaces button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.space) === i)));
  $('meta[name=theme-color]').content = i ? '#1B1640' : '#C9D2D7';
  setAppName();
}
async function goSpace(i, v = 0, noAuto = false) {
  i = clamp(i, 0, 1);
  if (isMobile) { mPage(i); return; }
  if (S.overview) await exitOverview();
  const target = i;
  if (target !== S.space) live(`${SPACE_NAMES[target]} space`);
  settleSpace(target);
  if (target === 1) preloadLios();
  const reveal = () => {
    S.liosVisited = true;
    $('.lios-card').classList.add('is-in');
    setTimeout(() => {
      if (!noAuto && WIN.analyst.state === 'closed' && S.space === 1 && !S.overview) openApp('analyst', { from: $('.lios-launch [data-open=analyst]'), focus: false });
    }, reduced() ? 0 : 160);
  };
  const ok = await spring('space', {
    from: S.p, to: target, v, k: 84, c: 18.5,
    onUpdate: x => { setP(x); if (target === 1 && !S.liosVisited && x > 0.88) reveal(); },
  });
  const f = S.focused[target];
  if (ok && f && document.activeElement && !document.activeElement.closest('.menubar, .dock, .cmd, .overview')) f.el.focus({ preventScroll: true });
  return ok;
}
let preloaded = false;
function preloadLios() {
  if (preloaded) return; preloaded = true;
  ['analyst', 'markets'].forEach(id => $$('.shot-img', WIN[id].el)[0].decode?.().catch(() => {}));
}

/* Horizontal trackpad swipe and pointer drag on the wallpaper scrub the same progress value. */
function initSpaceGestures() {
  let wheelT = 0, quietUntil = 0, startP = 0;
  addEventListener('wheel', e => {
    if (S.locked) { if (e.deltaY > 12) unlock(); return; }
    if (S.cmd || S.overview) return;
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 1.3 || Math.abs(e.deltaX) < 1) return;
    if (e.target.closest('.track, .seg, .insp')) return;
    e.preventDefault();
    if (performance.now() < quietUntil) return;
    if (!wheelT) { stop('space'); startP = S.p; }
    setP(clamp(S.p + e.deltaX / (innerWidth * 0.85), -0.12, 1.12));
    clearTimeout(wheelT);
    wheelT = setTimeout(() => {
      wheelT = 0;
      const d = S.p - startP;
      const t = Math.round(clamp(Math.abs(d) > 0.16 ? startP + Math.sign(d) : Math.round(S.p), 0, 1));
      if (t !== Math.round(startP)) quietUntil = performance.now() + 450;
      goSpace(t);
    }, 110);
  }, { passive: false });

  $$('.space').forEach(sp => sp.addEventListener('pointerdown', e => {
    if (e.target !== sp || e.button || S.overview) return;
    stop('space');
    const x0 = e.clientX, p0 = S.p;
    let lx = x0, lt = performance.now(), v = 0, active = false;
    sp.setPointerCapture(e.pointerId);
    const move = ev => {
      const dx = ev.clientX - x0;
      if (!active && Math.abs(dx) < 8) return;
      active = true; body.classList.add('is-scrubbing');
      const raw = p0 - dx / innerWidth;
      setP(raw < 0 ? raw * 0.3 : raw > 1 ? 1 + (raw - 1) * 0.3 : raw);
      const now = performance.now(); v = lerp(v, -(ev.clientX - lx) / innerWidth / Math.max(0.008, (now - lt) / 1000), 0.4); lx = ev.clientX; lt = now;
    };
    const up = () => {
      sp.removeEventListener('pointermove', move); sp.removeEventListener('pointerup', up); sp.removeEventListener('pointercancel', up);
      body.classList.remove('is-scrubbing');
      if (!active) return;
      const t = Math.abs(v) > 0.8 ? (v > 0 ? 1 : 0) : Math.round(clamp(S.p));
      goSpace(t, v);
    };
    sp.addEventListener('pointermove', move); sp.addEventListener('pointerup', up); sp.addEventListener('pointercancel', up);
  }));
  $$('.spaces button').forEach(b => b.addEventListener('click', () => goSpace(Number(b.dataset.space))));
}

/* ------------------------------------------------------------------ overview */
function tileLayout(wins) {
  const W = innerWidth, H = innerHeight;
  const area = { x: 56, y: 118, w: W - 112, h: H - 118 - 150 };
  const gap = 36, labelH = 34, n = wins.length;
  let best = null;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cw = (area.w - gap * (cols - 1)) / cols, ch = (area.h - gap * (rows - 1)) / rows - labelH;
    const sc = Math.min(...wins.map(w => Math.min(cw / w.w, ch / w.h, 0.62)));
    if (!best || sc > best.sc) best = { cols, rows, cw, ch, sc };
  }
  const { cols, rows, cw, ch } = best;
  const totalH = rows * (ch + labelH) + (rows - 1) * gap;
  const y0 = area.y + (area.h - totalH) / 2;
  return wins.map((w, i) => {
    const r = Math.floor(i / cols), inRow = Math.min(cols, n - r * cols), c = i % cols;
    const rowW = inRow * cw + (inRow - 1) * gap, x0 = area.x + (area.w - rowW) / 2;
    const s = Math.min(cw / w.w, ch / w.h, 0.62);
    const tw = w.w * s, th = w.h * s;
    const left = x0 + c * (cw + gap) + (cw - tw) / 2, top = y0 + r * (ch + labelH + gap) + (ch - th);
    return { w, left, top, width: tw, height: th, s };
  });
}
async function enterOverview() {
  if (isMobile || S.locked || S.overview) return;
  closeMenu();
  S.overview = true;
  body.classList.add('is-overview');
  setAppName();
  const ov = $('#overview'), box = $('#ovTiles');
  ov.hidden = false;
  $$('.ov-spaces button').forEach(b => b.setAttribute('aria-current', String(Number(b.dataset.space) === S.space)));
  const wins = Object.values(WIN).filter(w => w.app.space === S.space && w.state === 'open').sort((a, b) => a.app.space - b.app.space || APPS.indexOf(a.app) - APPS.indexOf(b.app));
  const tiles = wins.length ? tileLayout(wins) : [];
  box.innerHTML = tiles.length ? '' : `<p class="ov-empty">No windows are open in ${SPACE_NAMES[S.space]}. Open one from the dock or press ${isMac ? '⌘K' : 'Ctrl K'}.</p>`;
  live('Overview. Choose a window.');
  tiles.forEach((t, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ov-tile';
    b.style.cssText = `left:${t.left}px;top:${t.top}px;width:${t.width}px;height:${t.height}px`;
    b.innerHTML = `<span class="ov-label"><span class="ico ico--xs ${t.w.app.space ? 'ico--lios' : ''}">${svg(t.w.id)}</span>${t.w.app.title}</span>`;
    b.setAttribute('aria-label', `${t.w.app.title} window`);
    b.addEventListener('click', () => exitOverview(t.w));
    box.appendChild(b);
    t.w.el.classList.add('is-tiled');
    animWin(t.w, [t.left - t.w.x, t.top - t.w.y, t.s, 1], { k: 190, c: 24 });
    setTimeout(() => b.classList.add('is-in'), reduced() ? 0 : 140 + i * 40);
  });
  (box.querySelector('button') || $('.ov-spaces button')).focus();
}
async function exitOverview(pick) {
  if (!S.overview) return;
  S.overview = false;
  body.classList.remove('is-overview');
  $('#overview').hidden = true;
  $('#ovTiles').innerHTML = '';
  const wins = Object.values(WIN).filter(w => w.el.classList.contains('is-tiled'));
  if (pick) focusWin(pick);
  setAppName();
  const done = wins.map(w => { w.el.classList.remove('is-tiled'); return animWin(w, [0, 0, 1, 1], { k: 200, c: 25 }); });
  const f = pick || S.focused[S.space];
  if (f) f.el.focus({ preventScroll: true });
  await Promise.all(done);
}
function toggleOverview() { S.overview ? exitOverview() : enterOverview(); }

/* ------------------------------------------------------------------ menu */
const MENU = [
  ...APPS.filter(a => !a.space).map(a => ({ label: a.title, run: () => openApp(a.id) })),
  null,
  ...APPS.filter(a => a.space).map(a => ({ label: a.title, run: () => openApp(a.id) })),
  null,
  { label: 'Overview', key: 'F3', run: () => enterOverview() },
  { label: 'Work space', key: 'Ctrl ←', run: () => goSpace(0) },
  { label: 'L//IOS space', key: 'Ctrl →', run: () => goSpace(1) },
  { label: 'Search', key: isMac ? '⌘K' : 'Ctrl K', run: () => openCmd() },
];
function initMenu() {
  const m = $('#goMenu'), btn = $('#goBtn');
  m.innerHTML = MENU.map((it, i) => it ? `<button type="button" role="menuitem" tabindex="-1" data-i="${i}"><span>${it.label}</span>${it.key ? `<kbd>${it.key}</kbd>` : ''}</button>` : '<span class="menu-sep" role="separator"></span>').join('');
  const items = () => $$('[role=menuitem]', m);
  btn.addEventListener('click', () => (S.menu ? closeMenu() : openMenu()));
  btn.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { e.preventDefault(); openMenu(); } });
  m.addEventListener('click', e => { const b = e.target.closest('[role=menuitem]'); if (!b) return; closeMenu(false); MENU[b.dataset.i].run(); });
  m.addEventListener('keydown', e => {
    const list = items(), i = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); list[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); list[list.length - 1].focus(); }
    else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); closeMenu(); }
  });
  document.addEventListener('pointerdown', e => { if (S.menu && !e.target.closest('.mb-menuwrap')) closeMenu(false); });
}
function openMenu() {
  const m = $('#goMenu');
  S.menu = true; m.hidden = false; $('#goBtn').setAttribute('aria-expanded', 'true');
  spring('menu', { from: 0, to: 1, k: 420, c: 32, onUpdate: t => { m.style.opacity = String(clamp(t * 1.4)); m.style.transform = `translateY(${(1 - t) * -6}px) scale(${0.98 + 0.02 * t})`; } });
  $('[role=menuitem]', m).focus();
}
function closeMenu(refocus = true) {
  if (!S.menu) return;
  S.menu = false; $('#goMenu').hidden = true; $('#goBtn').setAttribute('aria-expanded', 'false');
  if (refocus) $('#goBtn').focus();
}

/* ------------------------------------------------------------------ command bar (real navigation over apps, screens and roles) */
const ENTRIES = [];
function buildIndex() {
  APPS.forEach(a => ENTRIES.push({ g: 'Apps', label: a.title, sub: a.space ? 'L//IOS space' : 'Work space', icon: a.id, kw: a.kw, run: () => openApp(a.id) }));
  ['analyst', 'markets'].forEach(id => PILLARS[id].screens.forEach((s, i) => ENTRIES.push({ g: 'Screens', label: `${s.label}`, sub: PILLARS[id].name, icon: id, kw: `${s.alt} ${id}`, run: async () => { await openApp(id); WIN[id].select(i); } })));
  PILLARS.health.screens.forEach((s, i) => ENTRIES.push({ g: 'Screens', label: s.label, sub: 'L//IOS Health', icon: 'health', kw: `${s.alt} health`, run: async () => { await openApp('health'); WIN.health.go(i); } }));
  CAREER.slice().reverse().forEach(r => ENTRIES.push({ g: 'Career', label: r.t, sub: r.d, icon: 'career', kw: r.s, run: async () => { await openApp('career'); WIN.career.select(CAREER.indexOf(r)); } }));
  [['In the role', 'about-role', 'responsibilities offshore team validation automation'], ['Education', 'about-edu', 'laurier bba accounting hackeryou']].forEach(([l, anchor, kw]) => ENTRIES.push({ g: 'Sections', label: l, sub: 'About', icon: 'about', kw, run: async () => { await openApp('about'); document.getElementById(anchor).scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); } }));
  ENTRIES.push(
    { g: 'Actions', label: 'Overview', sub: 'See every open window', icon: 'overview', kw: 'windows mission exposé', run: () => enterOverview(), desk: true },
    { g: 'Actions', label: 'Go to the Work space', sub: 'Space 1', icon: 'mark', kw: 'switch', run: () => goSpace(0) },
    { g: 'Actions', label: 'Go to the L//IOS space', sub: 'Space 2', icon: 'mark', kw: 'switch lios', run: () => goSpace(1) },
    { g: 'Actions', label: 'Email Ryan', sub: 'ryanlaw@live.com', icon: 'contact', kw: 'mail contact', href: 'mailto:ryanlaw@live.com' },
    { g: 'Actions', label: 'Open LinkedIn', sub: 'linkedin.com', icon: 'web', kw: 'profile', href: 'https://www.linkedin.com/in/ryan-law-92a629104/' },
    { g: 'Actions', label: 'Try the Intelligence Lab', sub: 'A browser version of Analyst', icon: 'lab', kw: 'demo lios analyst live', href: 'https://lawryan.github.io/#lab' },
    { g: 'Actions', label: 'L//IOS product page', sub: 'lawryan.github.io/lios', icon: 'web', kw: 'lios product', href: 'https://lawryan.github.io/lios/' },
  );
}
let cmdSel = 0, cmdShown = [], cmdReturn = null;
function cmdFilter(q) {
  q = q.trim().toLowerCase();
  const toks = q.split(/\s+/).filter(Boolean);
  let list = ENTRIES.filter(e => !(isMobile && e.desk));
  if (toks.length) {
    list = list.map(e => {
      const hay = `${e.label} ${e.sub} ${e.kw} ${e.g}`.toLowerCase();
      if (!toks.every(t => hay.includes(t))) return null;
      const lab = e.label.toLowerCase();
      return { e, score: (lab.startsWith(q) ? 0 : lab.includes(q) ? 1 : 2) + (e.g === 'Apps' ? -0.5 : 0) };
    }).filter(Boolean).sort((a, b) => a.score - b.score).map(x => x.e);
  } else list = list.filter(e => e.g === 'Apps' || e.g === 'Actions');
  return list.slice(0, 40);
}
function cmdRender() {
  const list = $('#cmdList');
  cmdShown = cmdFilter($('#cmdInput').value);
  cmdSel = clamp(cmdSel, 0, Math.max(0, cmdShown.length - 1));
  if (!cmdShown.length) { list.innerHTML = '<li class="cmd-none" role="presentation">Nothing matches. Try an app name, a screen such as “Quality”, or a role.</li>'; $('#cmdInput').removeAttribute('aria-activedescendant'); return; }
  let g = '', html = '';
  cmdShown.forEach((e, i) => {
    if (e.g !== g) { g = e.g; html += `<li class="cmd-g" role="presentation">${g}</li>`; }
    const lios = ['analyst', 'markets', 'health'].includes(e.icon) || /L\/\/IOS/.test(e.label);
    html += `<li role="option" id="opt-${i}" aria-selected="${i === cmdSel}" data-i="${i}"><span class="ico ico--xs ${lios ? 'ico--lios' : ''}">${svg(e.icon)}</span><span class="o-l">${e.label}</span><span class="o-s">${e.sub}</span>${e.href ? '<span class="o-k">Link</span>' : ''}</li>`;
  });
  list.innerHTML = html;
  $('#cmdInput').setAttribute('aria-activedescendant', `opt-${cmdSel}`);
}
function cmdMove(n) {
  if (!cmdShown.length) return;
  cmdSel = (cmdSel + n + cmdShown.length) % cmdShown.length;
  $$('#cmdList [role=option]').forEach(o => o.setAttribute('aria-selected', String(Number(o.dataset.i) === cmdSel)));
  $('#cmdInput').setAttribute('aria-activedescendant', `opt-${cmdSel}`);
  $(`#opt-${cmdSel}`)?.scrollIntoView({ block: 'nearest' });
}
function cmdRun(i) {
  const e = cmdShown[i];
  if (!e) return;
  closeCmd(false);
  if (e.href) { if (e.href.startsWith('mailto:')) location.href = e.href; else window.open(e.href, '_blank', 'noopener'); return; }
  e.run();
}
function openCmd() {
  if (S.cmd) return;
  if (S.locked && !isMobile) { unlock().then(openCmd); return; }
  closeMenu(false);
  cmdReturn = document.activeElement;
  S.cmd = true;
  const c = $('#cmd'), panel = $('.cmd-panel');
  c.hidden = false;
  $('#cmdInput').value = ''; cmdSel = 0; cmdRender();
  $('#cmdInput').focus();
  spring('cmd', { from: 0, to: 1, k: 380, c: 30, onUpdate: t => { panel.style.opacity = String(clamp(t * 1.3)); panel.style.transform = `translateY(${(1 - t) * -10}px) scale(${0.97 + 0.03 * t})`; $('.cmd-scrim').style.opacity = String(clamp(t)); } });
}
function closeCmd(refocus = true) {
  if (!S.cmd) return;
  S.cmd = false;
  $('#cmd').hidden = true;
  if (refocus && cmdReturn && document.contains(cmdReturn)) cmdReturn.focus();
}
function initCmd() {
  buildIndex();
  const input = $('#cmdInput');
  input.addEventListener('input', () => { cmdSel = 0; cmdRender(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); cmdMove(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cmdMove(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); cmdRun(cmdSel); }
    else if (e.key === 'Escape') { e.preventDefault(); closeCmd(); }
    else if (e.key === 'Tab') { e.preventDefault(); }
  });
  $('#cmdList').addEventListener('click', e => { const o = e.target.closest('[role=option]'); if (o) cmdRun(Number(o.dataset.i)); });
  $('#cmdList').addEventListener('pointermove', e => { const o = e.target.closest('[role=option]'); if (o && Number(o.dataset.i) !== cmdSel) cmdMove(Number(o.dataset.i) - cmdSel); });
  $$('#cmd [data-close]').forEach(b => b.addEventListener('click', () => closeCmd()));
  $('#cmdBtn').addEventListener('click', openCmd);
}

/* ------------------------------------------------------------------ lock screen and the opening sequence */
let autoT = 0;
function initLock() {
  const lock = $('#lock'), surf = $('#lockSurface');
  if (isMobile) $('.lock-hint').textContent = 'Swipe up to open';
  // The name opens its width axis once, as the screen wakes.
  const name = $('#lockName');
  spring('name', { from: 0, to: 1, k: 60, c: 14, onUpdate: t => { name.style.fontVariationSettings = `"wdth" ${(78 + 47 * clamp(t, 0, 1.08)).toFixed(1)}`; name.style.opacity = String(clamp(t * 2)); } });
  $('#unlockBtn').addEventListener('click', () => unlock());
  surf.addEventListener('pointerdown', e => {
    if (e.button || !S.locked) return;
    stop('lock');
    const y0 = e.clientY;
    let ly = y0, lt = performance.now(), v = 0, moved = false;
    const move = ev => {
      const dy = Math.min(0, ev.clientY - y0);
      if (!moved && Math.abs(dy) > 4) { moved = true; try { surf.setPointerCapture(e.pointerId); } catch { /* pointer gone */ } }
      setLift(-dy / innerHeight);
      const now = performance.now(); v = lerp(v, (ev.clientY - ly) / Math.max(8, now - lt), 0.5); ly = ev.clientY; lt = now;
    };
    const up = ev => {
      surf.removeEventListener('pointermove', move); surf.removeEventListener('pointerup', up); surf.removeEventListener('pointercancel', up);
      if (!moved) return;
      const frac = -Math.min(0, ev.clientY - y0) / innerHeight;
      if (frac > 0.16 || v < -0.45) unlock(-v * 1000 / innerHeight);
      else spring('lock', { from: S.lift || 0, to: 0, k: 260, c: 26, onUpdate: setLift });
    };
    surf.addEventListener('pointermove', move); surf.addEventListener('pointerup', up); surf.addEventListener('pointercancel', up);
  });
  // A visitor who does nothing still gets the desktop, with About and Results open.
  if (!params.has('still')) {
    const arm = () => { clearTimeout(autoT); autoT = setTimeout(() => S.locked && unlock(), 8500); };
    arm();
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => { if (S.locked) arm(); }, { passive: true }));
  }
  lock.inert = false;
}
function setLift(f) {
  S.lift = f;
  const surf = $('#lockSurface');
  surf.style.transform = `translate3d(0,${(-f * 100).toFixed(3)}%,0)`;
  $('.lock-main').style.transform = `translate3d(0,${(f * 18).toFixed(2)}vh,0)`;
  root.style.setProperty('--u', clamp(f * 1.3).toFixed(4));
}
let unlocking = null;
function unlock(v = 0) {
  if (!S.locked) return Promise.resolve();
  if (unlocking) return unlocking;
  clearTimeout(autoT);
  unlocking = (async () => {
    body.classList.add('is-unlocking');
    const lift = spring('lock', { from: S.lift || 0, to: 1, v: Math.max(v, 0.6), k: 120, c: 20, onUpdate: setLift });
    if (isMobile) { await mAssemble(); } else await assemble();
    await lift;
    S.locked = false;
    body.classList.remove('is-locked', 'is-unlocking');
    $('#lock').hidden = true;
    unlocking = null;
  })();
  return unlocking;
}
async function assemble() {
  const mb = $('#menubar'), dock = $('#dock');
  settleSpace(0);
  await wait(90);
  spring('mb', { from: -1, to: 0, k: 240, c: 26, onUpdate: t => { mb.style.transform = `translateY(${(t * 110).toFixed(2)}%)`; } });
  await wait(70);
  spring('dock', { from: 1, to: 0, k: 200, c: 22, onUpdate: t => { dock.style.transform = `translate(-50%, ${(t * 140).toFixed(2)}%)`; } });
  const seq = ['career', 'results', 'about'];
  for (const [i, id] of seq.entries()) {
    const w = WIN[id];
    w.el.hidden = false; w.state = 'open';
    const s = 0.9;
    [w.tx, w.ty, w.s, w.o] = [w.w * (1 - s) / 2, w.h * (1 - s) / 2 + 60 - i * 8, s, 0];
    render(w); focusWin(w); setRunning(w);
    animWin(w, [0, 0, 1, 1], { k: 150 + i * 20, c: 20 + i });
    if (!w.opened) { w.opened = true; w.onFirstOpen && w.onFirstOpen(); }
    await wait(110);
  }
  WIN.about.el.focus({ preventScroll: true });
  live('Desktop ready. About, Results and Career are open.');
}

/* ------------------------------------------------------------------ keyboard */
function initKeys() {
  addEventListener('keydown', e => {
    const typing = e.target.closest && e.target.closest('input, textarea, [contenteditable]');
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); S.cmd ? closeCmd() : openCmd(); return; }
    if (S.cmd) return;
    if (S.locked) {
      if ((e.key === 'Enter' || e.key === ' ') && (e.target === body || e.target.closest('#lock'))) { e.preventDefault(); unlock(); }
      else if (e.key === 'ArrowUp' && !e.target.closest('a,button:not(#unlockBtn)')) { e.preventDefault(); unlock(); }
      return;
    }
    if (e.key === '/' && !typing) { e.preventDefault(); openCmd(); return; }
    if (e.key === 'Escape') {
      if (S.menu) { closeMenu(); return; }
      if (S.overview) { exitOverview(); return; }
      if (isMobile && mCurrent) { mClose(); return; }
    }
    if (isMobile) return;
    if (e.key === 'F3' || (e.ctrlKey && e.key === 'ArrowUp')) { e.preventDefault(); toggleOverview(); return; }
    if (e.ctrlKey && e.key === 'ArrowDown' && S.overview) { e.preventDefault(); exitOverview(); return; }
    if (e.ctrlKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); goSpace(S.space + (e.key === 'ArrowRight' ? 1 : -1)); return; }
    if (S.overview && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const tiles = $$('.ov-tile'), i = tiles.indexOf(document.activeElement);
      if (tiles.length) { e.preventDefault(); tiles[(i + (e.key === 'ArrowRight' ? 1 : -1) + tiles.length) % tiles.length].focus(); }
    }
  });
  $('#ovBtn').addEventListener('click', toggleOverview);
  $$('.ov-spaces button').forEach(b => b.addEventListener('click', async () => { await exitOverview(); goSpace(Number(b.dataset.space)); }));
  $('#overview').addEventListener('click', e => { if (e.target.id === 'overview' || e.target.id === 'ovTiles') exitOverview(); });
  $('#skip').addEventListener('click', async e => { e.preventDefault(); await openApp('about'); const h = isMobile ? $('#t-about') : WIN.about.el; h.setAttribute('tabindex', '-1'); h.focus(); });
  document.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) { e.preventDefault(); openApp(b.dataset.open, { from: b }); } });
  $('#copyEmail').addEventListener('click', async e => {
    const lab = $('span', e.currentTarget);
    try { await navigator.clipboard.writeText('ryanlaw@live.com'); lab.textContent = 'Copied'; live('Email address copied'); }
    catch { lab.textContent = 'Select and copy'; }
    setTimeout(() => { lab.textContent = 'Copy'; }, 2000);
  });
}

/* ------------------------------------------------------------------ phone: home screens, zoom-from-icon apps */
let mCurrent = null;
function initMobile() {
  body.classList.add('is-m');
  const layer = $('#appLayer');
  Object.values(WIN).forEach(w => { layer.appendChild(w.el); });
  const grids = $$('.grid', $('#home'));
  const icon = a => `<li><button type="button" class="m-icon" data-app="${a.id}"><span class="ico ${a.space ? 'ico--lios' : ''}">${svg(a.id)}</span><span class="m-label">${a.short || a.title}</span></button></li>`;
  grids[0].innerHTML = APPS.filter(a => !a.space).map(icon).join('');
  grids[1].innerHTML = APPS.filter(a => a.space).map(icon).join('') +
    `<li><a class="m-icon" href="https://lawryan.github.io/#lab"><span class="ico ico--lios ico--link">${svg('lab')}</span><span class="m-label">Lab</span></a></li>
     <li><a class="m-icon" href="https://lawryan.github.io/lios/"><span class="ico ico--lios ico--link">${svg('web')}</span><span class="m-label">L//IOS site</span></a></li>`;
  $$('.m-icon[data-app]').forEach(b => b.addEventListener('click', () => mOpen(b.dataset.app, b)));
  const pages = $('#pages');
  pages.addEventListener('scroll', () => {
    const p = clamp(pages.scrollLeft / Math.max(1, pages.clientWidth));
    setP(p);
    const i = Math.round(p);
    if (i !== S.space) {
      S.space = i; root.dataset.env = i ? 'lios' : 'work';
      $('meta[name=theme-color]').content = i ? '#1B1640' : '#C9D2D7';
      $$('.dots button').forEach(d => d.toggleAttribute('aria-current', Number(d.dataset.page) === i));
      $$('.page').forEach((pg, j) => { pg.inert = j !== i; });
    }
  }, { passive: true });
  $$('.page')[1].inert = true;
  $$('.dots button').forEach(d => d.addEventListener('click', () => mPage(Number(d.dataset.page))));
  $('#mSearch').addEventListener('click', openCmd);
  Object.values(WIN).forEach(w => {
    $('.win-back', w.el).addEventListener('click', () => mClose());
    // swipe down from the app header closes it
    const bar = $('.win-bar', w.el);
    bar.addEventListener('pointerdown', e => {
      if (e.target.closest('button, [role=tab]') || mCurrent !== w) return;
      const y0 = e.clientY; let ly = y0, lt = performance.now(), v = 0;
      bar.setPointerCapture(e.pointerId);
      const move = ev => { const dy = Math.max(0, ev.clientY - y0); w.drag = dy; mDragRender(w); const now = performance.now(); v = (ev.clientY - ly) / Math.max(8, now - lt); ly = ev.clientY; lt = now; };
      const up = () => {
        bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); bar.removeEventListener('pointercancel', up);
        if ((w.drag || 0) > 110 || v > 0.6) mClose();
        else spring(`mdrag-${w.id}`, { from: w.drag || 0, to: 0, k: 300, c: 28, onUpdate: d => { w.drag = d; mDragRender(w); } });
      };
      bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
    });
  });
}
function mDragRender(w) {
  const d = w.drag || 0, H = innerHeight;
  w.el.style.transform = `translate3d(0,${d}px,0) scale(${1 - (d / H) * 0.18})`;
  w.el.style.borderRadius = `${Math.min(36, d / 3)}px`;
}
function mPage(i) {
  const pages = $('#pages');
  const from = pages.scrollLeft, to = i * pages.clientWidth;
  pages.classList.add('is-driven');
  return spring('mpage', { from, to, k: 90, c: 19, onUpdate: x => { pages.scrollLeft = x; }, onDone: () => pages.classList.remove('is-driven') });
}
function mIconFor(id) { return $(`.m-icon[data-app="${id}"]`); }
function mClipFrom(r) { const W = innerWidth, H = innerHeight; return [r.top, W - r.right, H - r.bottom, r.left]; }
function mApply(w, t, ins, rad) {
  const i = ins.map(v => v * (1 - t));
  w.el.style.clipPath = `inset(${i[0].toFixed(1)}px ${i[1].toFixed(1)}px ${i[2].toFixed(1)}px ${i[3].toFixed(1)}px round ${lerp(rad, 0, clamp(t)).toFixed(1)}px)`;
  const inner = w.el;
  inner.style.setProperty('--zoom', clamp(t, 0, 1.05).toFixed(4));
  $('#home').style.transform = `scale(${1 - 0.07 * clamp(t)})`;
  $('#home').style.opacity = String(1 - 0.6 * clamp(t));
}
async function mOpen(id, fromEl) {
  if (S.cmd) closeCmd(false);
  if (S.locked) await unlock();
  const w = WIN[id];
  if (mCurrent && mCurrent !== w) await mClose(true);
  const icon = mIconFor(id);
  const onPage = icon && w.app.space === S.space;
  const from = fromEl && document.contains(fromEl) && fromEl.offsetParent ? fromEl : onPage ? icon : $('#mSearch');
  const r = (from.querySelector('.ico') || from).getBoundingClientRect();
  w.ins = mClipFrom(r);
  w.el.hidden = false; w.drag = 0; w.el.style.transform = ''; w.el.style.borderRadius = '';
  mCurrent = w;
  w.el.scrollTop = 0; $('.win-body', w.el).scrollTop = 0;
  $('#home').inert = true;
  body.classList.add('has-app');
  w.placeThumb && w.placeThumb();
  live(`${w.app.title} opened`);
  await spring(`m-${id}`, { from: 0, to: 1, k: 190, c: 24, onUpdate: t => mApply(w, t, w.ins, 16) });
  w.placeThumb && w.placeThumb();
  $('.win-back', w.el).focus({ preventScroll: true });
  if (!w.opened) { w.opened = true; w.onFirstOpen && w.onFirstOpen(); }
}
async function mClose(quick) {
  const w = mCurrent;
  if (!w) return;
  mCurrent = null;
  const icon = mIconFor(w.id);
  const r = icon && icon.offsetParent && Math.abs(icon.getBoundingClientRect().left) < innerWidth ? $('.ico', icon).getBoundingClientRect() : null;
  const ins = r ? mClipFrom(r) : [innerHeight * 0.4, innerWidth * 0.3, innerHeight * 0.4, innerWidth * 0.3];
  const d0 = w.drag || 0;
  $('#home').inert = false;
  body.classList.remove('has-app');
  live(`${w.app.title} closed`);
  await spring(`m-${w.id}`, {
    from: 1, to: 0, k: quick ? 400 : 230, c: quick ? 40 : 28, onUpdate: t => {
      mApply(w, t, ins, 16);
      w.drag = d0 * t; mDragRender(w);
    },
  });
  w.el.hidden = true; w.el.style.transform = ''; w.el.style.borderRadius = '';
  if (icon) icon.focus({ preventScroll: true });
}
async function mAssemble() {
  const home = $('#home');
  home.hidden = false;
  const icons = $$('.page:first-child .widget, .page:first-child .m-icon, .home-foot');
  icons.forEach(el => { el.style.opacity = '0'; });
  await wait(120);
  icons.forEach((el, i) => {
    setTimeout(() => spring(`mi-${i}`, { from: 0, to: 1, k: 200, c: 20, onUpdate: t => { el.style.opacity = String(clamp(t * 1.5)); el.style.transform = `translateY(${(1 - t) * 26}px) scale(${0.92 + 0.08 * t})`; } }), reduced() ? 0 : i * 55);
  });
  await wait(300);
}

/* ------------------------------------------------------------------ boot */
initWindows();
if (!isMobile) { initDock(); initMenu(); initSpaceGestures(); }
initCmd();
initKeys();
if (isMobile) initMobile();
setP(0);
settleSpace(0);
initLock();
// test hook for the capture scripts (no effect on visitors)
window.__os = { anims, raf: () => rafId, openApp, goSpace, enterOverview, exitOverview, openCmd, closeCmd, unlock, mClose, state: S };
