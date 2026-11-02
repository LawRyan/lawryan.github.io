/**
 * Build-time render for profile v2. Facts come from src/content.ts (the live site's copy). Section leads quoted from the
 * live components are marked LIVE. The one exception is the validation framing, which follows Ryan's correction
 * (1 Nov): the framework confirmed the rules were accurate, for audit purposes. See docs/concepts/CLAIMS.md.
 */
import { cases, contact, experience, expertise, lios, metrics, principles, projects, site, story } from '../../src/content';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SITE = 'https://lawryan.github.io';
const abs = (h?: string) => !h ? '' : h.startsWith('http') ? h : h.startsWith('#') ? `${SITE}/${h}` : `${SITE}${h}`;
const vp = experience.find(r => r.id === 'vp')!;
const assoc = experience.find(r => r.id === 'assoc')!;
const roles = experience.filter(r => r.kind === 'role');
const edu = experience.filter(r => r.kind === 'education');
const C = (id: string) => cases.find(c => c.id === id)!;
const LIVE = {
  xpH: 'Where the business meets the build.',
  xpLede: 'I bridge business requirements and technical execution: understanding what a markets team needs, then building and validating the systems that deliver it.',
  skillsH: 'Markets knowledge, data discipline, and the tools to build.',
  projH: 'The work, and the path to it.',
  projLede: 'L//IOS leads. The earlier builds stay as a record of how I learned: the first apps, charts and sites I made.',
  contactH: 'Let’s build something meaningful.',
  contactLede: 'Whether it’s markets data, analytics, automation or applied AI, I’m always glad to compare notes.',
  footer: 'Personal site. Views are my own.',
};
const dl = (rows: [string, string][]) => `<dl class="pcso">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
const ICON = {
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  in: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/></svg>',
  gh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-.8-2.3c2.7-.3 5.5-1.3 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C6.5 2.5 5.5 2.8 5.5 2.8a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.2c0 4.6 2.8 5.7 5.5 6a3 3 0 0 0-.8 2.3V21"/></svg>',
  analyst: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  markets: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 17 6-6 4 4 8-8M15 7h6v6"/></svg>',
  health: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.6a5 5 0 0 0-8.8-3.2 5 5 0 0 0-8.8 3.2c0 5.4 8.8 10.4 8.8 10.4s8.8-5 8.8-10.4Z"/></svg>',
};

export default function render(): Record<string, string> {
  // ── professional introduction
  const about = `
    <div class="ab-grid">
      <div class="ab-lead rv">
        <p class="eyebrow">Ryan Law</p>
        <h2 id="h-about" class="statement">${esc(story.statement)}</h2>
        <p class="ab-intro">${esc(site.intro)}</p>
        <p class="ab-p">${esc(story.paragraphs[1])}</p>
      </div>
      <aside class="ab-role rv" aria-label="Current role">
        <p class="ar-k">Now</p>
        <p class="ar-t">${esc(vp.title)}</p>
        <p class="ar-o">${esc(vp.org)}, ${esc(vp.when)}</p>
        <p class="ar-s">${esc(vp.summary)}</p>
        <ul>${vp.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
      </aside>
    </div>
    <dl class="ledger rv" aria-label="Results">${metrics.map(m => `<div><dd>${esc(m.value)}</dd><dt><b>${esc(m.label)}</b>${esc(m.note)}</dt></div>`).join('')}</dl>
    <ol class="principles rv" aria-label="How I work">${principles.map(p => `<li><b>${esc(p.t)}</b> ${esc(p.d)}</li>`).join('')}</ol>`;

  // ── case studies
  const v = C('validation');
  const cs1 = dl([
    ['The problem', 'The rules behind the data had to be shown to be accurate, for audit purposes.'],
    ['My contribution', esc(v.contribution)],
    ['The solution', esc(v.approach)],
    ['The outcome', '<b>300+ rules</b> across roughly <b>100–150K trade records</b>, used to confirm the rules were accurate for audit.'],
  ]) + `<p class="tags">${v.tags.map(esc).join(' · ')}</p>`;
  const a = C('automation'), m = C('modernization');
  const cs2 = `
    <div class="f-text">${dl([
      ['The problem', esc(a.problem)],
      ['My contribution', `${esc(a.contribution)} ${esc(m.contribution)}`],
      ['The solution', `${esc(a.approach)} ${esc(m.approach)}`],
    ])}</div>
    <dl class="f-nums">
      <div><dd>95%</dd><dt>less manual reporting effort across product coverage, freeing capacity for other initiatives and workstreams</dt></div>
      <div><dd>~40</dd><dt>reports modernized in a separate rebuild</dt></div>
      <div><dd>~30 hrs</dd><dt>a month saved by that rebuild</dt></div>
    </dl>`;
  const f = C('fixed-income');
  const cs3 = dl([
    ['The problem', esc(f.problem)],
    ['My contribution', `${esc(f.contribution)} ${esc(assoc.summary)}`],
    ['The solution', esc(f.approach)],
    ['The outcome', esc(f.impact)],
  ]) + `<ul class="also">${assoc.points.slice(1).map(p => `<li>${esc(p)}</li>`).join('')}</ul>`;

  // ── L//IOS
  const liosHead = `<p class="lr-tag">${esc(lios.tagline)}</p>
    <p class="lr-st">${esc(lios.statement)}</p>
    <p class="lr-disc">${esc(lios.disclaimer)}</p>`;
  const sub = { data: 'Data exploration & analysis', markets: 'Markets & research', health: 'Health & training' } as Record<string, string>;
  const pick = lios.pillars.map((p, i) => `<button type="button" role="tab" id="pt-${p.id}" aria-controls="pp-${p.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">
      <i>${ICON[p.id === 'data' ? 'analyst' : p.id === 'markets' ? 'markets' : 'health']}</i><span><b>${esc(p.short)}</b><small>${esc(sub[p.id] || p.line)}</small></span><em class="st st-${p.status.toLowerCase().replace(/\s+/g, '-')}">${esc(p.status)}</em></button>`).join('');
  const panels = lios.pillars.map((p, i) => {
    const phone = p.shots[0]?.device === 'phone', shots = p.shots.slice(0, phone ? 5 : 4);
    const caps = p.capabilities.filter(c => c.status !== 'Planned').slice(0, 5);
    const planned = p.capabilities.filter(c => c.status === 'Planned');
    const link = p.id === 'data' ? `<a class="btn" href="${SITE}/#lab">Try the Intelligence Lab</a>` : '';
    return `<div class="pp${phone ? ' phone' : ''}" role="tabpanel" id="pp-${p.id}" aria-labelledby="pt-${p.id}"${i ? ' hidden' : ''}>
      <figure class="pp-fig">
        <div class="pp-screen">${shots.map((s, k) => `<img src="${s.src}${phone ? '' : '-720'}.webp"${phone ? '' : ` srcset="${s.src}-720.webp 720w, ${s.src}.webp 1440w" sizes="(max-width: 900px) 92vw, 60vw"`} alt="${esc(s.alt)}" loading="lazy" decoding="async"${k ? ' hidden' : ''}>`).join('')}</div>
        <figcaption>${esc(shots[0].caption)}</figcaption>
        <div class="pp-thumbs${phone ? ' phone' : ''}" role="group" aria-label="${esc(p.name)} screens">${shots.map((s, k) => `<button type="button" aria-pressed="${k === 0}" aria-label="Screen ${k + 1}: ${esc(s.alt)}"><img src="${s.src}${phone ? '' : '-720'}.webp" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>
      </figure>
      <div class="pp-copy">
        <h3>${esc(p.name)}</h3>
        <p class="pp-line">${esc(p.line)}</p>
        <p class="pp-body">${esc(p.body)}</p>
        <p class="pp-flow">${esc(p.flow)}</p>
        <ul class="pp-caps">${caps.map(c => `<li><em class="st st-${c.status.toLowerCase().replace(/\s+/g, '-')}">${esc(c.status)}</em>${esc(c.name)}</li>`).join('')}</ul>
        ${planned.length ? `<p class="pp-planned"><b>Planned, not built yet:</b> ${planned.map(c => esc(c.name)).join('; ')}</p>` : ''}
        ${p.proof?.length ? `<ul class="pp-proof">${p.proof.slice(0, 3).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        <p class="pp-links">${link}<a class="btn-ghost" href="${SITE}/lios/">Read about L//IOS</a></p>
      </div>
    </div>`;
  }).join('');
  const showcase = `<div class="sc-grid"><div class="sc-pick" role="tablist" aria-label="L//IOS applications">${pick}</div><div class="sc-panels">${panels}</div></div>`;

  // ── experience: an interactive rail, one role open at a time (all roles in the DOM)
  const ordered = [...roles].reverse();   // oldest first along the rail
  const rail = ordered.map((r, i) => `<button type="button" role="tab" id="rt-${r.id}" aria-controls="rp-${r.id}" aria-selected="${r.id === 'vp'}" tabindex="${r.id === 'vp' ? 0 : -1}" style="--x:${((r.from - 2015.5) / (2026.2 - 2015.5) * 100).toFixed(2)}%"><i></i><b>${esc(r.when.split(' – ')[0])}</b><span>${esc(r.title)}</span></button>`).join('');
  const rpanels = ordered.map(r => `<div class="rp" role="tabpanel" id="rp-${r.id}" aria-labelledby="rt-${r.id}"${r.id === 'vp' ? '' : ' hidden'}>
      <p class="rp-when">${esc(r.when)}</p><h3>${esc(r.title)}</h3><p class="rp-org">${esc(r.org)}</p>
      <p class="rp-sum">${esc(r.summary)}</p>${r.points.length ? `<ul>${r.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}</div>`).join('');
  const expHtml = `<header class="sec-head rv"><p class="eyebrow"><b>03</b> / Experience &amp; leadership</p><h2 id="h-exp">${esc(LIVE.xpH)}</h2><p class="sec-note">${esc(LIVE.xpLede)}</p></header>
    <div class="xp rv">
      <div class="rail" role="tablist" aria-label="Roles at ${esc(vp.org)}, oldest to newest"><div class="rail-line" aria-hidden="true"><span class="lead-from" style="--x:${((2019.92 - 2015.5) / (2026.2 - 2015.5) * 100).toFixed(2)}%">Leading teams since 2019</span></div>${rail}</div>
      <div class="rps">${rpanels}</div>
    </div>`;

  // ── projects (L//IOS is above; the rest, compact)
  const lead = projects.filter(p => p.name !== 'L//IOS' && (p.cat === 'Experimental' || p.cat === 'Data Analytics'));
  const earlier = projects.filter(p => p.name !== 'L//IOS' && !lead.includes(p));
  const row = (p: typeof projects[number]) => `<li><p class="pj-k">${esc(p.cat)}, ${esc(p.year)}</p><p class="pj-n">${p.href ? `<a href="${abs(p.href)}">${esc(p.name)}</a>` : esc(p.name)}</p><p class="pj-b">${esc(p.body)}</p></li>`;
  const projHtml = `<header class="sec-head rv"><p class="eyebrow"><b>04</b> / Projects</p><h2 id="h-pj">${esc(LIVE.projH)}</h2><p class="sec-note">${esc(LIVE.projLede)}</p></header>
    <ul class="pj rv">${lead.map(row).join('')}</ul>
    <details class="pj-earlier rv"><summary>Earlier work (${earlier.length})</summary><ul class="pj">${earlier.map(row).join('')}</ul></details>`;

  // ── skills, regrouped into the four requested areas (items unchanged; levels shown only where not "Established")
  const all = Object.fromEntries(expertise.flatMap(g => g.items));
  const item = (n: string) => `<li>${esc(n)}${all[n] && all[n] !== 'Established' ? ` <em>${esc(all[n].toLowerCase())}</em>` : ''}</li>`;
  const groups: [string, string[]][] = [
    ['Capital Markets', ['Capital Markets', 'Client Intelligence', 'Operational Efficiency']],
    ['Analytics & business intelligence', ['Business Intelligence', 'Tableau', 'Python', 'SQL', 'Excel', 'Data Quality & Validation', 'Data Visualization']],
    ['Automation & engineering', ['Workflow Automation', 'Data Integration', 'Process Optimization', 'Application Development', 'Analytical Systems', 'AI-Assisted Development', 'LLM Applications', 'Intelligent Analytics', 'Natural-Language Interfaces', 'Agentic Workflows']],
  ];
  const lead3 = `<div class="sk"><h3>Leadership &amp; delivery</h3><ul>${item('Stakeholder Collaboration')}${vp.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>`;
  const skillsHtml = `<header class="sec-head rv"><p class="eyebrow"><b>05</b> / Skills &amp; expertise</p><h2 id="h-sk">${esc(LIVE.skillsH)}</h2></header>
    <div class="sks rv">${groups.map(([h, items]) => `<div class="sk"><h3>${esc(h)}</h3><ul>${items.map(item).join('')}</ul></div>`).join('')}${lead3}</div>
    <div class="edu rv"><h3>Education</h3><ul>${edu.map(r => `<li><b>${esc(r.when)}</b><span>${esc(r.title)}</span><small>${esc(r.org)}</small></li>`).join('')}</ul></div>`;

  // ── contact
  const contactHtml = `<div class="ct rv">
      <p class="eyebrow"><b>06</b> / Contact</p>
      <h2 id="h-ct">${esc(LIVE.contactH)}</h2>
      <p class="sec-note">${esc(LIVE.contactLede)}</p>
      <ul class="ct-links">
        <li><a href="mailto:${contact.email}">${ICON.mail}<span>${contact.email}</span></a></li>
        <li><a href="${contact.linkedin}" rel="noopener">${ICON.in}<span>LinkedIn</span></a></li>
        <li><a href="${contact.github}" rel="noopener">${ICON.gh}<span>GitHub</span></a></li>
      </ul>
      <p class="ct-actions"><a class="btn" href="mailto:${contact.email}">Email me</a><button type="button" class="btn-ghost" id="print">Save résumé as PDF</button></p>
    </div>
    <p class="foot">© ${new Date().getFullYear()} ${esc(site.name)}. ${esc(LIVE.footer)} ${esc(lios.disclaimer)}</p>`;

  // ── the print résumé (hidden on screen)
  const print = `<div class="print" aria-hidden="true">
    <p class="p-name">${esc(site.name)}</p><p class="p-sub">${esc(vp.title)}, ${esc(vp.org)}</p>
    <p class="p-sub">${contact.email} | ${contact.linkedin.replace('https://www.', '')} | ${contact.github.replace('https://', '')} | ${site.url.replace('https://', '').replace(/\/$/, '')}</p>
    <h4>Profile</h4><p>${esc(site.intro)}</p>
    <h4>Results</h4><ul class="p-res">${metrics.map(m => `<li><b>${esc(m.value)}</b> ${esc(m.label)}, ${esc(m.note)}</li>`).join('')}</ul>
    <h4>Experience</h4>${roles.map(r => `<div class="p-role"><p><b>${esc(r.title)}</b>, ${esc(r.org)} <span>${esc(r.when)}</span></p><p>${esc(r.summary)}</p>${r.points.length ? `<ul>${r.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>`).join('')}
    <h4>Skills</h4>${[...groups.map(([h, items]) => `<p><b>${esc(h)}:</b> ${items.map(esc).join(', ')}</p>`), `<p><b>Leadership &amp; delivery:</b> ${['Stakeholder Collaboration', ...vp.points].map(esc).join('; ')}</p>`].join('')}
    <h4>Independent project</h4><p><b>L//IOS</b>: ${esc(lios.pillars.map(p => `${p.name} (${p.status.toLowerCase()})`).join(', '))}. ${esc(lios.disclaimer)}</p>
    <h4>Education</h4>${edu.map(r => `<p><b>${esc(r.title)}</b>, ${esc(r.org)} <span>${esc(r.when)}</span></p>`).join('')}
  </div>`;

  return { '%PRINT%': print, '%ABOUT%': about, '%CS1%': cs1, '%CS2%': cs2, '%CS3%': cs3, '%LIOSHEAD%': liosHead, '%SHOWCASE%': showcase, '%EXPERIENCE%': expHtml, '%PROJECTS%': projHtml, '%SKILLS%': skillsHtml, '%CONTACT%': contactHtml };
}
