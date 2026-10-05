import { describe, expect, it } from 'vitest';
import { levelSummary, levelsFor, placementFor } from './level';
import type { Attempt, Paper, Question } from './types';

const paper = (id: string, subject: string, month: string, extra: Partial<Paper> = {}): Paper =>
  ({ id, kind: 'exam', month, due_date: `${month}-28`, opens_on: `${month}-22`, subject, title: `${subject} exam`, status: 'published', duration_minutes: 25, questions: [], lessons: [], coverage_note: '', ...extra });
const sat = (p: Paper, percentage: number | null, at: string, extra: Partial<Attempt> = {}): Attempt =>
  ({ id: `${p.id}:${at}`, paper_id: p.id, status: 'submitted', answers: {}, started_at: at, expires_at: null, submitted_at: at, result: { objectiveCorrect: 0, objectiveTotal: 0, writtenPending: 0, writtenPoints: 0, writtenTotal: 0, percentage, summary: '', gaps: [] }, parent_review: null, correction: null, correction_at: null, revision: 1, paper_snapshot: p, ...extra });

// A level check: eight questions a year, the right answer always option 1.
const questions: Question[] = [5, 6, 7].flatMap(year => Array.from({ length: 8 }, (_, i) =>
  ({ id: `y${year}-${i + 1}`, prompt: `Year ${year} question ${i + 1}`, type: 'choice' as const, options: ['a', 'b', 'c', 'd'], answer: 1, sourceIds: [] })));
const check = paper('placement:2026-10:maths', 'Maths', '2026-10', { questions });
/** An attempt that gets the first `n` questions right in each year. */
const checked = (y5: number, y6: number, y7: number) => sat(check, 50, '2026-10-13T02:00:00Z', {
  answers: Object.fromEntries(questions.map(q => { const [year, n] = q.id.slice(1).split('-').map(Number); return [q.id, n <= { 5: y5, 6: y6, 7: y7 }[year]! ? 1 : 0]; })),
});

describe('levelsFor', () => {
  it('bands the latest monthly exam per subject and keeps the one before it', () => {
    expect(levelsFor([
      sat(paper('exam:2026-09:Maths', 'Maths', '2026-09'), 72, '2026-09-28T02:00:00Z'),
      sat(paper('exam:2026-10:Maths', 'Maths', '2026-10'), 84, '2026-10-28T02:00:00Z'),
      sat(paper('exam:2026-10:English', 'English', '2026-10'), 90, '2026-10-27T02:00:00Z'),
      sat(paper('exam:2026-10:Science', 'Science', '2026-10'), 79, '2026-10-26T02:00:00Z'),
    ])).toEqual([
      { subject: 'English', percentage: 90, month: '2026-10', band: 'Ahead', previous: null },
      { subject: 'Maths', percentage: 84, month: '2026-10', band: 'On track', previous: 72 },
      { subject: 'Science', percentage: 79, month: '2026-10', band: 'Needs another pass', previous: null },
    ]);
  });

  it('puts the pass mark itself on track', () => {
    expect(levelsFor([sat(paper('exam:2026-10:Maths', 'Maths', '2026-10'), 80, '2026-10-28T02:00:00Z')])[0].band).toBe('On track');
  });

  it('ignores practice, reviews, unmarked and unfinished work, and the level check', () => {
    const maths = paper('exam:2026-10:Maths', 'Maths', '2026-10');
    expect(levelsFor([
      sat({ ...maths, is_practice: true }, 95, '2026-10-28T02:00:00Z'),
      sat({ ...maths, kind: 'review' }, 95, '2026-10-28T02:00:00Z'),
      sat(maths, null, '2026-10-28T02:00:00Z'),
      sat(maths, 95, '2026-10-28T02:00:00Z', { status: 'in_progress' }),
      checked(8, 8, 8),
    ])).toEqual([]);
  });
});

describe('placementFor', () => {
  it('counts each year from the answer key', () => {
    expect(placementFor(checked(8, 6, 2)).years).toEqual([{ year: 5, correct: 8, total: 8 }, { year: 6, correct: 6, total: 8 }, { year: 7, correct: 2, total: 8 }]);
  });

  it('calls a year secure at 75% and reads the level from the first year that is not', () => {
    expect(placementFor(checked(5, 8, 8)).statement).toBe('Gaps in Year 5 work to close first.');
    expect(placementFor(checked(6, 5, 8)).statement).toBe('Secure in Year 5, working through Year 6. This is where a Year 6 student is expected to be mid-year; watch the gaps.');
    expect(placementFor(checked(6, 6, 5)).statement).toBe('Secure in Year 6. On track, ready to start Year 7 work.');
    expect(placementFor(checked(6, 6, 6)).statement).toBe('Secure in Year 7 work. Ahead: he needs harder maths than the plan gives him.');
  });
});

describe('levelSummary', () => {
  it('reads a handed-in level check and leaves an open one alone', () => {
    expect(levelSummary([checked(8, 6, 2)]).placement?.statement).toMatch(/^Secure in Year 6\./);
    expect(levelSummary([{ ...checked(8, 6, 2), status: 'in_progress' }])).toEqual({ subjects: [], placement: null });
  });
});
