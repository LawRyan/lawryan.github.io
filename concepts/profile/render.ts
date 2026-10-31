/**
 * Build-time render of the resume from src/content.ts, the single source of truth for the site's copy.
 * Nothing here is written by hand: every role, result, case and skill comes from that file.
 */
import { cases, contact, experience, expertise, lios, metrics, site, story } from '../../src/content';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const vp = experience.find(r => r.id === 'vp')!;

export default function render(): Record<string, string> {
  const summary = `
    <p class="statement">${esc(story.statement)}</p>
    <div class="sum-grid">
      <div class="sum-lead"><p>${esc(site.intro)}</p>${story.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</div>
      <div class="sum-role">
        <p class="sr-k">${esc(vp.title)}, ${esc(vp.org)}, ${esc(vp.when)}</p>
        <p>${esc(vp.summary)}</p>
        <ul>${vp.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
      </div>
    </div>`;
  const extra = cases.find(c => c.id === 'modernization')!;
  const results = `<dl class="results">${metrics.map(m => `<div><dd>${esc(m.value)}</dd><dt><b>${esc(m.label)}</b> ${esc(m.note)}</dt></div>`).join('')}</dl>
    <p class="res-extra">${esc(extra.impact)}</p>`;
  const work = cases.map(c => `<article class="case">
      <p class="c-k">${esc(c.k)}</p><h3>${esc(c.title)}</h3>
      <dl><div><dt>The problem</dt><dd>${esc(c.problem)}</dd></div><div><dt>What I did</dt><dd>${esc(c.contribution)} ${esc(c.approach)}</dd></div><div><dt>Result</dt><dd>${esc(c.impact)}</dd></div></dl>
      <p class="c-tags">${c.tags.map(esc).join(', ')}</p></article>`).join('');
  const roles = experience.filter(r => r.kind === 'role');
  const exp = roles.map(r => `<li class="role">
      <p class="r-when">${esc(r.when)}</p>
      <div><h3>${esc(r.title)}</h3><p class="r-org">${esc(r.org)}</p><p>${esc(r.summary)}</p>${r.points.length ? `<ul>${r.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}</div></li>`).join('');
  const skills = expertise.map(g => `<div class="sk"><h3>${esc(g.group)}</h3><ul>${g.items.map(([n, l]) => `<li><span>${esc(n)}</span><i class="lv-${l.toLowerCase()}">${esc(l)}</i></li>`).join('')}</ul></div>`).join('');
  const edu = experience.filter(r => r.kind === 'education').map(r => `<li><p class="r-when">${esc(r.when)}</p><div><h3>${esc(r.title)}</h3><p class="r-org">${esc(r.org)}</p></div></li>`).join('');
  const tabs = lios.pillars.map((p, i) => `<button type="button" role="tab" id="lt-${p.id}" aria-controls="lp-${p.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(p.short)}</button>`).join('');
  const panels = lios.pillars.map((p, i) => {
    const phone = p.shots[0]?.device === 'phone';
    const shots = p.shots.slice(0, phone ? 4 : 4);
    return `<div class="lp${phone ? ' phone' : ''}" role="tabpanel" id="lp-${p.id}" aria-labelledby="lt-${p.id}"${i ? ' hidden' : ''}>
      <div class="lp-copy"><p class="lp-st">${esc(p.product)}, ${esc(p.status.toLowerCase())}</p><h3>${esc(p.line)}</h3><p>${esc(p.body)}</p>
        <ul class="lp-caps">${p.capabilities.slice(0, 6).map(c => `<li><i class="st-${c.status.toLowerCase().replace(/\s+/g, '-')}">${esc(c.status)}</i>${esc(c.name)}</li>`).join('')}</ul></div>
      <figure class="lp-fig"><div class="lp-shots">${shots.map((s, k) => `<img src="${s.src}${phone ? '' : '-720'}.webp" alt="${esc(s.alt)}" loading="lazy" decoding="async"${k ? ' hidden' : ''}>`).join('')}</div>
        <figcaption>${esc(shots[0].caption)}</figcaption>
        <div class="lp-thumbs${phone ? ' phone' : ''}" role="group" aria-label="${esc(p.name)} screens">${shots.map((s, k) => `<button type="button" aria-pressed="${k === 0}" aria-label="Screen ${k + 1}: ${esc(s.alt)}"><img src="${s.src}${phone ? '' : '-720'}.webp" alt="" loading="lazy" decoding="async"></button>`).join('')}</div></figure></div>`;
  }).join('');
  const liosHtml = `<p class="lios-tag">${esc(lios.tagline)}</p><p class="lios-st">${esc(lios.statement)}</p>
    <div class="ltabs" role="tablist" aria-label="L//IOS applications">${tabs}</div>${panels}
    <p class="disc">${esc(lios.disclaimer)}</p>
    <p class="lios-links"><a href="https://lawryan.github.io/#lab">Try the Intelligence Lab</a><a href="https://lawryan.github.io/lios/">Read about L//IOS</a></p>`;
  const contactHtml = `<p class="ct-mail"><a href="mailto:${contact.email}">${contact.email}</a></p>
    <p class="ct-links"><a href="${contact.linkedin}" rel="noopener">LinkedIn</a><a href="${contact.github}" rel="noopener">GitHub</a><button type="button" id="print">Save as PDF</button></p>`;
  const printHead = `<header class="print-head"><h1>${esc(site.name)}</h1><p>${esc(vp.title)}, ${esc(vp.org)}</p><p>${contact.email} | <a href="${contact.linkedin}">${contact.linkedin.replace('https://www.', '')}</a> | <a href="${contact.github}">${contact.github.replace('https://', '')}</a> | ${site.url.replace('https://', '').replace(/\/$/, '')}</p></header>`;
  return { '%PRINTHEAD%': printHead, '%SUMMARY%': summary, '%RESULTS%': results, '%WORK%': work, '%EXPERIENCE%': exp, '%SKILLS%': skills, '%EDUCATION%': edu, '%LIOS%': liosHtml, '%CONTACT%': contactHtml, '%TITLE%': esc(site.title.replace(' · ', ', ')) };
}
