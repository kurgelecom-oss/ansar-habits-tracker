/* ════════════════════════════════════════════════════════════════════════════
   Deterministic visual fixtures.

   Development and test data only. Nothing here is imported by a route, and
   nothing here performs I/O — no fetch, no Date.now(), no Math.random(). Two
   runs a week apart must render the same pixels, or a visual comparison proves
   nothing.

   Habit ids, names, blocks, orders, point values and windows are transcribed
   from the live configuration recorded in
   docs/verification/dashboard-v2-baseline.md. They are the real programme, not
   invented stand-ins, so a fixture render is a fair preview of the real board.
   ══════════════════════════════════════════════════════════════════════════ */

import type {
  DashboardGate, DashboardGoldenBoot, DashboardHabit, DashboardServerTime,
  DashboardStretchItem, DashboardWallet,
} from "./types";
// Read, not re-typed. /api/tick computes this field from the same list, so a
// fixture that hardcoded it could preview a board production never renders.
import { requiresParentVerification } from "../lib/parent-verified";

/** Everything one screen of Dashboard V2 renders from. */
export type DashboardFixture = {
  name: string;
  gate: DashboardGate;
  wallet: DashboardWallet;
  stretchItems: DashboardStretchItem[];
  goldenBoot: DashboardGoldenBoot;
  weekScore: number;
  weekMax: number;
  /** Tally submissions counted today. Evidence state, never a score input. */
  workSubmissionCount: number;
  pointsActive: boolean;
  online: boolean;
};

type HabitSeed = Pick<DashboardHabit, "id" | "name" | "block" | "order" | "points" | "pointType">;

/** The live programme, in Notion order. Weekday-only rows are marked. */
const MORNING: HabitSeed[] = [
  { id: "bed_dressed", name: "Bed made + dressed", block: "pre_homeschool", order: 1, points: 0, pointType: "block" },
  { id: "quran", name: "Qur'an recitation - 20 min", block: "pre_homeschool", order: 2, points: 0, pointType: "block" },
  { id: "fajr", name: "Fajr Namaz done", block: "pre_homeschool", order: 3, points: 0, pointType: "block" },
  { id: "feet_floor", name: "Feet on floor by 6:45am - no phone", block: "pre_homeschool", order: 4, points: 0, pointType: "block" },
  { id: "movement", name: "Morning movement - 20 min outside (ball work)", block: "pre_homeschool", order: 5, points: 0, pointType: "block" },
  { id: "breakfast", name: "Breakfast done - no screens", block: "pre_homeschool", order: 6, points: 0, pointType: "block" },
  { id: "goals", name: "Daily goals written + Habits page reviewed", block: "pre_homeschool", order: 7, points: 0, pointType: "block" },
];

const HOMESCHOOL: HabitSeed[] = [
  { id: "homeschool_session", name: "Homeschool session completed (4 hrs)", block: "homeschool", order: 8, points: 5, pointType: "solo" },
];

/* The journal sits at 16.5 — after "Teeth brushed" and before "Reading in bed"
   — because that is where it is configured in Notion (tk, 31 Aug). It moved out
   of Homeschool and stopped being a `prerequisite` in the same edit, and the two
   halves are not separable: a prerequisite gates every SCORING habit in its own
   block, so a journal filed in Afternoon / Evening would have held btn_cornell
   and all_namaz shut until it was ticked — and it opens at 21:00, which is after
   both of their windows have closed. As `perfect_day_only` it gates nothing and
   is instead required for the perfect-day bonus, exactly like teeth and reading
   beside it.

   It is still the only Mon–Fri row in this block, so a weekend build must drop
   it — see WEEKEND_ARVO below. */
const AFTERNOON_EVENING: HabitSeed[] = [
  { id: "btn_cornell", name: "BTN episode + Cornell notes done", block: "afternoon_evening", order: 12, points: 1, pointType: "solo" },
  { id: "shower", name: "Shower done", block: "afternoon_evening", order: 13, points: 0, pointType: "perfect_day_only" },
  { id: "all_namaz", name: "All Namaz done (Fajr, Duhr, Asr, Maghrib, Isha)", block: "afternoon_evening", order: 14, points: 1, pointType: "solo" },
  { id: "room_tidy", name: "Room tidy", block: "afternoon_evening", order: 15, points: 0, pointType: "perfect_day_only" },
  { id: "teeth", name: "Teeth brushed", block: "afternoon_evening", order: 16, points: 0, pointType: "perfect_day_only" },
  { id: "journal", name: "Daily learning journal entry written", block: "afternoon_evening", order: 16.5, points: 0, pointType: "perfect_day_only" },
  { id: "reading", name: "Reading in bed (15+ min)", block: "afternoon_evening", order: 17, points: 0, pointType: "perfect_day_only" },
];

/* Saturday and Sunday. The journal's Notion "Days" is Mon–Fri, so habitsForDay()
   drops it on a weekend and the board never draws it — a weekend fixture that
   showed it would be previewing a row production cannot produce. */
const WEEKEND_ARVO: HabitSeed[] = AFTERNOON_EVENING.filter(h => h.id !== "journal");

const CONDITIONAL: HabitSeed[] = [
  { id: "soccer_training", name: "Soccer training attended (Mon & Wed only)", block: "conditional", order: 18, points: 1, pointType: "per_session" },
];

/** The window each block's habits sit in, for the LOCKED reason text. */
const WINDOWS: Record<string, string> = {
  pre_homeschool: "06:30–08:30",
  homeschool: "08:30–13:30",
  afternoon_evening: "13:30–21:30",
  conditional: "15:00–20:00",
};

/** The late group opens at 21:00 even though its block window starts earlier. */
const LATE_IDS = new Set(["room_tidy", "teeth", "journal", "reading"]);

type StateSeed = {
  state: DashboardHabit["state"];
  message?: string | null;
  overridden?: boolean;
};

function build(seeds: HabitSeed[], states: Record<string, StateSeed>): DashboardHabit[] {
  return seeds.map(seed => {
    const seeded = states[seed.id] ?? { state: "LIVE" as const };
    const window = LATE_IDS.has(seed.id) ? "21:00–21:30" : WINDOWS[seed.block] ?? null;
    return {
      ...seed,
      state: seeded.state,
      label: seeded.state === "DONE" ? "Done" : seeded.state === "MISSED" ? "Missed" : seed.name,
      message: seeded.message ?? null,
      reason: seeded.state === "LOCKED" ? "window" : seeded.state === "MISSED" ? "window" : null,
      window,
      dwellSeconds: null,
      overridden: seeded.overridden ?? false,
      parentVerifyRequired: requiresParentVerification(seed.id),
    };
  });
}

function serverTime(date: string, weekday: string, clock: string, minutesOfDay: number): DashboardServerTime {
  return { timeZone: "Australia/Sydney", date, weekday, clock, minutesOfDay, utcIso: `${date}T00:00:00.000Z` };
}

function gate(habits: DashboardHabit[], time: DashboardServerTime): DashboardGate {
  return {
    ok: true,
    serverTime: time,
    serviceRoleConfigured: true,
    overridePinConfigured: true,
    notionConfigured: true,
    habitsError: null,
    overrideLockedMs: 0,
    overriddenHabitIds: habits.filter(h => h.overridden).map(h => h.id),
    warnings: [],
    habits,
    defaultDwellSeconds: 90,
  };
}

const STRETCH_ITEMS: DashboardStretchItem[] = [
  { id: "extra_reading", name: "Extra reading - 20 min", category: "Learning", points: 1, whatCountsAsDone: "20 unbroken minutes with a book" },
  { id: "ball_work", name: "Ball work - 30 min", category: "Football", points: 1, whatCountsAsDone: "30 minutes of drills outside" },
  { id: "help_home", name: "Help at home", category: "Home", points: 1, whatCountsAsDone: "A full chore, unprompted" },
  { id: "extra_quran", name: "Extra Qur'an - 15 min", category: "Deen", points: 1, whatCountsAsDone: "15 minutes beyond the morning recitation" },
];

/* ── Wednesday, mid-afternoon ────────────────────────────────────────────────
   A training day, so the Conditional subsection is applicable. The morning is
   behind us: one habit was missed, one carries a parent override, the rest
   were earned. Homeschool is in progress. The journal is LOCKED with the rest of
   the 21:00 group, which is what mid-afternoon looks like now that it sits
   between "Teeth brushed" and "Reading in bed".
   Between them these 16 rows exercise DONE, LIVE, LOCKED, MISSED and OVERRIDE
   — every per-habit state the baseline requires. */
export const weekdayFixture: DashboardFixture = {
  name: "Wednesday 1:45pm",
  gate: gate(
    [
      ...build(MORNING, {
        bed_dressed: { state: "DONE" },
        quran: { state: "DONE" },
        fajr: { state: "DONE" },
        // The override case: done on the board, gold-marked, and listed in the
        // gate's audit array. It must never render as an earned completion.
        feet_floor: { state: "DONE", overridden: true },
        movement: { state: "DONE" },
        breakfast: { state: "DONE" },
        goals: { state: "MISSED", message: "Window closed 8:30am" },
      }),
      ...build(HOMESCHOOL, {
        homeschool_session: { state: "LIVE" },
      }),
      ...build(AFTERNOON_EVENING, {
        btn_cornell: { state: "LIVE" },
        shower: { state: "LIVE" },
        all_namaz: { state: "LIVE" },
        room_tidy: { state: "LOCKED", message: "Opens 9:00pm" },
        teeth: { state: "LOCKED", message: "Opens 9:00pm" },
        journal: { state: "LOCKED", message: "Opens 9:00pm" },
        reading: { state: "LOCKED", message: "Opens 9:00pm" },
      }),
      ...build(CONDITIONAL, {
        soccer_training: { state: "LIVE" },
      }),
    ],
    serverTime("2026-09-02", "Wednesday", "1:45pm", 825),
  ),
  wallet: {
    ok: true, serverDate: "2026-09-02", weekday: "Wednesday", weekStart: "2026-08-31",
    balance: 30, earnedWeek: 4, spentWeek: 20, spentToday: 0,
    remainingToday: 30, dailyRedeemCapMin: 30, minPerPoint: 10,
    earnedItemIds: ["extra_reading"],
    unlocked: false, lockMessage: "Locked — Qur'an recitation first",
    weekendRedemptionOnly: true, redemptionOpen: false,
    redemptionMessage: "Redeem on Saturday or Sunday",
  },
  stretchItems: STRETCH_ITEMS,
  goldenBoot: { ok: true, target: 4, streak: 3, progress: 3 },
  weekScore: 26,
  weekMax: 55,
  workSubmissionCount: 1,
  pointsActive: true,
  online: true,
};

/* ── Saturday, mid-morning ───────────────────────────────────────────────────
   Contract amendment 8027d53: the weekend removes Homeschool and NOTHING else.
   Afternoon / Evening is still scheduled seven days a week, so all six of its
   habits remain; Conditional is empty because soccer is Mon/Wed only. 13 rows,
   which is what a fully-ticked Saturday resolves. The wallet is open, because
   redemption is what a weekend actually earns. */
export const weekendFixture: DashboardFixture = {
  name: "Saturday 9:20am",
  gate: gate(
    [
      ...build(MORNING, {
        bed_dressed: { state: "DONE" },
        quran: { state: "DONE" },
        fajr: { state: "DONE" },
        feet_floor: { state: "DONE" },
        movement: { state: "LIVE" },
        breakfast: { state: "LIVE" },
        goals: { state: "LIVE" },
      }),
      ...build(WEEKEND_ARVO, {
        btn_cornell: { state: "LOCKED", message: "Opens 1:30pm" },
        shower: { state: "LOCKED", message: "Opens 1:30pm" },
        all_namaz: { state: "LOCKED", message: "Opens 1:30pm" },
        room_tidy: { state: "LOCKED", message: "Opens 9:00pm" },
        teeth: { state: "LOCKED", message: "Opens 9:00pm" },
        reading: { state: "LOCKED", message: "Opens 9:00pm" },
      }),
    ],
    serverTime("2026-09-05", "Saturday", "9:20am", 560),
  ),
  wallet: {
    ok: true, serverDate: "2026-09-05", weekday: "Saturday", weekStart: "2026-08-31",
    balance: 40, earnedWeek: 6, spentWeek: 20, spentToday: 10,
    remainingToday: 20, dailyRedeemCapMin: 30, minPerPoint: 10,
    earnedItemIds: ["extra_reading", "ball_work"],
    unlocked: true, lockMessage: null,
    weekendRedemptionOnly: true, redemptionOpen: true,
    redemptionMessage: null,
    weekendBonusMin: 30, weekendBonusActive: false,
    weekendBonusItemsDone: 2, weekendBonusItemsTotal: 4,
  },
  stretchItems: STRETCH_ITEMS,
  goldenBoot: { ok: true, target: 4, streak: 3, progress: 3 },
  weekScore: 42,
  weekMax: 55,
  workSubmissionCount: 0,
  pointsActive: true,
  online: true,
};

export const FIXTURES = [weekdayFixture, weekendFixture];
