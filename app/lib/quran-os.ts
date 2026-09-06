/* ════════════════════════════════════════════════════════════════════════════
   Qur'an evidence — read from Quran OS (https://quran-os.netlify.app).

   tk, 6 Sep 2026: Ansar's Qur'an sessions happen in Quran OS and "need to be
   tracked via this app". So the `quran` habit is no longer the child's word; it
   is a FINISHED Quran OS session (Fajr Flow: review → forge → words → letters)
   for the day, read server-side from Quran OS's token-gated snapshot feed.

   SAME SHAPE AS lib/tally.ts, ON PURPOSE. `configured` / `error` / `byDate` are
   kept as three separate facts for the same reason the journal keeps them: an
   unreachable Quran OS is not the same fact as "no session today", and the
   routes that read this must never turn the first into the second.

   NEVER THROWS. Every failure comes back as `{ byDate: {}, error }`.

   30-SECOND MEMO, in-process, explicit. The board polls /api/tick every 30s;
   without this every poll would be a round trip to Quran OS. `fresh` bypasses
   it for the sync route, which only runs when there is already work to do.
   ══════════════════════════════════════════════════════════════════════════ */

export const QURAN_HABIT_ID = "quran";
const MEMBER = "ansar";
const CACHE_MS = 30_000;
const NO_TOKEN = "QURAN_OS_TOKEN is not set for this deploy";

export type QuranEvidence = {
  /** Is QURAN_OS_TOKEN set for this deploy? False means nothing can be read. */
  configured: boolean;
  /** A FINISHED Quran OS session exists for the date. */
  found: boolean;
  /** Minutes of that session, or null. */
  minutes: number | null;
  /** When it finished, UTC ISO-8601, or null. */
  endedAt: string | null;
  /** Why the answer is unknown. Non-null means `found` means nothing. */
  error: string | null;
};

export type QuranEvidenceMap = {
  configured: boolean;
  error: string | null;
  /** Sydney/Melbourne YYYY-MM-DD → the finished session that owns that day. */
  byDate: Record<string, { minutes: number; endedAt: string | null }>;
};

type SnapshotSession = { date: string; minutes: number; finished: boolean; endedAt: string | null };
type Snapshot = { members?: Array<{ id: string; sessions?: SnapshotSession[] }> };

/** Pure. Turns a Quran OS snapshot into the day → session map. Exported for tests. */
export function evidenceFromSnapshot(body: Snapshot, member = MEMBER): QuranEvidenceMap["byDate"] {
  const m = (body.members ?? []).find(x => x.id === member);
  const byDate: QuranEvidenceMap["byDate"] = {};
  for (const s of m?.sessions ?? []) {
    if (!s.finished || typeof s.date !== "string") continue;
    // A day can hold several sessions; the first finished one is the record.
    if (!byDate[s.date]) byDate[s.date] = { minutes: Number(s.minutes) || 0, endedAt: s.endedAt ?? null };
  }
  return byDate;
}

let cache: { at: number; value: QuranEvidenceMap } | null = null;

export async function getQuranEvidenceMap(fresh = false): Promise<QuranEvidenceMap> {
  const token = process.env.QURAN_OS_TOKEN;
  if (!token) return { configured: false, error: NO_TOKEN, byDate: {} };
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.value;

  const base = process.env.QURAN_OS_URL || "https://quran-os.netlify.app";
  let value: QuranEvidenceMap;
  try {
    const res = await fetch(`${base}/api/snapshot?member=${MEMBER}&days=3`, {
      headers: { "x-qos-token": token }, cache: "no-store",
    });
    // The status is the diagnosis; the body and the token are never quoted.
    if (!res.ok) throw new Error(`Quran OS: ${res.status} ${res.statusText}`);
    const body = (await res.json()) as Snapshot;
    value = { configured: true, error: null, byDate: evidenceFromSnapshot(body) };
  } catch (e) {
    value = { configured: true, error: e instanceof Error ? e.message : "Quran OS unreachable", byDate: {} };
  }
  cache = { at: Date.now(), value };
  return value;
}

export async function getQuranEvidence(date: string, fresh = false): Promise<QuranEvidence> {
  const map = await getQuranEvidenceMap(fresh);
  const hit = map.byDate[date];
  return { configured: map.configured, error: map.error, found: Boolean(hit), minutes: hit?.minutes ?? null, endedAt: hit?.endedAt ?? null };
}

/** Test seam. */
export function __resetQuranEvidenceCache(): void { cache = null; }
