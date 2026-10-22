import { describe, expect, it } from 'vitest';
import { dailyFocus, distractions, hms, laneOf, reportSentence, streak, summarize, timelineBlocks, type Segment } from '../src/session/accounting';

const S = 1000, M = 60 * S;
const seg = (activity: string, start: number, end: number): Segment => ({ activity, start, end });

describe('summarize', () => {
  const day = [
    seg('FOCUSED', 0, 10 * M),
    seg('PHONE', 10 * M, 11 * M),
    seg('PHONE_CALL', 11 * M, 12 * M),   // phone -> call is the same pickup
    seg('FOCUSED', 12 * M, 30 * M),
    seg('AWAY', 30 * M, 32 * M),
    seg('FOCUSED', 32 * M, 40 * M),
    seg('BREAK', 40 * M, 45 * M),
    seg('FOCUSED', 45 * M, 50 * M),
  ];
  const s = summarize(day);

  it('totals', () => {
    expect(s.totalSec).toBe(50 * 60);
    expect(s.focusedSec).toBe(41 * 60);
    expect(s.bySec.BREAK).toBe(5 * 60);
    expect(s.phoneSec).toBe(2 * 60);
  });
  it('counts pickups and times away', () => {
    expect(s.phonePickups).toBe(1);
    expect(s.leftDesk).toBe(1);
  });
  it('A2: looking down has its own count, next to phone pickups, and is not study time', () => {
    const d = summarize([seg('READING', 0, M), seg('DOWN', M, 2 * M), seg('DOWN', 2 * M + 500, 3 * M), seg('READING', 3 * M, 4 * M), seg('DOWN', 4 * M, 5 * M)]);
    expect(d.lookDowns).toBe(2); // two DOWN pieces 0.5 s apart are one look
    expect(d.downSec).toBe(3 * 60 - 0.5);
    expect(d.phonePickups).toBe(0);
    expect(d.focusedSec).toBe(2 * 60);
  });
  it('longest focus streak is broken by anything else', () => {
    expect(s.longestFocusSec).toBe(18 * 60);
  });
  it('order of input does not matter; empty is all zero', () => {
    expect(summarize([...day].reverse())).toEqual(s);
    expect(summarize([]).totalSec).toBe(0);
  });
  it('a day with two sessions: the gap between them is not counted', () => {
    expect(summarize([seg('FOCUSED', 0, 10 * M), seg('FOCUSED', 60 * M, 70 * M)]).totalSec).toBe(20 * 60);
  });
  it('paused time is listed but never counts as focused, and it splits a focus streak', () => {
    const p = summarize([seg('FOCUSED', 0, 5 * M), seg('PAUSED', 5 * M, 15 * M), seg('FOCUSED', 15 * M, 20 * M)]);
    expect(p.focusedSec).toBe(10 * 60);
    expect(p.bySec.PAUSED).toBe(10 * 60);
    expect(p.longestFocusSec).toBe(5 * 60);
  });
  it('two separate phone pickups count twice', () => {
    expect(summarize([seg('PHONE', 0, M), seg('FOCUSED', M, 2 * M), seg('PHONE', 2 * M, 3 * M)]).phonePickups).toBe(2);
  });
  it('back-to-back focused segments (e.g. across two sessions saved apart) join only if they touch', () => {
    expect(summarize([seg('FOCUSED', 0, M), seg('FOCUSED', M + 500, 2 * M)]).longestFocusSec).toBeCloseTo(119.5);
    expect(summarize([seg('FOCUSED', 0, M), seg('FOCUSED', 5 * M, 6 * M)]).longestFocusSec).toBe(60);
  });
});

describe('days and streak', () => {
  const now = new Date(2026, 9, 9, 15, 0).getTime();          // 9 Oct, 15:00 local
  const at = (d: number, h: number) => new Date(2026, 9, d, h).getTime();

  it('splits focus per day, across midnight too', () => {
    const daily = dailyFocus([seg('FOCUSED', at(8, 23), at(9, 1)), seg('PHONE', at(9, 10), at(9, 11))], 3, now);
    expect(daily.map((d) => d.day)).toEqual(['2026-10-07', '2026-10-08', '2026-10-09']);
    expect(daily.map((d) => d.min)).toEqual([0, 60, 60]);
  });
  it('streak counts back from today; today not studied yet does not break it', () => {
    expect(streak([{ min: 5 }, { min: 5 }, { min: 5 }])).toBe(3);
    expect(streak([{ min: 5 }, { min: 5 }, { min: 0 }])).toBe(2);
    expect(streak([{ min: 5 }, { min: 0 }, { min: 0 }])).toBe(0);
    expect(streak([{ min: 0 }, { min: 5 }, { min: 5 }])).toBe(2);
  });
  it('clock text', () => {
    expect(hms(65)).toBe('1:05');
    expect(hms(3725)).toBe('1:02:05');
  });
});

describe('E2 reports: distractions, sentence, timeline rows', () => {
  const segs = [
    seg('WRITING', 0, 10 * M),
    seg('PHONE', 10 * M, 13 * M),
    seg('READING', 13 * M, 30 * M),
    seg('DOWN', 30 * M, 31 * M),
    seg('READING', 31 * M, 40 * M),
    seg('AWAY', 40 * M, 41 * M),
    seg('WRITING', 41 * M, 45 * M),
    seg('BREAK', 45 * M, 50 * M),
  ];
  const events = [
    { type: 'blocked_attempt', detail: 'site:youtube.com', at: 20 * M },
    { type: 'blocked_attempt', detail: 'site:facebook.com', at: 21 * M },
    { type: 'blocked_attempt', detail: 'app:Steam', at: 22 * M },
    { type: 'break', detail: null, at: 45 * M },
  ];
  const s = summarize(segs);

  it('one total, breakdown leaves out kinds that are zero', () => {
    const d = distractions(s, events);
    expect(d.total).toBe(6);
    expect(d.line).toBe('1 phone · 1 looking down · 1 left · 2 blocked sites · 1 blocked app');
    expect(distractions(summarize([seg('READING', 0, M)]), [])).toEqual({ total: 0, line: '' });
  });
  it('counts looking away', () => {
    expect(summarize([seg('LOOKING_AWAY', 0, S), seg('READING', S, 5 * S), seg('LOOKING_AWAY', 5 * S, 6 * S)]).lookAways).toBe(2);
  });
  it('sentence: minutes rounded down, the biggest cost named, no praise', () => {
    expect(reportSentence(s, 50, true)).toBe('40 of 50 minutes focused. Your phone cost you 3 minutes.');
    expect(reportSentence(summarize([seg('READING', 0, 49.9 * M)]), 50, true)).toBe('49 of 50 minutes focused. No distractions seen.');
    expect(reportSentence(summarize([seg('READING', 0, M), seg('AWAY', M, M + 40 * S)]), 25, true)).toBe('1 of 25 minutes focused. Leaving the desk cost you 40 seconds.');
    expect(reportSentence(summarize([seg('FOCUSED', 0, 25 * M)]), 25, false)).toBe('25 of 25 minutes focused. The camera was off, so distractions were not checked.');
  });
  it('timeline: three rows, study activities merged, blocked attempts as moments', () => {
    const b = timelineBlocks([seg('WRITING', 0, M), seg('READING', M, 2 * M), seg('PHONE', 2 * M, 3 * M), seg('PAUSED', 3 * M, 4 * M)],
      [{ type: 'blocked_attempt', detail: 'site:youtube.com', at: 90 * S }]);
    expect(b).toEqual([
      { lane: 'study', text: 'Studying', start: 0, end: 2 * M },
      { lane: 'distracted', text: 'Blocked site: youtube.com', start: 90 * S, end: 90 * S },
      { lane: 'distracted', text: 'Phone', start: 2 * M, end: 3 * M },
      { lane: 'break', text: 'Paused', start: 3 * M, end: 4 * M },
    ]);
    expect(laneOf('LOOKING_AWAY')).toBe('distracted');
    expect(laneOf('BREAK')).toBe('break');
  });
});
