import { useEffect, useRef, useState } from 'react';
import type { Shot as ShotT } from '../content';

/** A real application screenshot in a light device frame. Lazy-loaded, sized up front so nothing shifts. */
export function Shot({ shot, eager = false, sizes }: { shot: ShotT; eager?: boolean; sizes?: string }) {
  const desk = shot.device === 'desktop';
  const [w, h] = desk ? [1440, 900] : [540, 1170];
  return (
    <figure className={`shot shot-${shot.device}`}>
      <div className="shot-frame">
        {desk && <div className="shot-bar" aria-hidden="true"><i /><i /><i /></div>}
        <img
          src={`${shot.src}.webp`}
          srcSet={desk ? `${shot.src}-720.webp 720w, ${shot.src}.webp 1440w` : undefined}
          sizes={desk ? (sizes ?? '(max-width: 900px) 100vw, 60vw') : undefined}
          width={w} height={h} alt={shot.alt}
          loading={eager ? 'eager' : 'lazy'} decoding="async"
        />
      </div>
      <figcaption>{shot.caption}</figcaption>
    </figure>
  );
}

/** A set of screenshots with thumbnail navigation. Keyboard: arrow keys on the thumbnails. */
export function ShotGallery({ shots, label }: { shots: ShotT[]; label: string }) {
  const [i, setI] = useState(0);
  const thumbs = useRef<HTMLDivElement>(null);
  useEffect(() => setI(0), [shots]);
  const s = shots[Math.min(i, shots.length - 1)];
  const phone = s.device === 'phone';
  if (phone) {
    return (
      <div className="phones-real" role="group" aria-label={label}>
        {shots.slice(0, 3).map((x, n) => <Shot key={x.src} shot={x} eager={n === 0} />)}
      </div>
    );
  }
  return (
    <div className="gallery" role="group" aria-label={label}>
      <Shot key={s.src} shot={s} sizes="(max-width: 960px) 100vw, 62vw" />
      {shots.length > 1 && (
        <div className="gallery-thumbs" ref={thumbs} role="tablist" aria-label={`${label} screens`}
          onKeyDown={e => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            e.preventDefault();
            const n = (i + (e.key === 'ArrowRight' ? 1 : shots.length - 1)) % shots.length;
            setI(n);
            (thumbs.current?.children[n] as HTMLElement | undefined)?.focus();
          }}>
          {shots.map((x, n) => (
            <button key={x.src} role="tab" aria-selected={n === i} tabIndex={n === i ? 0 : -1} onClick={() => setI(n)} aria-label={x.alt}>
              <img src={`${x.src}-720.webp`} alt="" width={144} height={90} loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
