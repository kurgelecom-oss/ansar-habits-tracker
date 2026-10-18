/* The week film (tk, 18 Oct 2026): the Friday homeschool report played as a short
   animated story on the School page, one point per scene.

   The Friday report routine (trig_01FVdPZcJ2mK5GMguQ9Fg8RL) already does the analysis
   for the email. It also writes the same numbers as JSON to Notion "🎬 Week Films";
   week-story-import.ts checks them here and stores them as `week-report:<monday>`.
   This file is pure (no I/O) so the page can import it and the tests can run it.
   Note-to-Taylan items stay in the email; they are not part of the film. */
import { dayNameOf } from './time';

export const AREAS = ['English', 'Mathematics', 'Science', 'HASS', 'The Arts', 'Health & PE', 'Technologies', 'Languages'] as const;
export const CALLS = ['GREEN', 'PROVISIONAL GREEN', 'YELLOW', 'RED'] as const;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
export const BLOCKS = [['maths', 'Maths'], ['english', 'English'], ['hass', 'HASS'], ['rotation', 'Rotation']] as const;

export type Call = typeof CALLS[number];
export type DayRow = { day: typeof DAYS[number]; maths: boolean; english: boolean; hass: boolean; rotation: boolean; logs: number; start: string | null };
export type WeekReport = {
  week: string; label: string; call: Call; callWhy: string; deviceRule: number | null;
  days: DayRow[];
  areas: { area: typeof AREAS[number]; now: number; before: number; note: string }[];
  evidence: { submissions: number; withFile: number; unique: number };
  topics: { area: string; topic: string; weeks: number; plateau: boolean }[];
  flags: { date: string; kind: string; detail: string }[];
  words: { theme: string; days: number; quote: string }[];
  journals: { now: number; before: number[] };
  strengths: string[]; weaknesses: string[]; actions: string[];
  sources: { tally: number; notion: number };
};

const str = (v: unknown, max = 400) => typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null;
const int = (v: unknown, max = 999) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max ? v as number : null;
const strs = (v: unknown, min: number, max: number) => Array.isArray(v) && v.length >= min && v.length <= max && v.every(x => str(x, 240)) ? v.map(x => (x as string).trim()) : null;

/** Checks the JSON the routine wrote. Returns the report or the first problem (that text goes into the Notion Note). */
export function validateWeekReport(raw: unknown, week: string): WeekReport | string {
  const r = raw as Record<string, any>;
  if (!r || typeof r !== 'object') return 'Not a JSON object';
  if (dayNameOf(week) !== 'Monday') return `Week ${week} is not a Monday`;
  if (!str(r.label, 80)) return 'Missing label';
  if (!CALLS.includes(r.call)) return `call must be one of ${CALLS.join(', ')}`;
  if (!str(r.callWhy)) return 'Missing callWhy';
  if (r.deviceRule !== null && int(r.deviceRule, 5) === null) return 'deviceRule must be 0–5 or null (not recorded)';
  if (!Array.isArray(r.days) || r.days.length !== 5 || r.days.some((d: any, i: number) => d?.day !== DAYS[i] || BLOCKS.some(([k]) => typeof d[k] !== 'boolean') || int(d.logs, 40) === null || (d.start !== null && !/^\d{2}:\d{2}$/.test(d.start ?? ''))))
    return 'days: Mon–Fri in order, each with maths/english/hass/rotation true|false, logs, start "HH:MM" or null';
  if (!Array.isArray(r.areas) || r.areas.length !== 8 || AREAS.some((a, i) => r.areas[i]?.area !== a || int(r.areas[i].now) === null || int(r.areas[i].before) === null || typeof r.areas[i].note !== 'string'))
    return `areas: exactly the 8 VRQA areas in order (${AREAS.join(', ')}) with now, before, note`;
  const e = r.evidence ?? {};
  if ([e.submissions, e.withFile, e.unique].some(v => int(v) === null) || e.withFile > e.submissions || e.unique > e.withFile) return 'evidence: unique ≤ withFile ≤ submissions';
  if (!Array.isArray(r.topics) || r.topics.length > 8 || r.topics.some((t: any) => !str(t?.area, 40) || !str(t?.topic, 120) || int(t.weeks, 52) === null || typeof t.plateau !== 'boolean')) return 'topics: up to 8 of { area, topic, weeks, plateau }';
  if (!Array.isArray(r.flags) || r.flags.length > 12 || r.flags.some((f: any) => !/^\d{4}-\d{2}-\d{2}$/.test(f?.date ?? '') || !str(f.kind, 40) || !str(f.detail, 240))) return 'flags: up to 12 of { date, kind, detail }';
  if (!Array.isArray(r.words) || r.words.length > 6 || r.words.some((w: any) => !str(w?.theme, 40) || int(w.days, 7) === null || !str(w.quote, 200))) return 'words: up to 6 of { theme, days, quote }';
  if (int(r.journals?.now, 7) === null || !Array.isArray(r.journals.before) || r.journals.before.length !== 3 || r.journals.before.some((n: unknown) => int(n, 7) === null)) return 'journals: { now, before: [3 weeks ago, 2 weeks ago, last week] }';
  const strengths = strs(r.strengths, 3, 5), weaknesses = strs(r.weaknesses, 3, 5), actions = strs(r.actions, 3, 3);
  if (!strengths || !weaknesses) return 'strengths and weaknesses: 3 to 5 short sentences each';
  if (!actions) return 'actions: exactly 3 short sentences';
  if (int(r.sources?.tally, 9999) === null || int(r.sources?.notion, 9999) === null) return 'sources: { tally, notion } row counts';
  return {
    week, label: r.label.trim(), call: r.call, callWhy: r.callWhy.trim(), deviceRule: r.deviceRule,
    days: r.days.map((d: any) => ({ day: d.day, maths: d.maths, english: d.english, hass: d.hass, rotation: d.rotation, logs: d.logs, start: d.start })),
    areas: r.areas.map((a: any) => ({ area: a.area, now: a.now, before: a.before, note: a.note.trim() })),
    evidence: { submissions: e.submissions, withFile: e.withFile, unique: e.unique },
    topics: r.topics.map((t: any) => ({ area: t.area.trim(), topic: t.topic.trim(), weeks: t.weeks, plateau: t.plateau })),
    flags: r.flags.map((f: any) => ({ date: f.date, kind: f.kind.trim(), detail: f.detail.trim() })),
    words: r.words.map((w: any) => ({ theme: w.theme.trim(), days: w.days, quote: w.quote.trim() })),
    journals: { now: r.journals.now, before: [...r.journals.before] },
    strengths, weaknesses, actions, sources: { tally: r.sources.tally, notion: r.sources.notion },
  };
}

// ── Scenes ──────────────────────────────────────────────────────────────────
export type Trend = { label: string; before: number; now: number; lowerIsBetter?: boolean };

// id is unique per scene (the player keys edits on it); kind picks the visual. Long lists split into pages of 6.
type Base = { id: string; label: string; hold: number; caption: string };
export type Scene = Base & (
  | { kind: 'call'; call: Call; why: string; full: number; week: string }
  | { kind: 'trend'; since: string; from: Call; to: Call; rows: Trend[] }
  | { kind: 'days'; days: DayRow[] }
  | { kind: 'device'; held: number | null }
  | { kind: 'areas'; areas: WeekReport['areas'] }
  | { kind: 'evidence'; submissions: number; withFile: number; unique: number }
  | { kind: 'topics'; topics: WeekReport['topics'] }
  | { kind: 'journals'; now: number; before: number[] }
  | { kind: 'words'; words: WeekReport['words'] }
  | { kind: 'strong' | 'broke' | 'next'; items: string[] }
  | { kind: 'flags'; flags: WeekReport['flags'] }
);

const s = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const list = (xs: string[]) => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
/** A full day = all four blocks logged. Friday is catch-up, so the household rule counts Mon–Thu. */
export const fullDays = (days: DayRow[]) => days.slice(0, 4).filter(d => BLOCKS.every(([k]) => d[k])).length;
/** Longer lists hold longer: 1.5 s per item on top of the base. */
const PAGE = 6;
const pages = <T,>(xs: T[]) => xs.length ? Array.from({ length: Math.ceil(xs.length / PAGE) }, (_, i) => xs.slice(i * PAGE, i * PAGE + PAGE)) : [[]];
const paged = (label: string, i: number, n: number) => n > 1 ? `${label} ${i + 1}/${n}` : label;
const holdFor = (base: number, items: number) => Math.min(16, base + Math.round(items * 1.5));

/** This week against the previous film: what moved, in which direction. */
export function trendRows(r: WeekReport, p: WeekReport): Trend[] {
  const logs = (x: WeekReport) => x.days.reduce((n, d) => n + d.logs, 0);
  const areas = (x: WeekReport) => x.areas.filter(a => a.now > 0).length;
  return [
    { label: 'Full days', before: fullDays(p.days), now: fullDays(r.days) },
    { label: 'Work logs', before: logs(p), now: logs(r) },
    { label: 'Areas covered', before: areas(p), now: areas(r) },
    { label: 'Photos that count', before: p.evidence.unique, now: r.evidence.unique },
    { label: 'Journals', before: p.journals.now, now: r.journals.now },
    { label: 'Record problems', before: p.flags.length, now: r.flags.length, lowerIsBetter: true },
  ];
}
export const better = (t: Trend) => t.lowerIsBetter ? t.now < t.before : t.now > t.before;
export const worse = (t: Trend) => t.lowerIsBetter ? t.now > t.before : t.now < t.before;

/** prev = the film before this one (null for the first film): adds the "Since last week" scene. */
export function buildWeekStory(r: WeekReport, prev: WeekReport | null = null): Scene[] {
  const full = fullDays(r.days);
  const byLogs = [...r.days].sort((a, b) => b.logs - a.logs);
  const zero = r.areas.filter(a => a.now === 0).map(a => a.area);
  const reused = r.evidence.withFile - r.evidence.unique;
  const plateaus = r.topics.filter(t => t.plateau);
  const last = r.journals.before[2];
  const top = [...r.words].sort((a, b) => b.days - a.days)[0];

  const scenes: Scene[] = [
    { id: 'call', kind: 'call', label: 'The call', hold: 7, call: r.call, why: r.callWhy, full, week: r.label,
      caption: `${r.label}: ${r.call}. ${s(full, 'full day')} out of 4.` },
    { id: 'days', kind: 'days', label: 'Day by day', hold: 8, days: r.days,
      caption: byLogs[0].logs ? `${byLogs[0].day} was your strongest day with ${s(byLogs[0].logs, 'log')}. ${byLogs[4].day} was the quietest with ${byLogs[4].logs}.` : 'Nothing was logged this week.' },
    { id: 'device', kind: 'device', label: 'Device rule', hold: 6, held: r.deviceRule,
      caption: r.deviceRule === null ? 'The device rule was not written down this week, so the call cannot be a full green.' : `The device rule held ${s(r.deviceRule, 'morning')} out of 4.` },
    { id: 'areas', kind: 'areas', label: '8 areas', hold: 9, areas: r.areas,
      caption: zero.length ? `${8 - zero.length} of 8 learning areas covered. ${list(zero)} had nothing.` : 'All 8 learning areas had work this week.' },
    { id: 'evidence', kind: 'evidence', label: 'Evidence', hold: 7, ...r.evidence,
      caption: !r.evidence.submissions ? 'No work was logged, so there is no evidence.'
        : `${r.evidence.withFile} of ${r.evidence.submissions} logs had a photo. ${reused ? `${s(reused, 'photo')} had been used before, so ${r.evidence.unique} count.` : 'Every photo was new.'}` },
  ];
  if (prev) {
    const rows = trendRows(r, prev), up = rows.filter(better).length, down = rows.filter(worse).length;
    scenes.splice(1, 0, { id: 'trend', kind: 'trend', label: 'Since last week', hold: 9, since: prev.label, from: prev.call, to: r.call, rows,
      caption: `${prev.call === r.call ? `${r.call} again` : `${prev.call} last week, ${r.call} this week`}. ${up} ${up === 1 ? 'thing' : 'things'} got better, ${down} got worse.` });
  }
  if (r.topics.length) pages(r.topics).forEach((topics, i, all) => scenes.push({ id: i ? `topics-${i + 1}` : 'topics', kind: 'topics', label: paged('Topics', i, all.length), hold: holdFor(6, topics.length), topics,
    caption: i ? `${s(r.topics.length, 'topic')} in all this week.`
      : plateaus.length ? `${plateaus[0].topic} ${plateaus[0].weeks > 1 ? `has been the same for ${plateaus[0].weeks} weeks` : 'has not moved on'}. Check you are moving forward.` : `${s(r.topics.length, 'topic')} this week, none stuck.` }));
  scenes.push({ id: 'journals', kind: 'journals', label: 'Journal', hold: 6, now: r.journals.now, before: r.journals.before,
    caption: r.journals.now ? `${s(r.journals.now, 'journal')} this week, ${last} last week.` : 'No journal this week. Your journal is your best English work.' });
  if (r.words.length) scenes.push({ id: 'words', kind: 'words', label: 'Your words', hold: holdFor(7, r.words.length), words: r.words,
    caption: `“${top.quote}” came up ${s(top.days, 'day')}. When you keep saying it, it matters.` });
  scenes.push(
    { id: 'strong', kind: 'strong', label: 'Strong', hold: holdFor(6, r.strengths.length), items: r.strengths, caption: `${s(r.strengths.length, 'thing')} you did well this week.` },
    { id: 'broke', kind: 'broke', label: 'Broke', hold: holdFor(6, r.weaknesses.length), items: r.weaknesses, caption: `${s(r.weaknesses.length, 'thing')} that broke. Each one has a fix.` },
  );
  pages(r.flags).forEach((flags, i, all) => scenes.push({ id: i ? `flags-${i + 1}` : 'flags', kind: 'flags', label: paged('Records', i, all.length), hold: flags.length ? holdFor(6, flags.length) : 5, flags,
    caption: !r.flags.length ? 'Your records were clean this week.' : i ? `${s(r.flags.length - PAGE * i, 'more record problem')} to put right.` : `${s(r.flags.length, 'record problem')} to put right.` }));
  scenes.push({ id: 'next', kind: 'next', label: 'Next week', hold: 9, items: r.actions, caption: 'Three things for next week. That is the whole plan.' });
  return scenes;
}
