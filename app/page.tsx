"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase, getTodayDate, getWeekStart, getTodayDayName } from "./lib/supabase";
import { scoreDay, SOCCER_DAYS } from "./lib/scoring";

// ANSAR FC system — points are tracked from day one, but reward enforcement
// only activates 13 Jul 2026 after a green soft-launch week.
const POINTS_ACTIVE = false;

// Real Madrid-inspired accents. Base surfaces stay DARK on purpose: the stadium
// background scrim was tuned for dark cards, and every text token here is
// light-on-dark — switching to white surfaces would recolour all of it and
// re-open the contrast work. RM identity instead comes from Champions-League
// gold + royal navy + kit-white accents on the dark base.
const RM_GOLD = "#D4AF37";        // CL gold — FC scoreboard, achievements, top tier
const RM_GOLD_BRIGHT = "#E7C55B"; // brighter gold for large scoreboard numbers on dark
const RM_NAVY = "#0d2350";        // deep royal navy — scoreboard bar / section accents

type Habit = { id: string; block: string; label: string; icon: string; chip?: string };

function buildHabits(dayName: string): Habit[] {
  const hasSoccer = SOCCER_DAYS.includes(dayName);
  return [
    { id: "feet_floor",         block: "pre_homeschool",    label: "Feet on floor by 6:45am - no phone",                icon: "🌅" },
    { id: "fajr",               block: "pre_homeschool",    label: "Fajr Namaz done",                                    icon: "🕌" },
    { id: "bed_dressed",        block: "pre_homeschool",    label: "Bed made + dressed",                                 icon: "🛏️" },
    { id: "movement",           block: "pre_homeschool",    label: "Morning movement - 20 min outside (ball work)",      icon: "⚽" },
    { id: "breakfast",          block: "pre_homeschool",    label: "Breakfast done - no screens",                        icon: "🍳" },
    { id: "quran",              block: "pre_homeschool",    label: "Qur'an recitation - 20 min",                         icon: "📖" },
    { id: "goals",              block: "pre_homeschool",    label: "Daily goals written + Habits page reviewed",         icon: "✍️" },
    { id: "homeschool_session", block: "homeschool",        label: "Homeschool completed",                               icon: "📚", chip: "+5 pts" },
    { id: "btn_cornell",        block: "afternoon_evening", label: "BTN episode + Cornell notes done",                   icon: "📰", chip: "+1 pt" },
    { id: "all_namaz",          block: "afternoon_evening", label: "All Namaz done (Fajr, Duhr, Asr, Maghrib, Isha)",    icon: "🕌", chip: "+1 pt" },
    { id: "room_tidy",          block: "afternoon_evening", label: "Room tidy",                                          icon: "🧹" },
    { id: "shower",             block: "afternoon_evening", label: "Shower done",                                        icon: "🚿" },
    { id: "teeth",              block: "afternoon_evening", label: "Teeth brushed",                                      icon: "🪥" },
    { id: "reading",            block: "afternoon_evening", label: "Reading in bed (15+ min)",                           icon: "🌙" },
    ...(hasSoccer ? [{ id: "soccer_training", block: "conditional", label: "Soccer training attended", icon: "⚽", chip: "+1 pt" }] : []),
  ];
}

const BLOCKS = [
  { id: "pre_homeschool",    label: "🌅 Morning Habits",      subtitle: "Before 8:30am · all 7 = +2 pts", color: "#ffa500" },
  { id: "homeschool",        label: "📚 Homeschool",           subtitle: "Daily completion · +5 pts",      color: "#00d9ff" },
  { id: "afternoon_evening", label: "🌆 Afternoon / Evening",  subtitle: "After school",                   color: "#00ff88" },
  { id: "conditional",       label: "⚽ Conditional",          subtitle: "Mon & Wed only",                 color: "#a78bfa" },
];

const PRE_HABIT_IDS = ["feet_floor", "fajr", "bed_dressed", "movement", "breakfast", "quran", "goals"];

// ═══════════════════════════════════════════════════════════════════════════
// STRETCH POINTS — a SEPARATE daily system from the ANSAR FC weekly scoring
// above. 1 stretch point = 10 minutes of screen time. Daily cap = 75 earned
// minutes (1h15m). Qur'an's daily minimum stays in the FC habit list, NOT here.
// Items are loaded live from Notion via /api/stretch-items (Points editable in
// Notion without a redeploy). Completions persist to the Supabase
// `stretch_completions` table (localStorage fallback, like habit_completions).
// ═══════════════════════════════════════════════════════════════════════════
// ── LOG WORK ────────────────────────────────────────────────────────────────
// Tally intake form, opened in a modal so Ansar never leaves the board. Purely
// additive: nothing here reads or writes points, tiers, streak, screen time or
// the Stretch Wallet. `TALLY_ORIGIN` is the postMessage allow-list of one.
const TALLY_ORIGIN = "https://tally.so";
const TALLY_EMBED_JS = `${TALLY_ORIGIN}/widgets/embed.js`;
// dynamicHeight lets embed.js report the form's real height so the panel hugs
// it instead of leaving dead space under a short form. If the script never
// loads, .lw-frame's min-height keeps the form perfectly usable anyway.
const TALLY_FORM_SRC = `${TALLY_ORIGIN}/embed/ODKlVa?alignLeft=1&hideTitle=1&dynamicHeight=1`;

const STRETCH_MIN_PER_POINT = 10;
const STRETCH_DAILY_CAP_MIN = 75;   // earnable screen-time minutes per day
const STRETCH_SPEND_STEP_MIN = 10;  // each "Spend" tap burns 10 min (v1, no PS5 integration)
const SPEND_ITEM_ID = "__spend__";  // ledger marker for spend rows (negative minutes)

// Shape returned by /api/stretch-items (mapped from Notion Stretch Items source).
type StretchItem = { id: string; name: string; category: string; points: number; whatCountsAsDone: string };
type StretchRow = { item_id: string; minutes: number };

// Block-based scoring — NOT per-habit sums.
// Daily max = 10 on a non-training day, 11 on a training day (Mon/Wed).
//
// The arithmetic lives in app/lib/scoring.ts, mirrored into family-dashboard so
// both surfaces score the same Supabase rows identically. This adapter supplies
// the habit-id sets, which this app builds locally while family-dashboard reads
// them from Notion.
function scoreLocal(completedIds: Set<string>, dayName: string) {
  const baseIds = buildHabits(dayName).filter(h => h.block !== "conditional").map(h => h.id);
  return scoreDay(completedIds, dayName, PRE_HABIT_IDS, baseIds);
}

// ANSAR FC weekly tiers. Weekly max = 56 (incl. +3 streak bonus for 5 Perfect Days Mon–Fri).
const WEEKLY_MAX = 56;

const THRESHOLDS = [
  { min: 42, label: "First Team 🏆",      desc: "42+ pts",   color: RM_GOLD },
  { min: 34, label: "Bench ✅",           desc: "34–41 pts", color: "#00d9ff" },
  { min: 26, label: "Reserves ⚠️",        desc: "26–33 pts", color: "#ffa500" },
  { min: 0,  label: "Training Ground ❌", desc: "0–25 pts",  color: "#ff4444" },
];

function getThreshold(pts: number) {
  return THRESHOLDS.find(t => pts >= t.min) || THRESHOLDS[THRESHOLDS.length - 1];
}

function dayNameOf(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-AU", { weekday: "long" });
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function getHabitState(habit: Habit, blockHabits: Habit[], completed: Record<string, boolean>): "done" | "available" | "locked" {
  if (completed[habit.id]) return "done";
  const idx = blockHabits.findIndex(h => h.id === habit.id);
  const incompleteBefore = blockHabits.slice(0, idx).filter(h => !completed[h.id]).length;
  return incompleteBefore < 2 ? "available" : "locked";
}

async function calculateStreak(): Promise<number> {
  const today = getTodayDate();
  const cutoffStr = addDays(today, -60);

  const { data, error } = await supabase
    .from("habit_completions")
    .select("habit_id, completed_date")
    .gte("completed_date", cutoffStr)
    .order("completed_date", { ascending: false });

  if (error || !data) return 0;

  const byDate: Record<string, number> = {};
  data.forEach((r: { habit_id: string; completed_date: string }) => {
    byDate[r.completed_date] = (byDate[r.completed_date] || 0) + 1;
  });

  let streak = 0;
  for (let i = 0; i <= 60; i++) {
    const ds = addDays(today, -i);
    if ((byDate[ds] || 0) >= 5) {
      streak++;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

export default function AnsarPage() {
  const [dayName, setDayName] = useState("");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [weeklyPts, setWeeklyPts] = useState<number | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  // Stretch wallet (separate from FC): today's ledger rows + in-flight marker
  const [stretchLog, setStretchLog] = useState<StretchRow[]>([]);
  const [stretchSaving, setStretchSaving] = useState<string | null>(null);
  // Stretch item definitions loaded live from Notion (/api/stretch-items)
  const [stretchItems, setStretchItems] = useState<StretchItem[]>([]);
  // Stretch Wallet daily unlock gate. Opens once Morning Habits + Homeschool are
  // both 100% done, then STAYS open for the rest of the day (sticky per-day flag
  // in localStorage). Never re-locks.
  const [stretchUnlocked, setStretchUnlocked] = useState(false);
  // ── Log Work modal. Presentation only: it reads no scoring state and writes
  // none. `embedKey` remounts the iframe to re-arm a blank form after a submit.
  const [logOpen, setLogOpen] = useState(false);
  const [logSaved, setLogSaved] = useState(false);
  const [embedKey, setEmbedKey] = useState(0);

  const loadWeeklyData = useCallback(async () => {
    const weekStart = getWeekStart();
    const today = getTodayDate();

    const { data, error } = await supabase
      .from("habit_completions")
      .select("habit_id, completed_date")
      .gte("completed_date", weekStart)
      .lte("completed_date", today);

    if (!error && data) {
      const byDate: Record<string, Set<string>> = {};
      data.forEach((r: { habit_id: string; completed_date: string }) => {
        if (!byDate[r.completed_date]) byDate[r.completed_date] = new Set();
        byDate[r.completed_date].add(r.habit_id);
      });

      let total = 0;
      Object.keys(byDate).forEach(ds => {
        total += scoreLocal(byDate[ds], dayNameOf(ds)).total;
      });

      // Weekly streak bonus: 5 Perfect Days Mon–Fri = +3 to weekly total.
      const weekdayDates = [0, 1, 2, 3, 4].map(i => addDays(weekStart, i));
      const allWeekdaysPerfect = weekdayDates.every(
        ds => byDate[ds] && scoreLocal(byDate[ds], dayNameOf(ds)).perfect
      );
      if (allWeekdaysPerfect) total += 3;

      setWeeklyPts(total);
    }
  }, []);

  const loadFromSupabase = useCallback(async () => {
    const { data, error } = await supabase
      .from("habit_completions")
      .select("habit_id")
      .eq("completed_date", getTodayDate());
    if (!error && data) {
      const map: Record<string, boolean> = {};
      data.forEach((r: { habit_id: string }) => { map[r.habit_id] = true; });
      setCompleted(map);
      localStorage.setItem(`ansar-habits-${getTodayDate()}`, JSON.stringify(map));
      setOnline(true);
    } else {
      const saved = localStorage.getItem(`ansar-habits-${getTodayDate()}`);
      if (saved) setCompleted(JSON.parse(saved));
      setOnline(false);
    }
  }, []);

  // Stretch ledger load — independent of the FC `online` badge. If the Supabase
  // table is missing/unreachable, it silently falls back to localStorage so the
  // wallet still works and the FC status indicator is unaffected.
  const loadStretch = useCallback(async () => {
    const today = getTodayDate();
    const { data, error } = await supabase
      .from("stretch_completions")
      .select("item_id, minutes")
      .eq("completed_date", today);
    if (!error && data) {
      const rows = data as StretchRow[];
      setStretchLog(rows);
      localStorage.setItem(`ansar-stretch-${today}`, JSON.stringify(rows));
    } else {
      const saved = localStorage.getItem(`ansar-stretch-${today}`);
      setStretchLog(saved ? JSON.parse(saved) : []);
    }
  }, []);

  // Stretch item definitions from Notion (server-cached 5 min). Best-effort:
  // if it fails, the wallet shows its "no items" empty state rather than erroring.
  const loadStretchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/stretch-items");
      if (!res.ok) return;
      const items = (await res.json()) as StretchItem[];
      if (Array.isArray(items)) setStretchItems(items);
    } catch {
      // best-effort; leaves the last-known (or empty) item list in place
    }
  }, []);

  useEffect(() => {
    const dn = getTodayDayName();
    setDayName(dn);
    setHabits(buildHabits(dn));
    setMounted(true);
    // Restore today's sticky Stretch-Wallet unlock flag (set once Morning Habits +
    // Homeschool were both cleared earlier today) so a reload doesn't re-lock it.
    if (localStorage.getItem(`ansar-stretch-unlocked-${getTodayDate()}`) === "1") {
      setStretchUnlocked(true);
    }
    loadFromSupabase();
    loadWeeklyData();
    loadStretch();
    loadStretchItems();
    calculateStreak().then(setStreak);

    const tick = setInterval(() => {
      setTime(new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }));
    }, 1000);
    setTime(new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }));

    const poll = setInterval(() => {
      loadFromSupabase();
      loadWeeklyData();
      loadStretch();
    }, 30000);

    return () => { clearInterval(tick); clearInterval(poll); };
  }, [loadFromSupabase, loadWeeklyData, loadStretch, loadStretchItems]);

  // Stretch-Wallet unlock gate. Opens once BOTH the Morning Habits block AND the
  // Homeschool block are 100% complete — the Afternoon/Evening (and Conditional)
  // blocks are still required for FC points but do NOT gate stretch access.
  // Once opened it's sticky for the day (never re-locks): the early-return on
  // `stretchUnlocked` guarantees we only ever flip false→true. Keeping it sticky
  // matters if Morning/Homeschool habits are ever time-gated later.
  useEffect(() => {
    if (!mounted || stretchUnlocked || habits.length === 0) return;
    const blockComplete = (blockId: string) => {
      const bh = habits.filter(h => h.block === blockId);
      return bh.length > 0 && bh.every(h => completed[h.id]);
    };
    if (blockComplete("pre_homeschool") && blockComplete("homeschool")) {
      setStretchUnlocked(true);
      localStorage.setItem(`ansar-stretch-unlocked-${getTodayDate()}`, "1");
    }
  }, [mounted, stretchUnlocked, habits, completed]);

  // ── Log Work: Esc-to-close + body-scroll lock while the modal is open ──
  // Below 1440px .ab-root scrolls, so the lock is on <body>, and the previous
  // value is restored on close rather than assumed to be "".
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

  // ── Log Work: Tally submit signal ──
  // Origin-checked against tally.so — messages from anywhere else are ignored
  // outright. If this event never fires nothing happens: the modal simply stays
  // open and the X closes it. No synthetic submit signal is ever manufactured.
  useEffect(() => {
    if (!logOpen) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== TALLY_ORIGIN) return;
      let payload: unknown = e.data;
      if (typeof payload === "string") {
        try { payload = JSON.parse(payload); } catch { return; }
      }
      if ((payload as { event?: string } | null)?.event === "Tally.FormSubmitted") {
        setLogSaved(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [logOpen]);

  // Re-arm: hold the confirmation for a beat, then remount the iframe so the
  // form comes back blank and Ansar can log another entry without reopening.
  // Kept out of the listener so closing mid-beat cancels the timer cleanly.
  useEffect(() => {
    if (!logSaved) return;
    const t = setTimeout(() => {
      setLogSaved(false);
      setEmbedKey(k => k + 1);
    }, 1500);
    return () => clearTimeout(t);
  }, [logSaved]);

  // ── Log Work: Tally's official embed script, fetched once on first open ──
  // loadEmbeds() promotes data-tally-src → src. The manual fallback does the
  // same by hand, so the form still renders if the script 404s or is blocked.
  // Re-runs on embedKey so a re-armed iframe gets promoted too.
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

  async function toggle(id: string, state: string) {
    if (state !== "available") return;
    setSaving(id);
    setCompleted(prev => {
      const next = { ...prev, [id]: true };
      localStorage.setItem(`ansar-habits-${getTodayDate()}`, JSON.stringify(next));
      return next;
    });
    const { error } = await supabase
      .from("habit_completions")
      .upsert({ habit_id: id, completed_date: getTodayDate() }, { onConflict: "habit_id,completed_date" });
    if (error) {
      setOnline(false);
    } else {
      setOnline(true);
      loadWeeklyData();
    }
    setSaving(null);
  }

  // ── Stretch wallet handlers (append-only ledger, separate from FC toggle) ──
  // Cap is enforced on cumulative EARNED minutes per day (independent of spend),
  // so a completion past the 75-min cap still logs a row (minutes: 0) for the
  // record but adds nothing to the balance.
  function stretchEarnedMinutes(rows: StretchRow[]): number {
    return rows.filter(r => r.item_id !== SPEND_ITEM_ID && r.minutes > 0).reduce((s, r) => s + r.minutes, 0);
  }

  async function earnStretch(item: StretchItem) {
    if (stretchSaving) return;
    // One earn per item per calendar day. stretchLog mirrors stretch_completions
    // for completed_date=today (loaded from Supabase + polled + refreshed after
    // each earn), so an existing row for this item_id means it's already done —
    // block regardless of the 75-min cap. Resets naturally at the next day's date.
    if (stretchLog.some(r => r.item_id === item.id)) return;
    const today = getTodayDate();
    const itemMin = item.points * STRETCH_MIN_PER_POINT;
    const alreadyEarned = stretchEarnedMinutes(stretchLog);
    const credited = Math.max(0, Math.min(itemMin, STRETCH_DAILY_CAP_MIN - alreadyEarned));
    const row: StretchRow = { item_id: item.id, minutes: credited };
    setStretchSaving(item.id);
    setStretchLog(prev => {
      const next = [...prev, row];
      localStorage.setItem(`ansar-stretch-${today}`, JSON.stringify(next));
      return next;
    });
    await supabase.from("stretch_completions").insert({ item_id: item.id, completed_date: today, minutes: credited });
    setStretchSaving(null);
    loadStretch();
  }

  async function spendStretch() {
    if (stretchSaving) return;
    const today = getTodayDate();
    const earned = stretchEarnedMinutes(stretchLog);
    const spent = stretchLog.filter(r => r.item_id === SPEND_ITEM_ID).reduce((s, r) => s + Math.abs(r.minutes), 0);
    const balance = earned - spent;
    if (balance <= 0) return;
    const burn = Math.min(STRETCH_SPEND_STEP_MIN, balance);
    const row: StretchRow = { item_id: SPEND_ITEM_ID, minutes: -burn };
    setStretchSaving(SPEND_ITEM_ID);
    setStretchLog(prev => {
      const next = [...prev, row];
      localStorage.setItem(`ansar-stretch-${today}`, JSON.stringify(next));
      return next;
    });
    await supabase.from("stretch_completions").insert({ item_id: SPEND_ITEM_ID, completed_date: today, minutes: -burn });
    setStretchSaving(null);
    loadStretch();
  }

  const completedSet = new Set(Object.keys(completed).filter(k => completed[k]));
  const dayScore = scoreLocal(completedSet, dayName);
  const todayPts = dayScore.total;
  const todayDone = habits.filter(h => completed[h.id]).length;
  const overallPct = habits.length > 0 ? Math.round((todayDone / habits.length) * 100) : 0;
  const weekThreshold = getThreshold(weeklyPts ?? 0);
  const DAILY_MAX = SOCCER_DAYS.includes(dayName) ? 11 : 10;

  // ── Stretch wallet derived values (today) ──
  const stretchEarned = stretchEarnedMinutes(stretchLog);           // capped ≤ 75
  const stretchSpent = stretchLog.filter(r => r.item_id === SPEND_ITEM_ID).reduce((s, r) => s + Math.abs(r.minutes), 0);
  const stretchBalance = Math.max(0, stretchEarned - stretchSpent);
  const stretchCapReached = stretchEarned >= STRETCH_DAILY_CAP_MIN;
  // Wallet is locked until Morning Habits + Homeschool are cleared (sticky once opened).
  const walletLocked = mounted && !stretchUnlocked;
  const stretchByItem: Record<string, number> = {};
  const stretchCountByItem: Record<string, number> = {};
  stretchLog.forEach(r => {
    if (r.item_id === SPEND_ITEM_ID) return;
    stretchByItem[r.item_id] = (stretchByItem[r.item_id] || 0) + r.minutes;
    stretchCountByItem[r.item_id] = (stretchCountByItem[r.item_id] || 0) + 1;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MATCH DAY BOARD — one screen, no scroll.
  //
  // The page used to run 2,729px inside a 1,080px screen: 1,649px (60%) sat below
  // the fold, and every block additionally carried `maxHeight: 400px; overflowY:
  // auto`, so habits scrolled INSIDE a card that was itself already invisible.
  // Both scrolls are gone. The root is a fixed-height flex column and each of the
  // four board columns sizes itself to fit.
  //
  // The height came back from removing what repeated itself, not from removing
  // anything tappable: the four 431px metric cards, the slim stat row (a verbatim
  // duplicate of them), the standalone "on track for" card, the soccer alert (the
  // Conditional column already says Mon & Wed) and a dead 40px spacer all collapse
  // into the 80px scoreboard strip. Every habit, every wallet item and every
  // control survives, larger than before.
  //
  // Scoring, progressive unlock and the wallet gate are untouched — this is layout.
  // ═══════════════════════════════════════════════════════════════════════════

  // Presses need :active / :focus-visible, which inline styles cannot express, so
  // the interaction and the responsive grid live in one stylesheet. Everything else
  // stays inline to match the rest of the file.
  const BOARD_CSS = `
/* padding-top, NOT margin-top, to clear the fixed nav. body is height:100% in
   layout.tsx, so a top margin here collapses through it and pushes the document
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
   allowed to scroll again — 15 habits at a usable size genuinely cannot fit an
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

/* ── LOG WORK MODAL ───────────────────────────────────────────────────────
   Hand-rolled: this repo has no modal primitive and no stylesheet to reuse.
   Chrome is lifted straight from the board's own palette (#16192d panel,
   #1f2438 controls, #2d3543 borders) so it reads native.

   z-index 1000 clears BOTH the fixed .topnav (900) and the page header (100).
   Anything lower and the nav would sit on top of the backdrop. */
.lw-backdrop{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;
  justify-content:center;padding:24px;background:rgba(8,11,20,0.72)}
/* The panel sizes to the form (embed.js reports its height) and stops at 85vh,
   past which .lw-body scrolls. No fixed height: an iframe has no intrinsic
   height, so a short form would otherwise sit in a tall box of dead space. */
.lw-panel{display:flex;flex-direction:column;width:min(560px,100%);max-height:85vh;
  background:#16192d;border:1px solid #2d3543;border-radius:14px;overflow:hidden;
  box-shadow:0 24px 64px rgba(0,0,0,0.62)}
.lw-head{display:flex;align-items:center;justify-content:space-between;gap:12px;
  flex-shrink:0;padding:13px 15px;border-bottom:1px solid #2d3543}
/* min-height is the safety net: if embed.js fails to load, no height is ever
   reported and the iframe would fall back to its 150px default. */
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
   * One habit as a real <button>. `flex: 1` with a 56px floor lets rows share the
   * column's height — ~105px each at 1920×1080, compressing gracefully on smaller
   * screens rather than overflowing. It was a 48px div before.
   */
  const habitButton = (habit: Habit, blockHabits: Habit[], color: string) => {
    const state = mounted ? getHabitState(habit, blockHabits, completed) : "locked";
    const isDone = state === "done";
    const isAvailable = state === "available";
    const isLocked = state === "locked";
    const isSaving = saving === habit.id;

    return (
      <button
        key={habit.id}
        type="button"
        className="ab-btn"
        onClick={() => toggle(habit.id, state)}
        disabled={!isAvailable}
        aria-label={habit.label}
        style={{
          display: "flex", alignItems: "center", gap: 14, padding: "0 16px",
          borderRadius: 11, flex: 1, minHeight: 56, width: "100%", textAlign: "left",
          font: "inherit", color: "inherit",
          border: `1px solid ${isDone ? color + "50" : isAvailable ? "#2d3543" : "#1f2438"}`,
          background: isDone ? color + "0a" : isAvailable ? "#1f2438" : "#16192d",
          opacity: isLocked ? 0.45 : 1,
          cursor: isAvailable ? "pointer" : "default",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <span style={{
          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
          border: `2px solid ${isDone ? color : isAvailable ? "#2d3543" : "#1f2438"}`,
          background: isDone ? color : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {isSaving ? <span style={{ fontSize: 13 }}>⏳</span> :
           isDone ? <span style={{ fontSize: 16, color: "#000", fontWeight: 800 }}>✓</span> :
           isLocked ? <span style={{ fontSize: 12 }}>🔒</span> : null}
        </span>

        <span aria-hidden style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}>{habit.icon}</span>

        <span style={{
          flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, lineHeight: 1.28,
          color: isDone ? "#757f8f" : isLocked ? "#565f70" : "#ffffff",
          textDecoration: isDone ? "line-through" : "none",
        }}>
          {habit.label}
        </span>

        {habit.chip && (
          <span style={{
            fontSize: 11, fontWeight: 800, flexShrink: 0, padding: "5px 10px",
            borderRadius: 7, whiteSpace: "nowrap",
            color: isDone ? color : isLocked ? "#565f70" : "#b0b5c1",
            background: isDone ? color + "15" : "#16192d",
            border: `1px solid ${isDone ? color + "40" : "#2d3543"}`,
          }}>
            {habit.chip}
          </span>
        )}
      </button>
    );
  };

  /** A full habit column (Morning, and Afternoon/Evening). */
  const habitColumn = (block: (typeof BLOCKS)[number]) => {
    const blockHabits = habits.filter(h => h.block === block.id);
    if (blockHabits.length === 0) return null;
    const done = blockHabits.filter(h => completed[h.id]).length;
    return (
      <div style={cardStyle}>
        {colHead(block.color, block.label, block.subtitle,
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#ffffff", fontVariantNumeric: "tabular-nums" }}>
              {mounted ? done : 0}/{blockHabits.length}
            </div>
            <div style={{ fontSize: 10, color: "#757f8f", marginTop: 2, fontWeight: 500 }}>
              {mounted ? (dayScore.blocks[block.id] ?? 0) : 0} pts
            </div>
          </div>,
        )}
        <div style={{ padding: 11, display: "flex", flexDirection: "column", gap: 9, flex: 1, minHeight: 0 }}>
          {blockHabits.map(h => habitButton(h, blockHabits, block.color))}
        </div>
      </div>
    );
  };

  const morning = BLOCKS.find(b => b.id === "pre_homeschool")!;
  const school = BLOCKS.find(b => b.id === "homeschool")!;
  const evening = BLOCKS.find(b => b.id === "afternoon_evening")!;
  const conditional = BLOCKS.find(b => b.id === "conditional")!;
  const schoolHabits = habits.filter(h => h.block === "homeschool");
  const condHabits = habits.filter(h => h.block === "conditional");

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
      // Height and the nav offset are set in BOARD_CSS (.ab-root) — padding, not
      // margin, so nothing collapses through body and re-introduces a scrollbar.
      // Decorative Bernabeu backdrop. A near-solid dark scrim (92% of the original
      // #0f1419 page colour) sits on top of the photo and does ALL the work of
      // preserving contrast — no text/card styling is changed. Bump the 0.92 alpha
      // higher if any section ever looks low-contrast; never lighten text.
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

      {/* HEADER — 52px. The soft-launch notice is a chip here, not a 46px band. */}
      <header style={{
        background: "#16192d", borderBottom: "1px solid #2d3543", height: 52, flexShrink: 0,
        padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      }}>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em" }}>
          Ansar <span style={{ color: RM_GOLD, letterSpacing: "0.04em" }}>· ANSAR FC</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#757f8f", flexShrink: 0 }}>
          {!POINTS_ACTIVE && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: "#ffa500", padding: "3px 9px", borderRadius: 20,
              border: "1px solid rgba(255,165,0,0.3)", background: "rgba(255,165,0,0.1)",
            }}>
              Soft-launch · points preview
            </span>
          )}
          <span>{mounted ? new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" }) : ""} · {time}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: online ? "#00ff88" : "#ff4444", display: "inline-block" }} />
            <span style={{ color: online ? "#00ff88" : "#ff4444", fontSize: 11, fontWeight: 500 }}>{online ? "Live" : "Offline"}</span>
          </span>
          <a href="/" style={{
            fontSize: 11, color: "#b0b5c1", textDecoration: "none", fontWeight: 600,
            background: "#1f2438", padding: "6px 12px", borderRadius: 6, border: "1px solid #2d3543",
          }}>← Back</a>
        </div>
      </header>

      {/* SCOREBOARD STRIP — 80px carrying every number the four 431px metric cards,
          the duplicate slim row and the "on track for" card used to spread between them. */}
      <div style={{
        height: 80, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 20px",
        background: RM_NAVY, borderBottom: "1px solid rgba(212,175,55,0.28)",
      }}>
        {cell("Points today", <>{mounted ? todayPts : "—"}{sub(` / ${DAILY_MAX}`)}{mounted && dayScore.perfect && <span style={{ fontSize: 18, marginLeft: 5 }}>⭐</span>}</>)}
        {cell("Week total", <>{mounted && weeklyPts !== null ? weeklyPts : "—"}{sub(` / ${WEEKLY_MAX}`)}</>)}
        {cell("Streak", <>{mounted && streak !== null ? streak : "—"}{mounted && streak !== null && streak > 0 ? " 🔥" : ""}</>)}
        {cell("Today", <>{mounted ? overallPct : 0}{sub("%")}</>,
          <div style={{ height: 5, borderRadius: 3, background: "rgba(0,0,0,0.34)", overflow: "hidden", marginTop: 6, width: 150 }}>
            <div style={{
              height: "100%", borderRadius: 3, transition: "width 200ms ease-in-out",
              width: mounted ? `${overallPct}%` : "0%",
              background: "linear-gradient(90deg, #ffa500, #00ff88)",
            }} />
          </div>,
        )}
        <div style={{ padding: "0 22px", height: 52, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase", color: "rgba(232,235,242,0.6)" }}>
            Screen time
          </div>
          <div style={{ fontSize: 29, fontWeight: 800, color: "#a78bfa", lineHeight: 1.08, fontVariantNumeric: "tabular-nums" }}>
            {mounted ? (walletLocked ? "🔒" : stretchBalance) : "—"}
            {mounted && !walletLocked && sub(` / ${STRETCH_DAILY_CAP_MIN} min`)}
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
              {weekThreshold.desc}{!POINTS_ACTIVE && " · preview, not yet enforced"}
            </i>
          </div>
        </div>
      </div>

      {/* BOARD — four columns, no scroll on either axis at 1440px+ */}
      <div className="ab-board">

        {/* 1 — Morning Habits */}
        {habitColumn(morning)}

        {/* 2 — Afternoon / Evening */}
        {habitColumn(evening)}

        {/* 3 — Homeschool (hero) · Conditional · Weekly Tiers */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
          {schoolHabits.length > 0 && (
            <div style={{ ...cardStyle, flex: "0 0 auto" }}>
              {colHead(school.color, school.label, school.subtitle)}
              <div style={{ padding: 11 }}>
                {/* The single +5 habit — worth more than all seven morning habits
                    combined, so it gets the largest target on the board rather than
                    one line lost in a list. */}
                {schoolHabits.map(h => {
                  const state = mounted ? getHabitState(h, schoolHabits, completed) : "locked";
                  const isDone = state === "done";
                  const isSaving = saving === h.id;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      className="ab-btn"
                      onClick={() => toggle(h.id, state)}
                      disabled={state !== "available"}
                      aria-label={h.label}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "flex-start",
                        justifyContent: "center", gap: 7, padding: 18, minHeight: 126, width: "100%",
                        borderRadius: 11, textAlign: "left", font: "inherit", color: "inherit",
                        border: `1px solid ${isDone ? school.color + "66" : "#2d3543"}`,
                        background: isDone ? school.color + "10" : "#1f2438",
                        cursor: state === "available" ? "pointer" : "default",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      <span style={{ fontSize: 36, fontWeight: 800, color: school.color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                        {isSaving ? "⏳" : "+5"}
                      </span>
                      <span style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.2 }}>
                        {h.icon} {h.label}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: isDone ? school.color : "#757f8f" }}>
                        {isDone ? "✓ Done — wallet unlocked" : "Tap when the day's homeschool is finished"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* LOG WORK — opens the Tally intake modal. Sits directly under the
              +5 card because logging work IS the schoolwork action; it belongs
              beside that habit rather than floating in the header chrome.
              flex-shrink:0 keeps the 60px target intact — the height it needs
              comes out of Weekly Tiers below, which is flex:1 with ~200px of
              slack at 1440px+. Touches no scoring state: onClick only opens. */}
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
                  {mounted ? condHabits.filter(h => completed[h.id]).length : 0}/{condHabits.length}
                </div>,
              )}
              <div style={{ padding: 11, display: "flex", flexDirection: "column", gap: 9 }}>
                {condHabits.map(h => habitButton(h, condHabits, conditional.color))}
              </div>
            </div>
          )}

          {/* Weekly tiers — the 209px reference card, now four chips filling whatever
              height this column has left over. */}
          <div style={{ ...cardStyle, flex: 1, minHeight: 0 }}>
            {colHead(`linear-gradient(90deg, ${RM_NAVY}, ${RM_GOLD}, #f5f5f5)`, "🏆 Weekly Tiers", `5 Perfect Days Mon–Fri = +3 · max ${WEEKLY_MAX}`)}
            <div style={{ padding: 11, display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 0 }}>
              {THRESHOLDS.map((t, i) => {
                const weekPts = weeklyPts ?? 0;
                const isActive = mounted && weekPts >= t.min && (i === 0 || weekPts < THRESHOLDS[i - 1].min);
                const isAchieved = mounted && weekPts >= t.min;
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

        {/* 4 — Stretch Wallet. Permanently on screen instead of below the fold. */}
        <div style={{ ...cardStyle, border: "1px solid #3a2d5a" }}>
          {colHead("linear-gradient(90deg, #a78bfa, #00d9ff)", "🎮 Stretch Wallet",
            `1 point = ${STRETCH_MIN_PER_POINT} min screen time · separate from ANSAR FC`,
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 19, fontWeight: 800, color: "#a78bfa", fontVariantNumeric: "tabular-nums" }}>
                {mounted && !walletLocked ? stretchBalance : "—"}
                <span style={{ fontSize: 12, color: "#757f8f" }}>/{STRETCH_DAILY_CAP_MIN}</span>
              </div>
              <div style={{ fontSize: 10, color: "#757f8f", marginTop: 2, fontWeight: 500 }}>
                {mounted && !walletLocked ? `${stretchEarned} earned · ${stretchSpent} spent` : "min"}
              </div>
            </div>,
          )}

          <div style={{ padding: 11, display: "flex", flexDirection: "column", gap: 9, flex: 1, minHeight: 0 }}>
            {mounted && walletLocked && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderRadius: 9,
                border: "1px solid #3a2d5a", background: "rgba(167,139,250,0.10)",
                fontSize: 12, color: "#a78bfa", fontWeight: 700, flexShrink: 0,
              }}>
                🔒 Finish Morning Habits + Homeschool to unlock
              </div>
            )}

            {mounted && !walletLocked && stretchCapReached && (
              <div style={{ fontSize: 11, color: "#00ff88", fontWeight: 600, flexShrink: 0 }}>
                ✅ Daily cap reached — extra completions still log but don&apos;t add minutes.
              </div>
            )}

            <div style={{
              display: "flex", flexDirection: "column", gap: 9, flex: 1, minHeight: 0,
              opacity: walletLocked ? 0.4 : 1,
              pointerEvents: walletLocked ? "none" : "auto",
            }}>
              {mounted && stretchItems.length === 0 && (
                <div style={{ fontSize: 12, color: "#757f8f", padding: "8px 2px" }}>
                  No stretch items available right now.
                </div>
              )}
              {stretchItems.map(item => {
                const earnedForItem = mounted ? (stretchByItem[item.id] || 0) : 0;
                const countForItem = mounted ? (stretchCountByItem[item.id] || 0) : 0;
                const itemMin = item.points * STRETCH_MIN_PER_POINT;
                const isSaving = stretchSaving === item.id;
                const done = countForItem > 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="ab-btn"
                    onClick={() => !isSaving && !walletLocked && !done && earnStretch(item)}
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
                        {done
                          ? `✓ earned ${earnedForItem} min today${countForItem > 1 ? ` (×${countForItem})` : ""}`
                          : item.whatCountsAsDone || `Worth ${item.points} pt`}
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
              disabled={!mounted || walletLocked || stretchBalance <= 0}
              style={{
                minHeight: 56, borderRadius: 10, border: "none", width: "100%", flexShrink: 0,
                fontSize: 16, fontWeight: 800, fontFamily: "inherit",
                color: mounted && !walletLocked && stretchBalance > 0 ? "#0f1419" : "#757f8f",
                background: mounted && !walletLocked && stretchBalance > 0 ? "#a78bfa" : "#1f2438",
                boxShadow: mounted && !walletLocked && stretchBalance > 0 ? "0 3px 0 #7c5fd3" : "none",
                cursor: mounted && !walletLocked && stretchBalance > 0 ? "pointer" : "not-allowed",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              Spend {STRETCH_SPEND_STEP_MIN} min →
            </button>
          </div>
        </div>
      </div>

      {/* ── LOG WORK MODAL ────────────────────────────────────────────────
          An overlay, not a page swap: the board stays mounted and untouched
          underneath, so closing returns it exactly as it was. Three ways out —
          the X, the backdrop, and Esc (listener above). */}
      {logOpen && (
        <div
          className="lw-backdrop"
          // Backdrop-to-close fires only for a press that lands on the backdrop
          // itself — never one that bubbled up out of the panel.
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
                    : "Log as many entries as you need · Esc to close"}
                </div>
              </div>
              {/* Focused on open so the keyboard lands inside the dialog rather
                  than on whatever sat behind it. */}
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
              {/* `key={embedKey}` is the re-arm: bumping it remounts the iframe,
                  which reloads the form blank. src is left to Tally's embed.js
                  (or the manual promotion fallback) via data-tally-src. */}
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
