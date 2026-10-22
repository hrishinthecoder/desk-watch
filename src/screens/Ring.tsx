import type { ReactNode } from 'react';

// Night Desk ring timer: a thin track and the part done in the accent, the clock and two lines inside.
// `frac` 0..1 (null = full ring, as when ready). Size comes from CSS (.ring), the SVG scales with it.
export function Ring({ frac, label, children, className = '' }: { frac: number | null; label?: string; children: ReactNode; className?: string }) {
  const r = 186, c = 2 * Math.PI * r, f = frac === null ? 1 : Math.max(0, Math.min(1, frac));
  const value = frac === null ? {} : { role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(f * 100) };
  return (
    <div className={`ring ${className}`} {...value}>
      <svg viewBox="0 0 400 400" aria-hidden="true">
        <circle cx="200" cy="200" r={r} className="ring-track" />
        {f > 0 && <circle cx="200" cy="200" r={r} className="ring-done" strokeDasharray={`${f * c} ${c}`} transform="rotate(-90 200 200)" />}
      </svg>
      <div className="ring-in">{children}</div>
    </div>
  );
}
