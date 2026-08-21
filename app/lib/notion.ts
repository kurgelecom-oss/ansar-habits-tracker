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

import { NOTION_BLOCK_MAP, BLOCK_PRE, type GateHabit } from "./gating";
// The weekday rule lives in lib/days.ts because the board needs it too — see
// habitsForDay() at the bottom of this file.
import { habitsOnDay } from "./days";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = "2025-09-03";

// Data sources. All query-only: GET /v1/databases/{id} 404s for a
// data_source id, only the POST .../query endpoint works.
const HABITS_DS = "470a7eba-f14b-42c5-92fb-79a006720240";  // ANSAR OS — Habit Blocks
const SETTINGS_DS = "0415a499-d4ee-49e8-baf6-a3f38ec27235"; // ANSAR OS — App Settings
const STRETCH_DS = "11bea89f-f327-4cf7-9a13-dafc9211d86d"; // ANSAR OS — Stretch Items

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

export interface StretchItem {
  id: string;               // Notion "Item ID" — permanent, Supabase keys off this
  name: string;
  category: string;
  points: number;           // 1 point = 10 min screen time (edit in Notion to retune)
  whatCountsAsDone: string;
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
let stretchCache: { at: number; value: StretchItem[] } | null = null;

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
 * Active stretch items, 5-minute cached like the other two sources. Shared by
 * /api/stretch-items (the wallet's item list) and /api/stretch (the weekend
 * all-items cap bonus) so both are counting the SAME roster — two separate
 * fetches of "all items" is how the bonus ends up requiring an item the board
 * doesn't show. Throws on failure; each caller decides its own degraded shape.
 */
export async function getStretchItems(fresh = false): Promise<StretchItem[]> {
  if (!fresh && stretchCache && Date.now() - stretchCache.at < CACHE_MS) {
    return stretchCache.value;
  }
  const data = await queryDataSource(STRETCH_DS, {
    filter: { property: "Active", checkbox: { equals: true } },
  });
  const items: StretchItem[] = data.results
    .map((page: any) => {
      const p = page.properties;
      return {
        id: text(p, "Item ID"),
        name: title(p, "Name") || "Untitled",
        category: p?.Category?.select?.name ?? "",
        points: p?.Points?.number ?? 0,
        whatCountsAsDone: text(p, "What counts as done"),
      };
    })
    // Drop rows without a stable Item ID — the ledger keys off it.
    .filter((item: StretchItem) => item.id);
  stretchCache = { at: Date.now(), value: items };
  return items;
}

/**
 * The habits that apply on a given weekday.
 *
 * A thin server-side alias for habitsOnDay(). The rule itself moved to
 * lib/days.ts so the board can apply the SAME rule when it scores past dates —
 * this module cannot be imported from a client component without dragging
 * NOTION_TOKEN into the bundle, and two copies of the rule is how a habit ends
 * up rendered on a day it does not score (or scored on a day it is not
 * rendered). See lib/days.ts for the rule and why the conditional fallback
 * still exists.
 */
export function habitsForDay(habits: Habit[], weekday: string): Habit[] {
  return habitsOnDay(habits, weekday);
}
