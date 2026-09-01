/* ════════════════════════════════════════════════════════════════════════════
   TODAY'S SCHOOL PROGRAMME — SERVER ONLY.

   Read from TABLES, not from a page. This is the whole point of the 2 Sept 2026
   change, so it is worth saying plainly:

   The Control Room is the control layer. The homeschool week page in Homeschool
   Hub is the human report — written for a reader, archived every Friday, shown
   to VRQA. The board no longer parses it.

   It used to. That version read the live week page block by block and matched
   headings and bold labels against regexes. It worked, and it was fragile in a
   way nobody could see from Notion: a shortened day name, a bullet missing its
   colon, a card nested one level deeper than expected, and the board went blank
   with no error anywhere. The failure mode of a document is prose that reads
   fine to a human and parses to nothing.

   A table cannot be malformed that way. A column is either filled or it is not.

   Two sources, both under 🎛️ ANSAR OS — Control Room:
     · 📆 Daily Programme — one row per subject per day.
     · 📚 Subject Guides  — standing explainers, related from a programme row.

   The week page survives as a LINK — App Settings → "Active Week Page" — which
   the sheet offers as "Open the full week in Notion". Read by a human, never by
   this file.
   ══════════════════════════════════════════════════════════════════════════ */

import { sydneyWeekday, sydneyDateKey } from "./time";
import { PROGRAMME_DS, GUIDES_DS, SETTINGS_DS } from "./notion-sources";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = "2025-09-03";

/** Five minutes, matching /api/habits and lib/notion.ts. */
const CACHE_MS = 5 * 60 * 1000;

/** Days a school programme exists for. Friday is flex, and still a day. */
export const SCHOOL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

/**
 * How far past a row's date the board keeps showing it before saying so.
 *
 * Seven days, so a week that ran Mon–Fri is still "this week" on the following
 * Monday morning, before anyone has had a chance to load the new one. Past that
 * the card still renders — stale lessons beat a blank board — but it says out
 * loud that it is old, because the silent version of this is exactly the bug
 * the old "showing last week" notice existed to catch.
 */
const STALE_AFTER_DAYS = 7;

/** One tappable subject on the board. `detail` is what the pop-up shows. */
export interface Subject {
  /** Stable within a day: slug of the label plus its position. */
  id: string;
  /** The programme row's Label, e.g. "Block 1 — Maths". */
  name: string;
  /** The row's Duration, e.g. "45 min". Null when the cell is empty. */
  duration: string | null;
  /** The row's Task — today's instruction, the top half of the sheet. */
  detail: string;
  /**
   * The related Subject Guide's standing lines — the bottom half of the sheet.
   *
   * The day's own text is often a single line — "Khan Academy — next lesson" —
   * which is the right amount of instruction for a boy who already knows the
   * routine, and the wrong amount of context for a sheet that fills the screen.
   * The guide is where the engine, the tracking and the real-world layer are
   * written down once, instead of being retyped every Friday.
   *
   * A row may relate to more than one guide (Monday's "Technologies +
   * Languages"), in which case the lines are concatenated in relation order.
   */
  guide: string[];
}

/** Today's card, or the reason there isn't one. */
export interface SchoolDay {
  ok: boolean;
  /** The Week column, e.g. "Phase 1 — Week 8 (31 Aug–4 Sept)". */
  weekTitle: string;
  /** Deep link to the human week report, from App Settings. */
  weekUrl: string | null;
  /** Rebuilt heading, e.g. 'Monday 31 August — "Hagia Sophia…"'. */
  dayLabel: string;
  /** Sydney weekday the card is for. */
  weekday: string;
  /** Sydney date key the card was built for. */
  date: string;
  subjects: Subject[];
  /** True when the rows are old, or when Notion could not be read at all. */
  stale: boolean;
  /** Shown to the reader when subjects is empty, or when stale. */
  message: string | null;
}

async function notionPost(path: string, body: unknown): Promise<any> {
  if (!NOTION_TOKEN) throw new Error("Missing NOTION_TOKEN");
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Notion ${path}: ${res.status} ${res.statusText}`);
  return res.json();
}

const plain = (rich: any[]): string =>
  Array.isArray(rich) ? rich.map((r: any) => r?.plain_text ?? "").join("") : "";

const textProp = (props: any, name: string): string =>
  plain(props?.[name]?.rich_text ?? []).trim();

const titleProp = (props: any, name: string): string =>
  plain(props?.[name]?.title ?? []).trim();

/**
 * The week report's URL, from App Settings → "Active Week Page".
 *
 * Nothing is parsed from it any more. It exists so the sheet's "Open the full
 * week in Notion" link lands somewhere, which is why a blank value returns null
 * rather than throwing: no link is a smaller problem than no lessons.
 */
export async function getActiveWeekUrl(): Promise<string | null> {
  const data = await notionPost(`/data_sources/${SETTINGS_DS}/query`, { page_size: 10 });
  const url = data.results?.[0]?.properties?.["Active Week Page"]?.url;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

/**
 * A slug that is stable for a given label and position within the day.
 *
 * The board keys React rows off this and the sheet is opened by identity, so it
 * must not change between two renders of the same day. Label plus index does
 * that, and survives two blocks sharing a label.
 */
export function subjectId(label: string, index: number): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "subject"}-${index}`;
}

/** The guide id a relation cell points at, dashes stripped for comparison. */
const relationIds = (props: any, name: string): string[] =>
  (props?.[name]?.relation ?? [])
    .map((r: any) => String(r?.id ?? "").replace(/-/g, ""))
    .filter(Boolean);

/**
 * Guide text, split into the bullets the sheet renders.
 *
 * One line per bullet. Blank lines are dropped rather than rendered as empty
 * bullets, which is what a trailing newline in a Notion text cell would
 * otherwise produce.
 */
export function guideLines(text: string): string[] {
  return text.split("\n").map(l => l.trim()).filter(Boolean);
}

/**
 * The heading the sheet prints, rebuilt from columns.
 *
 * Reproduces what the week page used to spell out — 'Monday 31 August —
 * "Hagia Sophia: the greatest building"' — from Day, Date and Day Topic, so
 * nobody has to type the same string in two places and keep them agreeing. The
 * Note rides along in brackets when a day carries one.
 */
export function buildDayLabel(
  weekday: string, isoDate: string | null, topic: string, note: string,
): string {
  let head = weekday;
  if (isoDate) {
    const d = new Date(`${isoDate}T00:00:00Z`);
    if (!Number.isNaN(d.getTime())) {
      const day = d.getUTCDate();
      const month = d.toLocaleString("en-AU", { month: "long", timeZone: "UTC" });
      head = `${weekday} ${day} ${month}`;
    }
  }
  const parts = [head];
  if (topic) parts.push(`— "${topic}"`);
  if (note) parts.push(`(${note})`);
  return parts.join(" ");
}

/** Whole days between an ISO date and today, negative for the future. */
export function daysSince(isoDate: string | null, todayKey: string): number | null {
  if (!isoDate) return null;
  const then = Date.parse(`${isoDate}T00:00:00Z`);
  const now = Date.parse(`${todayKey}T00:00:00Z`);
  if (Number.isNaN(then) || Number.isNaN(now)) return null;
  return Math.round((now - then) / 86_400_000);
}

/**
 * Programme rows into Subjects, guides attached.
 *
 * Exported for the tests, which feed it fixture rows rather than a live query —
 * the mapping is where a renamed column would silently blank a field, so it is
 * the part worth pinning.
 */
export function mapProgramme(
  rows: any[], guides: Map<string, string[]>,
): { subjects: Subject[]; topic: string; note: string; week: string; isoDate: string | null } {
  let topic = "", note = "", week = "", isoDate: string | null = null;

  const subjects = rows.map((row: any, index: number) => {
    const p = row.properties ?? {};
    const label = textProp(p, "Label") || titleProp(p, "Name");
    if (!topic) topic = textProp(p, "Day Topic");
    if (!note) note = textProp(p, "Note");
    if (!week) week = textProp(p, "Week");
    if (!isoDate) isoDate = p?.Date?.date?.start ?? null;

    const guide = relationIds(p, "Guide").flatMap(id => guides.get(id) ?? []);
    return {
      id: subjectId(label, index),
      name: label,
      duration: textProp(p, "Duration") || null,
      detail: textProp(p, "Task"),
      guide,
    };
  // A row with no label has nothing to render and nothing to tap. Dropping it
  // keeps a half-typed row from showing as a blank line on Ansar's board.
  }).filter(s => s.name);

  return { subjects, topic, note, week, isoDate };
}

let cache: { at: number; value: SchoolDay } | null = null;
let lastGood: SchoolDay | null = null;

/**
 * Today's card.
 *
 * Cached for five minutes and keyed on the weekday, so `?day=Thursday` never
 * serves Wednesday's rows from the memo. `fresh` skips it, which is how a row
 * edited in the Control Room seconds ago gets verified immediately.
 *
 * Notion failing is not an error the reader should see as a crash: the last
 * good card comes back marked stale, and a cold process with no last good card
 * returns an empty, honest one. A board that says "can't reach Notion" is
 * recoverable; a board that silently shows yesterday's subjects as though they
 * were today's is not.
 */
export async function getSchoolDay(fresh = false, weekdayOverride?: string): Promise<SchoolDay> {
  const weekday = weekdayOverride ?? sydneyWeekday();
  const date = sydneyDateKey();

  if (!fresh && cache && cache.value.weekday === weekday && Date.now() - cache.at < CACHE_MS) {
    return cache.value;
  }

  const empty = (message: string, stale = false): SchoolDay => ({
    ok: !stale, weekTitle: "", weekUrl: null, dayLabel: "", weekday, date,
    subjects: [], stale, message,
  });

  if (!SCHOOL_DAYS.includes(weekday)) {
    const value = empty("No school programme on the weekend.");
    cache = { at: Date.now(), value };
    return value;
  }

  try {
    // The week link is a nicety, not a dependency: a missing or unreadable
    // App Settings row must not cost us the lessons, so it resolves alongside
    // the rows and degrades to null on its own.
    const [weekUrl, programme, guideRows] = await Promise.all([
      getActiveWeekUrl().catch(() => null),
      notionPost(`/data_sources/${PROGRAMME_DS}/query`, {
        filter: {
          and: [
            { property: "Active", checkbox: { equals: true } },
            { property: "Day", select: { equals: weekday } },
          ],
        },
        sorts: [{ property: "Order", direction: "ascending" }],
        page_size: 100,
      }),
      notionPost(`/data_sources/${GUIDES_DS}/query`, {
        filter: { property: "Active", checkbox: { equals: true } },
        page_size: 100,
      }),
    ]);

    const guides = new Map<string, string[]>(
      (guideRows.results ?? []).map((g: any) => [
        String(g.id ?? "").replace(/-/g, ""),
        guideLines(plain(g.properties?.Guide?.rich_text ?? [])),
      ]),
    );

    const { subjects, topic, note, week, isoDate } =
      mapProgramme(programme.results ?? [], guides);

    const age = daysSince(isoDate, date);
    const old = age !== null && age > STALE_AFTER_DAYS;

    const value: SchoolDay = {
      ok: true,
      weekTitle: week,
      weekUrl,
      dayLabel: buildDayLabel(weekday, isoDate, topic, note),
      weekday,
      date,
      subjects,
      stale: old,
      message: subjects.length === 0
        ? `No ${weekday} rows in the Control Room yet — load this week into 📆 Daily Programme.`
        : old
          ? "Showing an old week — the Control Room hasn't been loaded with this week yet."
          : null,
    };
    cache = { at: Date.now(), value };
    if (subjects.length > 0) lastGood = value;
    return value;
  } catch (error) {
    console.error("Error reading the school programme:", error);
    if (lastGood) {
      return { ...lastGood, weekday, date, stale: true,
        message: "Showing the last week we could read — Notion is unreachable." };
    }
    return empty("Can't reach Notion — today's subjects are unavailable.", true);
  }
}
