import { describe, expect, it } from 'vitest';
import { buildWeekStory, fullDays, validateWeekReport } from './week-story';
import { SAMPLE_WEEK } from './week-story-sample';

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
  it('unrecorded device rule says so', () => expect(buildWeekStory({ ...SAMPLE_WEEK, deviceRule: null }).find(x => x.id === 'device')!.caption).toMatch(/not written down/));
  it('skips empty optional scenes and keeps clean-records scene', () => {
    const lean = buildWeekStory({ ...SAMPLE_WEEK, topics: [], words: [], flags: [] });
    expect(lean.map(x => x.id)).toEqual(['call', 'days', 'device', 'areas', 'evidence', 'journals', 'strong', 'broke', 'flags', 'next']);
    expect(lean.find(x => x.id === 'flags')!.caption).toBe('Your records were clean this week.');
  });
  it('ends on the three actions', () => expect(sc[sc.length - 1]).toMatchObject({ id: 'next', items: SAMPLE_WEEK.actions }));
});
