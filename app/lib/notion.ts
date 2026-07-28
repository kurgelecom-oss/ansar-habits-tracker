/* ════════════════════════════════════════════════════════════════════════════
   Notion as the control layer — SERVER ONLY.

   NOTION_TOKEN never reaches the browser. Nothing in this file is imported by a
   "use client" module; the board sees only the mapped JSON that /api/habits
   returns.

   Notion owns WHICH habits exist, WHEN their windows are, HOW LONG the dwell is,
   and their point values. Notion does NOT own the scoring arithmetic — that
   stays in app/lib/scoring.ts as code constants, hash-synced with
   family-dashboard. Editing a window in Notion changes behaviour without a
   deploy; changing how a block is scored still needs a code change in both
   repos.
   ══════════════════════════════════════════════════════════════════════════ */

import { NOTION_BLOCK_MAP, BLOCK_PRE, BLOCK_CONDITIONAL, type GateHabit } from "./gating";
// SOCCER_DAYS only. scoring.ts is hash-synced with family-dashboard and is read
// here, never modified.
import { SOCCER_DAYS } from "./scoring";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = "2025-09-03";

// Data sources. Both are query-only: GET /v1/databases/{id} 404s for a
// data_source id, only the POST .../query endpoint works.
const HABITS_DS = "470a7eba-f14b-42c5-92fb-79a006720240";  // ANSAR OS — Habit Blocks
const SETTINGS_DS = "0415a499-d4ee-49e8-baf6-a3f38ec27235"; // ANSAR OS — App Settings

/** Five minutes, matching family-dashboard's /api/habits revalidate window. */
const CACHE_MS = 5 * 60 * 1000;

export interface Habit extends GateHabit {
  /** Notion "Points". Displayed on chips; the scoring math does NOT read it. */
  points: number;
  pointType: string;
  /** Notion "Days" multi-select, e.g. ["Mon","Wed"]. Empty means every day. */
  days: string[];
}

export interface AppSettings {
  pointsActive: boolean;
  defaultDwellSeconds: number;
  weekendRedemptionOnly: boolean;
}

/** Used when App Settings is unreachable. Matches the seeded Notion values. */
export const SETTINGS_FALLBACK: AppSettings = {
  pointsActive: true,
  defaultDwellSeconds: 90,
  weekendRedemptionOnly: true,
};

async function queryDataSource(id: string, body: unknown): Promise<any> {
  if (!NOTION_TOKEN) throw new Error("Missing NOTION_TOKEN");
  const res = await fetch(`https://api.notion.com/v1/data_sources/${id}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    // The cache below is ours, in-process and explicit. Next's fetch cache would
    // add a second, invisible layer with different invalidation.
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Notion ${id}: ${res.status} ${res.statusText}`);
  return res.json();
}

const text = (props: any, name: string): string => {
  const arr = props?.[name]?.rich_text;
  return Array.isArray(arr) && arr.length ? arr[0].plain_text : "";
};
const title = (props: any, name: string): string => {
  const arr = props?.[name]?.title;
  return Array.isArray(arr) && arr.length ? arr[0].plain_text : "";
};

function mapHabit(page: any): Habit {
  const p = page.properties;
  const blockName = p?.Block?.select?.name ?? "";
  const dwell = p?.["Dwell Seconds"]?.number;
  return {
    id: text(p, "Habit ID"),
    name: title(p, "Name") || "Untitled",
    // An unrecognised Block lands in pre_homeschool rather than vanishing — a
    // habit that shows up in the wrong column is a visible bug; one that is
    // silently dropped is an invisible one.
    block: NOTION_BLOCK_MAP[blockName] ?? BLOCK_PRE,
    order: p?.Order?.number ?? 0,
    points: p?.Points?.number ?? 0,
    pointType: p?.["Point Type"]?.select?.name ?? "",
    days: (p?.Days?.multi_select ?? []).map((o: any) => o.name),
    windowStart: text(p, "Window Start") || null,
    windowEnd: text(p, "Window End") || null,
    dwellSeconds: typeof dwell === "number" ? dwell : null,
  };
}

let habitsCache: { at: number; value: Habit[] } | null = null;
let settingsCache: { at: number; value: AppSettings } | null = null;

/**
 * Active habits, ordered. `fresh` bypasses the 5-minute cache — used by the
 * /api/tick diagnostic so a window edited in Notion can be verified immediately
 * instead of after a cache expiry. It changes only how stale the read is, never
 * what any gate decides.
 */
export async function getHabits(fresh = false): Promise<Habit[]> {
  if (!fresh && habitsCache && Date.now() - habitsCache.at < CACHE_MS) {
    return habitsCache.value;
  }
  const data = await queryDataSource(HABITS_DS, {
    filter: { property: "Active", checkbox: { equals: true } },
    sorts: [{ property: "Order", direction: "ascending" }],
    page_size: 100,
  });
  // Drop rows without a stable Habit ID — every completion row keys off it, so a
  // blank id would write orphan data.
  const habits: Habit[] = data.results.map(mapHabit).filter((h: Habit) => h.id);
  habitsCache = { at: Date.now(), value: habits };
  return habits;
}

export async function getSettings(fresh = false): Promise<AppSettings> {
  if (!fresh && settingsCache && Date.now() - settingsCache.at < CACHE_MS) {
    return settingsCache.value;
  }
  const data = await queryDataSource(SETTINGS_DS, { page_size: 10 });
  const p = data.results?.[0]?.properties;
  const dwell = p?.["Default Dwell Seconds"]?.number;
  const value: AppSettings = {
    pointsActive: p?.["Points Active"]?.checkbox ?? SETTINGS_FALLBACK.pointsActive,
    defaultDwellSeconds:
      typeof dwell === "number" ? dwell : SETTINGS_FALLBACK.defaultDwellSeconds,
    weekendRedemptionOnly:
      p?.["Weekend Redemption Only"]?.checkbox ?? SETTINGS_FALLBACK.weekendRedemptionOnly,
  };
  settingsCache = { at: Date.now(), value };
  return value;
}

/**
 * The habits that apply on a given weekday.
 *
 * A habit with "Days" set applies only on those days; one with Days empty
 * applies every day.
 *
 * THE CONDITIONAL EXCEPTION. Every row in Notion currently has Days empty,
 * including `soccer_training` — so the plain rule above would put soccer
 * training on the board seven days a week, and scoring.ts (which awards it only
 * on SOCCER_DAYS) would score a tick that the board offered. Rather than trust
 * an unset field, a conditional-block habit with no Days falls back to
 * SOCCER_DAYS, the same constant scoring.ts uses.
 *
 * This fallback is a safety net, not the intended configuration: filling in
 * Days on the Notion row takes precedence over it the moment it is set.
 */
export function habitsForDay(habits: Habit[], weekday: string): Habit[] {
  const short = weekday.slice(0, 3);   // "Monday" → "Mon"
  return habits.filter(h => {
    if (h.days.length > 0) return h.days.includes(short);
    if (h.block === BLOCK_CONDITIONAL) return SOCCER_DAYS.includes(weekday);
    return true;
  });
}
