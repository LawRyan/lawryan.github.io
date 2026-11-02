// Fills the V4 page at build time from src/content.ts, the single source for the site's words.
import { contact, experience, expertise, lios } from '../../src/content';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

export default function render() {
  // L//IOS: one panel per application, real screenshots only
  const tabs = lios.pillars.map((p, i) => `<button type="button" role="tab" id="lt-${p.id}" aria-controls="lp-${p.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"><b>${esc(p.short)}</b><span>${esc(p.line)}</span></button>`).join('');
  const panels = lios.pillars.map((p, i) => {
    const phone = p.shots[0]?.device === 'phone';
    const shots = p.shots.slice(0, phone ? 3 : 4);
    const stage = phone
      ? `<div class="phones">${shots.map(s => `<figure class="phone"><img src="${s.src}.webp" alt="${esc(s.alt)}" loading="lazy" decoding="async"></figure>`).join('')}</div>`
      : `<figure class="window"><div class="chrome" aria-hidden="true"><i></i><i></i><i></i><span>${esc(p.name)}</span></div><div class="shots">${shots.map((s, k) => `<img src="${s.src}.webp" alt="${esc(s.alt)}" loading="lazy" decoding="async"${k ? ' hidden' : ''}>`).join('')}</div></figure>
         <div class="thumbs" role="group" aria-label="${esc(p.name)} screens">${shots.map((s, k) => `<button type="button" aria-pressed="${k === 0}" aria-label="Screen ${k + 1}: ${esc(s.alt)}"><img src="${s.src}-720.webp" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>`;
    return `<div class="lp" role="tabpanel" id="lp-${p.id}" aria-labelledby="lt-${p.id}"${i ? ' hidden' : ''}>
      <div class="lp-stage">${stage}<p class="shot-note">${esc(shots[0].caption)}</p></div>
      <div class="lp-copy">
        <p class="lp-status"><i></i>${esc(p.status)}</p>
        <h3>${esc(p.name)}</h3>
        <p class="lp-body">${esc(p.body)}</p>
        <p class="lp-flow">${esc(p.flow).split(' → ').join('<span> → </span>')}</p>
        <ul class="lp-proof">${p.proof.slice(0, 3).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      </div></div>`;
  }).join('');
  const principles = lios.philosophy.map(x => `<li><b>${esc(x.t)}</b>${esc(x.d)}</li>`).join('');

  // Experience & background, compact
  const roles = experience.filter(r => r.kind === 'role').map(r => `<li><span class="when">${esc(r.when)}</span><div><b>${esc(r.title)}</b><span class="org">${esc(r.org)}</span><p>${esc(r.summary)}</p></div></li>`).join('');
  const edu = experience.filter(r => r.kind === 'education').map(r => `<li><span class="when">${esc(r.when)}</span><div><b>${esc(r.title)}</b><span class="org">${esc(r.org)}</span></div></li>`).join('');

  return {
    '%LIOS_TABS%': tabs, '%LIOS_PANELS%': panels, '%LIOS_PRINCIPLES%': principles,
    '%LIOS_TAG%': esc(lios.tagline), '%LIOS_STATEMENT%': esc(lios.statement), '%LIOS_DISC%': esc(lios.disclaimer),
    '%ROLES%': roles, '%EDU%': edu,
    '%SKILLS%': expertise.map(g => `<p class="skills"><b>${esc(g.group)}</b>${g.items.map(([n]) => esc(n)).join(' · ')}</p>`).join(''),
    '%EMAIL%': contact.email, '%LINKEDIN%': contact.linkedin, '%GITHUB%': contact.github,
  };
}
