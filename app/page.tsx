"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, getWeekStart } from "./lib/supabase";
import { scoreDay } from "./lib/scoring";
// sydneyMinutesOfDay/parseHHMM feed the morning feasibility banner. Both are the
// SAME primitives the server gates against — time.ts is Intl.DateTimeFormat with
// timeZone "Australia/Sydney" throughout and holds no hardcoded offset, so the
// banner cannot disagree with gateWindow() about what minute it is.
import { addDays, dayNameOf, sydneyMinutesOfDay, parseHHMM } from "./lib/time";
// Pure day rule, shared with the server's habitsForDay(). lib/days.ts imports no
// Notion code, so nothing server-only reaches this bundle.
// scoringHabits/isPrerequisite are the second rule in the same pure module: a
// habit whose Notion "Point Type" is `prerequisite` unlocks and scores nothing,
// so it is stripped out of every count before any total is taken.
import { habitsOnDay, scoringHabits } from "./lib/days";
// Mirrored byte-for-byte with family-dashboard/app/lib/streak.ts — see the
// header there, and scripts/check-scoring-sync.sh which guards the pair.
import { calculateStreak, STREAK_LOOKBACK_DAYS } from "./lib/streak";
import ClubHeader from "./components/dashboard/ClubHeader";
import ClubStatus from "./components/dashboard/ClubStatus";
import DayViewToggle, { type DayView } from "./components/dashboard/DayViewToggle";
import DashboardShell from "./components/dashboard/DashboardShell";
import DayProgrammePanel from "./components/dashboard/DayProgrammePanel";
import MatchCentre from "./components/dashboard/MatchCentre";
import HabitPanel from "./components/dashboard/HabitPanel";
import StretchWalletPanel from "./components/dashboard/StretchWalletPanel";
import WorkWeekPanel from "./components/dashboard/WorkWeekPanel";
import dashboardStyles from "./components/dashboard/dashboard.module.css";
import { deriveMatchReadiness, journalEvidenceState } from "./dashboard/model";
import type { DashboardHabit } from "./dashboard/types";
import type { MatchCentreData } from "./lib/football/types";
// The squad week, Mon–Fri. This file used to declare its own copy beside the
// /55 note below; lib/goldenBoot.ts asked for the collapse the moment page.tsx
// was next edited, and the Golden Boot cell is that edit. Nothing server-only
// arrives with it: goldenBoot.ts imports only scoring/days/time — all three
// already in this bundle — plus a type-only Supabase import that erases.
import { SQUAD_DAYS } from "./lib/goldenBoot";

/* ════════════════════════════════════════════════════════════════════════════
   THE BOARD.

   Everything below this comment is COSMETIC. It renders what the server has
   already decided.

     • The habit list comes from /api/habits (Notion). Nothing here is hardcoded
       except icons, which Notion has no field for.
     • Whether a button is LIVE, LOCKED, MISSED or DONE comes from /api/tick's
       read-only diagnostic, which runs the same app/lib/gating.ts the write path
       enforces — against the SERVER's Australia/Sydney clock, not this device's.
     • A tap POSTs to /api/tick and takes the server's answer. If the server says
       no, the button does not flip, whatever this file thought.

   That is the point of the branch: changing the iPad's clock changes nothing
   here, because no decision on this page is made from `new Date()`.
   ══════════════════════════════════════════════════════════════════════════ */

// Real Madrid-inspired accents. Base surfaces stay DARK on purpose: the stadium
// background scrim was tuned for dark cards, and every text token here is
// light-on-dark — switching to white surfaces would recolour all of it and
// re-open the contrast work. RM identity instead comes from Champions-League
// gold + royal navy + kit-white accents on the dark base.
const RM_GOLD = "#D4AF37";        // CL gold — FC scoreboard, achievements, top tier

// The canonical accent, from globals.css. This repo used to carry #00d9ff — a
// near-identical but WRONG cyan that matched none of the other five surfaces.
const CYAN = "var(--cyan)";

// ANSAR FC reward gate. NO LONGER A CONSTANT — it is the "Points Active"
// checkbox on the ANSAR OS App Settings row, read through /api/settings.
//
// It used to be `const POINTS_ACTIVE = false` here. Notion had said true since
// 14 Jul, so the board kept showing "Soft-launch · points preview" for two
// weeks after the soft launch ended, and fixing that needed a deploy. It is now
// a checkbox tk can tick.
//
// See `pointsActive` state below: null means "not loaded yet" and renders
// neither state, so the chip cannot flash the wrong answer on first paint.

/* ── Habits ────────────────────────────────────────────────────────────────
   The list itself is Notion's. Icons are not: Notion's Habit Blocks source has
   no icon property, and an emoji is presentation, not configuration. A habit
   added in Notion without an entry here simply gets the default tick.

   The map itself lives in app/dashboard/icons.ts. This file no longer reads it
   at all: every habit now renders through HabitRow, which looks its own icon
   up, so there is exactly one copy and nothing here to drift from it. */

const BLOCKS = [
  { id: "pre_homeschool",    label: "Morning Habits", icon: "🌅",      subtitle: "6:30–8:30am · all = +2 pts", color: "#ffa500" },
  { id: "homeschool",        label: "Homeschool", icon: "📚",        subtitle: "8:30am–1:30pm · +5 pts",     color: CYAN },
  { id: "afternoon_evening", label: "Afternoon / Evening", icon: "🌆", subtitle: "1:30–8:30pm",               color: "#00ff88" },
  { id: "conditional",       label: "Conditional", icon: "⚽",        subtitle: "Mon & Wed · 3:00–8:00pm",    color: "#a78bfa" },
];

/* ── Stretch Wallet ────────────────────────────────────────────────────────
   1 stretch point = 10 minutes. Points BANK across the week and convert to
   PS5 minutes on Saturday and Sunday only, capped at 75 redeemed minutes a day
   — except that earning EVERY active item on a weekend day lifts that day's
   cap by 30 (the server reports the lifted cap in dailyRedeemCapMin). All
   rules are enforced in /api/stretch against the server's Sydney clock — the
   values below are display fallbacks only. */
const STRETCH_MIN_PER_POINT = 10;
const STRETCH_DAILY_REDEEM_CAP_MIN = 75;
const STRETCH_SPEND_STEP_MIN = 10;

// ── LOG WORK ────────────────────────────────────────────────────────────────
// Tally intake form, opened in a modal so Ansar never leaves the board. Purely
// additive: nothing here reads or writes points, tiers, streak, screen time or
// the Stretch Wallet. `TALLY_ORIGIN` is the postMessage allow-list of one.
const TALLY_ORIGIN = "https://tally.so";
const TALLY_EMBED_JS = `${TALLY_ORIGIN}/widgets/embed.js`;
const TALLY_FORM_SRC = `${TALLY_ORIGIN}/embed/ODKlVa?alignLeft=1&hideTitle=1&dynamicHeight=1`;

/* ── Server contracts ──────────────────────────────────────────────────────── */

type ButtonState = "DONE" | "LIVE" | "LOCKED" | "MISSED";

/** One habit as /api/tick's diagnostic reports it. */
type GateHabitView = {
  id: string; name: string; block: string; order: number;
  /** Notion "Point Type". `prerequisite` means unlocks-only — see lib/days.ts.
   *  Optional so a response from an older deploy still parses as "scores". */
  pointType?: string | null;
  window: string | null; dwellSeconds: number | null;
  state: ButtonState; label: string;
  reason: string | null; message: string | null;
};

type GateSnapshot = {
  ok: boolean;
  serverTime: { timeZone: string; date: string; weekday: string; clock: string; minutesOfDay: number; utcIso: string };
  serviceRoleConfigured: boolean;
  overridePinConfigured: boolean;
  notionConfigured: boolean;
  habitsError: string | null;
  overrideLockedMs: number;
  overriddenHabitIds: string[];
  warnings: string[];
  habits: GateHabitView[];
  // The dwell the gates actually use, from Notion App Settings. The route has
  // always returned it; this type simply never declared it. The banner needs it
  // rather than a literal 90 so that retuning the dwell in Notion moves the
  // warning at the same moment it moves gateDwell().
  defaultDwellSeconds?: number;
};

/** Notion habit, from /api/habits. Supplies the point values the chips show. */
type NotionHabit = {
  id: string; name: string; block: string; order: number; points: number;
  pointType: string; days: string[];
  windowStart: string | null; windowEnd: string | null; dwellSeconds: number | null;
};

type StretchItem = { id: string; name: string; category: string; points: number; whatCountsAsDone: string };

type WalletState = {
  ok: boolean; serverDate: string; weekday: string; weekStart: string;
  balance: number; earnedWeek: number; spentWeek: number; spentToday: number;
  remainingToday: number; dailyRedeemCapMin: number; minPerPoint: number;
  earnedItemIds: string[];
  unlocked: boolean; lockMessage: string | null;
  weekendRedemptionOnly: boolean; redemptionOpen: boolean; redemptionMessage: string | null;
  // Weekend all-items bonus. Optional so a board served ahead of a stale
  // function deploy renders the card without the bonus line instead of crashing.
  weekendBonusMin?: number; weekendBonusActive?: boolean;
  weekendBonusItemsDone?: number; weekendBonusItemsTotal?: number;
};

/**
 * /api/golden-boot's GET, narrowed to what the scoreboard cell reads.
 *
 * `progress` is the position within the CURRENT run of four and is computed by
 * the route, not here — a streak of 4 arrives as 4, a streak of 5 arrives as 1.
 * The cell prints it verbatim so this file and the ledger cannot disagree about
 * what "X / 4" means. The route's other fields (weeks, awards, writeConfigured)
 * are deliberately absent: the strip has no use for them.
 */
type GoldenBootState = { ok: boolean; target: number; streak: number; progress: number };

/** What a refused tap left on screen. */
type Rejection = { habitId: string; habitName: string; reason: string; message: string };

// ANSAR FC weekly tiers. Weekly max = 55 (incl. +3 streak bonus for 5 Perfect
// Days Mon–Fri): Mon 11 + Tue 10 + Wed 11 + Thu 10 + Fri 10 = 52, plus 3. It was
// 56, which no combination of ticks could reach. Kept in step with
// lib/scoring.ts's WEEKLY_MAX by hand — this file declares its own copy rather
// than importing it, as the dashboard's two surfaces also do.
const WEEKLY_MAX = 55;

/**
 * The days the squad total is made of. Mon–Fri, and nothing else, ever.
 *
 * This is a HARD filter, not a consequence of the habit schedule. It used to be
 * the latter: every habit was Mon–Fri, so a Saturday resolved to zero applicable
 * habits and scored nothing, and the /55 came out right as a side effect.
 * Morning Habits and Afternoon/Evening are now scheduled seven days a week, so
 * that side effect is gone — a fully-ticked Saturday resolves 13 applicable
 * habits and would score 5 straight into a ceiling with no room for it.
 * WEEKLY_MAX is 52 + 3 of strictly weekday points; anything a weekend adds is
 * overflow, and "Week total 60 / 55" is how that overflow would show up.
 *
 * Weekend effort is not discarded, it is reported elsewhere: the weekend daily
 * rating on the scoreboard (see WEEKEND_MAX) and the Stretch Wallet, which is
 * what a weekend actually earns.
 *
 * The list itself is no longer declared here. It is imported at the top of this
 * file from lib/goldenBoot.ts, which is the record-keeping side of the same
 * rule — the display copy and the written-down copy cannot drift if there is
 * only one of them. This note stays because the reasoning is the board's.
 */

/**
 * The weekend daily ceiling: the weekday ceiling minus the 5 the Homeschool
 * block pays, because Homeschool is the one block that stays Mon–Fri.
 *
 * 10 − 5 = 5, and it reconciles against scoreDay() term by term: 2 for the
 * all-or-nothing Morning block, 1 for btn_cornell, 1 for all_namaz, 1 for a
 * perfect day. There is no conditional term — SOCCER_DAYS is Mon/Wed, so nothing
 * on a weekend can reach the 11 a training day allows.
 */
/* The weekend ceiling and the tier table used to be declared here. Both are
   gone from this file: the tiers now come from app/dashboard/model.ts, which
   reads the 42/34/26/0 boundaries out of lib/scoring.ts rather than re-typing
   them. That leaves exactly one written-down copy of the tier boundaries in
   the repo, which is what check-scoring-sync.sh has always been guarding. */


export default function AnsarPage() {
  const [gate, setGate] = useState<GateSnapshot | null>(null);
  const [notionHabits, setNotionHabits] = useState<NotionHabit[]>([]);
  /** Weekday/weekend PREVIEW. null = follow the server's real day. */
  const [dayView, setDayView] = useState<DayView | null>(null);
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [stretchItems, setStretchItems] = useState<StretchItem[]>([]);
  // null until /api/settings answers — see the POINTS_ACTIVE note at the top.
  const [pointsActive, setPointsActive] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("");
  /**
   * Minutes since Sydney midnight, for the morning feasibility banner.
   *
   * NULL UNTIL MOUNTED, deliberately. A clock read during the server render and
   * again on the client is the classic hydration mismatch, and this one would
   * flash a red "can't finish in time" banner on a page that had not yet decided
   * it. Null renders no banner at all.
   *
   * Separate from `time` above, which is the DEVICE's clock and is display-only.
   * This one is Sydney via lib/time.ts — the zone the gates are decided in.
   */
  const [nowMin, setNowMin] = useState<number | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [weeklyPts, setWeeklyPts] = useState<number | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  const [goldenBoot, setGoldenBoot] = useState<GoldenBootState | null>(null);
  /**
   * Real Madrid's live fixture, from /api/football/real-madrid. `null` only
   * before the first fetch lands; after that it is always a provider answer,
   * including the deliberate "unavailable" one. The board never fabricates a
   * fixture to fill this in.
   */
  const [football, setFootball] = useState<MatchCentreData | null>(null);
  const [reject, setReject] = useState<Rejection | null>(null);

  // Parent override. The PIN is typed here and sent to the server; it is never
  // compared here and never stored. The server holds PARENT_OVERRIDE_PIN.
  const [overrideFor, setOverrideFor] = useState<Rejection | null>(null);
  const [pin, setPin] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideError, setOverrideError] = useState("");
  const [overrideBusy, setOverrideBusy] = useState(false);
  // Long-press: which habit is being held, and the live countdown of the
  // lockout when one is in force. `lockedMs` is seeded from the server on every
  // poll so a refresh cannot clear it.
  const [holdId, setHoldId] = useState<string | null>(null);
  const [lockedMs, setLockedMs] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Log Work modal (unchanged behaviour) ──
  const [logOpen, setLogOpen] = useState(false);
  const [logSaved, setLogSaved] = useState(false);
  const [embedKey, setEmbedKey] = useState(0);

  const rejectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Loads ──────────────────────────────────────────────────────────────── */

  // The single source of truth for today. Fails CLOSED: if this cannot be
  // reached, `gate` stays null and every button renders non-tappable, because a
  // board that guesses LIVE while the server is unreachable is a board that
  // teaches Ansar to tap and hope.
  const loadGate = useCallback(async () => {
    try {
      const res = await fetch("/api/tick", { cache: "no-store" });
      if (!res.ok) { setOnline(false); return; }
      const snap = (await res.json()) as GateSnapshot;
      if (snap?.ok) {
        setGate(snap);
        setOnline(true);
        if (typeof snap.overrideLockedMs === "number") setLockedMs(snap.overrideLockedMs);
      } else { setOnline(false); }
    } catch {
      setOnline(false);
    }
  }, []);

  const loadNotionHabits = useCallback(async () => {
    try {
      const res = await fetch("/api/habits");
      if (!res.ok) return;
      const list = (await res.json()) as NotionHabit[];
      if (Array.isArray(list)) setNotionHabits(list);
    } catch { /* best-effort: chips degrade, gating does not */ }
  }, []);

  const loadWallet = useCallback(async () => {
    try {
      const res = await fetch("/api/stretch", { cache: "no-store" });
      if (!res.ok) return;
      const w = (await res.json()) as WalletState;
      if (w?.ok) setWallet(w);
    } catch { /* best-effort */ }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) return;
      const s = (await res.json()) as { pointsActive?: boolean };
      if (typeof s?.pointsActive === "boolean") setPointsActive(s.pointsActive);
    } catch { /* best-effort: the chip stays hidden rather than lying */ }
  }, []);

  const loadStretchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/stretch-items");
      if (!res.ok) return;
      const items = (await res.json()) as StretchItem[];
      if (Array.isArray(items)) setStretchItems(items);
    } catch { /* best-effort */ }
  }, []);

  // The Golden Boot run, read from the finalised-week ledger.
  //
  // FAILS TO NOTHING, DELIBERATELY. /api/golden-boot answers 503 while
  // db/week_results.sql has not been run, and that window is a real state this
  // board can be in. `goldenBoot` staying null renders no cell at all — the
  // other five keep their places and the strip keeps its height. A cell reading
  // "—/4" would be worse than absent: it would claim a run of zero.
  const loadGoldenBoot = useCallback(async () => {
    try {
      const res = await fetch("/api/golden-boot", { cache: "no-store" });
      if (!res.ok) { setGoldenBoot(null); return; }
      const g = (await res.json()) as GoldenBootState;
      setGoldenBoot(g?.ok ? g : null);
    } catch { setGoldenBoot(null); }
  }, []);

  // Weekly total and streak are read-only history. They still read Supabase
  // directly with the anon key — SELECT stays open to anon after the RLS
  // hardening; only writes moved to the server.
  const loadWeeklyData = useCallback(async (today: string) => {
    const weekStart = getWeekStart();
    const { data, error } = await supabase
      .from("habit_completions")
      .select("habit_id, completed_date")
      .gte("completed_date", weekStart)
      .lte("completed_date", today);
    if (error || !data) return;

    const byDate: Record<string, Set<string>> = {};
    data.forEach((r: { habit_id: string; completed_date: string }) => {
      if (!byDate[r.completed_date]) byDate[r.completed_date] = new Set();
      byDate[r.completed_date].add(r.habit_id);
    });

    if (notionHabits.length === 0) return;   // habits not loaded yet — don't score a blank list

    // Resolved PER DATE, not once for the week. Habits carry Notion "Days", and
    // the weekday and weekend rosters are no longer the same list — Homeschool
    // is Mon–Fri, soccer is Mon/Wed, everything else is all seven days.
    // habitsOnDay() is the same rule the server applies in habitsForDay(); it is
    // imported from lib/days.ts precisely so there is one copy of it rather than
    // a client one that can drift.
    const idsFor = (ds: string) => {
      const applicable = habitsOnDay(notionHabits, dayNameOf(ds));
      // `applicable` stays UNFILTERED — it is only used for the "was anything
      // scheduled at all" guard below, and a day that scheduled nothing but a
      // prerequisite still scheduled something. Only the two id lists that feed
      // scoreDay() drop prerequisites, so the /55 cannot move when one is added.
      const scored = scoringHabits(applicable);
      return {
        applicable,
        preIds: scored.filter(h => h.block === "pre_homeschool").map(h => h.id),
        baseIds: scored.filter(h => h.block !== "conditional").map(h => h.id),
      };
    };

    let total = 0;
    Object.keys(byDate).forEach(ds => {
      // THE WEEKDAY FILTER, and it is deliberately the first thing here.
      // Weekend rows are skipped because of the DATE, never because the day
      // happened to schedule nothing — that used to be the mechanism, and it
      // stopped being true the moment weekend habits were restored. A Saturday
      // with all 13 of its habits ticked contributes exactly 0 to the /55.
      if (!SQUAD_DAYS.includes(dayNameOf(ds))) return;
      const { applicable, preIds, baseIds } = idsFor(ds);
      if (applicable.length === 0) return;   // nothing scheduled that day → 0
      total += scoreDay(byDate[ds], dayNameOf(ds), preIds, baseIds).total;
    });

    const weekdayDates = [0, 1, 2, 3, 4].map(i => addDays(weekStart, i));
    const allWeekdaysPerfect = weekdayDates.every(ds => {
      if (!byDate[ds]) return false;
      const { applicable, preIds, baseIds } = idsFor(ds);
      return applicable.length > 0 && scoreDay(byDate[ds], dayNameOf(ds), preIds, baseIds).perfect;
    });
    if (allWeekdaysPerfect) total += 3;

    setWeeklyPts(total);
  }, [notionHabits]);

  /**
   * Fetches the history and hands it to the shared rule. Named loadStreak, not
   * calculateStreak, because calculateStreak is now the imported pure function —
   * one name for the I/O, another for the arithmetic.
   */
  const loadStreak = useCallback(async (today: string) => {
    // Window tied to the constant the walk uses, so the query can never fetch
    // less history than lib/streak.ts is willing to walk through.
    const cutoffStr = addDays(today, -STREAK_LOOKBACK_DAYS);
    const { data, error } = await supabase
      .from("habit_completions")
      .select("habit_id, completed_date")
      .gte("completed_date", cutoffStr)
      .order("completed_date", { ascending: false });
    if (error || !data) return;

    const byDate: Record<string, number> = {};
    data.forEach((r: { completed_date: string }) => {
      byDate[r.completed_date] = (byDate[r.completed_date] || 0) + 1;
    });

    // The rule itself lives in lib/streak.ts, mirrored byte-for-byte with
    // family-dashboard. It used to sit inline here, and the dashboard's two
    // copies drifted the moment this one changed — reporting 8 where this
    // reported 14 off the same rows. `today` is the SERVER's Sydney date, so no
    // clock is read inside the calculation.
    setStreak(calculateStreak(byDate, today));
  }, []);

  /**
   * The Match Centre feed. A failed fetch is NOT an empty bar: it becomes the
   * same honest "unavailable" shape the route returns, so the plate keeps its
   * geometry and says why instead of showing a stale or invented score.
   */
  const loadFootball = useCallback(async () => {
    try {
      const res = await fetch("/api/football/real-madrid", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setFootball(await res.json() as MatchCentreData);
    } catch {
      setFootball({
        available: false,
        reason: "upstream_unavailable",
        message: "Fixture unavailable right now",
        updatedAt: null,
        stale: true,
      });
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadGate();
    loadNotionHabits();
    loadWallet();
    loadStretchItems();
    loadSettings();
    loadFootball();

    // The header clock is the DEVICE's, and is labelled as such. It is display
    // only — no gate anywhere reads it. The server's Sydney clock is shown
    // beside it so a mismatch is visible rather than silent.
    const t = setInterval(() => {
      setTime(new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }));
    }, 1000);
    setTime(new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }));

    const poll = setInterval(() => { loadGate(); loadWallet(); }, 30000);

    // The feasibility clock. 15s rather than the 1s above, because the banner
    // only ever changes on a minute boundary and a per-second re-render of the
    // whole board to redraw the same sentence is waste. It is also faster than
    // the 30s gate poll on purpose: the deadline moves on its own even when
    // nothing is tapped, so the warning must not wait for a refetch to appear.
    // 60s, not the 30s gate poll: a LIVE score is the only thing here that
    // moves quickly, and the route's phase-aware Cache-Control means a
    // SCHEDULED match answers from the CDN for an hour regardless.
    const fixturePoll = setInterval(() => { loadFootball(); }, 60000);

    const feas = setInterval(() => setNowMin(sydneyMinutesOfDay()), 15000);
    setNowMin(sydneyMinutesOfDay());

    // A phone that slept through the 30s poll would show stale gates until the
    // next tick; refetch the same pair the poll fetches the moment the tab is
    // visible again. Intervals themselves are untouched.
    const onVis = () => {
      if (document.visibilityState === "visible") { loadGate(); loadWallet(); loadFootball(); }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearInterval(t); clearInterval(poll); clearInterval(feas); clearInterval(fixturePoll);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadGate, loadNotionHabits, loadWallet, loadStretchItems, loadSettings, loadFootball]);

  // History reloads whenever the server's date or the habit list changes.
  const serverDate = gate?.serverTime.date ?? "";
  useEffect(() => {
    if (!serverDate || notionHabits.length === 0) return;
    loadWeeklyData(serverDate);
    loadStreak(serverDate);
  }, [serverDate, notionHabits, loadWeeklyData, loadStreak]);

  // The Golden Boot is keyed on the SERVER's date and nothing else. It is not on
  // the 30-second poll beside gate and wallet: a finalised week changes at most
  // once a week, and polling it would spend ~2,900 function calls a day on a
  // number that moves four times a month. `serverDate` first becomes non-empty
  // when the gate lands, which is what loads it, and changes again at the Sydney
  // date rollover, which is what keeps a board left running for days honest. No
  // habit-roster guard here — the ledger is already finalised and needs none.
  useEffect(() => {
    if (!serverDate) return;
    loadGoldenBoot();
  }, [serverDate, loadGoldenBoot]);

  /* ── Log Work effects (unchanged) ───────────────────────────────────────── */

  useEffect(() => {
    if (!logOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLogOpen(false); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [logOpen]);

  useEffect(() => {
    if (!logOpen) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== TALLY_ORIGIN) return;
      let payload: unknown = e.data;
      if (typeof payload === "string") {
        try { payload = JSON.parse(payload); } catch { return; }
      }
      if ((payload as { event?: string } | null)?.event === "Tally.FormSubmitted") setLogSaved(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [logOpen]);

  useEffect(() => {
    if (!logSaved) return;
    const t = setTimeout(() => { setLogSaved(false); setEmbedKey(k => k + 1); }, 1500);
    return () => clearTimeout(t);
  }, [logSaved]);

  useEffect(() => {
    if (!logOpen) return;
    const promote = () => {
      const tally = (window as unknown as { Tally?: { loadEmbeds?: () => void } }).Tally;
      if (tally?.loadEmbeds) { tally.loadEmbeds(); return; }
      document.querySelectorAll<HTMLIFrameElement>("iframe[data-tally-src]").forEach(f => {
        if (!f.getAttribute("src") && f.dataset.tallySrc) f.src = f.dataset.tallySrc;
      });
    };
    if (document.querySelector(`script[src="${TALLY_EMBED_JS}"]`)) { promote(); return; }
    const s = document.createElement("script");
    s.src = TALLY_EMBED_JS;
    s.async = true;
    s.onload = promote;
    s.onerror = promote;
    document.body.appendChild(s);
  }, [logOpen, embedKey]);

  useEffect(() => () => { if (rejectTimer.current) clearTimeout(rejectTimer.current); }, []);

  // Escape cancels the override dialog. Backdrop click is handled on the
  // element itself; between them there are three ways out and no trap.
  useEffect(() => {
    if (!overrideFor) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeOverride(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overrideFor]);

  /* ── Actions ────────────────────────────────────────────────────────────── */

  /* ── Long-press to reach the parent override ───────────────────────────
     A CLICK is the first thing a child tries, so a click on a refused habit
     stays inert. Two seconds of sustained hold — mouse or touch — is the door,
     and the ring filling around the button is the only hint that it exists.
     Releasing early cancels silently and leaves nothing on screen. */
  const HOLD_MS = 2000;

  function beginHold(h: GateHabitView) {
    if (h.state !== "MISSED" && h.state !== "LOCKED") return;
    if (!gate?.overridePinConfigured) return;
    setHoldId(h.id);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      setHoldId(null);
      setOverrideFor({
        habitId: h.id,
        habitName: h.name,
        reason: h.reason ?? "closed",
        message: h.message || h.label || "Refused",
      });
      setPin("");
      setOverrideReason("");
      setOverrideError("");
    }, HOLD_MS);
  }

  function cancelHold() {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    setHoldId(null);
  }

  useEffect(() => () => { if (holdTimer.current) clearTimeout(holdTimer.current); }, []);

  // Countdown for the brute-force lockout. Purely a display tick — the server
  // re-asserts the real remaining time on every poll and on every attempt.
  useEffect(() => {
    if (lockedMs <= 0) return;
    const t = setInterval(() => setLockedMs(ms => Math.max(0, ms - 1000)), 1000);
    return () => clearInterval(t);
  }, [lockedMs]);

  function showRejection(r: Rejection) {
    setReject(r);
    if (rejectTimer.current) clearTimeout(rejectTimer.current);
    rejectTimer.current = setTimeout(() => setReject(null), 8000);
  }

  /**
   * Tap a habit.
   *
   * Sends { habitId, date } and NOTHING ELSE. No timestamp is attached, because
   * the server would ignore it — the recorded time is the server's own clock.
   * The optimistic update this function used to do is gone: the button only
   * changes after the server has agreed.
   */
  async function tick(habitId: string, habitName: string) {
    if (saving || !gate) return;
    // Refused habits are aria-disabled rather than disabled, so that a pointer
    // hold can still reach the parent override. A plain click must therefore be
    // rejected here instead of relying on the button being inert.
    const view = gate.habits.find(h => h.id === habitId);
    if (view && view.state !== "LIVE") return;
    setSaving(habitId);
    setReject(null);
    try {
      const res = await fetch("/api/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, date: gate.serverTime.date }),
      });
      const body = await res.json();
      if (res.ok && body?.ok) {
        // Re-read the clock before the reload, not on the next 15s edge. A tick
        // removes one habit from R and so pushes latestSafeNextTick 90s later;
        // leaving the banner on stale minutes would keep an amber warning up for
        // a quarter-minute after the tap that already resolved it.
        setNowMin(sydneyMinutesOfDay());
        await loadGate();
        await loadWallet();
        if (serverDate) loadWeeklyData(serverDate);
      } else {
        showRejection({
          habitId, habitName,
          reason: body?.reason ?? "error",
          message: body?.message ?? "That didn't work — try again",
        });
        await loadGate();
      }
    } catch {
      showRejection({ habitId, habitName, reason: "offline", message: "No connection — nothing was recorded" });
    } finally {
      setSaving(null);
    }
  }

  function closeOverride() {
    setOverrideFor(null);
    setPin("");
    setOverrideReason("");
    setOverrideError("");
  }

  /** Parent override. Correct PIN bypasses gates 1–4 and writes to override_log. */
  async function submitOverride() {
    if (!overrideFor || !gate || overrideBusy) return;
    setOverrideBusy(true);
    setOverrideError("");
    try {
      const res = await fetch("/api/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          habitId: overrideFor.habitId,
          date: gate.serverTime.date,
          overridePin: pin,
          reason: overrideReason,
        }),
      });
      const body = await res.json();
      if (res.ok && body?.ok) {
        closeOverride();
        setLockedMs(0);
        setReject(null);
        await loadGate();
        await loadWallet();
        if (serverDate) loadWeeklyData(serverDate);
      } else {
        // bad_pin clears the field and keeps the dialog open so Nihal can
        // simply retype. Anything else is surfaced verbatim — the one thing
        // this must never do is fail silently.
        setOverrideError(body?.message ?? "Override refused");
        if (body?.reason === "bad_pin" || body?.reason === "locked_out") setPin("");
        if (typeof body?.lockedMs === "number" && body.lockedMs > 0) setLockedMs(body.lockedMs);
      }
    } catch {
      setOverrideError("No connection");
    } finally {
      setOverrideBusy(false);
    }
  }

  async function earnStretch(item: StretchItem) {
    if (saving) return;
    setSaving(item.id);
    try {
      const res = await fetch("/api/stretch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "earn", itemId: item.id, points: item.points }),
      });
      const body = await res.json();
      if (!res.ok || !body?.ok) {
        showRejection({ habitId: item.id, habitName: item.name, reason: body?.reason ?? "error", message: body?.message ?? "Not right now" });
      }
      await loadWallet();
    } catch {
      showRejection({ habitId: item.id, habitName: item.name, reason: "offline", message: "No connection" });
    } finally {
      setSaving(null);
    }
  }

  async function spendStretch() {
    if (saving) return;
    setSaving("__spend__");
    try {
      const res = await fetch("/api/stretch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "spend" }),
      });
      const body = await res.json();
      if (!res.ok || !body?.ok) {
        showRejection({ habitId: "__spend__", habitName: "PS5 minutes", reason: body?.reason ?? "error", message: body?.message ?? "Not right now" });
      }
      await loadWallet();
    } catch {
      showRejection({ habitId: "__spend__", habitName: "PS5 minutes", reason: "offline", message: "No connection" });
    } finally {
      setSaving(null);
    }
  }

  /* ── Derived ────────────────────────────────────────────────────────────── */

  const gateHabits = gate?.habits ?? [];
  const dayName = gate?.serverTime.weekday ?? "";
  const completedIds = new Set(gateHabits.filter(h => h.state === "DONE").map(h => h.id));
  const overriddenIds = new Set(gate?.overriddenHabitIds ?? []);
  const pointsById: Record<string, number> = {};
  notionHabits.forEach(h => { pointsById[h.id] = h.points; });

  /* Prerequisites are stripped BEFORE anything is counted.
     A `prerequisite` habit is worth no points, is not part of the all-or-nothing
     morning block, is not required for a Perfect Day, and is not in the Today %
     denominator. Adding one in Notion therefore moves nothing on this strip —
     it only decides what is tappable. See lib/days.ts for why the flag is Point
     Type and not Points == 0 (eleven live habits already score zero).

     `completedIds` above is deliberately left over ALL habits: scoreDay() only
     ever looks up specific ids, and baseIds is what decides the perfect day. */
  const scored = scoringHabits(gateHabits);
  const preIds = scored.filter(h => h.block === "pre_homeschool").map(h => h.id);
  const baseIds = scored.filter(h => h.block !== "conditional").map(h => h.id);
  const dayScore = scoreDay(completedIds, dayName, preIds, baseIds);
  const todayDone = scored.filter(h => h.state === "DONE").length;
  const overallPct = scored.length > 0 ? Math.round((todayDone / scored.length) * 100) : 0;

  // Weekend is read from the SERVER's Sydney weekday, never `new Date()` — same
  // rule as every gate on this page. Empty until /api/tick answers, so the
  // scoreboard cannot flash the weekday cell on a Saturday before the server has
  // spoken. It is declared BEFORE DAILY_MAX because the ceiling now depends on
  // it: a weekend day is a real scoring day with a real, lower ceiling, not a
  // blank one.

  // Three ceilings, one expression. 11 on a training day, 10 on a school day, 5
  // on a weekend — see WEEKEND_MAX for why the weekend number is 10 minus the
  // Homeschool block's 5. `todayPts` needs no branch at all: it comes from
  // scoreDay() over the habits the SERVER says apply today, so a weekend already
  // scores itself correctly out of this ceiling.
  const earnedItemIds = new Set(wallet?.earnedItemIds ?? []);

  /* ── Styles ─────────────────────────────────────────────────────────────── */

  const BOARD_CSS = `
/* No top padding: this route draws its own ANSAR FC bar, so globals.css hides
   the shared fixed .topnav while this main is on screen and the 40px it used to
   reserve is spent on the stadium masthead instead. The two must move together —
   restore the reservation the moment the shared bar comes back here, or the
   fixed nav (z-index 900) lands on top of the first 40px of the board. Keep it
   as padding-top, NOT margin-top: body is height:100% in globals.css, so a top
   margin collapses through it and pushes the document 40px taller than the
   viewport — a scrollbar on a page whose whole point is not scrolling. */
.ab-root{display:flex;flex-direction:column;height:100dvh;padding-top:0;overflow:hidden}
/* The board grid, the row/spend button chrome and the long-hold ring used to
   be declared here. They now live in dashboard.module.css beside the
   components that draw them — .grid carries the same four-column track list
   and the same 1439/820 breakpoints, and .holdRing the same two-second sweep.
   Only the rules for elements this file still renders remain below. */
@media (max-width:1439px){
  .ab-root{height:auto;min-height:100dvh;overflow:visible}
}

/* ── NOTION SOURCE STRIP ──────────────────────────────────────────────────
   Links to the three Notion databases this board reads from, for a parent who
   needs to edit a window or a point value. Faint on purpose: a tool for Nihal,
   not something for Ansar to notice mid-tick.

   The 0.45 sits on the CHILDREN, not on .ab-src. Opacity on the container would
   open a stacking context and multiply through, so a:hover could only ever
   reach 0.45 x 1 = 0.45 and the hover cue would silently do nothing. Every
   child is an element (the middots are spans) so the > * selector reaches all
   of them — a bare text node could not be targeted.

   flex-shrink:0 keeps the strip off the panel grid's growth path, so at the
   1440px+ height:100dvh / overflow:hidden layout the board yields the ~34px
   rather than the strip being squeezed to nothing. */
.ab-src{display:flex;align-items:center;justify-content:center;gap:8px;
  flex-shrink:0;padding:14px 0 20px;font-size:10px;letter-spacing:0.04em;
  color:#565f70}
/* Compacted on a short desktop viewport: at 1440x820 the weekday programme
   needs the height more than this strip needs its margins. A parent's link
   list, not part of the day's work. */
@media (min-width:1440px) and (max-height:900px){
  .ab-src{padding:0}
}
.ab-src > *{opacity:0.45;transition:opacity 180ms ease,color 180ms ease}
.ab-src a{color:#565f70;text-decoration:none}
.ab-src a:hover{opacity:1;color:var(--cyan)}
.ab-src a:focus-visible{opacity:1;outline:2px solid ${RM_GOLD};outline-offset:2px}
@media (prefers-reduced-motion:reduce){
  .ab-src > *{transition:none}
}

/* ── LONG-PRESS HOLD INDICATOR ────────────────────────────────────────────
   It moved to dashboard.module.css as .holdRing, drawn by HabitRow, with the
   same two-second sweep and the same reason for existing: it is the only
   visible hint that a refused habit can be opened at all. */

/* ── PARENT OVERRIDE DIALOG ───────────────────────────────────────────────── */
.ab-ov-pin{letter-spacing:0.5em;font-size:22px!important;text-align:center;
  font-variant-numeric:tabular-nums}
.ab-ov-note{font-size:11.5px;line-height:1.45;color:#b0b5c1;margin-top:8px}
.ab-ov-lock{margin-top:12px;padding:10px 12px;border-radius:9px;
  border:1px solid #ff444455;background:rgba(255,68,68,0.10);
  color:#ff4444;font-size:12px;font-weight:800}

/* ── GATE REJECTION TOAST ─────────────────────────────────────────────────
   The server's own words, verbatim. Chrome uses the canonical --bg-card so it
   reads as system feedback rather than as part of the stadium board. */
.ab-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:1100;
  display:flex;align-items:center;gap:14px;max-width:min(640px,92vw);
  padding:14px 18px;border-radius:12px;background:var(--bg-card);
  border:1px solid #ff4444;box-shadow:0 18px 44px rgba(0,0,0,.6)}
.ab-toast-x{flex-shrink:0;width:32px;height:32px;border-radius:8px;border:1px solid #2d3543;
  background:var(--bg-base);color:#b0b5c1;font:inherit;font-weight:800;cursor:pointer}
.ab-toast-act{flex-shrink:0;padding:8px 14px;border-radius:8px;border:1px solid ${RM_GOLD}66;
  background:${RM_GOLD}1a;color:${RM_GOLD};font:inherit;font-size:12px;font-weight:800;cursor:pointer}

/* ── PARENT OVERRIDE DIALOG ───────────────────────────────────────────────── */
.ab-ov-backdrop{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;
  justify-content:center;padding:24px;background:rgba(8,11,20,.75)}
.ab-ov{width:min(420px,100%);padding:22px;border-radius:14px;background:var(--bg-card);
  border:1px solid #3a4170;box-shadow:0 24px 64px rgba(0,0,0,.62)}
.ab-ov input{width:100%;margin-top:6px;padding:11px 13px;border-radius:9px;
  border:1px solid #3a4170;background:var(--bg-base);color:#ffffff;font:inherit;font-size:15px}
.ab-ov input:focus-visible{outline:2px solid ${RM_GOLD};outline-offset:1px}
.ab-ov-row{display:flex;gap:10px;margin-top:18px}
.ab-ov-row button{flex:1;padding:12px;border-radius:9px;font:inherit;font-size:14px;
  font-weight:800;cursor:pointer;border:1px solid #3a4170;background:var(--bg-base);color:#b0b5c1}
.ab-ov-row button.primary{background:${RM_GOLD};border-color:${RM_GOLD};color:#0f1419}
.ab-ov-row button:disabled{opacity:.5;cursor:not-allowed}

/* ── LOG WORK MODAL ──────────────────────────────────────────────────────── */
.lw-backdrop{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;
  justify-content:center;padding:24px;background:rgba(8,11,20,0.72)}
.lw-panel{display:flex;flex-direction:column;width:min(560px,100%);max-height:85vh;
  background:#16192d;border:1px solid #2d3543;border-radius:14px;overflow:hidden;
  box-shadow:0 24px 64px rgba(0,0,0,0.62)}
.lw-head{display:flex;align-items:center;justify-content:space-between;gap:12px;
  flex-shrink:0;padding:13px 15px;border-bottom:1px solid #2d3543}
.lw-body{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;background:#ffffff}
.lw-frame{display:block;width:100%;min-height:420px;border:0}
.lw-x{display:flex;align-items:center;justify-content:center;width:36px;height:36px;
  flex-shrink:0;border-radius:9px;border:1px solid #2d3543;background:#1f2438;
  color:#b0b5c1;font:inherit;font-size:17px;font-weight:800;cursor:pointer;
  -webkit-tap-highlight-color:transparent;transition:background 180ms ease,color 180ms ease}
.lw-x:hover{background:#2d3543;color:#ffffff}
.lw-x:focus-visible{outline:2px solid ${RM_GOLD};outline-offset:2px}
@media (max-width:820px){
  .lw-backdrop{padding:12px}
  .lw-panel{width:100%;height:92vh;max-height:92vh}
}

/* ── PHONE (max-width:640px) ──────────────────────────────────────────────
   Additive only. The header, scoreboard strip and its cells carry inline
   styles, so the size overrides here need !important; nothing at or above
   641px can see this block, and the >=1440px no-scroll contract is untouched. */
@media (max-width:640px){
  /* Bottom-most fixed element on the board: keep the toast above the iOS
     home-indicator safe area. */
  .ab-toast{padding-bottom:calc(14px + env(safe-area-inset-bottom))}
}`;


  /**
   * Column shell: accent rail, title/subtitle, optional right-hand count.
   *
   * `compact` is opt-in and only Weekly Tiers passes it. It buys back 11px of
   * header (61 -> 50) by thinning the rail, halving the block padding, and
   * dropping the static subline to 9px with a 1px gap — the title keeps its 15px.
   * The other four callers (Morning/Evening, Homeschool, Conditional, Stretch
   * Wallet) omit the flag and render byte-identically, which is why the tightening
   * lives here as a parameter rather than in the shared style: editing the base
   * would have restyled every card on the board.
   */


  /* habitButton, heroButton and habitColumn were the inline presentation for
     Morning, Afternoon/Evening, Homeschool and Conditional. Every one of those
     blocks now renders through HabitPanel or DayProgrammePanel, so the closures
     are gone rather than left to rot beside their replacements. The behaviour
     they carried - the four states, the point chip, the override marker, the
     tick and long-hold wiring - moved into HabitRow unchanged. */

  /* ── WEEKDAY / WEEKEND PREVIEW ──────────────────────────────────────────────
     `liveView` is what the server says today actually is. When the toggle picks
     the other side, the roster is rebuilt from the Notion habit list using
     habitsOnDay() — the same rule the server applies — and every row comes back
     LOCKED. A tick belongs to a date and the server would refuse one for a day
     that is not today, so the board says so up front rather than letting a tap
     fail silently. Nothing here touches scoring, the gate, or any write. */
  const liveView: DayView | null =
    dayName === "" ? null : (dayName === "Saturday" || dayName === "Sunday" ? "weekend" : "weekday");
  const previewing = dayView !== null && liveView !== null && dayView !== liveView;
  const previewDayName = dayView === "weekend" ? "Saturday" : "Monday";

  const previewHabits: DashboardHabit[] = previewing
    ? habitsOnDay(notionHabits, previewDayName).map(h => ({
        id: h.id, name: h.name, block: h.block, order: h.order,
        pointType: h.pointType, points: h.points,
        state: "LOCKED" as ButtonState,
        label: `Preview · ${previewDayName}`,
        message: null, reason: "preview",
        window: h.windowStart && h.windowEnd ? `${h.windowStart}-${h.windowEnd}` : null,
        dwellSeconds: h.dwellSeconds ?? null,
        overridden: false,
      }))
    : [];

  const viewHabits: DashboardHabit[] = previewing
    ? previewHabits
    : (gateHabits as DashboardHabit[]);

  const inBlock = (blockId: string) =>
    viewHabits.filter(h => h.block === blockId).sort((a, b) => a.order - b.order);

  /* ── MORNING FEASIBILITY ────────────────────────────────────────────────────
     Can the morning block still be finished before its window shuts?

     THE ARITHMETIC. R habits remain. Gate 2 forces `dwell` seconds between
     consecutive ticks in a block, so clearing R of them takes (R−1) gaps — the
     first is free, every one after it waits. Working backwards from the close:

         latestSafeNextTick = windowEnd − (R−1) × dwell

     Past that minute the chain no longer fits and the last habit is arithmetically
     unreachable however fast the tapping goes. That is not a hypothetical: on
     2026-08-10 `movement` landed at 08:29:01 against an 08:30 close with two
     habits left, which needed 3 minutes of dwell and had 2 — `goals` was already
     impossible and nothing on screen said so.

     WHY IT READS `> latestSafeNextTick` AND NOT `>=`. gateWindow() compares whole
     minutes and denies only on `nowMinutes > end`, so the final minute of the
     window is still live. Mirroring the operator keeps the banner from calling a
     morning dead while the server would still accept the tap.

     ADVISORY ONLY. Nothing here can allow or refuse anything — the server re-runs
     evaluateGates() on every POST regardless of what this computes. It exists to
     make a deadline visible before it passes, not to enforce one. */
  const morningFeasibility = (() => {
    if (nowMin === null) return null;                 // pre-mount, no clock yet
    const bh = inBlock("pre_homeschool");
    if (bh.length === 0) return null;

    const remaining = bh.filter(h => h.state !== "DONE");
    if (remaining.length === 0) return null;          // block finished, nothing to warn about

    // The window is read off the habits themselves, so it stays whatever Notion
    // says. `window` arrives as "HH:MM-HH:MM"; an unset or unparseable one means
    // the habit is UNGATED, and an ungated habit has no deadline to miss.
    const end = parseHHMM(remaining[0].window?.split("-")[1] ?? null);
    if (end === null) return null;

    const dwellMin = (gate?.defaultDwellSeconds ?? 90) / 60;
    const latestSafeNextTick = end - (remaining.length - 1) * dwellMin;
    const minsLeft = latestSafeNextTick - nowMin;

    if (nowMin > latestSafeNextTick) {
      return { level: "red" as const, latestSafeNextTick, remaining: remaining.length,
        text: "⚠️ Morning can't finish in time — needs a parent override" };
    }
    // The last three minutes of viability. Ceil, not round: with 0.5 minutes left
    // "1m left" is honest and "0m left" reads as already-lost.
    if (minsLeft <= 3) {
      return { level: "amber" as const, latestSafeNextTick, remaining: remaining.length,
        text: `⏳ ${Math.max(1, Math.ceil(minsLeft))}m left to finish morning — keep tapping` };
    }
    return null;
  })();


  const morning = BLOCKS.find(b => b.id === "pre_homeschool")!;
  /**
   * Morning rows for HabitPanel: the gate's own habit views, plus the two facts
   * a row renders that /api/tick does not carry — the Notion point value and
   * whether a parent override stands behind the completion. Both are read from
   * the same `pointsById` and `overriddenIds` the rest of this file uses, so
   * the panel cannot disagree with the board about either.
   */
  const rowsFor = (blockId: string): DashboardHabit[] =>
    inBlock(blockId).map(h => ({
      ...h,
      points: pointsById[h.id] ?? 0,
      overridden: overriddenIds.has(h.id),
    }));
  const morningRows = rowsFor("pre_homeschool");
  const homeschoolRows = rowsFor("homeschool");
  /**
   * Match Readiness — a DISPLAY summary of today's learning state, never a
   * football result and never an input to a gate. workSubmissionCount is 0
   * because nothing in this app counts Tally submissions yet; claiming a
   * number here would be inventing evidence.
   */
  const readiness = deriveMatchReadiness({
    morningDone: morningRows.filter(h => h.state === "DONE").length,
    morningTotal: morningRows.length,
    homeschoolDone: homeschoolRows.some(h => h.id === "homeschool_session" && h.state === "DONE"),
    journalState: journalEvidenceState(homeschoolRows.find(h => h.id === "journal")),
    workSubmissionCount: 0,
  });

  /**
   * One scoreboard cell. `opts` is additive and defaulted, so the four calls
   * that predate it render byte-identically to before.
   *
   *   color  the value's colour. Gold is the scoreboard default; the Golden Boot
   *          takes CYAN, the same var(--cyan) every other surface uses.
   *   side   which edge carries the divider. Every cell has drawn it on the
   *          RIGHT, because every cell had a neighbour to its right. The Golden
   *          Boot sits last, after Banked and before the right-aligned tier
   *          badge — a right-hand rule there would hang in the gap with nothing
   *          after it, so it draws on the LEFT instead and separates itself from
   *          Banked, which has never drawn one of its own.
   */


  return (
    <div className="ab-root" style={{
      // Decorative Bernabeu backdrop. A near-solid dark scrim (92% of the original
      // #0f1419 page colour) sits on top of the photo and does ALL the work of
      // preserving contrast — no text/card styling is changed.
      backgroundColor: "#0f1419",
      backgroundImage: "linear-gradient(rgba(8,12,20,0.88), rgba(6,9,16,0.94)), url('/stadium-lights.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundAttachment: "fixed",
      color: "#ffffff",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <style>{BOARD_CSS}</style>

      <DashboardShell
        status={
          <>
          <DayViewToggle
            value={dayView ?? liveView ?? "weekday"}
            live={liveView}
            onChange={setDayView}
          />
          <ClubStatus
            serverTime={gate?.serverTime ?? null}
            deviceTime={mounted ? time : ""}
            online={online}
            pointsActive={pointsActive}
            todayPercent={gate ? overallPct : null}
            streak={streak}
          />
          </>
        }
      >

      <ClubHeader />

      {/* The scoreboard strip is replaced by the Match Centre frame. Its
          cells did not disappear: Week total, the tier badge and Golden Boot
          are in Work + Week, Banked is the Stretch Wallet's own summary, and
          Today and Streak moved into the header status line. The Golden Boot
          is now rendered in exactly one place. */}
      <MatchCentre data={football ?? {
        available: false,
        reason: "upstream_unavailable",
        message: "Loading Real Madrid's fixture…",
        updatedAt: null,
        stale: false,
      }} />

      {/* Server-unreachable banner. The board fails closed, and says so. */}
      {mounted && !gate && (
        <div style={{
          flexShrink: 0, padding: "10px 20px", background: "rgba(255,68,68,0.12)",
          borderBottom: "1px solid rgba(255,68,68,0.35)", color: "#ff4444",
          fontSize: 12, fontWeight: 700,
        }}>
          Can&apos;t reach the server — nothing is tappable until it answers. Nothing you tapped was lost.
        </div>
      )}
      {/* Notion unreachable. Without the habit list there is nothing to gate and
          nothing to show, so the board says so instead of rendering an empty
          board that looks like a finished day. */}
      {gate && gate.habitsError && (
        <div style={{
          flexShrink: 0, padding: "10px 20px", background: "rgba(255,68,68,0.12)",
          borderBottom: "1px solid rgba(255,68,68,0.35)", color: "#ff4444",
          fontSize: 12, fontWeight: 700,
        }}>
          Habit list unavailable — {gate.habitsError}. Nothing can be ticked until this is fixed.
        </div>
      )}
      {gate && gate.warnings.length > 0 && (
        <div style={{
          flexShrink: 0, padding: "8px 20px", background: "rgba(255,165,0,0.10)",
          borderBottom: "1px solid rgba(255,165,0,0.30)", color: "#ffa500",
          fontSize: 11, fontWeight: 600,
        }}>
          ⚠ {gate.warnings.length} habit{gate.warnings.length === 1 ? " has" : "s have"} no usable window in Notion and {gate.warnings.length === 1 ? "is" : "are"} ungated.
        </div>
      )}

      {/* BOARD — four columns, no scroll on either axis at 1440px+ */}
      <div className={dashboardStyles.grid}>

        {/* 1 — Morning Habits */}
        {/* MORNING — Dashboard V2 rows. Behaviour-preserving: the same tick,
            beginHold, cancelHold, saving, holdId and morningFeasibility this
            column always used, handed to a component instead of a closure. */}
        <HabitPanel
          title={morning.label}
          icon={morning.icon}
          scoreLabel="Morning"
          subtitle={morning.subtitle}
          accent={morning.color}
          habits={morningRows}
          doneCount={morningRows.filter(h => h.state === "DONE").length}
          blockPoints={dayScore.blocks.pre_homeschool ?? 0}
          savingId={saving}
          holdId={holdId}
          feasibility={morningFeasibility}
          onTick={tick}
          onHoldStart={beginHold}
          onHoldCancel={cancelHold}
        />

        {/* 2 — TODAY'S PROGRAMME. Homeschool, Afternoon/Evening and Conditional
            in one panel. Amendment 8027d53: the weekend removes only the
            Homeschool subsection; nothing else is allowed to disappear. */}
        <DayProgrammePanel
          homeschool={homeschoolRows}
          afternoonEvening={rowsFor("afternoon_evening")}
          conditional={rowsFor("conditional")}
          savingId={saving}
          holdId={holdId}
          onTick={tick}
          onHoldStart={beginHold}
          onHoldCancel={cancelHold}
        />

        {/* 3 — WORK + WEEK. The Log Work button only opens the modal; every
            piece of Tally wiring (origin allow-list, form URL, embed script,
            submitted message, reset) stays in this file, untouched. */}
        <WorkWeekPanel
          weekPoints={weeklyPts}
          weekMax={WEEKLY_MAX}
          goldenBoot={goldenBoot}
          submissionCount={null}
          readiness={readiness}
          logOpen={logOpen}
          onOpenLogWork={() => setLogOpen(true)}
        />

        {/* 4 — STRETCH WALLET. Render-only: every lock, cap, redemption and
            bonus below is the server's decision, passed through verbatim. */}
        <StretchWalletPanel
          wallet={wallet}
          items={stretchItems}
          earnedItemIds={earnedItemIds}
          savingId={saving}
          minPerPoint={STRETCH_MIN_PER_POINT}
          spendStepMin={STRETCH_SPEND_STEP_MIN}
          dailyCapMin={STRETCH_DAILY_REDEEM_CAP_MIN}
          onEarn={earnStretch}
          onSpend={spendStretch}
        />
      </div>

      {/* ── NOTION SOURCE STRIP ─────────────────────────────────────────────
          The three Notion databases behind this board, one click away for a
          parent mid-edit. In normal flow at the bottom of .ab-root, below the
          board and above the fixed overlays.

          These are the human-facing database URLs, which are NOT the
          data_source ids lib/notion.ts queries (a database and its data source
          carry different ids under Notion-Version 2025-09-03). Changing one
          does not change the other — editing a link here does not repoint the
          board, and repointing the board does not update these links. */}
      <div className="ab-src">
        <span>Notion:</span>
        <a href="https://www.notion.so/060adb487ef5451b8fdccaa95f60514c" target="_blank" rel="noopener noreferrer">Habits</a>
        <span aria-hidden>·</span>
        <a href="https://www.notion.so/f4d6ca41a1a24e08b597abfd77d1e78e" target="_blank" rel="noopener noreferrer">Settings</a>
        <span aria-hidden>·</span>
        <a href="https://www.notion.so/3dacc9966756478db29604840c39c08a" target="_blank" rel="noopener noreferrer">Stretch</a>
        {/* The monthly record. It rides in THIS strip rather than the scoreboard
            because the strip is a horizontal flex row — one more child costs no
            height at all, and .ab-root is 100dvh with overflow:hidden, so any
            height added here comes straight out of the board.

            It is a link, not a button: /export is a real page that opens in its
            own tab and prints itself, so the board never leaves the screen and
            nothing on it has to wait for a report to render. */}
        <span aria-hidden>·</span>
        <a href="/export" target="_blank" rel="noopener noreferrer" title="Last month's record, ready to print or save as PDF">
          Month PDF
        </a>
      </div>

      {/* ── GATE REJECTION TOAST ────────────────────────────────────────────
          The server's own message, shown plainly. "too_fast" carries the exact
          wording the brief specified, which /api/tick returns verbatim. */}
      {reject && (
        <div className="ab-toast" role="status" aria-live="polite">
          <span aria-hidden style={{ fontSize: 22, flexShrink: 0 }}>
            {reject.reason === "too_fast" ? "⏱️" : reject.reason === "locked" ? "🔒" : "🚫"}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: "#ffffff" }}>
              {reject.message}
            </span>
            <span style={{ display: "block", fontSize: 11, color: "#b0b5c1", marginTop: 3 }}>
              {reject.habitName}
            </span>
          </span>
          {gate?.overridePinConfigured && (
            <button
              type="button"
              className="ab-toast-act"
              onClick={() => { setOverrideFor(reject); setReject(null); setOverrideError(""); }}
            >
              Parent override
            </button>
          )}
          <button type="button" className="ab-toast-x" onClick={() => setReject(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* ── PARENT OVERRIDE ─────────────────────────────────────────────────
          Nihal's escape hatch for a legitimately missed tick, reached by a
          two-second hold on any refused habit.

          The PIN is never compared in this file, never stored, and never lands
          in the bundle — it is posted to /api/tick, which holds
          PARENT_OVERRIDE_PIN as a Netlify environment variable. Every accepted
          override writes a row to override_log stamped with the server's clock,
          and the board then renders that habit with an OVERRIDE marker so a
          restored tick never reads as work Ansar actually did. */}
      {overrideFor && (
        <div
          className="ab-ov-backdrop"
          onClick={e => { if (e.target === e.currentTarget) closeOverride(); }}
        >
          <div className="ab-ov" role="dialog" aria-modal="true" aria-labelledby="ab-ov-title">
            <div id="ab-ov-title" style={{ fontSize: 16, fontWeight: 800, color: "#ffffff" }}>
              Parent override
            </div>
            <div style={{ fontSize: 13, color: "#ffffff", marginTop: 10, fontWeight: 700 }}>
              {overrideFor.habitName}
            </div>
            {/* The server's own refusal, quoted back, so Nihal can see what she
                is overriding rather than taking it on trust. */}
            <div style={{ fontSize: 12, color: "#ff4444", marginTop: 4, fontWeight: 600 }}>
              {overrideFor.message}
            </div>
            <div className="ab-ov-note">
              Unlocking marks this done for today and bypasses the window, dwell,
              order and cascade checks. It is recorded.
            </div>

            {lockedMs > 0 ? (
              <div className="ab-ov-lock">
                Locked — too many incorrect PINs. Try again in{" "}
                {Math.floor(lockedMs / 60000)}:{String(Math.floor((lockedMs % 60000) / 1000)).padStart(2, "0")}
              </div>
            ) : (
              <>
                <label style={{ display: "block", marginTop: 16, fontSize: 11, fontWeight: 800, color: "#757f8f", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  PIN
                  <input
                    className="ab-ov-pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={4}
                    value={pin}
                    // Digits only, four of them. Stripping here rather than
                    // validating on submit means the field simply cannot hold
                    // anything the server would reject as malformed.
                    onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    onKeyDown={e => { if (e.key === "Enter" && pin.length === 4) submitOverride(); }}
                    autoFocus
                  />
                </label>

                <label style={{ display: "block", marginTop: 12, fontSize: 11, fontWeight: 800, color: "#757f8f", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Reason <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 600, color: "#565f70" }}>· optional</span>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={e => setOverrideReason(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && pin.length === 4) submitOverride(); }}
                    placeholder="Sick, travelling, power out…"
                  />
                </label>
              </>
            )}

            {overrideError && (
              <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: "#ff4444" }}>
                {overrideError}
              </div>
            )}

            <div className="ab-ov-row">
              <button type="button" onClick={closeOverride}>Cancel</button>
              <button
                type="button"
                className="primary"
                onClick={submitOverride}
                disabled={pin.length !== 4 || overrideBusy || lockedMs > 0}
              >
                {overrideBusy ? "Working…" : "Unlock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOG WORK MODAL ─────────────────────────────────────────────────── */}
      {logOpen && (
        <div
          className="lw-backdrop"
          onClick={e => { if (e.target === e.currentTarget) setLogOpen(false); }}
        >
          <div className="lw-panel" role="dialog" aria-modal="true" aria-label="Log Work">
            <div className="lw-head">
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#ffffff" }}>📝 Log Work</div>
                <div style={{
                  fontSize: 10, marginTop: 3, fontWeight: 600,
                  color: logSaved ? "#00ff88" : "#757f8f",
                }}>
                  {logSaved
                    ? "✅ Logged — resetting for your next entry"
                    : "Log as many entries as you need · tap ✕ to close"}
                </div>
              </div>
              <button
                type="button"
                className="lw-x"
                onClick={() => setLogOpen(false)}
                aria-label="Close Log Work"
                autoFocus
              >
                ✕
              </button>
            </div>
            <div className="lw-body">
              <iframe
                key={embedKey}
                className="lw-frame"
                data-tally-src={TALLY_FORM_SRC}
                title="Log Work form"
              />
            </div>
          </div>
        </div>
      )}
      </DashboardShell>
    </div>
  );
}
