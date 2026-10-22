// A big clock's text. Anek Bangla's Bangla digits are not all the same width (০ 0.61em … ৩ 0.77em, measured
// 2026-10-16), so in Bangla each digit sits in its own 0.77em box and the clock never changes width as it ticks.
// English digits are already equal width (tabular-nums), so they are left as they are.
export function ClockText({ text }: { text: string }) {
  if (!/[০-৯]/.test(text)) return <>{text}</>;
  return <>{[...text].map((c, i) => (/[০-৯]/.test(c) ? <span key={i} className="dg">{c}</span> : c))}</>;
}
