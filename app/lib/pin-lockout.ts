/* ════════════════════════════════════════════════════════════════════════════
   Parent-override brute-force lockout — DURABLE.

   WHY THIS FILE EXISTS. The first implementation was a module-scope Map in the
   route. It looked right and did nothing: Netlify load-balances across warm
   Lambda instances, each with its own copy, so a run of five wrong PINs
   measured on production counted down 4, 3, 2 … 4, 3, 2 and never reached the
   threshold. A counter that resets under the exact conditions it is meant to
   defend against is worse than none, because it reads as protection.

   State therefore lives in Postgres, written with the service role, so every
   instance sees the same tally.

   STORAGE. The dedicated table is `pin_attempts` (db/pin_attempts.sql). If it
   is absent, this falls back to `override_log` with a sentinel habit_id, which
   already exists and is already service-role-only. Failed override attempts are
   legitimately audit material, so the fallback is a less tidy home rather than
   a hack. The probe result is cached per instance, so the fallback costs one
   extra query per cold start and nothing after that.

   No PIN value is ever stored here — only that an attempt failed, and when.
   ══════════════════════════════════════════════════════════════════════════ */

import { adminClient } from "./supabase-admin";

export const LOCKOUT_MAX_FAILURES = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

/** Sentinel used when falling back to override_log. Cannot collide with a real
 *  habit id: every habit id in Notion is a plain slug. */
const SENTINEL = "__pin_attempt__";

/** null = not probed yet. */
let hasDedicatedTable: boolean | null = null;

async function useDedicated(): Promise<boolean> {
  if (hasDedicatedTable !== null) return hasDedicatedTable;
  const { error } = await adminClient().from("pin_attempts").select("id").limit(1);
  // PGRST205 = table missing from the schema cache. Anything else (including
  // success) means the table is there and usable.
  hasDedicatedTable = !(error && (error as { code?: string }).code === "PGRST205");
  return hasDedicatedTable;
}

/** Which store is in use — surfaced by the diagnostic so this is never a guess. */
export async function lockoutBackend(): Promise<"pin_attempts" | "override_log"> {
  return (await useDedicated()) ? "pin_attempts" : "override_log";
}

/** Record one failed PIN attempt for this client. */
export async function recordFailure(key: string, nowMs: number): Promise<void> {
  const db = adminClient();
  if (await useDedicated()) {
    await db.from("pin_attempts").insert({
      client_key: key,
      failed_at: new Date(nowMs).toISOString(),
    });
    return;
  }
  await db.from("override_log").insert({
    habit_id: SENTINEL,
    date: new Date(nowMs).toISOString().slice(0, 10),
    created_at: new Date(nowMs).toISOString(),
    reason: key,
  });
}

/**
 * Remaining lockout for this client in ms, and how many failures are inside the
 * window. Locked once LOCKOUT_MAX_FAILURES failures land within LOCKOUT_MS; the
 * lock then runs LOCKOUT_MS from the MOST RECENT failure, so hammering it while
 * locked extends the wait rather than running it down.
 */
export async function lockoutState(key: string, nowMs: number): Promise<{
  remainingMs: number;
  failures: number;
}> {
  const since = new Date(nowMs - LOCKOUT_MS).toISOString();
  const db = adminClient();

  let times: number[] = [];
  if (await useDedicated()) {
    const { data } = await db
      .from("pin_attempts")
      .select("failed_at")
      .eq("client_key", key)
      .gte("failed_at", since);
    times = (data ?? []).map((r: { failed_at: string }) => Date.parse(r.failed_at));
  } else {
    const { data } = await db
      .from("override_log")
      .select("created_at, reason")
      .eq("habit_id", SENTINEL)
      .gte("created_at", since);
    times = (data ?? [])
      .filter((r: { reason: string }) => r.reason === key)
      .map((r: { created_at: string }) => Date.parse(r.created_at));
  }

  const failures = times.length;
  if (failures < LOCKOUT_MAX_FAILURES) return { remainingMs: 0, failures };
  const latest = Math.max(...times);
  return { remainingMs: Math.max(0, latest + LOCKOUT_MS - nowMs), failures };
}

/** A correct PIN clears the tally — the parent has proved themselves. */
export async function clearFailures(key: string): Promise<void> {
  const db = adminClient();
  if (await useDedicated()) {
    await db.from("pin_attempts").delete().eq("client_key", key);
    return;
  }
  await db.from("override_log").delete().eq("habit_id", SENTINEL).eq("reason", key);
}
