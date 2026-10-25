import { describe, expect, it } from 'vitest';
import { better, buildWeekStory, fullDays, trendRows, validateWeekReport, worse } from './week-story';
import { SAMPLE_PREV, SAMPLE_WEEK } from './week-story-sample';

const { week: _w, ...written } = SAMPLE_WEEK;
const valid = (over: Record<string, unknown> = {}) => validateWeekReport({ ...written, ...over }, '2026-10-12');

describe('validateWeekReport', () => {
  it('accepts the sample and stamps the Monday', () => expect(valid()).toMatchObject({ week: '2026-10-12', call: 'YELLOW' }));
  it('rejects a week that is not a Monday', () => expect(validateWeekReport(written, '2026-10-13')).toMatch(/not a Monday/));
  it('rejects an unknown call', () => expect(valid({ call: 'AMBER' })).toMatch(/call must be/));
  it('needs exactly three actions', () => expect(valid({ actions: ['a', 'b'] })).toMatch(/exactly 3/));
  it('needs the eight areas in order', () => expect(valid({ areas: [...written.areas].reverse() })).toMatch(/8 VRQA areas/));
  it('evidence cannot claim more unique files than files', () => expect(valid({ evidence: { submissions: 5, withFile: 3, unique: 4 } })).toMatch(/unique/));
  it('accepts an unrecorded device rule', () => expect(valid({ deviceRule: null })).toMatchObject({ deviceRule: null }));
  it('a theme can repeat on more than 7 days (the report looks back 4 weeks)', () => expect(valid({ words: [{ theme: 'Learn business', days: 14, quote: 'I need to learn business' }] })).toMatchObject({ words: [{ days: 14 }] }));
  it('names the word item that fails', () => expect(valid({ words: [{ theme: 'A', days: 2, quote: 'ok' }, { theme: 'B', days: 40, quote: 'x' }] })).toBe('words[1]: theme max 40 characters, days 0–31, quote max 200 characters'));
});

describe('buildWeekStory', () => {
  const sc = buildWeekStory(SAMPLE_WEEK);
  const get = (id: string) => sc.find(x => x.id === id) as any;
  it('full days count only Mon–Thu with all four blocks', () => expect(fullDays(SAMPLE_WEEK.days)).toBe(2));
  it('opens with the call', () => expect(sc[0].caption).toBe('Week 12 · 12–16 Oct: YELLOW. 2 full days out of 4.'));
  it('names strongest and quietest day', () => expect(get('days').caption).toBe('Mon was your strongest day with 6 logs. Fri was the quietest with 1.'));
  it('calls out empty learning areas', () => expect(get('areas').caption).toBe('7 of 8 learning areas covered. Languages had nothing.'));
  it('reused photos do not count', () => expect(get('evidence').caption).toBe('15 of 18 logs had a photo. 2 photos had been used before, so 13 count.'));
  it('flags the plateau', () => expect(get('topics').caption).toMatch(/^Ratios has been the same for 3 weeks/));
  it('quotes his most repeated words', () => expect(get('words').caption).toMatch(/^“slow down and read the question” came up 4 days/));
  it('unrecorded device rule gets no scene', () => expect(buildWeekStory({ ...SAMPLE_WEEK, deviceRule: null }).some(x => x.id === 'device')).toBe(false));
  it('skips empty optional scenes and keeps clean-records scene', () => {
    const lean = buildWeekStory({ ...SAMPLE_WEEK, topics: [], words: [], flags: [] });
    expect(lean.map(x => x.id)).toEqual(['call', 'days', 'device', 'areas', 'evidence', 'journals', 'strong', 'broke', 'flags', 'next']);
    expect(lean.find(x => x.id === 'flags')!.caption).toBe('Your records were clean this week.');
  });
  it('ends on the three actions', () => expect(sc[sc.length - 1]).toMatchObject({ id: 'next', items: SAMPLE_WEEK.actions }));
  it('splits more than 6 flags into pages with unique ids', () => {
    const flags = Array.from({ length: 12 }, (_, i) => ({ date: '2026-10-12', kind: 'Incomplete entry', detail: `Flag ${i}` }));
    const f = buildWeekStory({ ...SAMPLE_WEEK, flags }).filter(x => x.kind === 'flags');
    expect(f.map(x => [x.id, x.label, x.caption])).toEqual([['flags', 'Records 1/2', '12 record problems to put right.'], ['flags-2', 'Records 2/2', '6 more record problems to put right.']]);
  });
  it('does not claim a duration when the report gives none', () => {
    const t = buildWeekStory({ ...SAMPLE_WEEK, topics: [{ area: 'Maths', topic: 'Ratios', weeks: 0, plateau: true }] }).find(x => x.id === 'topics')!;
    expect(t.caption).toBe('Ratios has not moved on. Check you are moving forward.');
  });
});

describe('since last week', () => {
  const rows = trendRows(SAMPLE_WEEK, SAMPLE_PREV);
  const row = (l: string) => rows.find(r => r.label === l)!;
  it('compares the hand-worked figures', () => {
    expect(row('Full days')).toMatchObject({ before: 1, now: 2 });
    expect(row('Work logs')).toMatchObject({ before: 9, now: 18 });
    expect(row('Photos that count')).toMatchObject({ before: 9, now: 13 });
    expect(row('Journals')).toMatchObject({ before: 3, now: 2 });
  });
  it('fewer record problems counts as better', () => expect(better(row('Record problems'))).toBe(true));
  it('scene sits right after the call, with a plain caption', () => {
    const sc = buildWeekStory(SAMPLE_WEEK, SAMPLE_PREV);
    expect(sc[1]).toMatchObject({ id: 'trend', since: 'Week 11 · 5–9 Oct' });
    expect(sc[1].caption).toBe('RED last week, YELLOW this week. 4 things got better, 1 got worse.');
    expect(rows.filter(worse).map(r => r.label)).toEqual(['Journals']);
  });
  it('no previous film, no trend scene', () => expect(buildWeekStory(SAMPLE_WEEK).some(x => x.id === 'trend')).toBe(false));
});
