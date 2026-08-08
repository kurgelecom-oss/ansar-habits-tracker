/* ════════════════════════════════════════════════════════════════════════════
   THE GOLDEN BOOT — finalised weeks, and the streak counted off them.

   Two halves, deliberately separated:

     • PURE       computeWeek / isFinalizable / trailingFirstTeamStreak / …
                  No I/O, no clock, no Supabase. Each takes what it needs as an
                  argument, which is what makes them testable against real
                  history without a database.
     • PERSISTED  finalizeWeeks / loadWeekResults / …
                  Each takes a SupabaseClient as its FIRST ARGUMENT. This module
                  never calls adminClient() and never reads
                  SUPABASE_SERVICE_ROLE_KEY, so it cannot drag the key into a
                  client bundle no matter who imports it. The route supplies the
                  privileged client; this file only knows how to use one.

   WHY FINALISE AT ALL. The live /55 on the board is recomputed from raw
   habit_completions on every load. That is right for the week in progress and
   wrong for every week before it, because the rules keep moving: WEEKLY_MAX was
   56; homeschool used to pay 3+1+1 across three habits that are now retired; the
   weekend used to schedule nothing. Recomputing an old week a year from now
   scores it under next year's rules, so a "four First Team weeks in a row"
   streak built on live recomputation would silently rewrite itself every time
   the scoring changed. A finalised week is a fact. Facts get written down once.

   scoring.ts is imported READ-ONLY. It is hash-synced byte-for-byte with
   family-dashboard (scripts/check-scoring-sync.sh) and nothing here may change
   it — the thresholds and the day arithmetic are consumed, never redefined.
   ══════════════════════════════════════════════════════════════════════════ */

import type { SupabaseClient } from "@supabase/supabase-js";
// READ-ONLY imports from the mirrored module. getThreshold is the single source
// of the 42/34/26/0 boundaries; WEEKLY_MAX is used only as a sanity ceiling.
import { scoreDay, getThreshold, WEEKLY_MAX } from "./scoring";
import { habitsOnDay, type DayScoped } from "./days";
import { addDays, dayNameOf, weekStartOf } from "./time";

/**
 * The days a squad week is made of. Mon–Fri, and nothing else, ever.
 *
 * DUPLICATED, knowingly: app/page.tsx declares its own SQUAD_DAYS for the live
 * board. That copy is display-side, this one is record-keeping side, and they
 * must agree — if they ever disagree, the number Ansar watches during the week
 * is not the number written down at the end of it. The verification harness
 * asserts both files carry the same list. Collapse them into one import when the
 * Golden Boot UI lands and page.tsx is being edited anyway; doing it now would
 * mean touching page.tsx for a release that ships no UI.
 */
export const SQUAD_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

/** The tier label that counts toward the Golden Boot. From scoring.ts THRESHOLDS. */
export const FIRST_TEAM = "First Team";

/** Consecutive First Team weeks that earn a Golden Boot. */
export const GOLDEN_BOOT_TARGET = 4;

/** A habit as far as week scoring is concerned — Notion's block + days. */
export type RosterHabit = DayScoped & { id: string };

/** Completions grouped by calendar date, the shape scoreDay() consumes. */
export type CompletionsByDate = Record<string, Set<string>>;

export interface WeekComputation {
  total: number;
  tier: string;
  perfect: boolean;
}

export interface WeekResultRow {
  week_start: string;
  total_points: number;
  tier: string;
  perfect_week: boolean;
  partial: boolean;
}

/* ── PURE ─────────────────────────────────────────────────────────────────── */

/**
 * Score one Mon–Fri week.
 *
 * This is loadWeeklyData() in app/page.tsx term for term: the same per-date
 * roster resolve, the same SQUAD_DAYS filter, the same empty-roster guard, the
 * same +3 for five perfect weekdays. It is not shared code because the board
 * scores a PARTIAL week ending today while this scores a CLOSED week ending
 * Friday — different windows, identical arithmetic. The verification harness
 * asserts the two produce the same number for the same week.
 */
export function computeWeek(
  weekStart: string,
  byDate: CompletionsByDate,
  roster: RosterHabit[],
): WeekComputation {
  const idsFor = (ds: string) => {
    const applicable = habitsOnDay(roster, dayNameOf(ds));
    return {
      applicable,
      preIds: applicable.filter(h => h.block === "pre_homeschool").map(h => h.id),
      baseIds: applicable.filter(h => h.block !== "conditional").map(h => h.id),
    };
  };

  const weekdayDates = [0, 1, 2, 3, 4].map(i => addDays(weekStart, i));

  let total = 0;
  for (const ds of weekdayDates) {
    if (!byDate[ds]) continue;
    // Belt-and-braces: weekdayDates is Mon–Fri by construction, but the filter
    // is stated rather than assumed, exactly as it is on the board.
    if (!SQUAD_DAYS.includes(dayNameOf(ds))) continue;
    const { applicable, preIds, baseIds } = idsFor(ds);
    if (applicable.length === 0) continue;
    total += scoreDay(byDate[ds], dayNameOf(ds), preIds, baseIds).total;
  }

  const perfect = weekdayDates.every(ds => {
    if (!byDate[ds]) return false;
    const { applicable, preIds, baseIds } = idsFor(ds);
    return applicable.length > 0 &&
      scoreDay(byDate[ds], dayNameOf(ds), preIds, baseIds).perfect;
  });
  if (perfect) total += 3;

  // A total above WEEKLY_MAX means the scoring and the ceiling have drifted
  // apart — the same class of bug that made "Week total / 56" unreachable.
  // Throw rather than clamp: a silently clamped total is a bug nobody finds.
  // WEEKLY_MAX is imported read-only for exactly this check.
  if (total > WEEKLY_MAX) {
    throw new Error(
      `week ${weekStart} scored ${total}, above WEEKLY_MAX ${WEEKLY_MAX} — ` +
      `scoring and the ceiling have drifted`,
    );
  }

  return { total, tier: getThreshold(total).label, perfect };
}

/**
 * Has this week closed?
 *
 * Finalisable once its FRIDAY has passed — today must be strictly later than
 * week_start + 4 days. Saturday of the same week qualifies; Friday itself does
 * not, because Friday's 21:00–21:30 habits have not happened yet and a week
 * finalised at Friday lunchtime would record a loss that was still winnable.
 *
 * Both arguments are Sydney calendar dates ("YYYY-MM-DD"). The comparison is a
 * plain string compare, which is correct for ISO dates and reads no clock.
 */
export function isFinalizable(weekStart: string, todaySydney: string): boolean {
  return todaySydney > addDays(weekStart, 4);
}

/**
 * Did this week begin before there was any data?
 *
 * TRUE only for weeks whose Monday precedes the earliest completion on record —
 * the tracker started mid-week, so that first week has no Mon/Tue rows and its
 * total is an artefact of a missing tracker rather than a missed routine.
 *
 * Deliberately NOT "some weekday has no completions": a day Ansar genuinely
 * skipped is a real zero and must count against him. Only absent HISTORY is
 * partial.
 */
export function isPartialWeek(weekStart: string, earliestCompletionDate: string): boolean {
  return weekStart < earliestCompletionDate;
}

/**
 * Consecutive First Team weeks ending at the most recent finalised week.
 *
 * Walks backwards and stops at the first week that is not First Team, is
 * partial, or is missing. The gap check matters: two First Team weeks either
 * side of an un-finalised week are not "in a row", and array order alone would
 * happily call them consecutive.
 *
 * Partial weeks BREAK the walk rather than being skipped over. A week with no
 * data is not evidence that a streak continued, and treating it as transparent
 * would let a run span a month the tracker was switched off.
 */
export function trailingFirstTeamStreak(rows: WeekResultRow[]): number {
  const sorted = [...rows].sort((a, b) => (a.week_start < b.week_start ? 1 : -1));
  let streak = 0;
  let expected: string | null = null;
  for (const row of sorted) {
    if (expected !== null && row.week_start !== expected) break;   // gap in the run
    if (row.partial || row.tier !== FIRST_TEAM) break;
    streak += 1;
    expected = addDays(row.week_start, -7);
  }
  return streak;
}

/**
 * Every week that should hold a Golden Boot, given the finalised weeks.
 *
 * Walks FORWARD keeping a running streak and marks each week where the streak
 * completes a set of four. Forward rather than backward because a backfill
 * finalises several weeks at once and every historical run has to be found, not
 * only the current one.
 *
 * The trigger is `streak % GOLDEN_BOOT_TARGET === 0`, so the boot is awarded at
 * 4, again at 8, again at 12. "Reaches 4" read strictly would award once and
 * never again, which makes the prize unwinnable a second time — not what a
 * running "X/4 weeks in a row" counter is for.
 */
export function awardWeeks(rows: WeekResultRow[]): string[] {
  const sorted = [...rows].sort((a, b) => (a.week_start < b.week_start ? -1 : 1));
  const due: string[] = [];
  let streak = 0;
  let expected: string | null = null;
  for (const row of sorted) {
    const contiguous = expected === null || row.week_start === expected;
    streak = contiguous && !row.partial && row.tier === FIRST_TEAM ? streak + 1 : 0;
    if (streak > 0 && streak % GOLDEN_BOOT_TARGET === 0) due.push(row.week_start);
    expected = addDays(row.week_start, 7);
  }
  return due;
}

/* ── PERSISTED — every function takes the client, none creates one ─────────── */

export interface FinalizeReport {
  todaySydney: string;
  /** Weeks written this run. Empty on a second run — that is the contract. */
  finalized: WeekResultRow[];
  /** Weeks already on record and left alone. */
  skippedExisting: string[];
  /** Weeks still open because Friday has not passed. */
  skippedInProgress: string[];
  awardsInserted: string[];
  streak: number;
}

/** Completions grouped by date, for the whole history. */
export async function loadCompletionsByDate(db: SupabaseClient): Promise<CompletionsByDate> {
  const byDate: CompletionsByDate = {};
  // Paged rather than one unbounded select: PostgREST caps a response at
  // max-rows, and a silently truncated history would finalise wrong totals for
  // the oldest weeks — the ones nobody looks at closely enough to notice.
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("habit_completions")
      .select("habit_id, completed_date")
      .order("completed_date", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`habit_completions: ${error.message}`);
    const rows = (data ?? []) as { habit_id: string; completed_date: string }[];
    for (const r of rows) (byDate[r.completed_date] ??= new Set()).add(r.habit_id);
    if (rows.length < PAGE) break;
  }
  return byDate;
}

export async function loadWeekResults(db: SupabaseClient): Promise<WeekResultRow[]> {
  const { data, error } = await db
    .from("week_results")
    .select("week_start, total_points, tier, perfect_week, partial")
    .order("week_start", { ascending: true });
  if (error) throw new Error(`week_results: ${error.message}`);
  return (data ?? []) as WeekResultRow[];
}

export async function loadAwards(db: SupabaseClient): Promise<string[]> {
  const { data, error } = await db
    .from("golden_boot_awards")
    .select("week_start")
    .order("week_start", { ascending: true });
  if (error) throw new Error(`golden_boot_awards: ${error.message}`);
  return (data ?? []).map((r: { week_start: string }) => r.week_start);
}

/**
 * Finalise every closed week not yet on record, then reconcile awards.
 *
 * IDEMPOTENT, and the report proves it: a second run returns finalized: [] and
 * awardsInserted: []. Existing weeks are left ALONE rather than re-upserted, so
 * finalized_at keeps meaning "when this week was closed" and a re-run cannot
 * quietly restate an old week under rules that changed since.
 *
 * @param dryRun compute and report, write nothing.
 */
export async function finalizeWeeks(
  db: SupabaseClient,
  roster: RosterHabit[],
  todaySydney: string,
  dryRun = false,
): Promise<FinalizeReport> {
  const byDate = await loadCompletionsByDate(db);
  const dates = Object.keys(byDate).sort();
  if (dates.length === 0) {
    return {
      todaySydney, finalized: [], skippedExisting: [],
      skippedInProgress: [], awardsInserted: [], streak: 0,
    };
  }
  const earliest = dates[0];

  const existing = new Set((await loadWeekResults(db)).map(r => r.week_start));
  const weeks = [...new Set(dates.map(weekStartOf))].sort();

  const finalized: WeekResultRow[] = [];
  const skippedExisting: string[] = [];
  const skippedInProgress: string[] = [];

  for (const weekStart of weeks) {
    if (existing.has(weekStart)) { skippedExisting.push(weekStart); continue; }
    // The current week is never finalised. Friday has to be over.
    if (!isFinalizable(weekStart, todaySydney)) { skippedInProgress.push(weekStart); continue; }
    const { total, tier, perfect } = computeWeek(weekStart, byDate, roster);
    finalized.push({
      week_start: weekStart,
      total_points: total,
      tier,
      perfect_week: perfect,
      partial: isPartialWeek(weekStart, earliest),
    });
  }

  if (!dryRun && finalized.length > 0) {
    const { error } = await db.from("week_results").upsert(finalized, { onConflict: "week_start" });
    if (error) throw new Error(`week_results upsert: ${error.message}`);
  }

  // Reconcile awards against the full picture, including the rows just written.
  const allRows = dryRun
    ? [...(await loadWeekResults(db)), ...finalized]
    : await loadWeekResults(db);
  const due = awardWeeks(allRows);
  const held = new Set(await loadAwards(db));
  const missing = due.filter(w => !held.has(w));

  if (!dryRun && missing.length > 0) {
    // ignoreDuplicates keeps a concurrent second caller from erroring; the
    // primary key is what actually prevents a double award.
    const { error } = await db
      .from("golden_boot_awards")
      .upsert(missing.map(week_start => ({ week_start })),
        { onConflict: "week_start", ignoreDuplicates: true });
    if (error) throw new Error(`golden_boot_awards insert: ${error.message}`);
  }

  return {
    todaySydney,
    finalized,
    skippedExisting,
    skippedInProgress,
    awardsInserted: missing,
    streak: trailingFirstTeamStreak(allRows),
  };
}
