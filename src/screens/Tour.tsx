// Spotlight tour: dims the window except one real control (data-tour="…") and explains it in
// one short caption. Next / Back / Skip; Escape skips. Steps whose control is not on screen are left out.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TOURS, type TourId } from '../state/setup';
import { t } from '../../electron/i18n';

const PAD = 6;
const find = (target: string) => document.querySelector<HTMLElement>(`[data-tour="${target}"]`);

export function Tour({ id, onEnd }: { id: TourId; onEnd: () => void }) {
  const [steps] = useState(() => TOURS[id].filter((s) => find(s.target)));
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const next = useRef<HTMLButtonElement>(null);
  const step = steps[i];

  useLayoutEffect(() => {
    if (!step) return;
    const el = find(step.target);
    el?.scrollIntoView({ block: 'center' });
    const measure = () => setRect(find(step.target)?.getBoundingClientRect() ?? null);
    measure();
    addEventListener('resize', measure);
    return () => removeEventListener('resize', measure);
  }, [step]);
  useEffect(() => { next.current?.focus(); }, [i]);
  useEffect(() => { if (!steps.length) onEnd(); }, []);
  if (!step || !rect) return null;

  const last = i === steps.length - 1;
  const below = rect.bottom + 180 < innerHeight;
  const left = Math.max(16, Math.min(rect.left, innerWidth - 376));
  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title"
         onKeyDown={(e) => { if (e.key === 'Escape') onEnd(); }}>
      <div className="tour-hole" style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + 2 * PAD, height: rect.height + 2 * PAD }} />
      <div className="tour-card" style={below ? { top: rect.bottom + PAD + 12, left } : { bottom: innerHeight - rect.top + PAD + 12, left }}>
        <small className="muted">{t('{k} of {all}', { k: i + 1, all: steps.length })}</small>
        <h3 id="tour-title">{t(step.title)}</h3>
        <p>{t(step.text)}</p>
        <div className="row">
          <button ref={next} className="primary" onClick={() => (last ? onEnd() : setI(i + 1))}>{last ? t('Done') : t('Next')}</button>
          {i > 0 && <button onClick={() => setI(i - 1)}>{t('Back')}</button>}
          {!last && <button className="link" onClick={onEnd}>{t('Skip tour')}</button>}
        </div>
      </div>
    </div>
  );
}
