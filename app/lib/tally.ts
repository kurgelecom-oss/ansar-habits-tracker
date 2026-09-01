/* ════════════════════════════════════════════════════════════════════════════
   THE JOURNAL EVIDENCE READER.

   One question: did Ansar file a "Daily Journal" entry on the Tally form for a
   given Sydney date? Nothing else in this file, and nothing else may use it to
   decide anything but that.

   WHY IT EXISTS. Until now the journal row was tickable by anyone who could
   reach the board, having written nothing — the tick was the child's own word
   and there was no second record to check it against. app/dashboard/types.ts
   has always reserved a VERIFIED state "so the future Tally-matching phase has
   somewhere to put a real answer". This is that phase.

   THE FORM IS THE ONE THE BOARD ALREADY EMBEDS. app/page.tsx opens form ODKlVa
   in the Log Work modal; this reads the same form's submissions from the server
   side. The id is written down in both places rather than imported, because
   page.tsx is a client component and this module holds the API key — importing
   it there would pull the reader into the browser bundle to save a string. Both
   copies must move together if the form is ever replaced. The failure otherwise
   is a board that embeds one form and gates on another, which presents as "the
   gate is broken" rather than as a typo.

   IT NEVER WRITES. No tick, no completion, no Supabase. It answers a question
   and the gate in /api/tick decides what that answer is worth. A reader that
   could also write is a reader that can auto-tick, and an auto-tick is exactly
   what was ruled out: the box still has to be tapped, in its window, by a child
   who has actually written something.
   ══════════════════════════════════════════════════════════════════════════ */

import { sydneyDateKey } from "./time";

/** The Log Work form. Same id app/page.tsx embeds — see TALLY_FORM_SRC there. */
export const FORM_ID = "ODKlVa";

const API_ROOT = "https://api.tally.so";

/**
 * How many recent submissions to scan.
 *
 * The form takes work submissions, daily goals and the journal, and a busy day
 * has run to eight rows. 50 covers roughly a week of that, which is far more
 * than the one day this ever asks about — but a limit that is merely "enough
 * for today" is the limit that silently misses today's journal on the day the
 * homeschool session is logged subject by subject.
 */
const PAGE_LIMIT = 50;

/**
 * Cache lifetime. Deliberately much shorter than lib/notion.ts's five minutes.
 *
 * This gates a TAP. The child submits the journal in the modal and reaches for
 * the row seconds later, and "I just wrote it and it still says locked" is the
 * failure that would get the whole gate turned off. Thirty seconds is the
 * outside edge of that, and both callers can bypass it: the board asks for a
 * fresh read the moment Tally posts its FormSubmitted message, and /api/tick
 * re-checks fresh before it refuses a tick on this ground.
 */
const CACHE_MS = 30_000;

/* ── The form's own identifiers ──────────────────────────────────────────────
   Question ids are Tally's short per-question ids as returned by the
   submissions API. Option values arrive either as the option's display text or
   as its block UUID depending on how the form was built, so BOTH are written
   down and either one matches. Guessing one and hoping is how this reads
   "no journal today" forever on the day Tally changes its answer encoding. */
const Q = {
  /** "What are you logging?" — the discriminator this whole file turns on. */
  kind: "RYRxBl",
  /** "Student" — the form is shared with Ayah. */
  student: "PYldYx",
  /** "Date of work" — child-entered, and the reason submittedAt also counts. */
  dateOfWork: "EDLkD2",
  /** "Journal entry" — the prose itself. Presence is what makes it evidence. */
  entry: "OYLaBK",
} as const;

/** Question titles, as a fallback if Tally ever reissues the short ids. */
const Q_TITLE: Record<keyof typeof Q, string> = {
  kind: "What are you logging?",
  student: "Student",
  dateOfWork: "Date of work",
  entry: "Journal entry",
};

/** Accepted answers for "What are you logging?" = the journal. Text or UUID. */
const JOURNAL_VALUES = [
  "daily journal",
  "0a8f0715-5675-4dfa-b32a-f66d64796a42",
];

/** Accepted answers for "Student" = Ansar. Text or UUID. */
const ANSAR_VALUES = [
  "ansar",
  "8e79ee9c-96b6-45d0-a880-c5018e4ea9b9",
];

/* ── The answer ──────────────────────────────────────────────────────────── */

/**
 * What the reader knows about one day's journal.
 *
 * `error` and `found` are SEPARATE FIELDS and the distinction is the whole
 * point. "Tally answered, and there is no journal today" is a refusal the child
 * can fix by writing one. "Tally could not be reached" is not — and a gate that
 * cannot tell them apart will one day cost a perfect day to an outage. The gate
 * refuses only on the first.
 */
export type JournalEvidence = {
  /** Is TALLY_API_KEY set for this deploy? False means the gate cannot run. */
  configured: boolean;
  /** A matching Daily Journal submission exists for the date. */
  found: boolean;
  /** When it landed, UTC ISO-8601, or null when nothing matched. */
  submittedAt: string | null;
  /** Why the answer is unknown. Non-null means `found` means nothing. */
  error: string | null;
};

const UNCONFIGURED: JournalEvidence = {
  configured: false, found: false, submittedAt: null,
  error: "TALLY_API_KEY is not set for this deploy",
};

/* ── Answer shapes ───────────────────────────────────────────────────────── */

/**
 * Every string inside a Tally answer, lowercased and trimmed.
 *
 * An answer is a bare string for text and date questions, and an array for
 * choice questions — and each element of that array is either the option's text
 * or its UUID. Flattening both into one lowercase list means the caller writes
 * `includes`, not a shape check, and an encoding change on Tally's side lands
 * as a value that is simply also in the list.
 */
function answerStrings(answer: unknown): string[] {
  if (typeof answer === "string") return [answer.trim().toLowerCase()];
  if (Array.isArray(answer)) return answer.flatMap(answerStrings);
  return [];
}

type Question = { id?: unknown; title?: unknown };
type Response = { questionId?: unknown; answer?: unknown };
type Submission = {
  isCompleted?: unknown;
  submittedAt?: unknown;
  responses?: unknown;
};

/**
 * Resolve one of our four questions to the id this response set actually uses.
 *
 * The short id is tried first because it is what the API returned when this was
 * written. The title is the fallback: if Tally ever reissues ids, the question
 * text is what survives, and a reader that only knew the id would quietly stop
 * finding the journal rather than failing loudly.
 */
function resolveQuestionId(questions: Question[], key: keyof typeof Q): string {
  const wanted = Q[key];
  if (questions.some(q => q.id === wanted)) return wanted;
  const byTitle = questions.find(
    q => typeof q.title === "string" && q.title.trim() === Q_TITLE[key],
  );
  return typeof byTitle?.id === "string" ? byTitle.id : wanted;
}

/** The answer to one question within one submission, flattened to strings. */
function answerFor(submission: Submission, questionId: string): string[] {
  const responses = Array.isArray(submission.responses)
    ? (submission.responses as Response[])
    : [];
  const hit = responses.find(r => r.questionId === questionId);
  return hit ? answerStrings(hit.answer) : [];
}

/**
 * Does this submission count as today's journal?
 *
 * FOUR CONDITIONS, and the date one is deliberately generous:
 *
 *   1. completed — a partial submission is a form someone opened, not a journal
 *   2. "What are you logging?" is Daily Journal — the whole discriminator
 *   3. Student is Ansar — the form is shared with his sister
 *   4. the "Journal entry" textarea is not empty — choosing "Daily Journal" from
 *      a dropdown is not writing one, and the gate is meant to require the
 *      writing. Tally marks the field required, so this only ever catches a
 *      submission that reached us some other way
 *   5. it belongs to `date`, by EITHER the child-entered "Date of work" OR the
 *      Sydney date the submission actually landed on
 *
 * Condition 5 is an OR because the two fields genuinely disagree in the real
 * data. The journal filed at 07:39 Sydney on 2 Sep carried a "Date of work" of
 * 2 Sep while its prose narrated the 1st; one filed at 21:42 on 31 Aug had them
 * agreeing. Requiring both would refuse a journal that was plainly written, and
 * requiring only the child-entered one puts the gate behind a date picker a
 * ten-year-old is typing at bedtime. Either field naming the day is enough — and
 * being generous here costs nothing, because passing this gate still only earns
 * the right to TAP the row inside its 21:00–21:30 window.
 */
function matches(sub: Submission, ids: Record<keyof typeof Q, string>, date: string): boolean {
  if (sub.isCompleted === false) return false;

  const kind = answerFor(sub, ids.kind);
  if (!kind.some(v => JOURNAL_VALUES.includes(v))) return false;

  const student = answerFor(sub, ids.student);
  if (!student.some(v => ANSAR_VALUES.includes(v))) return false;

  const entry = answerFor(sub, ids.entry);
  if (!entry.some(v => v.length > 0)) return false;

  const dateOfWork = answerFor(sub, ids.dateOfWork).some(v => v.startsWith(date));
  const landedOn = typeof sub.submittedAt === "string"
    && !Number.isNaN(Date.parse(sub.submittedAt))
    && sydneyDateKey(new Date(sub.submittedAt)) === date;

  return dateOfWork || landedOn;
}

/* ── The read ────────────────────────────────────────────────────────────── */

let cache: { at: number; date: string; value: JournalEvidence } | null = null;

/**
 * Is there a Daily Journal submission for `date` (a Sydney YYYY-MM-DD)?
 *
 * `fresh` bypasses the 30-second memo. It changes only how stale the read is,
 * never what the gate concludes from it.
 *
 * NEVER THROWS. A network failure, a 401, or a response shaped differently than
 * expected all come back as `{ found: false, error: "..." }`, and the gate reads
 * the error rather than the false. This function's job is to report what it
 * knows, including that it knows nothing.
 */
export async function getJournalEvidence(date: string, fresh = false): Promise<JournalEvidence> {
  const key = process.env.TALLY_API_KEY;
  if (!key) return UNCONFIGURED;

  if (!fresh && cache && cache.date === date && Date.now() - cache.at < CACHE_MS) {
    return cache.value;
  }

  let value: JournalEvidence;
  try {
    const res = await fetch(
      `${API_ROOT}/forms/${FORM_ID}/submissions?page=1&limit=${PAGE_LIMIT}&filter=completed`,
      {
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        // Ours is the cache above: in-process, explicit, and 30 seconds. Next's
        // fetch cache would add a second invisible layer with its own lifetime.
        cache: "no-store",
      },
    );
    if (!res.ok) {
      // The status is the whole diagnosis — 401 is a bad key, 403 a plan that
      // does not include the API, 404 a form id that moved. None of them leak
      // the key itself, which is why the status is quoted and the body is not.
      throw new Error(`Tally ${FORM_ID}: ${res.status} ${res.statusText}`);
    }
    const body = (await res.json()) as {
      questions?: unknown; submissions?: unknown;
    };
    const questions = Array.isArray(body.questions) ? (body.questions as Question[]) : [];
    const submissions = Array.isArray(body.submissions) ? (body.submissions as Submission[]) : [];

    const ids = {
      kind: resolveQuestionId(questions, "kind"),
      student: resolveQuestionId(questions, "student"),
      dateOfWork: resolveQuestionId(questions, "dateOfWork"),
      entry: resolveQuestionId(questions, "entry"),
    };

    const hit = submissions.find(s => matches(s, ids, date));
    value = {
      configured: true,
      found: Boolean(hit),
      submittedAt: typeof hit?.submittedAt === "string" ? hit.submittedAt : null,
      error: null,
    };
  } catch (e) {
    value = {
      configured: true,
      found: false,
      submittedAt: null,
      error: e instanceof Error ? e.message : "Tally read failed",
    };
  }

  cache = { at: Date.now(), date, value };
  return value;
}

/** Test seam. Drops the memo so a case cannot inherit the previous one's answer. */
export function __resetJournalEvidenceCache(): void {
  cache = null;
}
