/* ════════════════════════════════════════════════════════════════════════════
   THE ASSESSMENT LOCK (tk, 5 Oct 2026).

   The Friday review and the monthly exam are part of the programme, not an
   optional tab. While one is due and has not been handed in, the board does not
   move on: the Homeschool tick, the afternoon and evening habits, school block
   ticks, the Stretch Wallet and the league tables all stay locked.

   WHAT STAYS OPEN: the Morning Habits. They have a 6:30 to 8:30 window, and a
   paper must never cost him the morning.

   WHAT COUNTS AS DUE
     Friday review   its Friday, and every day after it until it is handed in.
     Monthly exam    during the exam's own window (opens_on to due_date). The
                     month's exams are spread over the school days left in the
                     window: today's share is what locks, not all of them.

   WHAT COUNTS AS DONE: Ansar submitting it. A parent's marking is not required
   to lift the lock, because he cannot make that happen.

   IT NEVER TRAPS HIM. The lock applies only to a paper he can actually open: a
   published one. An exam still waiting for a parent's approval does not lock
   anything. If the papers cannot be read at all, the board stays OPEN. This is
   the opposite of the leagues rule on purpose: an outage that hides the league
   tables costs nothing, an outage that freezes the whole day costs the day.

   A parent can lift it for one day with the parent PIN (the gate route). And
   ASSESSMENT_GATE=off in the environment switches the whole rule off.

   Papers due before GATE_START never lock: September's unsubmitted recalls
   predate the rule and must not freeze the board the day this ships.
   ══════════════════════════════════════════════════════════════════════════ */
import { adminClient, hasServiceRole } from '../supabase-admin';
import { addDays, dayNameOf, sydneyDateKey } from '../time';

export const GATE_START = '2026-10-09';

export type DuePaper = { id: string; kind: 'review' | 'exam'; title: string };
export type AssessmentLock =
  | { locked: false }
  | { locked: true; due: DuePaper[]; message: string };

type PaperRow = { id: string; kind: 'review' | 'exam'; title: string; status: string; due_date: string; opens_on: string };
type AttemptRow = { paper_id: string; status: string; submitted_at: string | null };

const isSchoolDay = (date: string) => !['Saturday', 'Sunday'].includes(dayNameOf(date));

/** School days from `from` to `to`, both included. */
export function schoolDaysBetween(from: string, to: string): number {
  let n = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) if (isSchoolDay(d)) n++;
  return n;
}

/** The rule, with no I/O. `papers` are learner papers only. */
export function lockFor(today: string, papers: PaperRow[], attempts: AttemptRow[], bypassed: boolean): AssessmentLock {
  if (bypassed) return { locked: false };
  const handedIn = new Set(attempts.filter(a => a.status !== 'in_progress').map(a => a.paper_id));
  const open = papers.filter(p => p.status === 'published' && p.due_date >= GATE_START && !handedIn.has(p.id));

  const reviews = open.filter(p => p.kind === 'review' && p.due_date <= today);

  // Exams: only inside their window, only on a school day, and only today's share.
  const exams = isSchoolDay(today)
    ? open.filter(p => p.kind === 'exam' && p.opens_on <= today && today <= p.due_date)
    : [];
  let examsDue: PaperRow[] = [];
  if (exams.length) {
    const doneToday = attempts.filter(a => a.status !== 'in_progress' && a.submitted_at
      && sydneyDateKey(new Date(a.submitted_at)) === today
      && papers.some(p => p.id === a.paper_id && p.kind === 'exam')).length;
    const lastDay = exams.map(p => p.due_date).sort()[0];             // the tightest deadline sets the pace
    const daysLeft = Math.max(1, schoolDaysBetween(today, lastDay));
    const shareToday = Math.ceil((exams.length + doneToday) / daysLeft) - doneToday;
    examsDue = exams.slice(0, Math.max(0, shareToday));
  }

  const due = [...reviews, ...examsDue].map(({ id, kind, title }) => ({ id, kind, title }));
  if (!due.length) return { locked: false };
  const what = due.length === 1 ? due[0].title : `${due.length} papers`;
  return { locked: true, due, message: `Locked until ${what} ${due.length === 1 ? 'is' : 'are'} handed in. Open Tests to do ${due.length === 1 ? 'it' : 'them'}.` };
}

const bypassId = (date: string) => `gate-bypass:${date}`;

export async function assessmentLock(today: string = sydneyDateKey()): Promise<AssessmentLock> {
  if (process.env.ASSESSMENT_GATE === 'off' || !hasServiceRole()) return { locked: false };
  try {
    const db = adminClient();
    const [papers, bypass] = await Promise.all([
      db.from('ansar_assessment_papers').select('id,kind,title,status,due_date,opens_on')
        .or('is_practice.eq.false,is_practice.is.null').eq('status', 'published')
        .gte('due_date', GATE_START).lte('opens_on', today),
      db.from('ansar_assessment_state').select('id').eq('id', bypassId(today)).maybeSingle(),
    ]);
    if (papers.error || bypass.error) return { locked: false };
    const rows = (papers.data ?? []) as PaperRow[];
    if (!rows.length) return { locked: false };
    const attempts = await db.from('ansar_assessment_attempts').select('paper_id,status,submitted_at').in('paper_id', rows.map(p => p.id));
    if (attempts.error) return { locked: false };
    return lockFor(today, rows, (attempts.data ?? []) as AttemptRow[], !!bypass.data);
  } catch {
    return { locked: false };   // never trap him on an outage
  }
}

/** A parent lifts the lock for today only. The caller has already verified the PIN. */
export async function liftLockForToday(today: string = sydneyDateKey()): Promise<void> {
  const { error } = await adminClient().from('ansar_assessment_state')
    .upsert({ id: bypassId(today), payload: { liftedBy: 'parent' }, updated_at: new Date().toISOString() });
  if (error) throw new Error('Could not lift the lock.');
}
