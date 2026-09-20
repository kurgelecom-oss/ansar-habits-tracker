import { describe, expect, it } from 'vitest';
import { buildWeeklyReview, fridayFor, mapProgramme, type NotionPage } from './curriculum';
import type { Lesson } from './types';

function row(label: string, task: string, date = '2026-09-14'): NotionPage {
  const text = (plain_text: string) => ({ rich_text: [{ plain_text }] });
  return { id: 'page-1', properties: { Date: { date: { start: date } }, Label: text(label), Task: text(task), 'Day Topic': text('Ottoman ships'), Week: text('Week 10') } };
}
const lesson: Lesson = { id: 'source', date: '2026-08-31', subject: 'Maths', task: 'Work out the cost of 30 sacks at 2 coins each.', topic: 'Trade', week: 'Week 1', guide: [], url: '' };

describe('curriculum mapping', () => {
  it('splits combined subjects without leaking app tasks between them', () => {
    const { lessons } = mapProgramme([row('Block 4 — Technologies + Languages', 'Scratch or Code.org 35 min — build something. Then Duolingo Turkish 10 min.')], []);
    expect(lessons.map(l => l.subject)).toEqual(['Languages', 'Technologies']);
    expect(lessons.find(l => l.subject === 'Languages')?.task).toBe('Duolingo Turkish 10 min.');
    expect(lessons.find(l => l.subject === 'Technologies')?.task).not.toMatch(/Duolingo/);
  });
  it('maps skills mix and grammar to stable learning areas', () => {
    const result = mapProgramme([row('Skills mix', 'Typing.com 15 min. Duolingo Turkish 10 min. EverFi 20 min.')], []);
    expect(result.lessons.map(l => l.subject).sort()).toEqual(['HASS', 'Languages', 'Technologies']);
    expect(mapProgramme([row('Grammar', 'Use commas in your essay.')], []).lessons[0].subject).toBe('English');
  });
  it('excludes flex instructions, missing dates and impossible dates', () => {
    expect(mapProgramme([row('Review + tidy', 'Present work'), row('Go deeper', 'Extend it'), row('Maths', 'Count', ''), row('Maths', 'Count', '2026-02-30')], []).lessons).toEqual([]);
  });
  it('keeps inactive rows and uses date in snapshot identity', () => {
    const older = mapProgramme([row('Maths', 'Fractions', '2026-08-31')], []).lessons[0];
    const newer = mapProgramme([row('Maths', 'Fractions', '2026-09-07')], []).lessons[0];
    expect(older.id).not.toBe(newer.id);
    expect(older.date).toBe('2026-08-31');
  });
});

describe('weekly papers', () => {
  it('assigns Friday correctly over month and DST boundaries', () => {
    expect(fridayFor('2026-08-31')).toBe('2026-09-04');
    expect(fridayFor('2026-09-18')).toBe('2026-09-18');
    expect(fridayFor('2026-10-04')).toBe('2026-10-09');
  });
  it('creates four source-linked recall prompts in Friday month', () => {
    const paper = buildWeeklyReview([lesson], fridayFor(lesson.date));
    expect(paper.id).toBe('review:2026-09-04:maths');
    expect(paper.month).toBe('2026-09');
    expect(paper.opens_on).toBe(paper.due_date);
    expect(paper.status).toBe('published');
    expect(paper.questions).toHaveLength(4);
    expect(paper.questions.every(q => q.type === 'written' && q.sourceIds.includes(lesson.id))).toBe(true);
    expect(paper.questions[0].prompt).toContain(lesson.date);
    expect(paper.questions[0].prompt).toContain(lesson.topic);
    expect(paper.questions[0].prompt).not.toContain(lesson.task);
    expect(paper.lessons[0].task).toBe(lesson.task);
  });
});
