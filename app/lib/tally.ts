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

const NO_KEY = "TALLY_API_KEY is not set for this deploy";

const UNCONFIGURED: JournalEvidence = {
  configured: false, found: false, submittedAt: null, error: NO_KEY,
};

/**
 * Every day the form currently has a journal for, from ONE read.
 *
 * /api/journal-sync asks about more than one day (today and yesterday, its
 * grace window). Asking day by day would be two round trips to Tally for two
 * questions the same response already answers, and — worse — two chances for
 * the answers to disagree if a submission lands between them. One fetch, one
 * assignment pass, one map.
 */
export type JournalEvidenceMap = {
  configured: boolean;
  error: string | null;
  /** Sydney YYYY-MM-DD → the submission that owns that day. */
  byDate: Record<string, { submittedAt: string | null }>;
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

/** A calendar date at the start of a string, e.g. "2026-09-01" or an ISO stamp. */
const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/;

/**
 * WHICH DAY does this submission belong to — or null if it is not a journal?
 *
 * EXACTLY ONE DAY, NEVER TWO. This used to ask the opposite question ("does this
 * submission match day D?") and answer it generously: EITHER the child-entered
 * "Date of work" OR the Sydney date it landed on would do. That was harmless
 * while only one day was ever evaluated, and became a double-credit the moment
 * /api/journal-sync grew a one-day grace window — a journal written at 07:39
 * Thursday and honestly dated Wednesday matched Wednesday by its date field AND
 * Thursday by its landing time, earning two ticks for one piece of writing.
 * Turning the question around removes the overlap by construction: a submission
 * is assigned to one day, and a day then asks which submissions it owns.
 *
 * THE DATE HE PUTS ON THE FORM IS THE DAY IT COUNTS FOR. That is the whole rule,
 * and it is short enough to say to a ten-year-old. Tally marks "Date of work"
 * required and choosing "Daily Journal" is what reveals it, so it is always
 * present in practice; the landing date is a fallback for a submission that
 * somehow arrives without one, not a second chance at a different day.
 *
 * The other four conditions are unchanged:
 *   1. completed — a partial submission is a form someone opened, not a journal
 *   2. "What are you logging?" is Daily Journal — the whole discriminator
 *   3. Student is Ansar — the form is shared with his sister
 *   4. the "Journal entry" textarea is not empty — choosing "Daily Journal" from
 *      a dropdown is not writing one, and this is meant to require the writing
 */
function journalDayOf(
  sub: Submission,
  ids: Record<keyof typeof Q, string>,
): string | null {
  if (sub.isCompleted === false) return null;

  const kind = answerFor(sub, ids.kind);
  if (!kind.some(v => JOURNAL_VALUES.includes(v))) return null;

  const student = answerFor(sub, ids.student);
  if (!student.some(v => ANSAR_VALUES.includes(v))) return null;

  const entry = answerFor(sub, ids.entry);
  if (!entry.some(v => v.length > 0)) return null;

  for (const value of answerFor(sub, ids.dateOfWork)) {
    const hit = DATE_PREFIX.exec(value);
    if (hit) return hit[1];
  }

  // No usable "Date of work". Fall back to when it landed, in Sydney — never
  // UTC and never the machine's zone, so it agrees with the clock every gate in
  // this app is decided against.
  if (typeof sub.submittedAt === "string" && !Number.isNaN(Date.parse(sub.submittedAt))) {
    return sydneyDateKey(new Date(sub.submittedAt));
  }
  return null;
}

/* ── The read ────────────────────────────────────────────────────────────── */

let cache: { at: number; value: JournalEvidenceMap } | null = null;

/**
 * Every day the form has a journal for, as one map.
 *
 * `fresh` bypasses the 30-second memo. It changes only how stale the read is,
 * never what any caller concludes from it.
 *
 * NEVER THROWS. A network failure, a 401, or a response shaped differently than
 * expected all come back as `{ byDate: {}, error: "..." }`, and callers read the
 * error rather than the empty map. This function's job is to report what it
 * knows, including that it knows nothing.
 *
 * The memo is no longer keyed by date. It does not need to be: the map covers
 * every day in the fetch window at once, so one read answers today, yesterday
 * and anything else asked of it — and cannot serve one day's answer for another,
 * because each day has its own entry.
 */
export async function getJournalEvidenceMap(fresh = false): Promise<JournalEvidenceMap> {
  const key = process.env.TALLY_API_KEY;
  if (!key) return { configured: false, error: NO_KEY, byDate: {} };

  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.value;

  let value: JournalEvidenceMap;
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

    const byDate: JournalEvidenceMap["byDate"] = {};
    for (const s of submissions) {
      const day = journalDayOf(s, ids);
      if (!day) continue;
      const submittedAt = typeof s.submittedAt === "string" ? s.submittedAt : null;
      const held = byDate[day];
      /* Two journals filed for the same day: keep the EARLIER one. It is the
         submission that actually earned the day, and the recorded time should
         not drift later because he opened the form again to add a line. */
      if (held && held.submittedAt && submittedAt && held.submittedAt <= submittedAt) continue;
      byDate[day] = { submittedAt };
    }
    value = { configured: true, error: null, byDate };
  } catch (e) {
    value = {
      configured: true,
      error: e instanceof Error ? e.message : "Tally read failed",
      byDate: {},
    };
  }

  cache = { at: Date.now(), value };
  return value;
}

/**
 * Is there a Daily Journal submission for `date` (a Sydney YYYY-MM-DD)?
 *
 * A single-day view of the map above, kept because gate 6 and /api/tick ask
 * about exactly one day and have no use for the rest.
 */
export async function getJournalEvidence(date: string, fresh = false): Promise<JournalEvidence> {
  if (!process.env.TALLY_API_KEY) return UNCONFIGURED;

  const map = await getJournalEvidenceMap(fresh);
  const hit = map.byDate[date];
  return {
    configured: map.configured,
    found: Boolean(hit),
    submittedAt: hit?.submittedAt ?? null,
    error: map.error,
  };
}

/** Test seam. Drops the memo so a case cannot inherit the previous one's answer. */
export function __resetJournalEvidenceCache(): void {
  cache = null;
}
