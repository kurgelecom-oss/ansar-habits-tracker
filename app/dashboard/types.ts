/* ════════════════════════════════════════════════════════════════════════════
   Dashboard V2 display types.

   PRESENTATION ONLY. Nothing in this directory decides whether a habit may be
   ticked, what a day scores, or what a reward costs — the server owns all of
   that (see app/lib/gating.ts, scoring.ts, goldenBoot.ts and the /api routes).
   These types describe what the dashboard *renders* after the server has
   already decided.

   The shapes below mirror the live route contracts recorded in
   docs/verification/dashboard-v2-baseline.md. Where a field is optional here it
   is because the route may be served by an older deploy, exactly as
   app/page.tsx already tolerates.
   ══════════════════════════════════════════════════════════════════════════ */

/** The four states /api/tick reports for a habit. Server-decided, never local. */
export type ButtonState = "DONE" | "LIVE" | "LOCKED" | "MISSED";

/**
 * The blocks habits are configured into in Notion.
 *
 * Contract amendment 8027d53 splits these across two columns: `pre_homeschool`
 * is the Morning Habits panel, and the other three are subsections of Today's
 * Programme in this order — Homeschool, Afternoon / Evening, Conditional.
 */
export type HabitBlock =
  | "pre_homeschool" | "homeschool" | "afternoon_evening" | "conditional";

export const HABIT_BLOCKS: HabitBlock[] = [
  "pre_homeschool", "homeschool", "afternoon_evening", "conditional",
];

/**
 * One habit as the dashboard renders it: /api/tick's gate view, plus the point
 * value from /api/habits and whether a parent override stands behind it.
 *
 * `overridden` is carried on the row rather than looked up from a set at render
 * time so the gold audit marker cannot be lost by a component forgetting to
 * consult `overriddenHabitIds`. Spec §5: an override must never look identical
 * to an earned completion.
 */
export type DashboardHabit = {
  id: string;
  name: string;
  block: string;
  order: number;
  /** Notion "Point Type". `prerequisite` means unlocks-only — see lib/days.ts. */
  pointType?: string | null;
  points: number;
  state: ButtonState;
  label: string;
  message: string | null;
  reason: string | null;
  window: string | null;
  dwellSeconds: number | null;
  overridden: boolean;
  /**
   * Does a tap on this row need the parent PIN first? From /api/tick, which
   * reads lib/parent-verified.ts — the board never decides this for itself.
   *
   * Optional so a response from an older deploy still parses; absent reads as
   * "no PIN needed", which is safe in the only direction that matters: the
   * POST asks for the PIN again regardless, so a stale board can at worst be
   * refused, never wave a tick through.
   */
  parentVerifyRequired?: boolean;
};

/** Habits split by block. Every known block is always present, possibly empty. */
export type HabitBlockGroups =
  Record<HabitBlock, DashboardHabit[]> & Record<string, DashboardHabit[]>;

/**
 * How much evidence stands behind today's journal.
 *
 * `RECORDED` and `VERIFIED` are deliberately different values because the spec
 * forbids calling a self-certified tick "Verified". `VERIFIED` is now produced,
 * and only by the Tally match: /api/tick reads the form server-side and reports
 * `journalEvidence.found`, and model.ts turns a DONE tick plus that flag into
 * `VERIFIED`. A tick on its own is still `RECORDED`, exactly as before.
 */
export type JournalEvidenceState =
  | "NOT_REQUIRED" | "MISSING" | "RECORDED" | "VERIFIED" | "OVERRIDE";

/** /api/tick's serverTime. The authoritative Sydney clock — never the device's. */
export type DashboardServerTime = {
  timeZone: string; date: string; weekday: string;
  clock: string; minutesOfDay: number; utcIso: string;
};

/** /api/tick, narrowed to what Dashboard V2 renders. */
export type DashboardGate = {
  ok: boolean;
  serverTime: DashboardServerTime;
  serviceRoleConfigured: boolean;
  overridePinConfigured: boolean;
  notionConfigured: boolean;
  habitsError: string | null;
  overrideLockedMs: number;
  overriddenHabitIds: string[];
  warnings: string[];
  habits: DashboardHabit[];
  defaultDwellSeconds?: number;
  /**
   * Today's journal evidence, from lib/tally.ts via /api/tick.
   *
   * Optional so a response from an older deploy still parses; absent reads as
   * "no evidence", which errs toward RECORDED rather than toward claiming a
   * verification that was never checked. `error` being non-null means `found`
   * is meaningless — Tally could not be reached — and must not be read as a
   * negative answer.
   */
  journalEvidence?: {
    configured: boolean;
    found: boolean;
    submittedAt: string | null;
    error: string | null;
  };
};

/** /api/stretch. Rendered verbatim — the panel computes none of these. */
export type DashboardWallet = {
  ok: boolean; serverDate: string; weekday: string; weekStart: string;
  balance: number; earnedWeek: number; spentWeek: number; spentToday: number;
  remainingToday: number; dailyRedeemCapMin: number; minPerPoint: number;
  earnedItemIds: string[];
  unlocked: boolean; lockMessage: string | null;
  weekendRedemptionOnly: boolean; redemptionOpen: boolean;
  redemptionMessage: string | null;
  weekendBonusMin?: number; weekendBonusActive?: boolean;
  weekendBonusItemsDone?: number; weekendBonusItemsTotal?: number;
};

/** One redeemable stretch item, from /api/stretch-items. */
export type DashboardStretchItem = {
  id: string; name: string; category: string; points: number;
  whatCountsAsDone: string;
};

/** /api/golden-boot, narrowed to the strip. `progress` is route-computed. */
export type DashboardGoldenBoot = {
  ok: boolean; target: number; streak: number; progress: number;
};

/** One weekly tier boundary. `min` is scoring truth; the rest is presentation. */
export type TierThreshold = {
  min: number;
  label: string;
  desc: string;
  /** A CSS custom property reference, resolved from globals.css in Task 3. */
  color: string;
};

/** The tier a weekly total falls in, plus the full scale for the compact track. */
export type Tier = TierThreshold & { thresholds: TierThreshold[] };

/** Everything readiness is derived from. All of it is already server-approved. */
export type ReadinessInput = {
  morningDone: number;
  morningTotal: number;
  homeschoolDone: boolean;
  journalState: JournalEvidenceState;
  workSubmissionCount: number;
};

/**
 * A labelled progress summary of today's learning state.
 *
 * Spec §8.4: this is NOT a football score and must never sit in the score
 * position between two real teams. The `label` is part of the contract for
 * exactly that reason, and there is deliberately no home/away field.
 */
export type MatchReadiness = {
  label: "Match Readiness";
  percent: number;
  journalState: JournalEvidenceState;
};
