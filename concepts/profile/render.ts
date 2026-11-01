/**
 * Build-time render of the resume. Every word comes from the live site:
 *   - data from src/content.ts (the site's single source of copy)
 *   - section leads quoted verbatim from src/home/Home.tsx and src/components/common.tsx (listed in LIVE below)
 * Nothing here is written for this page.
 */
import { cases, contact, experience, expertise, lios, metrics, principles, projects, site, story } from '../../src/content';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const vp = experience.find(r => r.id === 'vp')!;
const SITE = 'https://lawryan.github.io';
const abs = (h?: string) => !h ? '' : h.startsWith('http') ? h : h.startsWith('#') ? `${SITE}/${h}` : `${SITE}${h}`;

/** Copy that lives in the live site's components, not in content.ts. Quoted exactly. */
const LIVE = {
  impactH: 'Reliable data, less manual work, clearer answers.',                                    // Home.tsx, Impact
  impactLede: 'Selected work from Capital Markets, described in general terms. No client, trade or proprietary detail is shown.',
  xpH: 'Where the business meets the build.',                                                       // Home.tsx, Experience
  xpLede: 'I bridge business requirements and technical execution: understanding what a markets team needs, then building and validating the systems that deliver it.',
  skillsH: 'Markets knowledge, data discipline, and the tools to build.',                          // Home.tsx, Expertise
  levels: [['Established', 'Professional depth'], ['Building', 'Actively applying'], ['Exploring', 'Learning and experimenting']],
  principlesH: 'Five principles.',                                                                  // Home.tsx, How I work
  projH: 'The work, and the path to it.',                                                           // Home.tsx, Projects
  projLede: 'L//IOS leads. The earlier builds stay as a record of how I learned: the first apps, charts and sites I made.',
  contactH: 'Let’s build something meaningful.',                                                    // Home.tsx, Contact
  contactLede: 'Whether it’s markets data, analytics, automation or applied AI, I’m always glad to compare notes.',
  footer: 'Personal site. Views are my own.',                                                       // common.tsx, footer
};

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
  const results = `<p class="rs-lead">${esc(LIVE.impactH)}</p>
    <dl class="results">${metrics.map(m => `<div><dd>${esc(m.value)}</dd><dt><b>${esc(m.label)}</b> ${esc(m.note)}</dt></div>`).join('')}</dl>`;
  const work = `<p class="rs-note">${esc(LIVE.impactLede)}</p>
    <div class="cases">${cases.map(c => `<article class="case">
      <p class="c-k">${esc(c.k)}</p><h3>${esc(c.title)}</h3>
      <dl>${([['Problem', c.problem], ['My contribution', c.contribution], ['Approach', c.approach], ['Impact', c.impact]] as const).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <p class="c-tags">${c.tags.map(esc).join(', ')}</p></article>`).join('')}</div>`;
  const roles = experience.filter(r => r.kind === 'role');
  const exp = `<p class="rs-lead">${esc(LIVE.xpH)}</p><p class="rs-note">${esc(LIVE.xpLede)}</p>
    <ol class="roles">${roles.map(r => `<li class="role">
      <p class="r-when">${esc(r.when)}</p>
      <div><h3>${esc(r.title)}</h3><p class="r-org">${esc(r.org)}</p><p>${esc(r.summary)}</p>${r.points.length ? `<ul>${r.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}</div></li>`).join('')}</ol>`;
  const skills = `<p class="rs-lead">${esc(LIVE.skillsH)}</p>
    <p class="levels">${LIVE.levels.map(([l, d]) => `<span><i class="lv-${l.toLowerCase()}">${l}</i> ${d}</span>`).join('')}</p>
    <div class="skills">${expertise.map(g => `<div class="sk"><h3>${esc(g.group)}</h3><ul>${g.items.map(([n, l]) => `<li><span>${esc(n)}</span><i class="lv-${l.toLowerCase()}">${esc(l)}</i></li>`).join('')}</ul></div>`).join('')}</div>`;
  const edu = experience.filter(r => r.kind === 'education').map(r => `<li><p class="r-when">${esc(r.when)}</p><div><h3>${esc(r.title)}</h3><p class="r-org">${esc(r.org)}</p></div></li>`).join('');

  const tabs = lios.pillars.map((p, i) => `<button type="button" role="tab" id="lt-${p.id}" aria-controls="lp-${p.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(p.short)}</button>`).join('');
  const panels = lios.pillars.map((p, i) => {
    const phone = p.shots[0]?.device === 'phone', shots = p.shots.slice(0, 4);
    return `<div class="lp${phone ? ' phone' : ''}" role="tabpanel" id="lp-${p.id}" aria-labelledby="lt-${p.id}"${i ? ' hidden' : ''}>
      <div class="lp-copy"><p class="lp-st">${esc(p.name)}, ${esc(p.status.toLowerCase())}</p><h3>${esc(p.line)}</h3><p>${esc(p.body)}</p>
        <p class="lp-flow">${esc(p.flow)}</p>
        <ul class="lp-caps">${p.capabilities.slice(0, 6).map(c => `<li><i class="st-${c.status.toLowerCase().replace(/\s+/g, '-')}">${esc(c.status)}</i>${esc(c.name)}</li>`).join('')}</ul>
        ${p.proof?.length ? `<ul class="lp-proof">${p.proof.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>
      <figure class="lp-fig"><div class="lp-shots">${shots.map((s, k) => `<img src="${s.src}${phone ? '' : '-720'}.webp" alt="${esc(s.alt)}" loading="lazy" decoding="async"${k ? ' hidden' : ''}>`).join('')}</div>
        <figcaption>${esc(shots[0].caption)}</figcaption>
        <div class="lp-thumbs${phone ? ' phone' : ''}" role="group" aria-label="${esc(p.name)} screens">${shots.map((s, k) => `<button type="button" aria-pressed="${k === 0}" aria-label="Screen ${k + 1}: ${esc(s.alt)}"><img src="${s.src}${phone ? '' : '-720'}.webp" alt="" loading="lazy" decoding="async"></button>`).join('')}</div></figure></div>`;
  }).join('');
  const liosHtml = `<p class="lios-tag">${esc(lios.tagline)}</p>
    <blockquote class="thesis"><p>“${esc(lios.thesis)}”</p></blockquote>
    <p class="lios-st">${esc(story.why.lead)} <b>${esc(story.why.q)}</b> ${esc(story.why.tail)}</p>
    <div class="ltabs" role="tablist" aria-label="L//IOS applications">${tabs}</div>${panels}
    <p class="disc">${esc(lios.disclaimer)}</p>
    <p class="lios-links"><a href="${SITE}/#lab">Try the Intelligence Lab</a><a href="${SITE}/lios/">Read about L//IOS</a></p>`;

  const recent = projects.filter(p => p.cat !== 'Earlier' && p.year !== 'Earlier');
  const earlier = projects.filter(p => !recent.includes(p));
  const proj = (p: typeof projects[number]) => `<li><p class="pj-k">${esc(p.cat)}, ${esc(p.year)}</p>${p.href ? `<h3><a href="${abs(p.href)}">${esc(p.name)}</a></h3>` : `<h3>${esc(p.name)}</h3>`}<p>${esc(p.body)}</p></li>`;
  const projectsHtml = `<p class="rs-lead">${esc(LIVE.projH)}</p><p class="rs-note">${esc(LIVE.projLede)}</p>
    <ul class="projects">${recent.map(proj).join('')}</ul>
    <details class="earlier"><summary>Earlier work (${earlier.length})</summary><ul class="projects">${earlier.map(proj).join('')}</ul></details>`;
  const principlesHtml = `<p class="rs-lead">${esc(LIVE.principlesH)}</p>
    <ol class="principles">${principles.map(p => `<li><h3>${esc(p.t)}</h3><p>${esc(p.d)}</p></li>`).join('')}</ol>`;
  const contactHtml = `<p class="rs-lead">${esc(LIVE.contactH)}</p><p class="rs-note">${esc(LIVE.contactLede)}</p>
    <p class="ct-mail"><a href="mailto:${contact.email}">${contact.email}</a></p>
    <p class="ct-links"><a href="${contact.linkedin}" rel="noopener">LinkedIn</a><a href="${contact.github}" rel="noopener">GitHub</a><button type="button" id="print">Save as PDF</button></p>
    <p class="foot">© ${new Date().getFullYear()} ${esc(site.name)}. ${esc(LIVE.footer)}</p>`;
  const printHead = `<div class="print-head" aria-hidden="true"><p class="ph-name">${esc(site.name)}</p><p>${esc(vp.title)}, ${esc(vp.org)}</p><p>${contact.email} | <a href="${contact.linkedin}">${contact.linkedin.replace('https://www.', '')}</a> | <a href="${contact.github}">${contact.github.replace('https://', '')}</a> | ${site.url.replace('https://', '').replace(/\/$/, '')}</p></div>`;
  return { '%PRINTHEAD%': printHead, '%SUMMARY%': summary, '%RESULTS%': results, '%WORK%': work, '%EXPERIENCE%': exp, '%SKILLS%': skills, '%EDUCATION%': edu, '%LIOS%': liosHtml, '%PROJECTS%': projectsHtml, '%PRINCIPLES%': principlesHtml, '%CONTACT%': contactHtml, '%TITLE%': esc(site.title.replace(' · ', ', ')) };
}
