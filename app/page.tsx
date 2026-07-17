"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase, getTodayDate, getWeekStart, getTodayDayName } from "./lib/supabase";

// ANSAR FC system — points are tracked from day one, but reward enforcement
// only activates 13 Jul 2026 after a green soft-launch week.
const POINTS_ACTIVE = false;

const SOCCER_DAYS = ["Monday", "Wednesday"];

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
    { id: "homeschool_session", block: "homeschool",        label: "Homeschool session completed (4 hrs)",               icon: "📚", chip: "+3 pts" },
    { id: "readtheory",         block: "homeschool",        label: "ReadTheory done",                                    icon: "📝", chip: "+1 pair" },
    { id: "khan",               block: "homeschool",        label: "Khan Academy done",                                  icon: "🎓", chip: "+1 pair" },
    { id: "journal",            block: "homeschool",        label: "Daily learning journal entry written",               icon: "📒", chip: "+1 pt" },
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
  { id: "homeschool",        label: "📚 Homeschool",           subtitle: "4 hour block",                   color: "#00d9ff" },
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
const STRETCH_MIN_PER_POINT = 10;
const STRETCH_DAILY_CAP_MIN = 75;   // earnable screen-time minutes per day
const STRETCH_SPEND_STEP_MIN = 10;  // each "Spend" tap burns 10 min (v1, no PS5 integration)
const SPEND_ITEM_ID = "__spend__";  // ledger marker for spend rows (negative minutes)

// Shape returned by /api/stretch-items (mapped from Notion Stretch Items source).
type StretchItem = { id: string; name: string; category: string; points: number; whatCountsAsDone: string };
type StretchRow = { item_id: string; minutes: number };

// Block-based scoring — NOT per-habit sums.
// Daily max = 10 on a non-training day, 11 on a training day (Mon/Wed).
function scoreDay(completedIds: Set<string>, dayName: string) {
  const hasSoccer = SOCCER_DAYS.includes(dayName);

  const pre = PRE_HABIT_IDS.every(id => completedIds.has(id)) ? 2 : 0;

  let school = 0;
  if (completedIds.has("homeschool_session")) school += 3;
  if (completedIds.has("readtheory") && completedIds.has("khan")) school += 1;
  if (completedIds.has("journal")) school += 1;

  let arvo = 0;
  if (completedIds.has("btn_cornell")) arvo += 1;
  if (completedIds.has("all_namaz")) arvo += 1;

  const conditional = hasSoccer && completedIds.has("soccer_training") ? 1 : 0;

  const visibleIds = buildHabits(dayName).map(h => h.id);
  const perfect = visibleIds.length > 0 && visibleIds.every(id => completedIds.has(id));
  const bonus = perfect ? 1 : 0;

  return {
    total: pre + school + arvo + conditional + bonus,
    blocks: { pre_homeschool: pre, homeschool: school, afternoon_evening: arvo, conditional } as Record<string, number>,
    perfect,
  };
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
        total += scoreDay(byDate[ds], dayNameOf(ds)).total;
      });

      // Weekly streak bonus: 5 Perfect Days Mon–Fri = +3 to weekly total.
      const weekdayDates = [0, 1, 2, 3, 4].map(i => addDays(weekStart, i));
      const allWeekdaysPerfect = weekdayDates.every(
        ds => byDate[ds] && scoreDay(byDate[ds], dayNameOf(ds)).perfect
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
  const dayScore = scoreDay(completedSet, dayName);
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

  // Renders a single habit block (header + chained habit rows). Extracted so the
  // page can place blocks individually in the new layout order.
  const renderBlock = (block: (typeof BLOCKS)[number]) => {
    const blockHabits = habits.filter(h => h.block === block.id);
    if (blockHabits.length === 0) return null;
    const blockDone = blockHabits.filter(h => completed[h.id]).length;
    const blockPts = mounted ? (dayScore.blocks[block.id] ?? 0) : 0;
    const blockPct = Math.round((blockDone / blockHabits.length) * 100);

    return (
      <div key={block.id} style={{ background: "#16192d", border: "1px solid #2d3543", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)", display: "flex", flexDirection: "column" }}>
        <div style={{ height: 3, background: block.color }} />
        <div style={{ padding: "16px", borderBottom: "1px solid #2d3543" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: block.color }}>{block.label}</div>
              <div style={{ fontSize: 11, color: "#757f8f", marginTop: 4, fontWeight: 500 }}>{block.subtitle}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#ffffff" }}>{blockDone}/{blockHabits.length}</div>
              <div style={{ fontSize: 11, color: "#757f8f", marginTop: 2, fontWeight: 500 }}>{blockPts} pts</div>
            </div>
          </div>
          <div style={{ height: 6, background: "#1f2438", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${blockPct}%`, background: block.color, borderRadius: 3, transition: "width 200ms ease-in-out", boxShadow: `0 0 8px ${block.color}40` }} />
          </div>
        </div>

        <div style={{ padding: "12px", flex: 1, overflowY: "auto", maxHeight: "400px" }}>
        {blockHabits.map((habit) => {
          const state = mounted ? getHabitState(habit, blockHabits, completed) : "locked";
          const isDone = state === "done";
          const isAvailable = state === "available";
          const isLocked = state === "locked";
          const isSaving = saving === habit.id;

          return (
            <div
              key={habit.id}
              onClick={() => toggle(habit.id, state)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px", marginBottom: 6, borderRadius: 8,
                border: `1px solid ${isDone ? block.color + "50" : isAvailable ? "#2d3543" : "#1f2438"}`,
                background: isDone ? block.color + "0a" : isAvailable ? "#1f2438" : "#16192d",
                opacity: isLocked ? 0.5 : 1,
                cursor: isAvailable ? "pointer" : "default",
                transition: "all 150ms ease-out",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                border: `2px solid ${isDone ? block.color : isAvailable ? "#2d3543" : "#1f2438"}`,
                background: isDone ? block.color : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 150ms ease-out",
              }}>
                {isSaving ? <span style={{ fontSize: 10 }}>⏳</span> :
                 isDone ? <span style={{ fontSize: 12, color: "#000", fontWeight: 700 }}>✓</span> :
                 isLocked ? <span style={{ fontSize: 9 }}>🔒</span> : null}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: isAvailable ? 600 : 500,
                  color: isDone ? "#757f8f" : isLocked ? "#565f70" : "#ffffff",
                  textDecoration: isDone ? "line-through" : "none",
                }}>
                  {habit.icon} {habit.label}
                </div>
                {isLocked && <div style={{ fontSize: 10, color: "#565f70", marginTop: 2, fontWeight: 500 }}>Complete previous habits to unlock</div>}
              </div>

              {habit.chip && (
                <div style={{
                  fontSize: 11, fontWeight: 600, flexShrink: 0,
                  color: isDone ? block.color : isLocked ? "#565f70" : "#b0b5c1",
                  background: isDone ? block.color + "15" : "#1f2438",
                  padding: "4px 8px", borderRadius: 6,
                  border: `1px solid ${isDone ? block.color + "40" : "#2d3543"}`,
                }}>
                  {habit.chip}
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: "calc(100vh - var(--nav-h))",
      marginTop: "var(--nav-h)",
      // Decorative Bernabeu backdrop. A near-solid dark scrim (82% of the original
      // #0f1419 page colour) sits on top of the photo and does ALL the work of
      // preserving contrast — no text/card styling is changed. Bump the 0.82 alpha
      // toward 0.9 if any section ever looks low-contrast; never lighten text.
      backgroundColor: "#0f1419",
      backgroundImage: "linear-gradient(rgba(15,20,25,0.92), rgba(15,20,25,0.92)), url('/bernabeu-bg.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundAttachment: "fixed",
      color: "#ffffff", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* HEADER */}
      <header style={{
        background: "#16192d", borderBottom: "1px solid #2d3543",
        padding: "16px 24px", display: "flex", alignItems: "center",
        // top:var(--nav-h) — the page scrolls on the body, so sticky resolves
        // against the viewport; top:0 would park this under the fixed nav.
        justifyContent: "space-between", position: "sticky", top: "var(--nav-h)", zIndex: 100, flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "#ffffff" }}>
            Ansar <span style={{ color: RM_GOLD, letterSpacing: "0.04em" }}>· ANSAR FC</span>
          </div>
          <div style={{ fontSize: 12, color: "#757f8f", marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
            {mounted ? new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" }) : ""} · {time}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: online ? "#00ff88" : "#ff4444", display: "inline-block" }} />
              <span style={{ color: online ? "#00ff88" : "#ff4444", fontSize: 11, fontWeight: 500 }}>{online ? "Live" : "Offline"}</span>
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* External cross-nav to Nihal's weekly view on the family dashboard */}
          <a href="https://kurgel-dashboard.netlify.app/week" target="_blank" rel="noopener noreferrer" style={{
            fontSize: 11, color: "#ffa500", textDecoration: "none", fontWeight: 700,
            background: "rgba(255,165,0,0.1)", padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(255,165,0,0.35)",
            cursor: "pointer", transition: "all 150ms ease-out",
          }}>📅 Homeschool Week ↗</a>
          <a href="/" style={{
            fontSize: 11, color: "#b0b5c1", textDecoration: "none", fontWeight: 600,
            background: "#1f2438", padding: "6px 12px", borderRadius: 6, border: "1px solid #2d3543",
            cursor: "pointer", transition: "all 150ms ease-out",
          }}>← Back</a>
        </div>
      </header>

      {/* MAIN CONTENT - SCROLLABLE. No TOP padding: the top block below supplies
          its own top spacing via paddingTop, so the header/content gap lives in
          one place. Everything here scrolls normally, top block included. */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px", width: "100%" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>

          {/* ═══ TOP BLOCK — the fuller stat block (Points / Week / Streak /
              Progress cards + Today's Progress bar) sits FIRST, with the Stretch
              Wallet balance bar directly beneath it. Plain wrapper: it scrolls
              away with the rest of the page like every other section (no sticky/
              pinned positioning). paddingTop supplies the gap under the header
              since the scroll container has no top padding of its own. ═══ */}
          <div style={{
            marginBottom: 24, paddingTop: 24,
          }}>

            {/* TOP METRICS ROW — Points Today / Week Total / Day Streak / Progress */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
              <div style={{ background: "#16192d", border: "1px solid #2d3543", borderRadius: 12, padding: "20px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)" }}>
                <div style={{ fontSize: 12, color: "#757f8f", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>Points Today</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: RM_GOLD_BRIGHT, lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: "0.01em" }}>
                  {mounted ? todayPts : "—"}{mounted && dayScore.perfect && <span style={{ fontSize: 20, marginLeft: 6 }}>⭐</span>}
                </div>
                <div style={{ fontSize: 12, color: "#b0b5c1", marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                  <span>📊</span> {mounted ? todayDone : 0}/{habits.length} complete · max {DAILY_MAX} pts
                </div>
              </div>

              <div style={{ background: "#16192d", border: "1px solid #2d3543", borderRadius: 12, padding: "20px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)" }}>
                <div style={{ fontSize: 12, color: "#757f8f", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>Week Total</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: RM_GOLD_BRIGHT, lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: "0.01em" }}>{mounted && weeklyPts !== null ? weeklyPts : "—"}</div>
                <div style={{ fontSize: 12, color: "#b0b5c1", marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                  <span>📈</span> /{WEEKLY_MAX} pts max
                </div>
              </div>

              <div style={{ background: "#16192d", border: "1px solid #2d3543", borderRadius: 12, padding: "20px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)" }}>
                <div style={{ fontSize: 12, color: "#757f8f", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>Day Streak</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: RM_GOLD_BRIGHT, lineHeight: 1, display: "flex", alignItems: "center", gap: 4, fontVariantNumeric: "tabular-nums", letterSpacing: "0.01em" }}>
                  {mounted && streak !== null ? streak : "—"}
                  {mounted && streak !== null && streak > 0 && <span>🔥</span>}
                </div>
                <div style={{ fontSize: 12, color: "#b0b5c1", marginTop: 8 }}>Consecutive days</div>
              </div>

              <div style={{ background: "#16192d", border: "1px solid #2d3543", borderRadius: 12, padding: "20px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)" }}>
                <div style={{ fontSize: 12, color: "#757f8f", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>Progress</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: "#00d9ff", lineHeight: 1 }}>{mounted ? overallPct : 0}%</div>
                <div style={{ fontSize: 12, color: "#b0b5c1", marginTop: 8 }}>Today&apos;s completion</div>
              </div>
            </div>

            {/* TODAY'S PROGRESS BAR */}
            <div style={{ background: "#16192d", border: "1px solid #2d3543", borderRadius: 12, padding: "16px", marginBottom: 16, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: "#b0b5c1", fontWeight: 600 }}>Today&apos;s Progress</span>
                <span style={{ fontSize: 13, color: "#ffffff", fontWeight: 700 }}>{mounted ? todayDone : 0} of {habits.length} habits</span>
              </div>
              <div style={{ height: 10, background: "#1f2438", borderRadius: 6, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 6, transition: "width 200ms ease-in-out",
                  width: mounted ? `${overallPct}%` : "0%",
                  background: "linear-gradient(90deg, #ffa500, #00ff88)",
                }} />
              </div>
              <div style={{ fontSize: 11, color: "#757f8f", marginTop: 10, fontWeight: 500 }}>
                ⭐ Perfect Day: tick every habit for +1 bonus pt <span style={{ color: RM_GOLD, fontWeight: 800, letterSpacing: "0.04em" }}>· ¡Vamos!</span>
              </div>
            </div>

            {/* ═══ STRETCH WALLET BALANCE BAR — second in the top block.
                Shows earned/cap when the wallet is unlocked, or a compact locked
                indicator when not (the ONLY place the locked state is announced). ═══ */}
            <div style={{
              background: "#16192d", border: "1px solid #3a2d5a", borderRadius: 12,
              overflow: "hidden", boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
            }}>
            <div style={{ height: 3, background: "linear-gradient(90deg, #a78bfa, #00d9ff)" }} />
            <div style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#a78bfa" }}>🎮 Stretch Wallet</div>
                  <div style={{ fontSize: 11, color: "#757f8f", marginTop: 4, fontWeight: 500 }}>
                    Screen-time bank · 1 stretch point = {STRETCH_MIN_PER_POINT} min · separate from ANSAR FC
                  </div>
                  {mounted && !walletLocked && (
                    <div style={{ fontSize: 11, color: RM_GOLD, marginTop: 6, fontWeight: 800, letterSpacing: "0.04em" }}>
                      ¡Vamos! · screen time unlocked
                    </div>
                  )}
                </div>

                {mounted && walletLocked ? (
                  /* Compact locked indicator — replaces the balance + the old banner */
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 14px", borderRadius: 8,
                    border: "1px solid #3a2d5a", background: "rgba(167,139,250,0.10)",
                    fontSize: 12, color: "#a78bfa", fontWeight: 700,
                  }}>
                    🔒 Finish Morning Habits + Homeschool to unlock
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 36, fontWeight: 800, color: "#a78bfa", lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: "0.01em" }}>
                        {mounted ? stretchBalance : "—"}<span style={{ fontSize: 16, color: "#757f8f", fontWeight: 600 }}> / {STRETCH_DAILY_CAP_MIN} min</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#757f8f", marginTop: 4 }}>
                        {mounted ? `${stretchEarned} earned · ${stretchSpent} spent today` : ""}
                      </div>
                    </div>
                    <button
                      onClick={spendStretch}
                      disabled={!mounted || walletLocked || stretchBalance <= 0}
                      style={{
                        fontSize: 12, fontWeight: 700, flexShrink: 0,
                        color: mounted && stretchBalance > 0 ? "#0f1419" : "#757f8f",
                        background: mounted && stretchBalance > 0 ? "#a78bfa" : "#1f2438",
                        border: `1px solid ${mounted && stretchBalance > 0 ? "#a78bfa" : "#2d3543"}`,
                        padding: "10px 16px", borderRadius: 8,
                        cursor: mounted && stretchBalance > 0 ? "pointer" : "not-allowed",
                        transition: "all 150ms ease-out",
                      }}
                    >
                      Spend {STRETCH_SPEND_STEP_MIN}m
                    </button>
                  </div>
                )}
              </div>

              {/* Cap progress bar — only when unlocked (locked state stays compact) */}
              {!(mounted && walletLocked) && (
                <>
                  <div style={{ height: 8, background: "#1f2438", borderRadius: 4, overflow: "hidden", marginTop: 16 }}>
                    <div style={{
                      height: "100%", borderRadius: 4, transition: "width 200ms ease-in-out",
                      width: mounted ? `${Math.min(100, (stretchEarned / STRETCH_DAILY_CAP_MIN) * 100)}%` : "0%",
                      background: stretchCapReached ? "#00ff88" : "#a78bfa",
                    }} />
                  </div>
                  {mounted && stretchCapReached && (
                    <div style={{ fontSize: 11, color: "#00ff88", marginTop: 8, fontWeight: 600 }}>
                      ✅ Daily cap reached — extra completions still log for the record but don&apos;t add minutes.
                    </div>
                  )}
                </>
              )}
            </div>
            </div>
          </div>

          {/* SLIM STAT ROW — compact, top-of-page companion to the balance bar.
              Reads the SAME state as the fuller row near the tier card below (no
              extra fetch), so the two can never disagree. Kept visually quiet so
              the balance bar stays the primary element. */}
          <div style={{
            display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14,
            padding: "10px 16px", marginBottom: 24, borderRadius: 10,
            background: RM_NAVY, border: `1px solid ${RM_GOLD}33`, fontSize: 12, color: "#e8ebf2",
            fontVariantNumeric: "tabular-nums",
          }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: RM_GOLD, textTransform: "uppercase", letterSpacing: "0.12em" }}>ANSAR FC</span>
            <span><b style={{ color: RM_GOLD_BRIGHT, fontWeight: 800, letterSpacing: "0.02em" }}>{mounted ? todayPts : "—"}</b> pts today{mounted && dayScore.perfect ? " ⭐" : ""}</span>
            <span style={{ color: `${RM_GOLD}55` }}>·</span>
            <span><b style={{ color: RM_GOLD_BRIGHT, fontWeight: 800, letterSpacing: "0.02em" }}>{mounted && weeklyPts !== null ? weeklyPts : "—"}</b> this week</span>
            <span style={{ color: `${RM_GOLD}55` }}>·</span>
            <span><b style={{ color: RM_GOLD_BRIGHT, fontWeight: 800, letterSpacing: "0.02em" }}>{mounted && streak !== null ? streak : "—"}</b> day streak{mounted && streak !== null && streak > 0 ? " 🔥" : ""}</span>
          </div>

          {/* SOFT-LAUNCH NOTICE */}
          {!POINTS_ACTIVE && (
            <div style={{
              background: "rgba(255,165,0,0.1)", border: "1px solid rgba(255,165,0,0.3)",
              borderRadius: 10, padding: "12px 16px", marginBottom: 16,
              fontSize: 12, color: "#ffa500", fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
            }}>
              🟡 Soft-launch week — points are tracked and shown, but rewards don&apos;t count yet. Points activate 13 Jul 2026.
            </div>
          )}

          {/* GATE BLOCKS — Morning Habits + Homeschool must both hit 100% to open the wallet */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, marginBottom: 16 }}>
            {renderBlock(BLOCKS.find(b => b.id === "pre_homeschool")!)}
            {renderBlock(BLOCKS.find(b => b.id === "homeschool")!)}
          </div>

          {/* ═══ STRETCH WALLET (item list) — placed right after Homeschool, the
              moment it becomes relevant. Dimmed + non-interactive while locked. ═══ */}
          <div style={{ background: "#16192d", border: "1px solid #3a2d5a", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", marginBottom: 24 }}>
            <div style={{ height: 3, background: "linear-gradient(90deg, #a78bfa, #00d9ff)" }} />
            <div style={{ padding: "20px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#a78bfa" }}>🎮 Stretch Wallet · earn screen time</div>
              <div style={{ fontSize: 11, color: "#757f8f", marginTop: 4, fontWeight: 500 }}>
                Tap an item once you&apos;ve done it — each adds minutes toward today&apos;s {STRETCH_DAILY_CAP_MIN}-min cap.
              </div>

              {/* Stretch items — live from Notion (/api/stretch-items) */}
              <div style={{
                display: "flex", flexDirection: "column", gap: 8, marginTop: 16,
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
                    <div
                      key={item.id}
                      onClick={() => !isSaving && !walletLocked && !done && earnStretch(item)}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 12, padding: "12px", borderRadius: 8,
                        border: `1px solid ${done ? "#a78bfa50" : "#2d3543"}`,
                        background: done ? "rgba(167,139,250,0.06)" : "#1f2438",
                        opacity: done ? 0.55 : 1,
                        cursor: done ? "default" : "pointer", transition: "all 150ms ease-out", WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                        border: `2px solid ${done ? "#a78bfa" : "#2d3543"}`,
                        background: done ? "#a78bfa" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {isSaving ? <span style={{ fontSize: 10 }}>⏳</span> : done ? <span style={{ fontSize: 12, color: "#0f1419", fontWeight: 700 }}>✓</span> : null}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#ffffff" }}>🧩 {item.name}</span>
                          {item.category && (
                            <span style={{ fontSize: 9, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", background: "rgba(167,139,250,0.12)", padding: "2px 6px", borderRadius: 4 }}>{item.category}</span>
                          )}
                        </div>
                        {item.whatCountsAsDone && (
                          <div style={{ fontSize: 11, color: "#b0b5c1", marginTop: 3, lineHeight: 1.45 }}>
                            ✅ {item.whatCountsAsDone}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: "#757f8f", marginTop: 3 }}>
                          Worth {item.points} pt · +{itemMin} min{done ? ` · earned ${earnedForItem} min today${countForItem > 1 ? ` (×${countForItem})` : ""}` : ""}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 12, fontWeight: 700, flexShrink: 0,
                        color: done ? "#a78bfa" : "#b0b5c1",
                        background: done ? "rgba(167,139,250,0.15)" : "#16192d",
                        padding: "4px 10px", borderRadius: 6,
                        border: `1px solid ${done ? "#a78bfa40" : "#2d3543"}`,
                        whiteSpace: "nowrap",
                      }}>
                        {done ? "✓ Done for today" : "Tap to earn"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* AFTERNOON / EVENING (+ Conditional) — still required for FC points, but
              NOT a gate for the wallet above. Set apart in its own outlined group so
              it doesn't read as "blocking" the wallet. */}
          <div style={{ border: "1px dashed #2d3543", borderRadius: 12, padding: "12px", marginBottom: 24, background: "rgba(255,255,255,0.015)" }}>
            <div style={{ fontSize: 11, color: "#757f8f", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 4px 12px" }}>
              Still required · doesn&apos;t gate the wallet
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
              {renderBlock(BLOCKS.find(b => b.id === "afternoon_evening")!)}
              {renderBlock(BLOCKS.find(b => b.id === "conditional")!)}
            </div>
          </div>

          {/* TOP METRICS ROW + TODAY'S PROGRESS BAR — live in the top block near
              the top of the page (see the top block above the slim stat row),
              first thing on the page, with the balance bar beneath. */}

          {/* ALERTS & STATUS SECTION */}
          <div style={{ marginBottom: 24 }}>
            {mounted && SOCCER_DAYS.includes(dayName) && (
              <div style={{
                background: "rgba(255,165,0,0.1)", border: "1px solid rgba(255,165,0,0.3)",
                borderRadius: 10, padding: "12px 16px", marginBottom: 12,
                fontSize: 12, color: "#ffa500", fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
              }}>
                ⚽ Soccer training day — Conditional block active (+1 pt per session)
              </div>
            )}

            <div style={{
              background: "#16192d", border: `1px solid ${weekThreshold.color}40`,
              borderRadius: 12, padding: "20px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
            }}>
              <div style={{ fontSize: 12, color: "#757f8f", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontWeight: 600 }}>
                This week you&apos;re on track for{!POINTS_ACTIVE && " (preview — not yet enforced)"}
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: weekThreshold.color, marginBottom: 8 }}>{weekThreshold.label}</div>
                  <div style={{ fontSize: 13, color: "#b0b5c1", lineHeight: 1.6 }}>{weekThreshold.desc}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: weekThreshold.color, lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: "0.01em" }}>{mounted && weeklyPts !== null ? weeklyPts : "—"}</div>
                  <div style={{ fontSize: 11, color: "#757f8f", marginTop: 4 }}>/ {WEEKLY_MAX} pts</div>
                </div>
              </div>
            </div>
          </div>

          {/* REWARD TIERS */}
          <div style={{ background: "#16192d", border: "1px solid #2d3543", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)" }}>
            <div style={{ height: 3, background: `linear-gradient(90deg, ${RM_NAVY}, ${RM_GOLD}, #f5f5f5)` }} />
            <div style={{ padding: "20px" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: RM_GOLD, marginBottom: 16, letterSpacing: "0.04em" }}>🏆 Weekly Tiers · ANSAR FC</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                {THRESHOLDS.map((t, i) => {
                  const weekPts = weeklyPts ?? 0;
                  const isActive = mounted && weekPts >= t.min && (i === 0 || weekPts < THRESHOLDS[i - 1].min);
                  const isAchieved = mounted && weekPts >= t.min;
                  return (
                    <div key={t.min} style={{
                      display: "flex", flexDirection: "column", gap: 8,
                      padding: "12px", borderRadius: 8,
                      background: isActive ? t.color + "15" : "#1f2438",
                      border: `1px solid ${isActive ? t.color + "50" : "#2d3543"}`,
                      opacity: isAchieved ? 1 : 0.5,
                      transition: "all 200ms ease-out",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.color, flexShrink: 0, boxShadow: isActive ? `0 0 8px ${t.color}` : "none" }} />
                        <div style={{ fontSize: 12, fontWeight: 700, color: t.color }}>{t.label}</div>
                      </div>
                      <div style={{ fontSize: 10, color: "#757f8f", lineHeight: 1.4 }}>{t.desc}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: t.color, marginTop: 4 }}>{t.min}+ pts</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: "#757f8f", marginTop: 14, fontWeight: 500 }}>
                🔥 Weekly streak bonus: 5 Perfect Days Mon–Fri = +3 pts · Weekly max {WEEKLY_MAX}
              </div>
            </div>
          </div>

          <div style={{ height: 40 }} />
        </div>
      </div>
    </div>
  );
}
