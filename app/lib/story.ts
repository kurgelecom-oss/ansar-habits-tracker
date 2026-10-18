/* ════════════════════════════════════════════════════════════════════════════
   THE MONDAY STORY (tk, 18 Oct 2026). Replaces the Kawthar Weekly email.

   Each week's four-lens study (Qur'an → Sunnah → the scholars → the story)
   arrives as a full-screen feature on the board: image, the three short lenses,
   the story, then a check. Until he passes the check the board does not move
   on, exactly like a due paper: the server refuses every tick past the Morning
   Habits (api/tick, Gate 7). Passing queues one email to the parent address
   with the result and the reading metrics.

   STORAGE: no new tables. A story is the row `story:<monday>` and his session
   is `story-session:<monday>` in ansar_assessment_state (id, payload jsonb).

   DUE: from its Monday, every day after, until he passes. A story stored for a
   later Monday is not due yet. It never traps him: an unreadable store leaves
   the board open, the parent PIN lift for today (gate-bypass:<date>) lifts this
   too, and STORY_GATE=off switches the rule off.

   METRICS: active reading time is counted by the browser only while the page
   is visible AND he has scrolled, moved or pressed something in the last 30 s.
   The server never credits more than the wall time since the story opened, so
   leaving the tab open or editing the request cannot inflate it.
   ══════════════════════════════════════════════════════════════════════════ */
import { adminClient, hasServiceRole } from './supabase-admin';
import { sydneyDateKey, weekStartOf } from './time';

export const STORY_PASS = 80;
/** Stories for weeks before this never lock (nothing was published then). */
export const STORY_GATE_START = '2026-10-19';

export type StoryQuestion = { id: string; prompt: string; options: string[]; answer: number; why: string; section: string };
export type Story = {
  weekStart: string; topic: string; kicker: string; headline: string; deck: string;
  image: { src: string; alt: string; credit: string };
  lenses: { title: string; body: string }[];
  story: { title: string; paragraphs: string[]; pull: string };
  lesson: string;
  questions: StoryQuestion[];
  reflection: string;
  status: 'draft' | 'published';
};
export type PublicStory = Omit<Story, 'questions'> & { questions: Omit<StoryQuestion, 'answer' | 'why'>[]; minReadSeconds: number; words: number };
export type Attempt = { at: string; answers: Record<string, number>; score: number; total: number; wrong: string[]; activeAt?: number };
export type StorySession = { openedAt: string; lastBeat?: string; activeSeconds: number; maxScroll: number; attempts: Attempt[]; reflection?: string; completedAt?: string };

/** Words in everything he is asked to read. */
export function wordCount(s: Pick<Story, 'lenses' | 'story' | 'lesson'>): number {
  const text = [...s.lenses.map(l => l.body), ...s.story.paragraphs, s.lesson].join(' ');
  return text.split(/\s+/).filter(Boolean).length;
}
/** The check opens after this much active reading: 60% of the time at 200 wpm. */
export function minReadSeconds(words: number): number { return Math.round((words / 200) * 60 * 0.6); }

export function publicStory(s: Story): PublicStory {
  const words = wordCount(s);
  return { ...s, questions: s.questions.map(({ id, prompt, options, section }) => ({ id, prompt, options, section })), words, minReadSeconds: minReadSeconds(words) };
}

/** Marks a submission. No I/O. */
export function grade(s: Story, answers: Record<string, number>): { score: number; total: number; percentage: number; passed: boolean; wrong: string[] } {
  const wrong = s.questions.filter(q => answers[q.id] !== q.answer).map(q => q.id);
  const total = s.questions.length;
  const score = total - wrong.length;
  const percentage = total ? Math.round((score / total) * 100) : 0;
  return { score, total, percentage, passed: percentage >= STORY_PASS, wrong };
}

/** Is a story due today? No I/O. */
export function storyDue(today: string, story: Story | null, session: StorySession | null, bypassed: boolean): boolean {
  if (!story || bypassed || story.status !== 'published') return false;
  if (story.weekStart < STORY_GATE_START || story.weekStart > today) return false;
  return !session?.completedAt;
}

/**
 * Credits active time from the browser's count, but never more than the wall
 * time since the previous check-in (plus 5 s slack). Mutates lastBeat.
 */
export function creditSeconds(session: StorySession, reported: number, now = Date.now()): number {
  const since = Date.parse(session.lastBeat ?? session.openedAt);
  const allowance = Math.max(0, Math.floor((now - since) / 1000)) + 5;
  const claimed = Math.max(0, (Math.floor(reported) || 0) - session.activeSeconds);
  session.lastBeat = new Date(now).toISOString();
  const wall = Math.max(0, Math.floor((now - Date.parse(session.openedAt)) / 1000));
  // Never more than the wall clock since opening, however the beats are timed.
  // Not atomic: two simultaneous requests can share one gap, still under the wall cap.
  return Math.max(session.activeSeconds, Math.min(wall, session.activeSeconds + Math.min(claimed, allowance)));
}

/** After a failed check he reads for this long again before the next try. */
export const RETRY_READ_SECONDS = 60;
export function retryWait(session: StorySession): number {
  const last = session.attempts[session.attempts.length - 1];
  return last ? Math.max(0, (last.activeAt ?? 0) + RETRY_READ_SECONDS - session.activeSeconds) : 0;
}

const fmtMin = (s: number) => `${Math.floor(s / 60)} min ${s % 60} s`;
const fmtTime = (iso: string) => new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

/** The parent email. Plain text, so it survives every mail client. */
export function storyReport(s: Story, session: StorySession): { subject: string; text: string } {
  const last = session.attempts[session.attempts.length - 1];
  const words = wordCount(s);
  const lines = [
    `Ansar finished this week's Kawthar story.`,
    ``,
    `${s.headline} (${s.topic})`,
    ``,
    `RESULT`,
    `Check: ${last.score}/${last.total} on attempt ${session.attempts.length}`,
    ...session.attempts.slice(0, -1).map((a, i) => `  Attempt ${i + 1}: ${a.score}/${a.total} (missed ${a.wrong.map(id => s.questions.findIndex(q => q.id === id) + 1).map(n => `Q${n}`).join(', ')})`),
    ``,
    `READING`,
    `Opened: ${fmtTime(session.openedAt)}`,
    `Finished: ${fmtTime(session.completedAt!)}`,
    `Active reading time: ${fmtMin(session.activeSeconds)} (the piece is ${words} words, about ${Math.round(words / 200)} min at a steady pace)`,
    `Scrolled: ${Math.round(session.maxScroll)}% of the page`,
    ``,
    `QUESTIONS`,
    ...s.questions.map((q, i) => {
      const firstTry = session.attempts[0].answers[q.id];
      return `Q${i + 1}. ${q.prompt}\n    ${firstTry === q.answer ? 'Right first time' : `First try: "${q.options[firstTry] ?? 'no answer'}"; right answer: "${q.options[q.answer]}"`}`;
    }),
    ``,
    `HIS OWN WORDS`,
    `"${s.reflection}"`,
    session.reflection ? `> ${session.reflection}` : '> (nothing written)',
  ];
  return { subject: `Kawthar story · ${s.topic} · ${last.score}/${last.total} · ${fmtMin(session.activeSeconds)} reading`, text: lines.join('\n') };
}

/* ── I/O ─────────────────────────────────────────────────────────────────── */
const storyId = (monday: string) => `story:${monday}`;
const sessionId = (monday: string) => `story-session:${monday}`;

async function readState<T>(id: string): Promise<T | null> {
  const { data, error } = await adminClient().from('ansar_assessment_state').select('payload').eq('id', id).maybeSingle();
  if (error) throw new Error('Story store unreadable');
  return (data?.payload as T) ?? null;
}
async function writeState(id: string, payload: unknown): Promise<void> {
  const { error } = await adminClient().from('ansar_assessment_state').upsert({ id, payload, updated_at: new Date().toISOString() });
  if (error) throw new Error('Could not save the story');
}

export const saveStory = (s: Story) => writeState(storyId(s.weekStart), s);
export const saveSession = (monday: string, s: StorySession) => writeState(sessionId(monday), s);

/** This week's story and his session, or nulls. Throws only on a store error. */
export async function currentStory(today = sydneyDateKey()): Promise<{ story: Story | null; session: StorySession | null; bypassed: boolean }> {
  const monday = weekStartOf(today);
  const [story, session, bypass] = await Promise.all([
    readState<Story>(storyId(monday)), readState<StorySession>(sessionId(monday)), readState(`gate-bypass:${today}`),
  ]);
  return { story, session, bypassed: !!bypass };
}

/** Server half of the gate, for api/tick. Fails OPEN. */
export async function storyLock(today = sydneyDateKey()): Promise<{ locked: boolean; message: string }> {
  if (process.env.STORY_GATE === 'off' || !hasServiceRole()) return { locked: false, message: '' };
  try {
    const { story, session, bypassed } = await currentStory(today);
    return storyDue(today, story, session, bypassed)
      ? { locked: true, message: `Read this week's story and pass the check first.` }
      : { locked: false, message: '' };
  } catch {
    return { locked: false, message: '' };
  }
}
