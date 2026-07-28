"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, getWeekStart } from "./lib/supabase";
import { scoreDay, SOCCER_DAYS } from "./lib/scoring";
import { addDays, dayNameOf } from "./lib/time";

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
const RM_GOLD_BRIGHT = "#E7C55B"; // brighter gold for large scoreboard numbers on dark
const RM_NAVY = "#0d2350";        // deep royal navy — scoreboard bar / section accents

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
   added in Notion without an entry here simply gets the default tick. */
const HABIT_ICONS: Record<string, string> = {
  feet_floor: "🌅", fajr: "🕌", bed_dressed: "🛏️", movement: "⚽",
  breakfast: "🍳", quran: "📖", goals: "✍️", homeschool_session: "📚",
  readtheory: "📘", khan: "📐", journal: "📓", btn_cornell: "📰",
  all_namaz: "🕌", room_tidy: "🧹", shower: "🚿", teeth: "🪥",
  reading: "🌙", soccer_training: "⚽",
};
const DEFAULT_ICON = "✅";

const BLOCKS = [
  { id: "pre_homeschool",    label: "🌅 Morning Habits",      subtitle: "6:30–8:30am · all = +2 pts", color: "#ffa500" },
  { id: "homeschool",        label: "📚 Homeschool",           subtitle: "8:30am–1:30pm · +5 pts",     color: CYAN },
  { id: "afternoon_evening", label: "🌆 Afternoon / Evening",  subtitle: "1:30–8:30pm",                color: "#00ff88" },
  { id: "conditional",       label: "⚽ Conditional",          subtitle: "Mon & Wed · 3:00–8:00pm",    color: "#a78bfa" },
];

/* ── Stretch Wallet ────────────────────────────────────────────────────────
   1 stretch point = 10 minutes. Points now BANK across the week and convert to
   PS5 minutes on Saturday and Sunday only, capped at 75 redeemed minutes a day.
   Both rules are enforced in /api/stretch against the server's Sydney clock —
   the values below are for display. */
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
  warnings: string[];
  habits: GateHabitView[];
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
};

/** What a refused tap left on screen. */
type Rejection = { habitId: string; habitName: string; reason: string; message: string };

// ANSAR FC weekly tiers. Weekly max = 56 (incl. +3 streak bonus for 5 Perfect Days Mon–Fri).
const WEEKLY_MAX = 56;

const THRESHOLDS = [
  { min: 42, label: "First Team 🏆",      desc: "42+ pts",   color: RM_GOLD },
  { min: 34, label: "Bench ✅",           desc: "34–41 pts", color: CYAN },
  { min: 26, label: "Reserves ⚠️",        desc: "26–33 pts", color: "#ffa500" },
  { min: 0,  label: "Training Ground ❌", desc: "0–25 pts",  color: "#ff4444" },
];

function getThreshold(pts: number) {
  return THRESHOLDS.find(t => pts >= t.min) || THRESHOLDS[THRESHOLDS.length - 1];
}

export default function AnsarPage() {
  const [gate, setGate] = useState<GateSnapshot | null>(null);
  const [notionHabits, setNotionHabits] = useState<NotionHabit[]>([]);
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [stretchItems, setStretchItems] = useState<StretchItem[]>([]);
  // null until /api/settings answers — see the POINTS_ACTIVE note at the top.
  const [pointsActive, setPointsActive] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [weeklyPts, setWeeklyPts] = useState<number | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  const [reject, setReject] = useState<Rejection | null>(null);

  // Parent override. The PIN is typed here and sent to the server; it is never
  // compared here and never stored. The server holds PARENT_OVERRIDE_PIN.
  const [overrideFor, setOverrideFor] = useState<Rejection | null>(null);
  const [pin, setPin] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideError, setOverrideError] = useState("");
  const [overrideBusy, setOverrideBusy] = useState(false);

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
      if (snap?.ok) { setGate(snap); setOnline(true); } else { setOnline(false); }
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

    // preIds/baseIds come from the live Notion list, not a hardcoded array.
    const preIds = notionHabits.filter(h => h.block === "pre_homeschool").map(h => h.id);
    const baseIds = notionHabits.filter(h => h.block !== "conditional").map(h => h.id);
    if (preIds.length === 0) return;   // habits not loaded yet — don't score a blank list

    let total = 0;
    Object.keys(byDate).forEach(ds => {
      total += scoreDay(byDate[ds], dayNameOf(ds), preIds, baseIds).total;
    });

    const weekdayDates = [0, 1, 2, 3, 4].map(i => addDays(weekStart, i));
    const allWeekdaysPerfect = weekdayDates.every(
      ds => byDate[ds] && scoreDay(byDate[ds], dayNameOf(ds), preIds, baseIds).perfect,
    );
    if (allWeekdaysPerfect) total += 3;

    setWeeklyPts(total);
  }, [notionHabits]);

  const calculateStreak = useCallback(async (today: string) => {
    const cutoffStr = addDays(today, -60);
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

    let s = 0;
    for (let i = 0; i <= 60; i++) {
      const ds = addDays(today, -i);
      if ((byDate[ds] || 0) >= 5) s++;
      else if (i === 0) continue;
      else break;
    }
    setStreak(s);
  }, []);

  useEffect(() => {
    setMounted(true);
    loadGate();
    loadNotionHabits();
    loadWallet();
    loadStretchItems();
    loadSettings();

    // The header clock is the DEVICE's, and is labelled as such. It is display
    // only — no gate anywhere reads it. The server's Sydney clock is shown
    // beside it so a mismatch is visible rather than silent.
    const t = setInterval(() => {
      setTime(new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }));
    }, 1000);
    setTime(new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }));

    const poll = setInterval(() => { loadGate(); loadWallet(); }, 30000);
    return () => { clearInterval(t); clearInterval(poll); };
  }, [loadGate, loadNotionHabits, loadWallet, loadStretchItems, loadSettings]);

  // History reloads whenever the server's date or the habit list changes.
  const serverDate = gate?.serverTime.date ?? "";
  useEffect(() => {
    if (!serverDate || notionHabits.length === 0) return;
    loadWeeklyData(serverDate);
    calculateStreak(serverDate);
  }, [serverDate, notionHabits, loadWeeklyData, calculateStreak]);

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

  /* ── Actions ────────────────────────────────────────────────────────────── */

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
        setOverrideFor(null);
        setPin("");
        setOverrideReason("");
        setReject(null);
        await loadGate();
        await loadWallet();
        if (serverDate) loadWeeklyData(serverDate);
      } else {
        setOverrideError(body?.message ?? "Override refused");
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
  const pointsById: Record<string, number> = {};
  notionHabits.forEach(h => { pointsById[h.id] = h.points; });

  const preIds = gateHabits.filter(h => h.block === "pre_homeschool").map(h => h.id);
  const baseIds = gateHabits.filter(h => h.block !== "conditional").map(h => h.id);
  const dayScore = scoreDay(completedIds, dayName, preIds, baseIds);
  const todayPts = dayScore.total;
  const todayDone = gateHabits.filter(h => h.state === "DONE").length;
  const overallPct = gateHabits.length > 0 ? Math.round((todayDone / gateHabits.length) * 100) : 0;
  const weekThreshold = getThreshold(weeklyPts ?? 0);
  const DAILY_MAX = SOCCER_DAYS.includes(dayName) ? 11 : 10;

  const walletLocked = !wallet?.unlocked;
  const stretchBalance = wallet?.balance ?? 0;
  const earnedItemIds = new Set(wallet?.earnedItemIds ?? []);

  /* ── Styles ─────────────────────────────────────────────────────────────── */

  const BOARD_CSS = `
/* padding-top, NOT margin-top, to clear the fixed nav. body is height:100% in
   globals.css, so a top margin here collapses through it and pushes the document
   40px taller than the viewport — a scrollbar on a page whose whole point is not
   scrolling. Padding cannot collapse. box-sizing:border-box is already global. */
.ab-root{display:flex;flex-direction:column;height:100dvh;padding-top:var(--nav-h);overflow:hidden}
.ab-board{display:grid;grid-template-columns:1fr 1fr 0.84fr 0.96fr;gap:14px;
  padding:14px 20px 18px;flex:1;min-height:0}
.ab-btn{transition:transform 220ms cubic-bezier(.34,1.56,.64,1),background 180ms ease,
  border-color 180ms ease,box-shadow 180ms ease;box-shadow:0 2px 0 rgba(0,0,0,.32)}
.ab-btn:active:not(:disabled){transform:scale(.965) translateY(1px);
  box-shadow:0 0 0 rgba(0,0,0,.32),inset 0 2px 9px rgba(0,0,0,.34)}
.ab-btn:focus-visible{outline:2px solid ${RM_GOLD};outline-offset:2px}
.ab-btn:disabled{box-shadow:none}
.ab-spend{transition:transform 220ms cubic-bezier(.34,1.56,.64,1),box-shadow 180ms ease}
.ab-spend:active:not(:disabled){transform:translateY(3px);box-shadow:0 0 0 #7c5fd3}
.ab-spend:focus-visible{outline:2px solid ${RM_GOLD};outline-offset:2px}
/* Below the 4-column breakpoint the board reflows to 2 columns and the page is
   allowed to scroll again — the habits at a usable size genuinely cannot fit an
   iPad. The no-scroll guarantee is for the 1440px+ screens this is built for. */
@media (max-width:1439px){
  .ab-root{height:auto;min-height:100dvh;overflow:visible}
  .ab-board{grid-template-columns:1fr 1fr}
}
@media (max-width:820px){.ab-board{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){
  .ab-btn,.ab-spend{transition:none}
  .ab-btn:active,.ab-spend:active{transform:none}
}

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
}`;

  const cardStyle: React.CSSProperties = {
    background: "#16192d", border: "1px solid #2d3543", borderRadius: 12,
    overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0,
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
  };

  /** Column shell: accent rail, title/subtitle, optional right-hand count. */
  const colHead = (color: string, title: string, subtitle: string, right?: React.ReactNode) => (
    <>
      <div style={{ height: 3, background: color, flexShrink: 0 }} />
      <div style={{
        padding: "12px 15px 11px", borderBottom: "1px solid #2d3543", flexShrink: 0,
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10,
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color }}>{title}</div>
          <div style={{ fontSize: 10, color: "#757f8f", marginTop: 3, fontWeight: 500 }}>{subtitle}</div>
        </div>
        {right}
      </div>
    </>
  );

  /**
   * One habit as a real <button>, in one of four server-decided states.
   *
   *   DONE    ticked, struck through
   *   LIVE    full colour, tappable
   *   LOCKED  greyed, non-tappable, says when it opens ("Opens 6:30am")
   *   MISSED  greyed, non-tappable, says "Missed" — this one scores zero
   *
   * MISSED is tinted red rather than merely dimmed: a missed window is a
   * different fact from a not-yet-open one, and the board should not make them
   * look the same.
   */
  const habitButton = (h: GateHabitView, color: string) => {
    const isDone = h.state === "DONE";
    const isLive = h.state === "LIVE";
    const isMissed = h.state === "MISSED";
    const isSaving = saving === h.id;
    const pts = pointsById[h.id] ?? 0;
    const chip = pts > 0 ? `+${pts} pt${pts === 1 ? "" : "s"}` : "";

    return (
      <button
        key={h.id}
        type="button"
        className="ab-btn"
        onClick={() => tick(h.id, h.name)}
        disabled={!isLive || isSaving}
        aria-label={h.name}
        title={h.window ? `Window ${h.window}` : undefined}
        style={{
          display: "flex", alignItems: "center", gap: 14, padding: "0 16px",
          borderRadius: 11, flex: 1, minHeight: 56, width: "100%", textAlign: "left",
          font: "inherit", color: "inherit",
          border: `1px solid ${isDone ? color + "50" : isLive ? "#2d3543" : isMissed ? "#ff444440" : "#1f2438"}`,
          background: isDone ? color + "0a" : isLive ? "#1f2438" : isMissed ? "rgba(255,68,68,0.06)" : "#16192d",
          opacity: isLive || isDone ? 1 : 0.5,
          cursor: isLive ? "pointer" : "not-allowed",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <span style={{
          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
          border: `2px solid ${isDone ? color : isLive ? "#2d3543" : isMissed ? "#ff444460" : "#1f2438"}`,
          background: isDone ? color : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {isSaving ? <span style={{ fontSize: 13 }}>⏳</span> :
           isDone ? <span style={{ fontSize: 16, color: "#000", fontWeight: 800 }}>✓</span> :
           isMissed ? <span style={{ fontSize: 12 }}>✕</span> :
           !isLive ? <span style={{ fontSize: 12 }}>🔒</span> : null}
        </span>

        <span aria-hidden style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}>
          {HABIT_ICONS[h.id] ?? DEFAULT_ICON}
        </span>

        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: "block", fontSize: 15, fontWeight: 600, lineHeight: 1.28,
            color: isDone ? "#757f8f" : isLive ? "#ffffff" : "#565f70",
            textDecoration: isDone ? "line-through" : "none",
          }}>
            {h.name}
          </span>
          {!isDone && !isLive && h.label && (
            <span style={{
              display: "block", fontSize: 11, fontWeight: 700, marginTop: 3,
              color: isMissed ? "#ff4444" : "#757f8f",
            }}>
              {h.label}
            </span>
          )}
        </span>

        {chip && (
          <span style={{
            fontSize: 11, fontWeight: 800, flexShrink: 0, padding: "5px 10px",
            borderRadius: 7, whiteSpace: "nowrap",
            color: isDone ? color : isLive ? "#b0b5c1" : "#565f70",
            background: isDone ? color + "15" : "#16192d",
            border: `1px solid ${isDone ? color + "40" : "#2d3543"}`,
          }}>
            {chip}
          </span>
        )}
      </button>
    );
  };

  const inBlock = (blockId: string) =>
    gateHabits.filter(h => h.block === blockId).sort((a, b) => a.order - b.order);

  /** A full habit column (Morning, and Afternoon/Evening). */
  const habitColumn = (block: (typeof BLOCKS)[number]) => {
    const bh = inBlock(block.id);
    if (bh.length === 0) return null;
    const done = bh.filter(h => h.state === "DONE").length;
    return (
      <div style={cardStyle}>
        {colHead(block.color, block.label, block.subtitle,
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#ffffff", fontVariantNumeric: "tabular-nums" }}>
              {done}/{bh.length}
            </div>
            <div style={{ fontSize: 10, color: "#757f8f", marginTop: 2, fontWeight: 500 }}>
              {dayScore.blocks[block.id] ?? 0} pts
            </div>
          </div>,
        )}
        <div style={{ padding: 11, display: "flex", flexDirection: "column", gap: 9, flex: 1, minHeight: 0 }}>
          {bh.map(h => habitButton(h, block.color))}
        </div>
      </div>
    );
  };

  const morning = BLOCKS.find(b => b.id === "pre_homeschool")!;
  const school = BLOCKS.find(b => b.id === "homeschool")!;
  const evening = BLOCKS.find(b => b.id === "afternoon_evening")!;
  const conditional = BLOCKS.find(b => b.id === "conditional")!;
  const schoolHabits = inBlock("homeschool");
  const condHabits = inBlock("conditional");

  /** One scoreboard cell. */
  const cell = (label: string, value: React.ReactNode, extra?: React.ReactNode) => (
    <div style={{
      padding: "0 22px", borderRight: "1px solid rgba(212,175,55,0.16)", height: 52,
      display: "flex", flexDirection: "column", justifyContent: "center",
    }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase", color: "rgba(232,235,242,0.6)" }}>
        {label}
      </div>
      <div style={{
        fontSize: 29, fontWeight: 800, color: RM_GOLD_BRIGHT, lineHeight: 1.08,
        fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em",
      }}>
        {value}
      </div>
      {extra}
    </div>
  );

  const sub = (t: string) => <small style={{ fontSize: 14, color: "rgba(232,235,242,0.55)", fontWeight: 600 }}>{t}</small>;

  return (
    <div className="ab-root" style={{
      // Decorative Bernabeu backdrop. A near-solid dark scrim (92% of the original
      // #0f1419 page colour) sits on top of the photo and does ALL the work of
      // preserving contrast — no text/card styling is changed.
      backgroundColor: "#0f1419",
      backgroundImage: "linear-gradient(rgba(15,20,25,0.92), rgba(15,20,25,0.92)), url('/bernabeu-bg.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundAttachment: "fixed",
      color: "#ffffff",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <style>{BOARD_CSS}</style>

      {/* HEADER */}
      <header style={{
        background: "#16192d", borderBottom: "1px solid #2d3543", height: 52, flexShrink: 0,
        padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      }}>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em" }}>
          Ansar <span style={{ color: RM_GOLD, letterSpacing: "0.04em" }}>· ANSAR FC</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#757f8f", flexShrink: 0 }}>
          {pointsActive === false && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: "#ffa500", padding: "3px 9px", borderRadius: 20,
              border: "1px solid rgba(255,165,0,0.3)", background: "rgba(255,165,0,0.1)",
            }}>
              Soft-launch · points preview
            </span>
          )}
          {/* The SERVER's clock — the one every gate is decided against. Shown
              first, and labelled, so it is obvious which clock is authoritative. */}
          {gate && (
            <span style={{ color: RM_GOLD_BRIGHT, fontWeight: 700 }} title="Server clock — every gate uses this">
              🕒 {gate.serverTime.clock} {gate.serverTime.weekday} · Sydney
            </span>
          )}
          <span style={{ opacity: 0.7 }} title="This device's clock — display only, no gate reads it">
            device {mounted ? time : ""}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: online ? "#00ff88" : "#ff4444", display: "inline-block" }} />
            <span style={{ color: online ? "#00ff88" : "#ff4444", fontSize: 11, fontWeight: 500 }}>{online ? "Live" : "Offline"}</span>
          </span>
        </div>
      </header>

      {/* SCOREBOARD STRIP */}
      <div style={{
        height: 80, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 20px",
        background: RM_NAVY, borderBottom: "1px solid rgba(212,175,55,0.28)",
      }}>
        {cell("Points today", <>{gate ? todayPts : "—"}{sub(` / ${DAILY_MAX}`)}{gate && dayScore.perfect && <span style={{ fontSize: 18, marginLeft: 5 }}>⭐</span>}</>)}
        {cell("Week total", <>{weeklyPts !== null ? weeklyPts : "—"}{sub(` / ${WEEKLY_MAX}`)}</>)}
        {cell("Streak", <>{streak !== null ? streak : "—"}{streak !== null && streak > 0 ? " 🔥" : ""}</>)}
        {cell("Today", <>{gate ? overallPct : 0}{sub("%")}</>,
          <div style={{ height: 5, borderRadius: 3, background: "rgba(0,0,0,0.34)", overflow: "hidden", marginTop: 6, width: 150 }}>
            <div style={{
              height: "100%", borderRadius: 3, transition: "width 200ms ease-in-out",
              width: gate ? `${overallPct}%` : "0%",
              background: "linear-gradient(90deg, #ffa500, #00ff88)",
            }} />
          </div>,
        )}
        <div style={{ padding: "0 22px", height: 52, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase", color: "rgba(232,235,242,0.6)" }}>
            Banked
          </div>
          <div style={{ fontSize: 29, fontWeight: 800, color: "#a78bfa", lineHeight: 1.08, fontVariantNumeric: "tabular-nums" }}>
            {!wallet ? "—" : walletLocked ? "🔒" : stretchBalance}
            {wallet && !walletLocked && sub(" min")}
          </div>
        </div>

        <div style={{
          marginLeft: "auto", display: "flex", alignItems: "center", gap: 11,
          border: `1px solid ${weekThreshold.color}66`, background: `${weekThreshold.color}1a`,
          padding: "9px 16px", borderRadius: 9,
        }}>
          <div>
            <b style={{ color: weekThreshold.color, fontSize: 15 }}>{weekThreshold.label}</b>
            <i style={{ fontStyle: "normal", fontSize: 11, color: "rgba(232,235,242,0.62)", display: "block", marginTop: 2 }}>
              {weekThreshold.desc}{pointsActive === false && " · preview, not yet enforced"}
            </i>
          </div>
        </div>
      </div>

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
      <div className="ab-board">

        {/* 1 — Morning Habits */}
        {habitColumn(morning)}

        {/* 2 — Afternoon / Evening */}
        {habitColumn(evening)}

        {/* 3 — Homeschool · Log Work · Conditional · Weekly Tiers */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
          {schoolHabits.length > 0 && (
            <div style={{ ...cardStyle, flex: "0 0 auto" }}>
              {colHead(school.color, school.label, school.subtitle,
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 19, fontWeight: 800, color: "#ffffff", fontVariantNumeric: "tabular-nums" }}>
                    {schoolHabits.filter(h => h.state === "DONE").length}/{schoolHabits.length}
                  </div>
                  <div style={{ fontSize: 10, color: "#757f8f", marginTop: 2, fontWeight: 500 }}>
                    {dayScore.blocks.homeschool ?? 0} pts
                  </div>
                </div>,
              )}
              <div style={{ padding: 11, display: "flex", flexDirection: "column", gap: 9 }}>
                {schoolHabits.map(h => habitButton(h, school.color))}
              </div>
            </div>
          )}

          {/* LOG WORK — opens the Tally intake modal. Touches no scoring state. */}
          <button
            type="button"
            className="ab-btn"
            onClick={() => setLogOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={logOpen}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              minHeight: 60, width: "100%", flexShrink: 0, borderRadius: 11,
              border: "1px solid #2d3543", background: "#1f2438",
              color: "#ffffff", font: "inherit", fontSize: 16, fontWeight: 800,
              cursor: "pointer", WebkitTapHighlightColor: "transparent",
            }}
          >
            <span aria-hidden style={{ fontSize: 21, lineHeight: 1 }}>📝</span>
            Log Work
          </button>

          {condHabits.length > 0 && (
            <div style={{ ...cardStyle, flex: "0 0 auto" }}>
              {colHead(conditional.color, conditional.label, conditional.subtitle,
                <div style={{ fontSize: 19, fontWeight: 800, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                  {condHabits.filter(h => h.state === "DONE").length}/{condHabits.length}
                </div>,
              )}
              <div style={{ padding: 11, display: "flex", flexDirection: "column", gap: 9 }}>
                {condHabits.map(h => habitButton(h, conditional.color))}
              </div>
            </div>
          )}

          <div style={{ ...cardStyle, flex: 1, minHeight: 0 }}>
            {colHead(`linear-gradient(90deg, ${RM_NAVY}, ${RM_GOLD}, #f5f5f5)`, "🏆 Weekly Tiers", `5 Perfect Days Mon–Fri = +3 · max ${WEEKLY_MAX}`)}
            <div style={{ padding: 11, display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 0 }}>
              {THRESHOLDS.map((t, i) => {
                const weekPts = weeklyPts ?? 0;
                const isActive = weeklyPts !== null && weekPts >= t.min && (i === 0 || weekPts < THRESHOLDS[i - 1].min);
                const isAchieved = weeklyPts !== null && weekPts >= t.min;
                return (
                  <div key={t.min} style={{
                    flex: 1, minHeight: 44, display: "flex", flexDirection: "column", justifyContent: "center",
                    padding: "8px 11px", borderRadius: 9,
                    background: isActive ? t.color + "15" : "#1f2438",
                    border: `1px solid ${isActive ? t.color + "50" : "#2d3543"}`,
                    opacity: isAchieved ? 1 : 0.45,
                    transition: "all 200ms ease-out",
                  }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: t.color, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%", background: t.color, flexShrink: 0,
                        boxShadow: isActive ? `0 0 8px ${t.color}` : "none",
                      }} />
                      {t.label}
                    </div>
                    <div style={{ fontSize: 10, color: "#757f8f", marginTop: 4 }}>
                      {t.desc}{isActive ? " · you are here" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4 — Stretch Wallet */}
        <div style={{ ...cardStyle, border: "1px solid #3a2d5a" }}>
          {colHead(`linear-gradient(90deg, #a78bfa, ${CYAN})`, "🎮 Stretch Wallet",
            `Banks all week · converts Sat & Sun · ${STRETCH_DAILY_REDEEM_CAP_MIN} min/day cap`,
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 19, fontWeight: 800, color: "#a78bfa", fontVariantNumeric: "tabular-nums" }}>
                {wallet && !walletLocked ? stretchBalance : "—"}
                <span style={{ fontSize: 12, color: "#757f8f" }}> min</span>
              </div>
              <div style={{ fontSize: 10, color: "#757f8f", marginTop: 2, fontWeight: 500 }}>
                {wallet && !walletLocked ? `${wallet.earnedWeek} earned · ${wallet.spentWeek} spent` : "locked"}
              </div>
            </div>,
          )}

          <div style={{ padding: 11, display: "flex", flexDirection: "column", gap: 9, flex: 1, minHeight: 0 }}>
            {wallet && walletLocked && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderRadius: 9,
                border: "1px solid #3a2d5a", background: "rgba(167,139,250,0.10)",
                fontSize: 12, color: "#a78bfa", fontWeight: 700, flexShrink: 0,
              }}>
                🔒 {wallet.lockMessage ?? "Finish Morning Habits + Homeschool to unlock"}
              </div>
            )}

            {wallet && !walletLocked && wallet.redemptionMessage && (
              <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600, flexShrink: 0 }}>
                {wallet.redemptionMessage}
              </div>
            )}

            <div style={{
              display: "flex", flexDirection: "column", gap: 9, flex: 1, minHeight: 0,
              opacity: walletLocked ? 0.4 : 1,
              pointerEvents: walletLocked ? "none" : "auto",
            }}>
              {stretchItems.length === 0 && (
                <div style={{ fontSize: 12, color: "#757f8f", padding: "8px 2px" }}>
                  No stretch items available right now.
                </div>
              )}
              {stretchItems.map(item => {
                const itemMin = item.points * STRETCH_MIN_PER_POINT;
                const isSaving = saving === item.id;
                const done = earnedItemIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="ab-btn"
                    onClick={() => earnStretch(item)}
                    disabled={done || isSaving || walletLocked}
                    aria-label={item.name}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                      borderRadius: 11, flex: 1, minHeight: 62, width: "100%", textAlign: "left",
                      font: "inherit", color: "inherit",
                      border: `1px solid ${done ? "#a78bfa50" : "#2d3543"}`,
                      background: done ? "rgba(167,139,250,0.06)" : "#1f2438",
                      opacity: done ? 0.55 : 1,
                      cursor: done ? "default" : "pointer",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    <span style={{
                      width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                      border: `2px solid ${done ? "#a78bfa" : "#2d3543"}`,
                      background: done ? "#a78bfa" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isSaving ? <span style={{ fontSize: 11 }}>⏳</span> :
                       done ? <span style={{ fontSize: 14, color: "#0f1419", fontWeight: 800 }}>✓</span> : null}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 700, lineHeight: 1.25 }}>
                        🧩 {item.name}
                      </span>
                      <span style={{ display: "block", fontSize: 11, color: "#757f8f", marginTop: 3 }}>
                        {done ? "✓ banked today" : item.whatCountsAsDone || `Worth ${item.points} pt`}
                      </span>
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: 800, flexShrink: 0, color: "#a78bfa",
                      border: "1px solid rgba(167,139,250,0.4)", background: "rgba(167,139,250,0.12)",
                      padding: "6px 11px", borderRadius: 7, whiteSpace: "nowrap",
                    }}>
                      +{itemMin}m
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="ab-spend"
              onClick={spendStretch}
              disabled={!wallet?.redemptionOpen || saving === "__spend__"}
              style={{
                minHeight: 56, borderRadius: 10, border: "none", width: "100%", flexShrink: 0,
                fontSize: 16, fontWeight: 800, fontFamily: "inherit",
                color: wallet?.redemptionOpen ? "#0f1419" : "#757f8f",
                background: wallet?.redemptionOpen ? "#a78bfa" : "#1f2438",
                boxShadow: wallet?.redemptionOpen ? "0 3px 0 #7c5fd3" : "none",
                cursor: wallet?.redemptionOpen ? "pointer" : "not-allowed",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {wallet && wallet.weekendRedemptionOnly && !["Saturday", "Sunday"].includes(wallet.weekday)
                ? "Converts Sat & Sun"
                : `Convert ${STRETCH_SPEND_STEP_MIN} min →`}
            </button>
          </div>
        </div>
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
          Nihal's escape hatch for a legitimately missed tick. The PIN is never
          compared in this file and never stored — it is posted to /api/tick,
          which holds PARENT_OVERRIDE_PIN as a Netlify env var. Every accepted
          override writes a row to override_log with the server's timestamp. */}
      {overrideFor && (
        <div className="ab-ov-backdrop" onClick={e => { if (e.target === e.currentTarget) setOverrideFor(null); }}>
          <div className="ab-ov" role="dialog" aria-modal="true" aria-label="Parent override">
            <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff" }}>Parent override</div>
            <div style={{ fontSize: 12, color: "#b0b5c1", marginTop: 6, lineHeight: 1.45 }}>
              Restore <b style={{ color: "#ffffff" }}>{overrideFor.habitName}</b> for today.
              This bypasses the window, dwell, order and cascade gates, and is recorded.
            </div>

            <label style={{ display: "block", marginTop: 16, fontSize: 11, fontWeight: 800, color: "#757f8f", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              PIN
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submitOverride(); }}
                autoFocus
              />
            </label>

            <label style={{ display: "block", marginTop: 12, fontSize: 11, fontWeight: 800, color: "#757f8f", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Reason
              <input
                type="text"
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submitOverride(); }}
                placeholder="e.g. did it, forgot to tick"
              />
            </label>

            {overrideError && (
              <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: "#ff4444" }}>{overrideError}</div>
            )}

            <div className="ab-ov-row">
              <button type="button" onClick={() => { setOverrideFor(null); setPin(""); setOverrideError(""); }}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={submitOverride} disabled={!pin || overrideBusy}>
                {overrideBusy ? "Working…" : "Restore tick"}
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
    </div>
  );
}
