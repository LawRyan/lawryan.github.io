/**
 * Chapter 03: three small tools that actually work. Everything runs in the browser; nothing is sent anywhere.
 * The sample data is synthetic (a made-up club sign-up sheet and a made-up coffee roaster's year).
 */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const SAMPLE = `name,email,joined,city,level,games
Maya Chen,maya.chen@example.com,2026-03-04,Toronto,Intermediate,24
 jordan ortiz,J.Ortiz@Example.com,04/03/2026,toronto,beginner,6
Priya Nair,priya.n@example.com,Mar 6 2026,Mississauga,Advanced,31
Sam Okafor,,2026-03-07,Toronto ,Intermediate,18
Lena Fischer,lena.f@example.com,2026-03-09,Oakville,advnced,27
Tom Brady-Ng,tom.bn@example.com,11/03/2026,TORONTO,Beginner,4
Ana Souza,ana.souza@example.com,2026-03-12,Mississauga,Intermediate,400
maya chen,maya.chen@example.com,2026-03-04,Toronto,Intermediate,24
Kofi Mensah,kofi.m@example.com,Mar 14 2026,Brampton,Intermediate,15
Hiro Tanaka,hiro.t@example.com,2026-03-15,Toronto,Advanced,36
Grace Liu,,15/03/2026,oakville,Beginner,3
Dev Patel,dev.patel@example.com,2026-03-18,Brampton,intermediate,21
Chloe Martin,chloe.m@example.com,2026-03-20,Toronto,Beginer,9
Omar Haddad,omar.h@example.com,2026-03-21,Mississauga,Advanced,29`;

// ── shared parsing and profiling
export function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; continue; }
    if (c === '"') q = true; else if (c === ',' || c === '\t') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(v => v.trim())) rows.push(row); row = []; }
    else cur += c;
  }
  row.push(cur); if (row.some(v => v.trim())) rows.push(row);
  const head = (rows.shift() || []).map((h, i) => h.trim() || `column ${i + 1}`);
  return { head, rows: rows.slice(0, 500).map(r => head.map((_, i) => r[i] ?? '')) };
}
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
export function dateOf(v) {
  let m;
  if ((m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return { f: 'yyyy-mm-dd', d: [+m[1], +m[2], +m[3]] };
  if ((m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return { f: 'dd/mm/yyyy', d: [+m[3], +m[2], +m[1]] };
  if ((m = v.match(/^([A-Za-z]{3})[a-z]* (\d{1,2}),? (\d{4})$/)) && MON[m[1].toLowerCase()]) return { f: 'Mon d yyyy', d: [+m[3], MON[m[1].toLowerCase()], +m[2]] };
  return null;
}
const isEmail = v => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
const isNum = v => /^-?\d+(\.\d+)?$/.test(v.replace(/,/g, ''));
const norm = v => v.trim().toLowerCase().replace(/\s+/g, ' ');
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const titleCase = v => v.trim().replace(/\s+/g, ' ').toLowerCase().replace(/(^|[\s-])\p{L}/gu, c => c.toUpperCase());

export function profile({ head, rows }) {
  const cols = head.map((name, c) => {
    const vals = rows.map(r => r[c] ?? ''), filled = vals.filter(v => v.trim());
    const kinds = { email: 0, date: 0, number: 0, text: 0 };
    filled.forEach(v => { const t = v.trim(); kinds[isEmail(t) ? 'email' : dateOf(t) ? 'date' : isNum(t) ? 'number' : 'text']++; });
    const type = Object.entries(kinds).sort((a, b) => b[1] - a[1])[0][0];
    const cell = vals.map(v => ({ blank: !v.trim(), odd: false, why: '' }));
    const findings = [];
    const blanks = cell.filter(x => x.blank).length;
    if (blanks) findings.push({ w: 3, t: `<b>${esc(name)}</b> is blank in ${blanks} of ${rows.length} rows.` });
    const spaced = vals.filter(v => v && v !== v.trim()).length;
    if (spaced) { vals.forEach((v, i) => { if (v && v !== v.trim()) Object.assign(cell[i], { odd: true, why: 'stray spaces' }); }); findings.push({ w: 1, t: `<b>${esc(name)}</b> has ${spaced} value${spaced > 1 ? 's' : ''} with stray spaces.` }); }
    if (type === 'date') {
      const fm = {}; vals.forEach((v, i) => { const d = dateOf(v.trim()); if (d) { fm[d.f] = (fm[d.f] || 0) + 1; cell[i].fmt = d.f; } });
      const fs = Object.entries(fm).sort((a, b) => b[1] - a[1]);
      if (fs.length > 1) { vals.forEach((v, i) => { if (cell[i].fmt && cell[i].fmt !== fs[0][0]) Object.assign(cell[i], { odd: true, why: 'date format' }); }); findings.push({ w: 2, t: `<b>${esc(name)}</b> mixes ${fs.length} date formats: ${fs.map(([f, n]) => `${n}× <code>${f}</code>`).join(', ')}.` }); }
    }
    if (type === 'email') {
      const up = vals.filter(v => v.trim() && v.trim() !== v.trim().toLowerCase()).length;
      if (up) { vals.forEach((v, i) => { if (v.trim() && v.trim() !== v.trim().toLowerCase()) Object.assign(cell[i], { odd: true, why: 'capitals in email' }); }); findings.push({ w: 1, t: `<b>${esc(name)}</b> has ${up} address${up > 1 ? 'es' : ''} with capitals, so the same person can look like two.` }); }
    }
    if (type === 'number') {
      const ns = vals.map(v => parseFloat(v.replace(/,/g, ''))).filter(n => !isNaN(n)).sort((a, b) => a - b);
      const qa = ns[Math.floor(ns.length * .25)], qb = ns[Math.floor(ns.length * .75)], iqr = qb - qa;
      vals.forEach((v, i) => { const n = parseFloat(v.replace(/,/g, '')); if (!isNaN(n) && iqr > 0 && (n > qb + 3 * iqr || n < qa - 3 * iqr)) { Object.assign(cell[i], { odd: true, why: 'far outside the rest' }); findings.push({ w: 3, t: `<b>${esc(name)}</b> = ${esc(v.trim())} in row ${i + 1} is far outside the rest (most values sit between ${qa} and ${qb}).` }); } });
    }
    if (type === 'text') {
      const groups = {}; vals.forEach((v, i) => { if (!v.trim()) return; const k = norm(v); (groups[k] ||= { forms: new Set(), n: 0, rows: [] }); groups[k].forms.add(v); groups[k].n++; groups[k].rows.push(i); });
      const keys = Object.keys(groups);
      if (keys.length <= Math.max(8, rows.length * .5)) {
        keys.forEach(k => { const g = groups[k]; if (g.forms.size > 1 && keys.length < rows.length * .6) { findings.push({ w: 1, t: `<b>${esc(name)}</b>: “${esc(titleCase(k))}” is written ${g.forms.size} different ways.` }); g.rows.forEach(i => { if (vals[i] !== titleCase(vals[i])) Object.assign(cell[i], { odd: true, why: 'spelling varies' }); }); } });
        keys.forEach(k => { const g = groups[k]; if (g.n > 1) return; const near = keys.filter(o => o !== k && groups[o].n > 1 && lev(o, k) <= 2); if (near.length) { findings.push({ w: 2, t: `<b>${esc(name)}</b>: “${esc(vals[g.rows[0]].trim())}” in row ${g.rows[0] + 1} looks like a typo for “${esc(titleCase(near[0]))}”.` }); Object.assign(cell[g.rows[0]], { odd: true, why: 'likely typo', fix: titleCase(near[0]) }); } });
      }
    }
    return { name, type, cell, findings, distinct: new Set(filled.map(norm)).size };
  });
  // duplicates: same email, or the same row once spacing and case are ignored
  const emailCol = cols.findIndex(c => c.type === 'email'), seen = {}, dups = [];
  rows.forEach((r, i) => { const key = emailCol >= 0 && r[emailCol].trim() ? norm(r[emailCol]) : r.map(norm).join('|'); if (key in seen) dups.push([seen[key], i]); else seen[key] = i; });
  const findings = cols.flatMap(c => c.findings);
  dups.forEach(([a, b]) => findings.push({ w: 3, t: `Rows ${a + 1} and ${b + 1} look like the same entry${emailCol >= 0 ? ' (same email)' : ''}.` }));
  findings.sort((a, b) => b.w - a.w);
  return { head, rows, cols, dups, findings, emailCol };
}

// ── 03.1 Untangle: profile any pasted list
export function untangle(root, shared) {
  const ta = root.querySelector('textarea'), out = root.querySelector('.ut-out'), sum = root.querySelector('.ut-sum');
  function run() {
    const P = profile(parseCSV(ta.value)); shared.P = P; shared.changed?.();
    if (!P.rows.length) { sum.textContent = 'Paste a few rows with a header line to see what’s in them.'; out.innerHTML = ''; return; }
    sum.innerHTML = `<b>${P.rows.length} rows · ${P.head.length} columns</b> · ${P.findings.length ? `${P.findings.length} thing${P.findings.length > 1 ? 's' : ''} worth a look` : 'nothing looks wrong'}`;
    const strips = P.cols.map(c => `<div class="strip"><span class="sn">${esc(c.name)}</span><span class="st">${c.type}</span><span class="sc">${c.cell.map((x, i) => `<i class="${x.blank ? 'b' : x.odd ? 'o' : ''}" title="row ${i + 1}${x.blank ? ': blank' : x.odd ? ': ' + x.why : ''}"></i>`).join('')}</span></div>`).join('');
    out.innerHTML = `<div class="strips" aria-hidden="true">${strips}<p class="key"><i></i> fine <i class="o"></i> worth a look <i class="b"></i> blank</p></div><ol class="finds">${P.findings.slice(0, 9).map(f => `<li>${f.t}</li>`).join('')}</ol>`;
  }
  ta.value = SAMPLE;
  let t; ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 200); });
  root.querySelector('[data-act=reset]').addEventListener('click', () => { ta.value = SAMPLE; run(); });
  root.querySelector('[data-act=clear]').addEventListener('click', () => { ta.value = ''; ta.focus(); run(); });
  run();
}

// ── 03.2 Rule it: write each fix once, run it on every row
const RULES = [
  { id: 'trim', t: 'Trim stray spaces' },
  { id: 'case', t: 'One spelling per value' },
  { id: 'email', t: 'Lowercase emails' },
  { id: 'date', t: 'One date format' },
  { id: 'typo', t: 'Fix likely typos' },
  { id: 'dup', t: 'Merge duplicates' },
  { id: 'hold', t: 'Hold rows with no email' },
];
export function ruleIt(root, shared) {
  const chips = root.querySelector('.chips'), out = root.querySelector('.ri-out'), meter = root.querySelector('.ri-meter');
  const on = new Set(RULES.map(r => r.id));
  chips.innerHTML = RULES.map(r => `<button type="button" aria-pressed="true" data-r="${r.id}">${r.t}</button>`).join('');
  chips.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const id = b.dataset.r; on.has(id) ? on.delete(id) : on.add(id); b.setAttribute('aria-pressed', on.has(id)); run(); });
  function run() {
    const P = shared.P; if (!P || !P.rows.length) { out.innerHTML = ''; meter.textContent = ''; return; }
    let fixes = 0; const held = new Set(), gone = new Set();
    const rows = P.rows.map((r, i) => r.map((v, c) => {
      const col = P.cols[c], cell = col.cell[i]; let nv = v;
      if (on.has('trim')) nv = nv.trim().replace(/\s+/g, ' ');
      if (nv.trim()) {
        if (on.has('case') && col.type === 'text' && col.distinct < P.rows.length * .9 || on.has('case') && /name/i.test(col.name)) nv = titleCase(nv);
        if (on.has('email') && col.type === 'email') nv = nv.trim().toLowerCase();
        if (on.has('date') && col.type === 'date') { const d = dateOf(nv.trim()); if (d) nv = d.d.map((x, k) => k ? String(x).padStart(2, '0') : x).join('-'); }
        if (on.has('typo') && cell.fix) nv = cell.fix;
      }
      if (nv !== v) fixes++;
      return { v: nv, was: v, ch: nv !== v };
    }));
    if (on.has('dup')) P.dups.forEach(([, b]) => { gone.add(b); fixes++; });
    if (on.has('hold') && P.emailCol >= 0) rows.forEach((r, i) => { if (!r[P.emailCol].v.trim() && !gone.has(i)) held.add(i); });
    const vis = rows.map((r, i) => [r, i]).filter(([, i]) => !gone.has(i));
    out.innerHTML = `<table class="rt"><thead><tr><th scope="col">#</th>${P.head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${vis.map(([r, i]) => `<tr${held.has(i) ? ' class="held"' : ''}><td>${i + 1}${held.has(i) ? ' <span class="hb">held</span>' : ''}</td>${r.map(x => `<td>${x.ch ? `<mark title="was: ${esc(x.was) || '(blank)'}">${esc(x.v) || '—'}</mark>` : esc(x.v) || '<span class="bl">blank</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const mins = Math.max(1, Math.round(fixes * 10 / 60));
    meter.innerHTML = `<b>${fixes}</b> fixes${gone.size ? `, ${gone.size} duplicate${gone.size > 1 ? 's' : ''} merged` : ''} · <b>${held.size}</b> row${held.size === 1 ? '' : 's'} held for a person · by hand, at an assumed 10 seconds a fix: about ${mins} min. With rules: instant, and the same every time.`;
  }
  shared.changed = run; run();
}

// ── 03.3 Ask the table: a question picks the chart, code computes the answer
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DATA = {   // cups sold per month, a made-up coffee roaster
  Espresso: [412, 405, 421, 430, 418, 426, 433, 429, 424, 252, 431, 447],
  Filter: [388, 381, 372, 366, 352, 341, 333, 328, 321, 315, 309, 302],
  'Cold brew': [62, 70, 104, 168, 286, 402, 497, 471, 318, 176, 92, 74],
};
const COL = { Espresso: 'var(--ink)', Filter: 'var(--silver-d)', 'Cold brew': 'var(--accent)' };
const fmt = n => Math.round(n).toLocaleString('en-CA');
function slope(ys) { const n = ys.length, mx = (n - 1) / 2, my = ys.reduce((a, b) => a + b) / n; let s = 0, d = 0; ys.forEach((y, x) => { s += (x - mx) * (y - my); d += (x - mx) ** 2; }); return { b: s / d, a: my - s / d * mx }; }
const QUESTIONS = [
  { q: 'Which month was busiest?', run(w, h) {
    const tot = MONTHS.map((_, i) => Object.values(DATA).reduce((a, s) => a + s[i], 0)), max = Math.max(...tot), bi = tot.indexOf(max), avg = tot.reduce((a, b) => a + b) / 12;
    const bw = w / 12, sy = v => h - 22 - v / (max * 1.08) * (h - 40);
    const svg = tot.map((v, i) => `<rect class="grow" style="--d:${i * 40}ms" x="${(i * bw + bw * .18).toFixed(1)}" y="${sy(v).toFixed(1)}" width="${(bw * .64).toFixed(1)}" height="${(h - 22 - sy(v)).toFixed(1)}" fill="${i === bi ? 'var(--accent)' : 'var(--ink)'}" opacity="${i === bi ? 1 : .8}"/><text x="${(i * bw + bw / 2).toFixed(1)}" y="${h - 6}" text-anchor="middle">${MONTHS[i]}</text>`).join('')
      + `<path class="avg" d="M0,${sy(avg).toFixed(1)}H${w}"/><text class="lbl" x="${w}" y="${(sy(avg) - 6).toFixed(1)}" text-anchor="end">monthly average ${fmt(avg)}</text>`;
    return { svg, a: `<b>${MONTHS[bi]}</b> was busiest: ${fmt(max)} cups, ${Math.round((max / avg - 1) * 100)}% above the monthly average of ${fmt(avg)}.` };
  } },
  { q: 'What’s growing, what’s shrinking?', run(w, h) {
    const max = 520, sx = i => 8 + i * (w - 16) / 11, sy = v => h - 22 - v / max * (h - 40);
    const fits = Object.entries(DATA).map(([k, ys]) => [k, slope(ys)]);
    const svg = Object.entries(DATA).map(([k, ys]) => `<path class="draw" pathLength="1" d="M${ys.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join('L')}" stroke="${COL[k]}"/><text class="lbl" x="${sx(11) - 4}" y="${(sy(ys[11]) - 8).toFixed(1)}" text-anchor="end" fill="${COL[k]}">${k}</text>`).join('')
      + fits.map(([k, f]) => `<path class="trend" d="M${sx(0)},${sy(f.a).toFixed(1)}L${sx(11)},${sy(f.a + f.b * 11).toFixed(1)}" stroke="${COL[k]}"/>`).join('')
      + MONTHS.map((m, i) => i % 2 ? '' : `<text x="${sx(i).toFixed(1)}" y="${h - 6}" text-anchor="middle">${m}</text>`).join('');
    const up = [...fits].sort((a, b) => b[1].b - a[1].b)[0], dn = [...fits].sort((a, b) => a[1].b - b[1].b)[0];
    return { svg, a: `On a straight-line trend, <b>${up[0]}</b> grows fastest (${up[1].b > 0 ? '+' : ''}${up[1].b.toFixed(1)} cups a month) and <b>${dn[0]}</b> is shrinking (${dn[1].b.toFixed(1)} a month). Cold brew’s “growth” is really one summer, which the next question shows.` };
  } },
  { q: 'How much does summer matter?', run(w, h) {
    const share = MONTHS.map((_, i) => DATA['Cold brew'][i] / Object.values(DATA).reduce((a, s) => a + s[i], 0));
    const bw = w / 12, sy = v => h - 22 - v / .5 * (h - 40), hi = share.indexOf(Math.max(...share));
    const svg = share.map((v, i) => `<rect class="grow" style="--d:${i * 40}ms" x="${(i * bw + bw * .18).toFixed(1)}" y="${sy(v).toFixed(1)}" width="${(bw * .64).toFixed(1)}" height="${(h - 22 - sy(v)).toFixed(1)}" fill="var(--accent)" opacity="${i === hi ? 1 : .55}"/><text x="${(i * bw + bw / 2).toFixed(1)}" y="${h - 6}" text-anchor="middle">${MONTHS[i]}</text>`).join('')
      + `<text class="lbl" x="${(hi * bw + bw / 2).toFixed(1)}" y="${(sy(share[hi]) - 8).toFixed(1)}" text-anchor="middle">${Math.round(share[hi] * 100)}%</text>`;
    return { svg, a: `Cold brew goes from <b>${Math.round(share[0] * 100)}%</b> of cups in January to <b>${Math.round(share[hi] * 100)}%</b> in ${MONTHS[hi]}. Summer stock and staffing should follow that curve, not the annual average.` };
  } },
  { q: 'Is anything unusual?', run(w, h) {
    const ys = DATA.Espresso, f = slope(ys.filter((_, i) => i !== 9)), res = ys.map((y, i) => y - (f.a + f.b * i));
    const sd = Math.sqrt(res.filter((_, i) => i !== 9).reduce((a, r) => a + r * r, 0) / 10), z = res.map(r => r / sd), oi = z.indexOf(Math.min(...z));
    const max = 520, min = 200, sx = i => 8 + i * (w - 16) / 11, sy = v => h - 22 - (v - min) / (max - min) * (h - 40);
    const band = `M${sx(0)},${sy(f.a + 2 * sd).toFixed(1)}L${sx(11)},${sy(f.a + f.b * 11 + 2 * sd).toFixed(1)}L${sx(11)},${sy(f.a + f.b * 11 - 2 * sd).toFixed(1)}L${sx(0)},${sy(f.a - 2 * sd).toFixed(1)}Z`;
    const svg = `<path class="band" d="${band}"/><path class="draw" pathLength="1" d="M${ys.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join('L')}" stroke="var(--ink)"/>`
      + `<circle cx="${sx(oi).toFixed(1)}" cy="${sy(ys[oi]).toFixed(1)}" r="6" fill="none" stroke="var(--accent)" stroke-width="2"/><text class="lbl" x="${(sx(oi) - 10).toFixed(1)}" y="${(sy(ys[oi]) + 4).toFixed(1)}" text-anchor="end">${MONTHS[oi]}: ${ys[oi]}</text>`
      + MONTHS.map((m, i) => i % 2 ? '' : `<text x="${sx(i).toFixed(1)}" y="${h - 6}" text-anchor="middle">${m}</text>`).join('');
    return { svg, a: `Espresso in <b>${MONTHS[oi]}</b> (${ys[oi]} cups) sits <b>${Math.abs(z[oi]).toFixed(1)} standard deviations</b> below its own trend; every other month is inside the band. Check the data before calling it a trend: a missing week of sales would look exactly like this.` };
  } },
];
export function askTable(root, reduce) {
  const qs = root.querySelector('.qs'), fig = root.querySelector('svg'), ans = root.querySelector('.ans');
  qs.innerHTML = QUESTIONS.map((q, i) => `<button type="button" aria-pressed="${i === 0}" data-q="${i}">${q.q}</button>`).join('');
  function show(i) {
    qs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.q == i));
    const w = 640, h = 280, r = QUESTIONS[i].run(w, h);
    fig.setAttribute('viewBox', `0 0 ${w} ${h}`); fig.innerHTML = r.svg; ans.innerHTML = r.a;
    if (!reduce) { fig.classList.remove('play'); void fig.getBBox(); requestAnimationFrame(() => fig.classList.add('play')); } else fig.classList.add('play');
  }
  qs.addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(+b.dataset.q); });
  show(0);
}
