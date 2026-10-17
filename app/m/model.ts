/* ════════════════════════════════════════════════════════════════════════════
   THE PHONE VIEW — what it shows, as plain data.

   /m is a READ-ONLY summary of the board. It decides nothing: every state in
   here was already decided by the server (/api/tick's gate diagnostic,
   /api/school-week, /api/pathway, /api/stretch, /api/golden-boot) and this
   module only picks which handful of facts fit on a phone screen.

   Pure on purpose — no clock, no fetch, no React — so the picking rules are
   testable and cannot drift from the board by reading a different clock. The
   one clock that matters is the server's Sydney clock, which arrives in the
   gate payload.
   ══════════════════════════════════════════════════════════════════════════ */

/** Exactly the states /api/tick reports. Same four words as the board. */
export type ButtonState = "DONE" | "LIVE" | "LOCKED" | "MISSED";

/** One habit, as the gate diagnostic reports it. A subset of the board's view. */
export type MobileHabit = {
  id: string;
  name: string;
  block: string;
  order: number;
  /** Notion "Point Type". `prerequisite` unlocks only — see lib/days.ts. */
  pointType?: string | null;
  window: string | null;
  state: ButtonState;
  label: string;
  message?: string | null;
};

/**
 * How a tile reads at a glance. Colour is never the only signal on the screen —
 * every tile also carries its number and a word — but the tone is what makes
 * "three missed" findable without reading.
 */
export type Tone = "done" | "live" | "wait" | "missed" | "off";

export type HabitRoll = {
  done: number;
  total: number;
  /** Of today's applicable habits. 0 when nothing is scheduled, never NaN. */
  percent: number;
  live: MobileHabit[];
  missed: MobileHabit[];
  /**
   * The one thing to do next: the first LIVE habit, or — when nothing is open
   * yet — the first LOCKED one, so the phone can say "Opens 8:30am" rather
   * than going blank between windows. Null once the day is finished.
   */
  next: MobileHabit | null;
  tone: Tone;
};

const byOrder = (a: MobileHabit, b: MobileHabit) => a.order - b.order;

/** Today's habits rolled into the four numbers a phone has room for. */
export function habitRoll(habits: MobileHabit[]): HabitRoll {
  const total = habits.length;
  const done = habits.filter(h => h.state === "DONE").length;
  const live = habits.filter(h => h.state === "LIVE").sort(byOrder);
  const missed = habits.filter(h => h.state === "MISSED").sort(byOrder);
  const locked = habits.filter(h => h.state === "LOCKED").sort(byOrder);
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    live,
    missed,
    next: live[0] ?? locked[0] ?? null,
    tone: total === 0 ? "off"
      : done === total ? "done"
      : live.length > 0 ? "live"
      : missed.length > 0 ? "missed"
      : "wait",
  };
}

/**
 * The tone for a plain done-out-of-total count, where there is no window to be
 * late against. `total === 0` is "off", NOT "done" — nothing loaded must never
 * read as everything finished. That is the same fail-closed rule
 * lib/weekend.ts applies to an empty Saturday Push.
 */
export function countTone(done: number, total: number): Tone {
  if (total === 0) return "off";
  if (done >= total) return "done";
  return done > 0 ? "live" : "wait";
}

/** One square on the phone's status grid. */
export type Tile = {
  id: string;
  icon: string;
  label: string;
  /** The number, pre-formatted. "3/5", "61%", "—". */
  value: string;
  /** One short line under it. Never more than a few words. */
  detail: string;
  tone: Tone;
  /** Where the full screen lives. The phone view links out; it never edits. */
  href: string;
};

/** "3/5" — or "—/—" while a source has not answered. */
export function fraction(done: number | null, total: number | null): string {
  if (done === null || total === null) return "—";
  return `${done}/${total}`;
}

/**
 * The block a habit belongs to, counted. Used for the compact block strip so a
 * parent can see WHICH part of the day stalled, not only that something did.
 */
export type BlockRoll = { block: string; done: number; total: number; tone: Tone; missed: number };

export function blockRolls(habits: MobileHabit[], order: string[]): BlockRoll[] {
  return order
    .map(block => {
      const mine = habits.filter(h => h.block === block);
      const done = mine.filter(h => h.state === "DONE").length;
      const missed = mine.filter(h => h.state === "MISSED").length;
      return {
        block,
        done,
        total: mine.length,
        missed,
        // A missed row outranks a part-done count: it is the thing worth seeing.
        tone: mine.length === 0 ? "off" as Tone
          : missed > 0 && done < mine.length ? "missed" as Tone
          : countTone(done, mine.length),
      };
    })
    .filter(r => r.total > 0);
}

/**
 * Habit ids ticked today, for scoring. Taken from the GATE's own DONE states
 * rather than from a second query, so the points on the phone can never
 * disagree with the buttons on the board.
 */
export function completedIds(habits: MobileHabit[]): Set<string> {
  return new Set(habits.filter(h => h.state === "DONE").map(h => h.id));
}

/**
 * How stale a snapshot is, in whole days, or null when it never said. The
 * school week is written by a nightly sync, so "edited this morning" is a real
 * and frequent state — the phone says so instead of implying it is live.
 */
export function daysBehind(syncedAt: string | null | undefined, todayKey: string): number | null {
  if (!syncedAt) return null;
  const synced = syncedAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(synced) || !/^\d{4}-\d{2}-\d{2}$/.test(todayKey)) return null;
  const ms = Date.parse(`${todayKey}T00:00:00Z`) - Date.parse(`${synced}T00:00:00Z`);
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.round(ms / 86_400_000));
}
