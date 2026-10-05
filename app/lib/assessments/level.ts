import { MASTERY_PASS } from './gate';
import type { Attempt, Levels, Placement, SubjectLevel } from './types';

/* Where he stands, read from marks that already exist. Nothing here marks
   anything: a monthly exam is marked when it is handed in, and the level check
   is the one paper that is there to be read rather than passed. */

type LevelAttempt = Pick<Attempt, 'paper_id' | 'status' | 'submitted_at' | 'answers' | 'result' | 'paper_snapshot'>;

/** The mark at or above which a subject is ahead of the plan. */
const AHEAD = 90;
/** The share of a year's questions that makes that year secure. */
const SECURE = 0.75;

export const isPlacement = (a: Pick<Attempt, 'paper_id'>) => a.paper_id.startsWith('placement:');

/** Latest marked monthly exam per subject, with the one before it for the trend. */
export function levelsFor(attempts: LevelAttempt[]): SubjectLevel[] {
  const bySubject = new Map<string, LevelAttempt[]>();
  for (const a of attempts) {
    if (a.paper_snapshot.is_practice === true || a.paper_snapshot.kind !== 'exam' || a.status === 'in_progress'
      || typeof a.result?.percentage !== 'number' || isPlacement(a)) continue;
    bySubject.set(a.paper_snapshot.subject, [...(bySubject.get(a.paper_snapshot.subject) ?? []), a]);
  }
  return [...bySubject].sort(([a], [b]) => a.localeCompare(b)).map(([subject, rows]) => {
    const [latest, previous] = rows.sort((a, b) => (b.submitted_at ?? '').localeCompare(a.submitted_at ?? ''));
    const percentage = latest.result!.percentage!;
    return {
      subject, percentage, month: latest.paper_snapshot.month,
      band: percentage >= AHEAD ? 'Ahead' : percentage >= MASTERY_PASS ? 'On track' : 'Needs another pass',
      previous: previous?.result?.percentage ?? null,
    };
  });
}

/**
 * Reads a maths level check: question ids carry the year (`y5-1` … `y7-8`).
 * Needs the full attempt, answer keys included, so it runs on the server only.
 */
export function placementFor(attempt: Pick<Attempt, 'answers' | 'paper_snapshot'>): Placement {
  const years = [5, 6, 7].map(year => {
    const questions = attempt.paper_snapshot.questions.filter(q => q.id.startsWith(`y${year}-`));
    return { year, correct: questions.filter(q => q.answer !== undefined && attempt.answers[q.id] === q.answer).length, total: questions.length };
  });
  const [y5, y6, y7] = years.map(y => y.total > 0 && y.correct / y.total >= SECURE);
  const statement = !y5 ? 'Gaps in Year 5 work to close first.'
    : !y6 ? 'Secure in Year 5, working through Year 6. This is where a Year 6 student is expected to be mid-year; watch the gaps.'
    : !y7 ? 'Secure in Year 6. On track, ready to start Year 7 work.'
    : 'Secure in Year 7 work. Ahead: he needs harder maths than the plan gives him.';
  return { years, statement };
}

/** Everything the Tests room shows under "Level", from all of his exam attempts. */
export function levelSummary(attempts: LevelAttempt[]): Levels {
  const check = attempts.filter(a => isPlacement(a) && a.status !== 'in_progress' && a.paper_snapshot.is_practice !== true)
    .sort((a, b) => (b.submitted_at ?? '').localeCompare(a.submitted_at ?? ''))[0];
  return { subjects: levelsFor(attempts), placement: check ? placementFor(check) : null };
}
