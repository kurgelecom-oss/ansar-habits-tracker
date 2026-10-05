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

import { NextResponse } from "next/server";
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

/**
 * Compare a submitted PIN against PARENT_OVERRIDE_PIN, with the lockout.
 *
 * Returns null when the PIN is good, or the NextResponse to send when it is
 * not. Extracted so the override path and the parent sign-off path cannot drift
 * apart: one lockout tally, one constant-time compare, one set of reason
 * strings. A second hand-rolled copy of this is how a new PIN entry point ends
 * up with no brute-force protection at all, which is precisely the bug
 * lib/pin-lockout.ts was written to end.
 *
 * The env var is shared on purpose — there is one parent PIN, and a second
 * secret to distribute is a second secret to leak. What differs between the two
 * callers is what a correct PIN then BUYS, and that is decided by the caller,
 * not here.
 */
export async function checkPin(
  pin: string,
  attemptKey: string,
  nowMs: number,
  noStore: Record<string, string>,
): Promise<NextResponse | null> {
  // Lockout is checked BEFORE the PIN is compared, so a locked-out caller
  // learns nothing about whether their guess was right.
  const { remainingMs: remaining } = await lockoutState(attemptKey, nowMs)
    .catch(() => ({ remainingMs: 0 }));
  if (remaining > 0) {
    return NextResponse.json({
      ok: false,
      reason: "locked_out",
      message: `Too many incorrect PINs. Try again in ${Math.ceil(remaining / 60000)} min.`,
      lockedMs: remaining,
    }, { status: 429, headers: noStore });
  }

  const expectedPin = process.env.PARENT_OVERRIDE_PIN;
  if (!expectedPin) {
    return NextResponse.json(
      { ok: false, reason: "no_override", message: "Parent override is not configured on this deploy." },
      { status: 503, headers: noStore },
    );
  }

  if (!timingSafeEqual(pin, expectedPin)) {
    await recordFailure(attemptKey, nowMs).catch(() => {});
    const after = await lockoutState(attemptKey, nowMs)
      .catch(() => ({ remainingMs: 0, failures: 0 }));
    const nowLocked = after.remainingMs;
    return NextResponse.json({
      ok: false,
      reason: nowLocked > 0 ? "locked_out" : "bad_pin",
      message: nowLocked > 0
        ? `Too many incorrect PINs. Try again in ${Math.ceil(nowLocked / 60000)} min.`
        : "Incorrect PIN.",
      attemptsRemaining: Math.max(0, LOCKOUT_MAX_FAILURES - after.failures),
      lockedMs: nowLocked,
    }, { status: nowLocked > 0 ? 429 : 403, headers: noStore });
  }

  // A correct PIN clears the counter — the parent has proved themselves.
  await clearFailures(attemptKey).catch(() => {});
  return null;
}

/** Constant-time string compare, so a wrong PIN leaks nothing through timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
