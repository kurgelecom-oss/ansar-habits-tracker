import { adminClient, hasServiceRole } from "./supabase-admin";
import { notionPost, guideLines, SCHOOL_DAYS } from "./homeschool";
import { PROGRAMME_DS, GUIDES_DS } from "./notion-sources";

/* ════════════════════════════════════════════════════════════════════════════
   The board's own copy of the Daily Programme. PHASE 2.

   Ansar's board currently phones Notion live on every load, which is why a
   renamed column can blank the screen and a Notion outage takes the board with
   it. Notion is a good place to WRITE a week and a bad place to SERVE one.

   WHY THIS EXISTS INSTEAD OF REUSING ansar_assessment_lessons
   The restructure proposal assumed the curriculum sync could feed the board
   too. It cannot. Checked against the stored rows for 5 Oct 2026, that table
   drops Label, Order and Duration; splits one Notion row into several lessons
   ("Technologies + Languages" becomes two, so four blocks read back as five);
   and shortens the task per subject. Serving the board from it would silently
   reorder his day and truncate his work.

   NOT YET WIRED TO THE BOARD. getSchoolDay() still reads Notion live. This
   module writes the copy and can compare it to a live read, so the switch is
   made on evidence — "add alongside, prove, then switch", and the phase gate
   is a full week of row-for-row agreement.
   ══════════════════════════════════════════════════════════════════════════ */

const TABLE = "school_programme_snapshots";

/** Notion property readers. Deliberately NOT mapProgramme: that collapses a day
 *  to one card and drops the per-row Order, Duration and Date this needs. */
const text = (p: any, name: string): string =>
  (p?.[name]?.rich_text ?? []).map((t: any) => t?.plain_text ?? "").join("").trim();
const title = (p: any, name: string): string =>
  (p?.[name]?.title ?? []).map((t: any) => t?.plain_text ?? "").join("").trim();

export interface SnapshotRow {
  notion_row_id: string;
  lesson_date: string;
  label: string;
  block_order: number | null;
  duration: string | null;
  task: string;
  day_topic: string;
  day_note: string;
  week_title: string;
  weekday: string | null;
  guide: string[];
}

/**
 * Read every active programme row from Notion and store it board-shaped.
 *
 * Rows with no Date are skipped on purpose. The holiday cards are deliberately
 * dateless so they never reach the assessment system; a snapshot keyed on date
 * cannot hold them either, and inventing one would be worse than omitting them.
 */
export async function syncSchoolSnapshot(): Promise<{
  written: number; skippedUndated: number; days: string[]; warnings: string[];
}> {
  if (typeof window !== "undefined") throw new Error("Snapshot sync is server-only");
  if (!hasServiceRole()) throw new Error("Snapshot sync needs the service role");

  const warnings: string[] = [];
  const [programme, guideRows] = await Promise.all([
    notionPost(`/data_sources/${PROGRAMME_DS}/query`, {
      filter: { property: "Active", checkbox: { equals: true } },
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
      guideLines(text(g.properties, "Guide")),
    ]),
  );

  let skippedUndated = 0;
  const rows: SnapshotRow[] = [];
  for (const row of programme.results ?? []) {
    const p = row.properties ?? {};
    const label = text(p, "Label") || title(p, "Name");
    const date = p?.Date?.date?.start ?? null;
    if (!label) continue;
    if (!date) { skippedUndated += 1; continue; }

    const guide = (p?.Guide?.relation ?? [])
      .map((r: any) => String(r?.id ?? "").replace(/-/g, ""))
      .flatMap((id: string) => guides.get(id) ?? []);

    rows.push({
      notion_row_id: String(row.id ?? "").replace(/-/g, ""),
      lesson_date: String(date).slice(0, 10),
      label,
      block_order: typeof p?.Order?.number === "number" ? p.Order.number : null,
      duration: text(p, "Duration") || null,
      task: text(p, "Task"),
      day_topic: text(p, "Day Topic"),
      day_note: text(p, "Note"),
      week_title: text(p, "Week"),
      weekday: p?.Day?.select?.name ?? null,
      guide,
    });
  }

  if (!rows.length) {
    warnings.push("No dated active programme rows came back from Notion; nothing was stored.");
    return { written: 0, skippedUndated, days: [], warnings };
  }

  const db = adminClient();
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await db.from(TABLE).upsert(
      rows.slice(i, i + 100).map(r => ({ ...r, synced_at: new Date().toISOString() })),
      { onConflict: "notion_row_id,lesson_date" },
    );
    // Never swallow a failed write: a half-written snapshot that reports
    // success is the one failure mode that would make the board lie later.
    if (error) throw new Error(`Snapshot write failed: ${error.message}`);
  }

  return {
    written: rows.length,
    skippedUndated,
    days: [...new Set(rows.map(r => r.weekday).filter(Boolean) as string[])],
    warnings,
  };
}

/** Stored rows for one date, in board order. */
export async function readSnapshotDate(date: string): Promise<SnapshotRow[]> {
  const { data, error } = await adminClient()
    .from(TABLE)
    .select("*")
    .eq("lesson_date", date)
    .order("block_order", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SnapshotRow[];
}

/** Stored rows for a date range, in date then board order. Phase 3's week grid. */
export async function readSnapshotRange(from: string, to: string): Promise<SnapshotRow[]> {
  const { data, error } = await adminClient()
    .from(TABLE)
    .select("*")
    .gte("lesson_date", from)
    .lte("lesson_date", to)
    .order("lesson_date", { ascending: true })
    .order("block_order", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SnapshotRow[];
}

/**
 * THE PHASE GATE INSTRUMENT.
 *
 * Compares a live Notion read of one weekday against the stored copy, field by
 * field, and names every difference. The board is only switched over once this
 * reports agreement for a full week — the point is to be able to prove it
 * rather than assert it.
 */
export async function compareToLive(weekday: string): Promise<{
  weekday: string; date: string | null; match: boolean;
  liveCount: number; storedCount: number; differences: string[];
}> {
  if (!SCHOOL_DAYS.includes(weekday)) {
    return { weekday, date: null, match: true, liveCount: 0, storedCount: 0,
      differences: ["Not a school day; nothing to compare."] };
  }

  const live = await notionPost(`/data_sources/${PROGRAMME_DS}/query`, {
    filter: {
      and: [
        { property: "Active", checkbox: { equals: true } },
        { property: "Day", select: { equals: weekday } },
      ],
    },
    sorts: [{ property: "Order", direction: "ascending" }],
    page_size: 100,
  });

  const liveRows = (live.results ?? [])
    .map((row: any) => {
      const p = row.properties ?? {};
      return {
        id: String(row.id ?? "").replace(/-/g, ""),
        label: text(p, "Label") || title(p, "Name"),
        task: text(p, "Task"),
        duration: text(p, "Duration") || null,
        date: p?.Date?.date?.start ? String(p.Date.date.start).slice(0, 10) : null,
      };
    })
    .filter((r: any) => r.label);

  const date = liveRows.find((r: any) => r.date)?.date ?? null;
  const stored = date ? await readSnapshotDate(date) : [];
  const differences: string[] = [];

  if (!date) differences.push("Live rows carry no Date, so there is nothing to key a snapshot on.");
  if (liveRows.length !== stored.length) {
    differences.push(`Row count differs: live ${liveRows.length}, stored ${stored.length}.`);
  }

  const byId = new Map(stored.map(s => [s.notion_row_id, s]));
  for (const l of liveRows) {
    const s = byId.get(l.id);
    if (!s) { differences.push(`Missing from snapshot: "${l.label}".`); continue; }
    if (s.label !== l.label) differences.push(`Label differs for ${l.id}: live "${l.label}", stored "${s.label}".`);
    if (s.task !== l.task) differences.push(`Task differs for "${l.label}".`);
    if ((s.duration ?? null) !== (l.duration ?? null)) differences.push(`Duration differs for "${l.label}".`);
    byId.delete(l.id);
  }
  for (const [id, s] of byId) differences.push(`Stale in snapshot, no longer live: "${s.label}" (${id}).`);

  return {
    weekday, date,
    match: differences.length === 0,
    liveCount: liveRows.length,
    storedCount: stored.length,
    differences,
  };
}
