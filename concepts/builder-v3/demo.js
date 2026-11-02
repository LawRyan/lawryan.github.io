// "Automate the repetitive": the same ten synthetic trades, checked by hand, then by rules.
// Every value below is invented for the demonstration.
const COLS = [['id', 'Trade ID'], ['prod', 'Product', 'hm'], ['notional', 'Notional'], ['td', 'Trade date'], ['sd', 'Settles'], ['lei', 'LEI'], ['book', 'Book']];
const TRADES = [
  ['TRD-784229', 'FX fwd', '2,800,000', '2 Mar', '4 Mar', '5493001KJTIIGC8Y1R12', 'FX-LDN-02'],
  ['TRD-784230', 'Rate swap', '1,000,000', '2 Mar', '4 Mar', '213800D1EI4B9WTWWD28', 'RATES-07'],
  ['TRD-784231', 'FX fwd', '750,000', '2 Mar', '27 Feb', '5493001KJTIIGC8Y1R12', 'FX-LDN-02'],
  ['TRD-784232', 'Bond', '3,000,000', '3 Mar', '5 Mar', '', 'CREDIT-11'],
  ['TRD-784233', 'Eq. swap', '500,000', '3 Mar', '5 Mar', '549300GKFG0RYRRQ1414', 'EQD-03'],
  ['TRD-784234', 'FX option', '1,250,000', '3 Mar', '5 Mar', '213800D1EI4B9WTWWD28', 'UNMAPPED'],
  ['TRD-784235', 'Bond', '2,000,000', '4 Mar', '6 Mar', '549300GKFG0RYRRQ1414', 'CREDIT-11'],
  ['TRD-784235', 'Bond', '2,000,000', '4 Mar', '6 Mar', '549300GKFG0RYRRQ1414', 'CREDIT-11'],
  ['TRD-784237', 'Rate swap', '900,000', '4 Mar', '6 Mar', '5493001KJTIIGC8Y1R12', 'RATES-07'],
  ['TRD-784238', 'FX fwd', '1,600,000', '5 Mar', '9 Mar', '213800D1EI4B9WTWWD28', 'FX-LDN-02'],
];
// each rule: which column it reads, and which rows it holds back (with the reason a person would need)
const RULES = [
  { name: 'Required fields present', col: 5, hits: { 3: ['LEI is blank', 'a 20-character LEI', 'blank'] } },
  { name: 'Settles on or after trade date', col: 4, hits: { 2: ['Settles before it trades', 'on or after 2 Mar', '27 Feb'] } },
  { name: 'Book mapped to a desk', col: 6, hits: { 5: ['Book has no desk', 'a mapped book', 'UNMAPPED'] } },
  { name: 'Notional within limit', col: 2, hits: {} },
  { name: 'Trade ID unique', col: 0, hits: { 7: ['Trade ID repeated', 'a unique ID', 'same as row 7'] } },
  { name: 'LEI is 20 characters', col: 5, hits: {} },
];
const HAND_MS = 320, RULE_MS = 300, HAND_TOTAL = TRADES.length * COLS.length * HAND_MS;

export function initDemo(reduce) {
  const $ = id => document.getElementById(id);
  const tt = $('tt'), rulesEl = $('rules'), run = $('run'), line = $('m-line'), exc = $('exc'), list = $('exc-list');
  if (!tt) return;
  tt.tHead.innerHTML = '<tr>' + COLS.map(([, h, c]) => `<th scope="col"${c ? ` class="${c}"` : ''}>${h}</th>`).join('') + '</tr>';
  tt.tBodies[0].innerHTML = TRADES.map(r => '<tr>' + r.map((v, j) => `<td${COLS[j][2] ? ` class="${COLS[j][2]}"` : ''}>${v || '<span aria-label="blank">·</span>'}</td>`).join('') + '</tr>').join('');
  rulesEl.innerHTML = RULES.map(r => `<li>${r.name}</li>`).join('');
  const rows = [...tt.tBodies[0].rows], cell = (i, j) => rows[i].cells[j], ruleLis = [...rulesEl.children];
  let mode = 'hand', token = 0, handMs = 0, ruleMs = 0;

  const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
  const fmt = ms => (ms / 1000).toFixed(1) + ' s';
  function bars() {
    $('b-hand').style.width = (handMs / HAND_TOTAL * 100).toFixed(1) + '%';
    $('b-rules').style.width = (ruleMs / HAND_TOTAL * 100).toFixed(1) + '%';
    $('t-hand').textContent = handMs ? fmt(handMs) : '–';
    $('t-rules').textContent = ruleMs ? fmt(ruleMs) : '–';
  }
  function clear() {
    rows.forEach(r => { r.className = ''; [...r.cells].forEach(c => c.classList.remove('cur', 'ok', 'bad')); });
    ruleLis.forEach(l => (l.className = ''));
    exc.hidden = true; list.innerHTML = '';
  }
  function setMode(m) {
    token++; mode = m; clear(); run.disabled = false;
    document.querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    rulesEl.classList.toggle('hand', m === 'hand');
    run.textContent = m === 'hand' ? 'Check by hand' : 'Run the rules';
    line.textContent = m === 'hand' ? 'Seventy fields to check, one at a time.' : 'Six rules, each written once, run across every trade.';
  }

  async function byHand(t) {
    handMs = 0; bars();
    for (let i = 0; i < rows.length; i++) for (let j = 0; j < COLS.length; j++) {
      if (t !== token) return;
      const c = cell(i, j); c.classList.add('cur');
      await wait(HAND_MS); if (t !== token) return;
      c.classList.remove('cur'); c.classList.add('ok');
      handMs += HAND_MS; bars();
      line.textContent = `Field ${i * COLS.length + j + 1} of 70. Row ${i + 1}, ${COLS[j][1].toLowerCase()}.`;
    }
    line.textContent = 'Seventy fields, checked by eye. Next cycle, it starts again from zero.';
    run.disabled = false; run.textContent = 'Check again';
  }

  async function withRules(t) {
    ruleMs = 0; bars();
    const held = [];
    for (let k = 0; k < RULES.length; k++) {
      if (t !== token) return;
      const r = RULES[k], li = ruleLis[k];
      li.className = 'run';
      rows.forEach((row, i) => { row.classList.add('sweep'); cell(i, r.col).classList.add('cur'); });
      line.textContent = `Rule ${k + 1} of 6: ${r.name.toLowerCase()}.`;
      await wait(RULE_MS); if (t !== token) return;
      rows.forEach((row, i) => { row.classList.remove('sweep'); cell(i, r.col).classList.remove('cur'); });
      for (const i in r.hits) { cell(+i, r.col).classList.add('bad'); held.push([+i, r, r.hits[i]]); }
      li.className = Object.keys(r.hits).length ? 'hit' : 'done';
      ruleMs += RULE_MS; bars();
    }
    const failed = new Set(held.map(h => h[0]));
    rows.forEach((row, i) => row.classList.add(failed.has(i) ? 'fail' : 'pass'));
    line.textContent = `Every trade checked against every rule. ${rows.length - failed.size} passed; ${failed.size} held for a person, with the reason.`;
    list.innerHTML = held.sort((a, b) => a[0] - b[0]).map(([i, r, [why, exp, got]]) =>
      `<li><button type="button" data-row="${i}" data-col="${r.col}" aria-pressed="false"><b>Row ${i + 1} · ${TRADES[i][0]}</b>${why}. Expected ${exp}; found <span>${got}</span>.</button></li>`).join('');
    exc.hidden = false;
    run.disabled = false; run.textContent = 'Run again';
  }

  list.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const on = b.getAttribute('aria-pressed') !== 'true';
    list.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false'));
    rows.forEach(r => r.classList.remove('focus'));
    if (on) { b.setAttribute('aria-pressed', 'true'); rows[+b.dataset.row].classList.add('focus'); }
  });
  document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  run.addEventListener('click', () => {
    const t = ++token; clear(); run.disabled = true;
    (mode === 'hand' ? byHand : withRules)(t);
  });
  window.__demo = { setMode, run: () => run.click() };
  setMode('hand'); bars();
}
