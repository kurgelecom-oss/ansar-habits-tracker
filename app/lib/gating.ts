/* ════════════════════════════════════════════════════════════════════════════
   THE FOUR GATES.

   Pure decision logic, no I/O, no Supabase, no Notion, no React. It is imported
   by /api/tick (where it is ENFORCED) and by the board (where its output only
   decides what a button looks like). That asymmetry is the whole design:

        THE SERVER DECIDES. THE UI ONLY REPORTS THE DECISION.

   Nothing in this file is reachable from a client-side branch that could be
   skipped. If the browser lies about the time, sends a forged timestamp, or
   POSTs directly with curl, the same function below runs on the server against
   the server's own clock and rejects it.

   This file is deliberately NOT app/lib/scoring.ts. scoring.ts is hash-synced
   byte-for-byte with family-dashboard (see scripts/check-scoring-sync.sh) and
   must not change; gating is a separate concern layered in front of it. Gating
   decides whether a tick is allowed to happen. Scoring decides what a tick that
   already happened is worth. They never call each other.
   ══════════════════════════════════════════════════════════════════════════ */

import { formatClock, parseHHMM } from "./time";

/** Local block ids. These are the ids scoring.ts already keys its subtotals on. */
export const BLOCK_PRE = "pre_homeschool";
export const BLOCK_SCHOOL = "homeschool";
export const BLOCK_ARVO = "afternoon_evening";
export const BLOCK_CONDITIONAL = "conditional";

/**
 * Notion "Block" select option → local block id.
 *
 * The option names below are the ones that actually exist in the Habit Blocks
 * data source (verified against the live schema). family-dashboard's copy of
 * this map keys off "Pre-Homeschool", which matches nothing and silently falls
 * through to its default — harmless there by luck, not by design. Do not copy
 * that spelling here.
 */
export const NOTION_BLOCK_MAP: Record<string, string> = {
  "Morning Habits": BLOCK_PRE,
  "Homeschool": BLOCK_SCHOOL,
  "Afternoon/Evening": BLOCK_ARVO,
  "Conditional": BLOCK_CONDITIONAL,
};

/** Every way a tick can be refused. These strings are part of the API contract. */
export type GateReason = "not_open" | "closed" | "too_fast" | "out_of_order" | "locked";

/** A habit as far as gating is concerned. Sourced from Notion via /api/habits. */
export interface GateHabit {
  id: string;
  name: string;
  block: string;
  /** Notion "Order" — global across blocks, so ordering is resolved per block. */
  order: number;
  /** Notion "Window Start"/"Window End", HH:MM 24hr, or null when unset. */
  windowStart: string | null;
  windowEnd: string | null;
  /** Notion per-habit "Dwell Seconds" override, or null to use the default. */
  dwellSeconds: number | null;
}

/** One recorded completion for the day being gated. */
export interface GateCompletion {
  habit_id: string;
  /** UTC ISO-8601, as stored in habit_completions.completed_at. */
  completed_at: string;
}

export interface GateContext {
  /** Every habit visible for this day, all blocks, any order. */
  habits: GateHabit[];
  /** Completions already recorded for `serverDate`. */
  completions: GateCompletion[];
  /** The server's own Sydney calendar date. Never the client's. */
  serverDate: string;
  /** Minutes since Sydney midnight, from the server's own clock. */
  nowMinutes: number;
  /** Epoch millis from the server's own clock, for dwell arithmetic. */
  nowMs: number;
  /** Fallback dwell when a habit has no per-habit override. From Notion. */
  defaultDwellSeconds: number;
}

export type GateVerdict =
  | { allowed: true }
  | { allowed: false; reason: GateReason; message: string };

/** Button state. DONE and MISSED and LOCKED are all non-tappable. */
export type ButtonState = "DONE" | "LIVE" | "LOCKED" | "MISSED";

const allow: GateVerdict = { allowed: true };
const deny = (reason: GateReason, message: string): GateVerdict =>
  ({ allowed: false, reason, message });

/* ── helpers ─────────────────────────────────────────────────────────────── */

/** Habits of one block, ordered by Notion "Order". */
export function blockHabits(habits: GateHabit[], block: string): GateHabit[] {
  return habits.filter(h => h.block === block).sort((a, b) => a.order - b.order);
}

function isDone(ctx: GateContext, habitId: string): boolean {
  return ctx.completions.some(c => c.habit_id === habitId);
}

/** True when every habit in a block has a completion row for the day. */
export function blockComplete(ctx: GateContext, block: string): boolean {
  const bh = blockHabits(ctx.habits, block);
  // The length guard matters: an empty block is not a complete one. Without it a
  // failed habit load would report every block complete and open every cascade.
  return bh.length > 0 && bh.every(h => isDone(ctx, h.id));
}

/** Effective dwell for a habit, in seconds. */
export function dwellFor(habit: GateHabit, ctx: GateContext): number {
  const v = habit.dwellSeconds;
  return typeof v === "number" && v >= 0 ? v : ctx.defaultDwellSeconds;
}

/** Most recent completion instant within a block, or null if the block is empty. */
function lastTickMsInBlock(ctx: GateContext, block: string): number | null {
  const ids = new Set(blockHabits(ctx.habits, block).map(h => h.id));
  let latest: number | null = null;
  for (const c of ctx.completions) {
    if (!ids.has(c.habit_id)) continue;
    const t = Date.parse(c.completed_at);
    if (Number.isNaN(t)) continue;
    if (latest === null || t > latest) latest = t;
  }
  return latest;
}

/* ── GATE 1 — WINDOW ─────────────────────────────────────────────────────────
   A tick outside [Window Start, Window End] is rejected. Before the window is
   "not_open"; after it is "closed".

   The date is checked here too, and it is the gate that kills batching: the only
   date a tick may carry is the server's own Sydney date. A stale tab, a tick
   queued overnight, or a hand-crafted request naming yesterday is refused. That
   is why /api/tick takes { habitId, date } and validates `date` rather than
   trusting it.

   An unset or malformed window is treated as ALWAYS OPEN, not always closed. The
   windows live in Notion and are edited by hand; a typo there should degrade to
   the old ungated behaviour for one habit, not brick Ansar's whole day. Callers
   surface these as warnings — see windowWarnings(). */
export function gateWindow(habit: GateHabit, ctx: GateContext, date: string): GateVerdict {
  if (date !== ctx.serverDate) {
    return date < ctx.serverDate
      ? deny("closed", "Missed — that day is over")
      : deny("not_open", "That day hasn't started yet");
  }

  const start = parseHHMM(habit.windowStart);
  const end = parseHHMM(habit.windowEnd);
  if (start === null || end === null) return allow;   // unconfigured → ungated

  if (ctx.nowMinutes < start) {
    return deny("not_open", `Opens ${formatClock(start)}`);
  }
  // Inclusive interval: the final minute of the window still counts.
  if (ctx.nowMinutes > end) {
    return deny("closed", `Missed — the window closed at ${formatClock(end)}`);
  }
  return allow;
}

/* ── GATE 2 — DWELL ──────────────────────────────────────────────────────────
   Reject if fewer than Dwell Seconds have passed since the previous tick in the
   same block. This is what stops a rapid-fire sweep down the column: seven
   habits at 90s each cannot be cleared in under nine minutes.

   It measures against the last tick in the BLOCK, not the last tick of this
   habit — the point is pace through a block, not per-habit cooldown. */
export function gateDwell(habit: GateHabit, ctx: GateContext): GateVerdict {
  const dwell = dwellFor(habit, ctx);
  if (dwell <= 0) return allow;

  const last = lastTickMsInBlock(ctx, habit.block);
  if (last === null) return allow;                    // first tick of the block

  const elapsed = Math.floor((ctx.nowMs - last) / 1000);
  // Negative elapsed means a stored timestamp is ahead of the server clock —
  // impossible unless a row was written by something other than /api/tick.
  // Treat it as "too fast" rather than silently allowing it.
  if (elapsed < dwell) {
    return deny("too_fast", "Too fast — did you actually finish?");
  }
  return allow;
}

/* ── GATE 3 — ORDER ──────────────────────────────────────────────────────────
   Within a block, the habit at Order N is rejected until Order N-1 is recorded.
   Strict: no skipping ahead and coming back.

   Notion's Order is global across blocks (1..18), so "N-1" means the habit
   immediately preceding this one *within its own block* once sorted. */
export function gateOrder(habit: GateHabit, ctx: GateContext): GateVerdict {
  const bh = blockHabits(ctx.habits, habit.block);
  const idx = bh.findIndex(h => h.id === habit.id);
  if (idx <= 0) return allow;                         // first in block, or unknown

  const prev = bh[idx - 1];
  if (!isDone(ctx, prev.id)) {
    return deny("out_of_order", `Do “${prev.name}” first`);
  }
  return allow;
}

/* ── GATE 4 — CASCADE ────────────────────────────────────────────────────────
   The homeschool block rejects all ticks until pre_homeschool is 100% complete.

   "In-window" is implicit rather than re-checked here: gate 1 already refused
   every out-of-window pre_homeschool tick, so a recorded pre_homeschool row can
   only exist because it passed its window — or because a parent override wrote
   it deliberately, which is exactly the escape hatch overrides are for. */
export function gateCascade(habit: GateHabit, ctx: GateContext): GateVerdict {
  if (habit.block !== BLOCK_SCHOOL) return allow;
  if (blockComplete(ctx, BLOCK_PRE)) return allow;
  return deny("locked", "Locked — finish Morning Habits first");
}

/**
 * The Stretch Wallet cascade. Stretch points stay locked until pre_homeschool
 * AND homeschool are both 100% complete.
 *
 * The Qur'an daily minimum is an ungamified gate: it earns nothing and is worth
 * zero points, it only unlocks. It sits in pre_homeschool, so requiring that
 * block already requires it — the explicit check below keeps that true even if
 * the habit is ever moved to another block in Notion.
 */
export const QURAN_HABIT_ID = "quran";

export function gateWallet(ctx: GateContext): GateVerdict {
  const quranExists = ctx.habits.some(h => h.id === QURAN_HABIT_ID);
  if (quranExists && !isDone(ctx, QURAN_HABIT_ID)) {
    return deny("locked", "Locked — Qur'an recitation first");
  }
  if (!blockComplete(ctx, BLOCK_PRE)) {
    return deny("locked", "Locked — finish Morning Habits first");
  }
  if (!blockComplete(ctx, BLOCK_SCHOOL)) {
    return deny("locked", "Locked — finish Homeschool first");
  }
  return allow;
}

/* ── The whole gauntlet ──────────────────────────────────────────────────── */

/**
 * Run all four gates in spec order and return the first refusal.
 *
 * Order matters for which reason a caller sees. WINDOW runs first because
 * "Opens 6:30am" is the most useful thing to tell a child at 6:00am, even if a
 * cascade would also have blocked them.
 */
export function evaluateGates(habit: GateHabit, ctx: GateContext, date: string): GateVerdict {
  if (isDone(ctx, habit.id)) {
    return deny("closed", "Already done today");
  }
  const gates = [
    gateWindow(habit, ctx, date),
    gateDwell(habit, ctx),
    gateOrder(habit, ctx),
    gateCascade(habit, ctx),
  ];
  return gates.find(g => !g.allowed) ?? allow;
}

/**
 * What the button should look like. Cosmetic only — the server re-runs
 * evaluateGates() on every POST regardless of what the UI thought.
 *
 * MISSED is distinct from LOCKED: LOCKED can still become tappable later today,
 * MISSED cannot. That distinction is why "closed" and "not_open" are separate
 * reasons rather than one "out of window".
 */
export function buttonState(habit: GateHabit, ctx: GateContext): ButtonState {
  if (isDone(ctx, habit.id)) return "DONE";
  const verdict = evaluateGates(habit, ctx, ctx.serverDate);
  if (verdict.allowed) return "LIVE";
  return verdict.reason === "closed" ? "MISSED" : "LOCKED";
}

/**
 * The label a non-LIVE button carries. "Opens 6:30am" for a window that hasn't
 * started, "Missed" once it has passed, and the gate's own message otherwise.
 */
export function buttonLabel(habit: GateHabit, ctx: GateContext): string {
  const verdict = evaluateGates(habit, ctx, ctx.serverDate);
  if (verdict.allowed) return "";
  if (verdict.reason === "closed") return "Missed";
  if (verdict.reason === "not_open") {
    const start = parseHHMM(habit.windowStart);
    return start === null ? verdict.message : `Opens ${formatClock(start)}`;
  }
  return verdict.message;
}

/**
 * Habits whose windows are unset or unparseable, and are therefore ungated.
 * Surfaced by the /api/tick diagnostic so a Notion typo is visible rather than
 * quietly permissive.
 */
export function windowWarnings(habits: GateHabit[]): string[] {
  return habits
    .filter(h => parseHHMM(h.windowStart) === null || parseHHMM(h.windowEnd) === null)
    .map(h => `${h.id}: window "${h.windowStart ?? ""}"–"${h.windowEnd ?? ""}" is not usable — habit is UNGATED`);
}
