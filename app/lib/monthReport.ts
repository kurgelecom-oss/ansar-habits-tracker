/* ════════════════════════════════════════════════════════════════════════════
   THE MONTH, ASSEMBLED — what Ansar did and didn't do, day by day.

   PURE. No fetch, no Supabase, no Notion, no React. Callers hand in the rows
   they have already read and get back a finished report to render. That is what
   lets one description of a month serve a print route today and anything else
   later without the two drifting.

   MOVED, NOT REWRITTEN. This logic began life inline in
   scripts/export-month-pdf.ts, which printed a PDF by driving headless Chrome
   from a Mac. There is no Chrome in a Netlify Lambda, so the export became a
   print route — and the assembly came here verbatim rather than being written a
   second time against the same tables.

   THE ARITHMETIC IS NOT HERE. Every point comes from scoreDay() in scoring.ts,
   which is hash-synced byte-for-byte with family-dashboard and must never be
   restated; every "does this habit apply today" comes from habitsOnDay() in
   days.ts; every calendar hop comes from time.ts. This file decides only what a
   month LOOKS like, never what it is worth.
   ══════════════════════════════════════════════════════════════════════════ */

import { scoreDay } from "./scoring";
import { habitsOnDay } from "./days";
import { TZ, sydneyDateKey, addDays, dayNameOf, weekStartOf } from "./time";

/* ── shapes ───────────────────────────────────────────────────────────────── */

/** One row of habit_completions. `completed_at` is UTC; `completed_date` is Sydney. */
export interface Completion {
  habit_id: string;
  completed_date: string;
  completed_at: string;
}

/** One finalised week from week_results. */
export interface WeekRow {
  week_start: string;
  total_points: number;
  tier: string;
  perfect_week: boolean;
  partial: boolean;
}

/** A habit as the report needs it: Notion's id, label, block and Days. */
export interface RosterHabit {
  id: string;
  name: string;
  block: string;
  days: string[];
}

export interface DayRow {
  date: string;
  weekday: string;
  weekend: boolean;
  /** No completion existed anywhere on or before this date. */
  beforeTracking: boolean;
  /** On or after tracking began, but nothing was recorded that day. */
  silent: boolean;
  /** The habits that SHOULD have been done, with the time each was ticked. */
  applicable: { id: string; name: string; block: string; at: string | null }[];
  /** Rows for habits no longer on the roster — kept so the record is complete. */
  retired: { id: string; name: string; at: string }[];
  /**
   * Ticked, on the roster, but not scheduled for this weekday — a homeschool
   * session logged on a Saturday, say.
   *
   * These are why a day can score above its own ceiling. scoreDay() reads the
   * completed set, not the schedule: `completedIds.has("homeschool_session")`
   * pays 5 whatever day it is. That is scoring.ts's behaviour, it is what the
   * board shows too, and it is not this file's to correct — so the row is
   * disclosed under the day instead of being quietly dropped.
   */
  offSchedule: { id: string; name: string; at: string }[];
  points: number;
  max: number;
  perfect: boolean;
}

export interface WeekSection {
  weekStart: string;
  label: string;
  row: WeekRow | null;
  days: DayRow[];
}

export interface MonthReport {
  month: string;
  title: string;
  monthStart: string;
  monthEnd: string;
  /** Earliest completed_date on record, or null if the table is empty. */
  earliest: string | null;
  weeks: WeekSection[];
  days: DayRow[];
  recordedDays: number;
  monthPoints: number;
  monthMax: number;
  perfectDays: number;
  completions: number;
  /** Sydney wall-clock stamp for the footer. */
  generatedAt: string;
}

/* ── calendar ─────────────────────────────────────────────────────────────
   All string maths on YYYY-MM, so nothing depends on the machine's zone, and
   no calendar date is round-tripped through toISOString(). See the header of
   lib/time.ts for what that mistake cost this codebase. */

export const prevMonthOf = (ym: string): string => {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};

/** The previous calendar month IN SYDNEY — the export's default subject. */
export const previousSydneyMonth = (): string => prevMonthOf(sydneyDateKey().slice(0, 7));

export const firstDayOf = (ym: string): string => `${ym}-01`;

/** Day 0 of the NEXT month is the last day of this one, evaluated in UTC. */
export const lastDayOf = (ym: string): string => {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${ym}-${String(last).padStart(2, "0")}`;
};

export const datesInMonth = (ym: string): string[] => {
  const out: string[] = [];
  for (let d = firstDayOf(ym); d <= lastDayOf(ym); d = addDays(d, 1)) out.push(d);
  return out;
};

export const isMonthKey = (v: string): boolean => /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

/* ── formatting ───────────────────────────────────────────────────────────
   Every date and time the report shows is produced by Intl with an IANA zone.
   No offset is hardcoded anywhere in this file. */

const CLICK_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ, hourCycle: "h23", hour: "2-digit", minute: "2-digit",
});
/** A UTC timestamptz → the wall-clock time Ansar actually tapped it, "HH:MM". */
export const clickTime = (isoUtc: string): string => CLICK_FMT.format(new Date(isoUtc));

const MONTH_FMT = new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", month: "long", year: "numeric" });
/** "2026-07" → "July 2026". Anchored at UTC noon so no zone can shift the month. */
export const monthTitle = (ym: string): string => {
  const [y, m] = ym.split("-").map(Number);
  return MONTH_FMT.format(new Date(Date.UTC(y, m - 1, 1, 12)));
};

const DAY_FMT = new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "short", day: "numeric" });
/** "2026-07-15" → "Wed 15". */
export const dayLabel = (ds: string): string => {
  const [y, m, d] = ds.split("-").map(Number);
  return DAY_FMT.format(new Date(Date.UTC(y, m - 1, d, 12)));
};

const DAY_MON_FMT = new Intl.DateTimeFormat("en-AU", {
  timeZone: "UTC", weekday: "short", day: "numeric", month: "short",
});
/* A week is Monday-anchored, so the first week of a month usually begins in the
   one before it. "Mon 29" in a July document is genuinely ambiguous, so a week
   that starts outside the month being reported carries its month. */
export const weekLabel = (ws: string, month: string): string => {
  if (ws.slice(0, 7) === month) return dayLabel(ws);
  const [y, m, d] = ws.split("-").map(Number);
  return DAY_MON_FMT.format(new Date(Date.UTC(y, m - 1, d, 12)));
};

const STAMP_FMT = new Intl.DateTimeFormat("en-AU", {
  timeZone: TZ, dateStyle: "full", timeStyle: "short", hourCycle: "h23",
});

/* ── assembly ─────────────────────────────────────────────────────────────── */

export interface MonthReportInput {
  month: string;
  roster: RosterHabit[];
  completions: Completion[];
  weekRows: WeekRow[];
  /** Earliest completed_date across the WHOLE table, not just this month. */
  earliest: string | null;
  /** Injected so the stamp is testable; defaults to now. */
  now?: Date;
}

export function buildMonthReport(input: MonthReportInput): MonthReport {
  const { month, roster, completions, weekRows, earliest } = input;

  if (roster.length === 0) {
    // Fail closed, for the same reason /api/golden-boot refuses an empty roster:
    // with no habits every day scores zero and the document would report a month
    // of total failure that never happened.
    throw new Error("empty roster — refusing to render a month against no habits");
  }

  const byDate: Record<string, Completion[]> = {};
  for (const c of completions) (byDate[c.completed_date] ??= []).push(c);

  const rosterIds = new Set(roster.map(h => h.id));
  const nameOf = new Map(roster.map(h => [h.id, h.name]));

  const days: DayRow[] = datesInMonth(month).map(date => {
    const weekday = dayNameOf(date);
    const rows = byDate[date] ?? [];
    const doneAt = new Map(rows.map(r => [r.habit_id, r.completed_at]));
    const completedIds = new Set(rows.map(r => r.habit_id));

    // The SHOULD-have-been-done set, from the real day rule in lib/days.ts. This
    // is what makes a ✗ meaningful: an absent row for a habit that never applied
    // on a Saturday is not a miss, and is not shown as one.
    const applicable = habitsOnDay(roster, weekday);
    const preIds = applicable.filter(h => h.block === "pre_homeschool").map(h => h.id);
    const baseIds = applicable.filter(h => h.block !== "conditional").map(h => h.id);

    const score = scoreDay(completedIds, weekday, preIds, baseIds);
    // The ceiling is asked of scoring.ts rather than restated here: a day where
    // every applicable habit is ticked is, by definition, worth the maximum. That
    // is how a weekend comes out of 5 and a training day out of 11 with no table
    // of magic numbers in this file.
    const max = scoreDay(new Set(applicable.map(h => h.id)), weekday, preIds, baseIds).total;

    return {
      date,
      weekday,
      weekend: weekday === "Saturday" || weekday === "Sunday",
      beforeTracking: earliest !== null && date < earliest,
      silent: rows.length === 0 && !(earliest !== null && date < earliest),
      applicable: applicable.map(h => ({
        id: h.id, name: h.name, block: h.block, at: doneAt.get(h.id) ?? null,
      })),
      retired: rows
        .filter(r => !rosterIds.has(r.habit_id))
        .map(r => ({ id: r.habit_id, name: nameOf.get(r.habit_id) ?? r.habit_id, at: r.completed_at })),
      offSchedule: rows
        .filter(r => rosterIds.has(r.habit_id) && !applicable.some(h => h.id === r.habit_id))
        .map(r => ({ id: r.habit_id, name: nameOf.get(r.habit_id) ?? r.habit_id, at: r.completed_at })),
      points: score.total,
      max,
      perfect: score.perfect,
    };
  });

  /* Month aggregates count only days that actually have a record. A day with no
     rows contributes nothing rather than a zero, so an absent fortnight cannot
     drag an average down and read as failure. */
  const recorded = days.filter(d => !d.beforeTracking && !d.silent);

  const weekRowOf = new Map(weekRows.map(w => [w.week_start, w]));
  const weeks: WeekSection[] = [...new Set(days.map(d => weekStartOf(d.date)))]
    .sort()
    .map(weekStart => ({
      weekStart,
      label: weekLabel(weekStart, month),
      row: weekRowOf.get(weekStart) ?? null,
      days: days.filter(d => weekStartOf(d.date) === weekStart),
    }));

  return {
    month,
    title: monthTitle(month),
    monthStart: firstDayOf(month),
    monthEnd: lastDayOf(month),
    earliest,
    weeks,
    days,
    recordedDays: recorded.length,
    monthPoints: recorded.reduce((n, d) => n + d.points, 0),
    monthMax: recorded.reduce((n, d) => n + d.max, 0),
    perfectDays: recorded.filter(d => d.perfect).length,
    completions: completions.length,
    generatedAt: STAMP_FMT.format(input.now ?? new Date()),
  };
}
