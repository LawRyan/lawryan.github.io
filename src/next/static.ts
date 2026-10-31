/**
 * Build-time HTML for the parts of /next/ that come straight from site content (src/content.ts), so the career
 * and the L//IOS showcase are real, crawlable markup that works without JavaScript, and nothing is retyped.
 */
import { contact, experience, lios } from '../content';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, '-');

/** The career, oldest first: the order the camera travels. */
export function career() {
  const roles = experience.filter(r => r.kind === 'role').slice().reverse();
  return roles.map((r, i) => `<li data-m="${i}"><p class="m-when">${esc(r.when)}</p><h3>${esc(r.title)}</h3><p>${esc(r.summary)}</p></li>`).join('\n');
}

const SHORT: Record<string, string> = { data: 'Data intelligence', markets: 'Markets and research', health: 'Health and training' };

export function showcase() {
  const P = lios.pillars;
  const tabs = P.map((p, i) => `<button type="button" role="tab" id="tab-${p.id}" aria-controls="panel-${p.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"><span class="t-name">${esc(p.short)}</span><span class="t-line">${esc(SHORT[p.id] || p.line)}</span></button>`).join('');
  const panels = P.map((p, i) => {
    const phone = p.shots[0]?.device === 'phone';
    const src = (s: string) => phone ? `${s}.webp` : `${s}-720.webp`;
    const srcset = (s: string) => phone ? '' : ` srcset="${s}-720.webp 720w, ${s}.webp 1440w" sizes="(max-width: 760px) 92vw, 58vw"`;
    const caps = p.capabilities.map(c => `<li><span class="st st-${slug(c.status)}">${esc(c.status)}</span>${esc(c.name)}</li>`).join('');
    const shots = p.shots.map((s, k) => `<img class="shot" data-k="${k}" src="${src(s.src)}"${srcset(s.src)} alt="${esc(s.alt)}" width="${phone ? 540 : 1440}" height="${phone ? 1170 : 900}" loading="${i === 0 && k === 0 ? 'eager' : 'lazy'}" decoding="async">`).join('');
    const thumbs = p.shots.map((s, k) => `<button type="button" class="thumb" data-k="${k}" aria-pressed="${k === 0}" aria-label="Show screenshot ${k + 1} of ${p.shots.length}: ${esc(s.alt)}"><img src="${src(s.src)}" alt="" loading="lazy" decoding="async"></button>`).join('');
    const cta = p.id === 'data'
      ? `<p class="p-cta"><a class="btn" href="https://lawryan.github.io/#lab">Try the Intelligence Lab</a><span>A browser-sized version of Analyst. Synthetic files or your own CSV; nothing is uploaded.</span></p>`
      : `<p class="p-cta"><a class="btn ghost" href="https://lawryan.github.io/lios/">Read about ${esc(p.name)}</a></p>`;
    return `<div class="panel${phone ? ' is-phone' : ''}" role="tabpanel" id="panel-${p.id}" aria-labelledby="tab-${p.id}" data-id="${p.id}">
  <div class="p-copy">
    <p class="p-status"><span class="st st-${slug(p.status)}">${esc(p.status)}</span>${esc(p.product)}</p>
    <h3>${esc(p.line)}</h3>
    <p class="p-body">${esc(p.body)}</p>
    <p class="p-flow">${esc(p.flow)}</p>
    <ul class="caps">${caps}</ul>
    ${cta}
  </div>
  <figure class="stage" data-n="${p.shots.length}">
    <div class="screens">${shots}</div>
    <figcaption>${esc(p.shots[0]?.caption || '')}</figcaption>
  </figure>
  <div class="thumbs" role="group" aria-label="${esc(p.name)} screenshots">${thumbs}</div>
</div>`;
  }).join('\n');
  return `<div class="tabs" role="tablist" aria-label="L//IOS applications">${tabs}</div>\n${panels}`;
}

export const values = {
  statement: lios.statement,
  disclaimer: lios.disclaimer,
  email: contact.email,
  linkedin: contact.linkedin,
};
