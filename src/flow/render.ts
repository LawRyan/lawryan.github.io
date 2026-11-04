// The flow homepage's static HTML, rendered at build time from src/content.ts so every word matches the site's
// content and the page reads fully before (or without) JavaScript. Only structure and section labels are written here.
import { site, story, arc, experience, metrics, cases, expertise, principles, lios, projects, contact } from '../content';
export function renderFlow(): Record<string, string> {
const e = (s: unknown) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const LIVE = '';
const href = (h?: string) => !h ? '' : h;
const statusCls: Record<string, string> = { Working: 'ok', 'In development': 'dev', Prototype: 'proto', Planned: 'plan', Concept: 'concept' };
const status = (s: string) => `<span class="st st-${statusCls[s]}">${e(s)}</span>`;
const head = (eyebrow: string, id: string, h: string, lede?: string) => `<header class="cs-head reveal"><p class="eyebrow"><b>//</b> ${e(eyebrow)}</p><h2 id="${id}">${h}</h2>${lede ? `<p class="lede">${e(lede)}</p>` : ''}<span class="tick" aria-hidden="true"></span></header>`;
const out: Record<string, string> = {};

out.ROLE = e(site.title);

out.ABOUT = `
${head('About', 'about-h', e(story.statement), site.intro)}
<div class="two reveal">
  <div class="prose">${story.paragraphs.map(p => `<p>${e(p)}</p>`).join('')}</div>
  <blockquote class="why glass"><p>${e(story.why.lead)}</p><p class="q">${e(story.why.q)}</p><p>${e(story.why.tail)}</p></blockquote>
</div>
<ol class="arc reveal" aria-label="Career arc">${arc.map((a, i) => `<li><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="when">${e(a.when)}</span><b>${e(a.stage)}</b><p>${e(a.text)}</p></li>`).join('')}</ol>`;

const roles = experience.filter(r => r.kind === 'role'), edu = experience.filter(r => r.kind === 'education');
out.EXPERIENCE = `
${head('Experience', 'xp-h', 'Where the business meets the build.')}
<div class="xp reveal">${roles.map((r, i) => `
  <details class="xp-row glass"${i === 0 ? ' open' : ''}>
    <summary><span class="when mono">${e(r.when)}</span><span class="t"><b>${e(r.title)}</b><span>${e(r.org)}</span></span><span class="pm" aria-hidden="true"></span></summary>
    <div class="xp-body"><p>${e(r.summary)}</p><ul>${r.points.map(p => `<li>${e(p)}</li>`).join('')}</ul></div>
  </details>`).join('')}
</div>
<div class="edu reveal"><p class="eyebrow"><b>//</b> Education</p><ul>${edu.map(r => `<li><span class="when mono">${e(r.when)}</span><b>${e(r.title)}</b><span>${e(r.org)}</span>${r.summary ? `<em>${e(r.summary)}</em>` : ''}</li>`).join('')}</ul></div>`;

out.IMPACT = `
${head('Impact', 'impact-h', 'Reliable data, less manual work, clearer answers.')}
<ul class="metrics reveal">${metrics.map(m => `<li><b>${e(m.value)}</b><span>${e(m.label)}</span><em>${e(m.note)}</em></li>`).join('')}</ul>
<div class="cases reveal">${cases.map(c => `
  <details class="case glass">
    <summary><span class="k mono">${e(c.k)}</span><b>${e(c.title)}</b><span class="imp">${e(c.impact)}</span><span class="more mono" aria-hidden="true">Read the case</span></summary>
    <dl><dt>Problem</dt><dd>${e(c.problem)}</dd><dt>Contribution</dt><dd>${e(c.contribution)}</dd><dt>Approach</dt><dd>${e(c.approach)}</dd><dt>Impact</dt><dd>${e(c.impact)}</dd></dl>
    <p class="tags">${c.tags.map(t => `<span>${e(t)}</span>`).join('')}</p>
  </details>`).join('')}
</div>`;

out.EXPERTISE = `
${head('Expertise', 'exp-h', 'Markets knowledge, data discipline, and the tools to build.')}
<p class="legend reveal"><span class="lv lv-e">Established</span><span class="lv lv-b">Building</span><span class="lv lv-x">Exploring</span></p>
<div class="kit reveal">${expertise.map(g => `<section class="glass"><h3>${e(g.group)}</h3><ul>${g.items.map(([n, l]) => `<li><span>${e(n)}</span><span class="lv lv-${l === 'Established' ? 'e' : l === 'Building' ? 'b' : 'x'}">${e(l)}</span></li>`).join('')}</ul></section>`).join('')}</div>`;

out.PROJECTS = `
${head('Projects', 'proj-h', 'The work, and the path to it.')}
<ul class="proj reveal">${projects.map(p => { const h = href(p.href), inner = `<span class="cat mono">${e(p.cat)}</span><span class="yr mono">${e(p.year)}</span><b>${e(p.name)}</b><p>${e(p.body)}</p><span class="tags">${p.tags.map(t => `<span>${e(t)}</span>`).join('')}</span>${h ? '<span class="go" aria-hidden="true">→</span>' : ''}`;
  return `<li>${h ? `<a href="${e(h)}"${h.startsWith('http') ? ' rel="noopener"' : ''}>${inner}</a>` : `<div>${inner}</div>`}</li>`; }).join('')}</ul>`;

out.PRINCIPLES = `
${head('How I work', 'philo-h', 'Five principles.')}
<ol class="principles reveal">${principles.map((p, i) => `<li><span class="n mono">${String(i + 1).padStart(2, '0')}</span><b>${e(p.t)}</b><p>${e(p.d)}</p></li>`).join('')}</ol>`;

out.LIOS_MORE = `
<header class="cs-head reveal"><p class="eyebrow"><b>//</b> L//IOS · ${e(lios.tagline)}</p><h2 id="lm-h">${e(lios.thesis)}</h2><span class="tick" aria-hidden="true"></span></header>
<div class="two reveal"><div class="prose">${lios.vision.map(p => `<p>${e(p)}</p>`).join('')}</div>
  <ol class="loop glass" aria-label="The loop every app follows">${lios.loop.map((l, i) => `<li><span class="n mono">${String(i + 1).padStart(2, '0')}</span><b>${e(l.k)}</b><span>${e(l.d)}</span></li>`).join('')}</ol></div>
<div class="pillars reveal">${lios.pillars.map(p => `
  <article class="pillar glass">
    <p class="ph"><b>${e(p.name)}</b>${status(p.status)}</p>
    <p class="line">${e(p.line)}</p>
    <p class="body">${e(p.body)}</p>
    <p class="flow mono">${e(p.flow)}</p>
    <ul class="caps">${p.capabilities.map(c => `<li><span>${e(c.name)}</span>${status(c.status)}</li>`).join('')}</ul>
    <ul class="proofs">${p.proof.map(t => `<li>${e(t)}</li>`).join('')}</ul>
    <p class="tags">${p.stack.map(t => `<span>${e(t)}</span>`).join('')}</p>
    ${p.extra ? `<p class="extra">${e(p.extra)}</p>` : ''}
  </article>`).join('')}
</div>
<div class="two reveal">
  <div><p class="eyebrow"><b>//</b> Product principles</p><ul class="lphilo">${lios.philosophy.map(x => `<li><b>${e(x.t)}</b><span>${e(x.d)}</span></li>`).join('')}</ul></div>
  <div><p class="eyebrow"><b>//</b> Roadmap</p><ul class="roadmap">${lios.roadmap.map(x => `<li><b>${e(x.t)}</b><span>${e(x.d)}</span></li>`).join('')}</ul></div>
</div>
<p class="tech reveal"><span class="eyebrow"><b>//</b> ${e(lios.techNote)}</span><span class="tags">${lios.tech.map(t => `<span>${e(t)}</span>`).join('')}</span></p>
<p class="links reveal"><a class="btn" href="${LIVE}/lios/">Open the L//IOS project page <span aria-hidden="true">→</span></a><a class="link-arrow" href="#lab">Try the Intelligence Lab <span aria-hidden="true">↓</span></a></p>
<p class="disc reveal">${e(lios.disclaimer)}</p>`;

out.CONTACT = `
<header class="cs-head reveal"><p class="eyebrow"><b>//</b> Contact</p><h2 id="contact-h">Let’s build something meaningful.</h2><span class="tick" aria-hidden="true"></span></header>
<ul class="contact-links reveal">
  <li><a href="${e(contact.linkedin)}" rel="noopener"><span class="mono">LinkedIn</span><b>Ryan Law</b><span aria-hidden="true">→</span></a></li>
  <li><a href="mailto:${e(contact.email)}"><span class="mono">Email</span><b>${e(contact.email)}</b><span aria-hidden="true">→</span></a></li>
</ul>`;

const p0 = lios.pillars[0], s0 = p0.shots[0];
out.STATEMENT = e(lios.statement); out.LINE = e(p0.name + ' · ' + p0.line); out.PROOF = p0.proof.slice(0, 3).map(t => '<li>' + e(t) + '</li>').join('');
out.CAP = e(s0.alt + '. ' + s0.caption); out.ALT = e(s0.alt); out.SHOT = s0.src + '.webp';
return out;
}
