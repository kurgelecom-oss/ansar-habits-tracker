import { describe, expect, it } from 'vitest';
import { creditSeconds, grade, publicStory, storyDue, storyReport, type StorySession } from './story';
import { SAMPLE_STORY } from './story-sample';

const live = { ...SAMPLE_STORY, status: 'published' as const, weekStart: '2026-10-26' };
const right = Object.fromEntries(SAMPLE_STORY.questions.map(q => [q.id, q.answer]));

describe('storyDue', () => {
  it('is due from its Monday until passed', () => {
    expect(storyDue('2026-10-26', live, null, false)).toBe(true);
    expect(storyDue('2026-10-29', live, { openedAt: '', activeSeconds: 0, maxScroll: 0, attempts: [] }, false)).toBe(true);
    expect(storyDue('2026-10-29', live, { openedAt: '', activeSeconds: 0, maxScroll: 0, attempts: [], completedAt: 'x' }, false)).toBe(false);
  });
  it('never locks for drafts, future weeks, a parent lift, or before the start', () => {
    expect(storyDue('2026-10-26', SAMPLE_STORY, null, false)).toBe(false);
    expect(storyDue('2026-10-25', live, null, false)).toBe(false);
    expect(storyDue('2026-10-26', live, null, true)).toBe(false);
    expect(storyDue('2026-10-05', { ...live, weekStart: '2026-10-05' }, null, false)).toBe(false);
  });
});

describe('grade', () => {
  it('passes at 80% and names the misses', () => {
    expect(grade(SAMPLE_STORY, right)).toMatchObject({ score: 6, passed: true, wrong: [] });
    expect(grade(SAMPLE_STORY, { ...right, q1: 0 })).toMatchObject({ score: 5, passed: true, wrong: ['q1'] });
    expect(grade(SAMPLE_STORY, { ...right, q1: 0, q2: 0 })).toMatchObject({ score: 4, passed: false });
  });
});

describe('metrics', () => {
  it('never credits more than the wall clock since opening', () => {
    const s: StorySession = { openedAt: new Date(Date.now() - 60_000).toISOString(), activeSeconds: 10, maxScroll: 0, attempts: [] };
    expect(creditSeconds({ ...s }, 9999)).toBeLessThanOrEqual(76);
    expect(creditSeconds({ ...s }, 5)).toBe(10);
    const beat = { ...s, lastBeat: new Date().toISOString() };
    expect(creditSeconds(beat, 9999)).toBeLessThanOrEqual(15);   // a forged count earns only the gap since the last check-in
  });
  it('the public story carries no answers', () => {
    expect(JSON.stringify(publicStory(SAMPLE_STORY).questions)).not.toMatch(/"answer"|"why"/);
  });
  it('report names first-try misses and the reflection', () => {
    const at = '2026-10-26T00:00:00.000Z';
    const r = storyReport(SAMPLE_STORY, { openedAt: at, completedAt: at, activeSeconds: 610, maxScroll: 100, reflection: 'Because he became a man.',
      attempts: [{ at, answers: { ...right, q1: 0, q2: 0 }, score: 4, total: 6, wrong: ['q1', 'q2'] }, { at, answers: right, score: 6, total: 6, wrong: [] }] });
    expect(r.subject).toContain('6/6');
    expect(r.text).toContain('attempt 2');
    expect(r.text).toContain('10 min 10 s');
    expect(r.text).toContain('Because he became a man.');
  });
});
