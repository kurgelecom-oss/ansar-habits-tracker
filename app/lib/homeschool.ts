/* ════════════════════════════════════════════════════════════════════════════
   The week's school programme — SERVER ONLY.

   Same contract as lib/notion.ts: NOTION_TOKEN never reaches the browser, and
   the board sees only the mapped JSON that /api/homeschool returns.

   WHY THIS READS A SETTING AND NOT A PAGE ID. The live week page is rebuilt and
   re-created every Friday, and the old one is renamed and moved into 📦 Weeks
   Archive — so its id changes weekly. Hard-coding it would mean a deploy every
   Friday. Instead the ONE fixed thing is the App Settings row that lib/notion.ts
   already reads, and its "Active Week Page" URL property points at whichever
   page is live. Repointing the board is a paste into Notion, not a release.

   ONEDRIVE IS RETIRED. Evidence is the Tally work log (form ODKlVa), which the
   board already opens from Work + Week. Any residual "Save: … → OneDrive" line
   left on a week page is dropped here rather than rendered — see SKIP below.
   ══════════════════════════════════════════════════════════════════════════ */

import { sydneyWeekday, sydneyDateKey } from "./time";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = "2025-09-03";

/** ⚙️ ANSAR OS — App Settings. The same data source lib/notion.ts queries. */
const SETTINGS_DS = "0415a499-d4ee-49e8-baf6-a3f38ec27235";

/** Five minutes, matching /api/habits and lib/notion.ts. */
const CACHE_MS = 5 * 60 * 1000;

/** Days a school programme exists for. Friday is flex, and still a day. */
const SCHOOL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const DAY_HEADING =
  /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b\s*(\d{1,2})?\s*([A-Za-z]+)?/;

/** Lines the board must never render, whatever a week page still says. */
const SKIP = /onedrive/i;

/** One tappable subject on the board. `detail` is what the pop-up shows. */
export interface Subject {
  /** Stable within a day: slug of the label plus its position. */
  id: string;
  /** The bold label before the colon, e.g. "Block 1 — Maths". */
  name: string;
  /** "45 min", pulled out of the label. Null when the label carries none. */
  duration: string | null;
  /** Everything after the colon — the explainer, in the page's own words. */
  detail: string;
  /**
   * The standing "how this subject works" lines from the week page's
   * 📚 Subject Guides section, matched to this block.
   *
   * The day's own text is often a single line — "Khan Academy — next lesson" —
   * which is the right amount of instruction for a boy who already knows the
   * routine, and the wrong amount of context for a sheet that fills the screen.
   * Subject Guides is where the week page ALREADY explains the engine, the
   * tracking and the real-world layer, so the sheet reads it from there rather
   * than asking anyone to write the same thing twice every Friday.
   */
  guide: string[];
}

/** Today's card, or the reason there isn't one. */
export interface SchoolDay {
  ok: boolean;
  /** Title of the live week page, e.g. "Homeschool Hub | Phase 1—Week 8 …". */
  weekTitle: string;
  /** Deep link to the live week page, for a parent mid-edit. */
  weekUrl: string | null;
  /** The heading this came from, e.g. 'Monday 31 August — "Hagia Sophia…"'. */
  dayLabel: string;
  /** Sydney weekday the card is for. */
  weekday: string;
  /** Sydney date key the card was built for. */
  date: string;
  subjects: Subject[];
  /** True when Notion could not be read and this is the last good copy. */
  stale: boolean;
  /** Shown to the reader when subjects is empty, or when stale. */
  message: string | null;
}

/* ── Notion reads ─────────────────────────────────────────────────────────── */

async function notion(path: string): Promise<any> {
  if (!NOTION_TOKEN) throw new Error("Missing NOTION_TOKEN");
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Notion ${path}: ${res.status} ${res.statusText}`);
  return res.json();
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

/**
 * The URL sitting in App Settings → "Active Week Page".
 *
 * Returns null rather than throwing when the property is blank, because "nobody
 * has pasted this week's link yet" is an ordinary Friday state and must degrade
 * to last-known-good, not to a red error banner.
 */
export async function getActiveWeekUrl(): Promise<string | null> {
  const data = await notionPost(`/data_sources/${SETTINGS_DS}/query`, { page_size: 10 });
  const url = data.results?.[0]?.properties?.["Active Week Page"]?.url;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

/** The 32-hex page id at the end of any Notion URL shape. */
export function pageIdFromUrl(url: string): string | null {
  const m = url.replace(/-/g, "").match(/([0-9a-f]{32})(?:\?|#|$)/i);
  return m ? m[1] : null;
}

const plain = (rich: any[]): string =>
  Array.isArray(rich) ? rich.map((r: any) => r?.plain_text ?? "").join("") : "";

/**
 * Every block on the page, with one level of container children spliced inline.
 *
 * The splice is not decoration. Week 8's Monday card is a `callout` with the
 * day's H2 and its bullets nested INSIDE it, while Tuesday–Thursday sit at the
 * top level. Without the splice, Monday would silently render blank — the worst
 * failure shape, because it looks like a day with no work rather than a bug.
 */
async function flatBlocks(pageId: string): Promise<any[]> {
  const top = await children(pageId);
  const out: any[] = [];
  for (const block of top) {
    out.push(block);
    // Only containers are opened. A to_do with children is a task with
    // sub-notes, and flattening those would promote a note to a subject row.
    const container = block.type === "callout" || block.type === "toggle" ||
      block.type === "column_list" || block.type === "column" ||
      block.type === "synced_block";
    if (container && block.has_children) {
      for (const kid of await children(block.id)) {
        out.push(kid);
        if (kid.has_children && (kid.type === "column" || kid.type === "callout")) {
          out.push(...(await children(kid.id)));
        }
      }
    }
  }
  return out;
}

async function children(id: string): Promise<any[]> {
  const acc: any[] = [];
  let cursor: string | undefined;
  do {
    const qs = `?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`;
    const data = await notion(`/blocks/${id}/children${qs}`);
    acc.push(...(data.results ?? []));
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return acc;
}

/* ── Parsing ──────────────────────────────────────────────────────────────── */

const slug = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

/**
 * One bullet → one subject, or null if it is not one.
 *
 * The shape the week page is written in is `**Label (45 min):** the task text`.
 * The label before the colon becomes the row on the board; everything after it
 * becomes the pop-up. A bullet with no colon is a note, not a block, and is
 * dropped — rendering it would put a bare sentence in the subject column.
 */
export function parseSubject(text: string, index: number): Subject | null {
  const line = text.trim();
  if (!line || SKIP.test(line)) return null;

  const colon = line.indexOf(":");
  if (colon < 1) return null;

  let name = line.slice(0, colon).replace(/\*\*/g, "").trim();
  const detail = line.slice(colon + 1).replace(/\*\*/g, "").trim();
  if (!name || !detail) return null;
  // A label this long is a sentence that happens to contain a colon.
  if (name.length > 60) return null;
  // OneDrive is retired; the save step goes with it wherever it survives.
  if (/^save\b/i.test(name)) return null;

  let duration: string | null = null;
  const dur = name.match(/\((\d+\s*min)\)\s*$/i);
  if (dur) {
    duration = dur[1].replace(/\s+/g, " ");
    name = name.slice(0, dur.index).trim();
  }

  return { id: `${slug(name)}-${index}`, name, duration, detail, guide: [] };
}

/**
 * Today's subjects, in the order the week page lists them.
 *
 * Matching is on the WEEKDAY NAME alone, deliberately. Matching the date too
 * would make the board go blank whenever a heading's date format drifted, and a
 * week page holds exactly one Monday — the name is already unique within it.
 */
export function subjectsForDay(blocks: any[], weekday: string): {
  dayLabel: string; subjects: Subject[];
} {
  let inDay = false;
  let dayLabel = "";
  const subjects: Subject[] = [];

  for (const block of blocks) {
    const type = block.type;

    if (type === "heading_1" || type === "heading_2" || type === "heading_3") {
      const text = plain(block[type]?.rich_text).trim();
      const day = text.match(DAY_HEADING);
      if (day) {
        if (inDay) break;             // next day's heading closes this one
        if (day[1] === weekday) { inDay = true; dayLabel = text; }
        continue;
      }
      // A non-day heading inside the day (e.g. "📚 Subject Guides") ends it.
      if (inDay) break;
      continue;
    }

    if (!inDay) continue;
    if (type !== "to_do" && type !== "bulleted_list_item") continue;

    const subject = parseSubject(plain(block[type]?.rich_text), subjects.length);
    if (subject) subjects.push(subject);
  }

  return { dayLabel, subjects };
}

/**
 * The 📚 Subject Guides section, as a lookup keyed by lowercased guide title.
 *
 * Guides are `### Maths` style headings with bullets under them, and they sit
 * BELOW every day card on the page — which is exactly why subjectsForDay stops
 * at a non-day heading. The two parsers read the same block list from opposite
 * ends of the page and must never bleed into each other.
 */
export function parseGuides(blocks: any[]): Record<string, string[]> {
  const guides: Record<string, string[]> = {};
  let inGuides = false;
  let current: string | null = null;

  for (const block of blocks) {
    const type = block.type;

    if (type === "heading_1" || type === "heading_2") {
      const text = plain(block[type]?.rich_text).trim();
      // Enter on the Subject Guides heading, leave on the next section of the
      // same rank — Progress Tracking, Reading Log, Resource Hub and so on.
      inGuides = /subject guides/i.test(text);
      current = null;
      continue;
    }

    if (!inGuides) continue;

    if (type === "heading_3") {
      const title = plain(block.heading_3?.rich_text).trim().toLowerCase();
      current = title || null;
      if (current) {
        guides[current] = [];
        // A guide heading may carry a subtitle after an em dash — the live page
        // has "HASS — interest-led topic menu". The block label is only ever
        // the bare subject, so the short head is registered as an alias
        // pointing at the SAME array; without it HASS silently gets no guide,
        // which looks like a subject nobody documented rather than a key that
        // did not match.
        const head = current.split("—")[0].trim();
        if (head && head !== current) guides[head] = guides[current];
      }
      continue;
    }

    if (!current) continue;
    if (type !== "bulleted_list_item" && type !== "to_do") continue;

    const line = plain(block[type]?.rich_text).replace(/\*\*/g, "").trim();
    // OneDrive is retired; its filing rules go with it.
    if (!line || SKIP.test(line)) continue;
    guides[current].push(line);
  }

  return guides;
}

/**
 * Which guides belong to a block label.
 *
 * "Block 3 — HASS" is guided by HASS; "Block 4 — Technologies + Languages" is
 * guided by both. Grammar is deliberately mapped to English: the week page
 * documents it as a rule INSIDE the English guide ("Tuesday and Thursday only,
 * always immediately before the writing task"), and that rule is the single
 * most useful thing the sheet can tell him about a 15-minute grammar block.
 */
export function guideKeysFor(name: string): string[] {
  const tail = name.includes("—") ? name.split("—").pop()! : name;
  const cleaned = tail.replace(/\(.*?\)/g, "").trim();
  if (!cleaned) return [];
  if (/^grammar$/i.test(cleaned)) return ["english"];
  return cleaned
    .split(/\s*[+&·]\s*/)
    .map(part => part.trim().toLowerCase())
    .filter(Boolean);
}

/** Attach each subject's standing guide lines, in place of nothing. */
export function attachGuides(subjects: Subject[], guides: Record<string, string[]>): Subject[] {
  return subjects.map(subject => {
    const keys = guideKeysFor(subject.name).filter(k => guides[k]?.length);
    if (keys.length === 0) return subject;
    // One matching guide reads as the subject's own notes and needs no label.
    // Two or more have to say which is which, or "Duolingo — Turkish only"
    // arrives looking like a rule about Scratch.
    const lines = keys.length === 1
      ? [...guides[keys[0]]]
      : keys.flatMap(k => guides[k].map(line => `${titleCase(k)} — ${line}`));
    return { ...subject, guide: lines };
  });
}

const titleCase = (s: string): string =>
  s.replace(/\b[a-z]/g, c => c.toUpperCase());

/* ── The public read ──────────────────────────────────────────────────────── */

let cache: { at: number; value: SchoolDay } | null = null;
/** Survives a Notion outage. Separate from `cache` so it is never expired. */
let lastGood: SchoolDay | null = null;

/**
 * Today's school card.
 *
 * Never throws. A Notion failure returns the last good card marked `stale`, and
 * a cold process with no last good card returns an empty, honest one — a board
 * that says "can't reach Notion" is recoverable; a board that silently shows
 * yesterday's subjects as though they were today's is not.
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
    const weekUrl = await getActiveWeekUrl();
    if (!weekUrl) {
      return empty('No week page set. Paste this week\'s link into App Settings → "Active Week Page".');
    }
    const pageId = pageIdFromUrl(weekUrl);
    if (!pageId) return empty("The Active Week Page link is not a Notion page URL.");

    const [page, blocks] = await Promise.all([
      notion(`/pages/${pageId}`),
      flatBlocks(pageId),
    ]);

    const titleProp = Object.values(page.properties ?? {})
      .find((p: any) => p?.type === "title") as { title?: any[] } | undefined;
    const weekTitle = plain(titleProp?.title ?? []);
    const parsed = subjectsForDay(blocks, weekday);
    const dayLabel = parsed.dayLabel;
    const subjects = attachGuides(parsed.subjects, parseGuides(blocks));

    const value: SchoolDay = {
      ok: true, weekTitle, weekUrl, dayLabel, weekday, date, subjects, stale: false,
      message: subjects.length === 0
        ? `No ${weekday} card found on the live week page.`
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
