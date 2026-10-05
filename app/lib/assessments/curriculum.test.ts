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
  it('creates one weekly review asking about each subject\'s days, and a final uncertainty prompt', () => {
    const science: Lesson = { ...lesson, id: 'science-source', date: '2026-09-02', subject: 'Science', task: 'Float a foil hull and load it with coins.', topic: 'Floating' };
    const paper = buildWeeklyReview([science, lesson], fridayFor(lesson.date));
    expect(paper.id).toBe('review:2026-09-04:week');
    expect(paper.month).toBe('2026-09');
    expect(paper.opens_on).toBe(paper.due_date);
    expect(paper.status).toBe('published');
    expect(paper.questions.map(q => q.id)).toEqual([`q-maths-${lesson.date}`, 'q-science-2026-09-02', 'q-unclear']);
    expect(paper.questions[0].prompt).toMatch(/what was the task, what did you do/);
    expect(paper.questions.every(q => q.type === 'written')).toBe(true);
    expect(paper.questions[0].sourceIds).toEqual([lesson.id]);
    expect(paper.questions[1].sourceIds).toEqual([science.id]);
    expect(paper.questions[2].sourceIds).toEqual([science.id, lesson.id]);
    expect(paper.questions[0].prompt).toContain(lesson.date);
    expect(paper.questions[0].prompt).toContain(lesson.topic);
    expect(paper.questions[0].prompt).not.toContain(lesson.task);
    expect(paper.questions[0].prompt).not.toContain(science.topic);
    expect(paper.lessons).toHaveLength(2);
    expect(paper.questions.every(q => /0 =/.test(q.rubric || '') && /1 =/.test(q.rubric || '') && /2 =/.test(q.rubric || ''))).toBe(true);
    expect(paper.questions[2].rubric).toContain('Do not penalize admitting uncertainty');
    // Marking a written recall must never require attesting to a practical demonstration.
    expect(paper.coverage_note).not.toMatch(/practical|demonstration/i);
  });
});

describe('weekly review day selection', () => {
  it('asks about the first and last day of a subject worked on all week', () => {
    const day = (date: string): Lesson => ({ id: `m-${date}`, date, subject: 'Maths', task: 'Fractions', topic: 'Istanbul', week: 'W1', guide: [], url: '' });
    const paper = buildWeeklyReview(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'].map(day), '2026-10-09');
    expect(paper.questions.map(q => q.id)).toEqual(['q-maths-2026-10-05', 'q-maths-2026-10-08', 'q-unclear']);
    expect(paper.questions[0].prompt).toContain('Monday');
    expect(paper.questions[0].prompt).not.toContain('Fractions');
  });
});
