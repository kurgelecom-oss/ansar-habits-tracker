"use client";

/* ════════════════════════════════════════════════════════════════════════════
   /m — MISSION CONTROL, PHONE EDITION.

   One screen, one thumb, read-only. The board at `/` is a kiosk on an iPad and
   is built to be TAPPED: nineteen habit buttons, a wallet, a Push with a parent
   PIN. None of that fits a phone held at a traffic light, and none of it is
   what a phone is for — the question on a phone is "where is he up to", not
   "let me tick that off".

   So this screen RENDERS AND LINKS, and writes nothing. There is no new write
   path here, no second copy of a gate, no PIN field. Every state word on it
   ("LIVE", "Opens 8:30am", "PS5 waits") is the server's own, lifted verbatim
   out of /api/tick's diagnostic and the other read routes the board already
   uses. A tap on anything that could change a fact leaves for the full screen
   that owns it.

   WHICH CLOCK. Every date and weekday on this page comes from the gate payload
   — the server's Australia/Sydney clock, the one the gates are decided against.
   `new Date()` is read in exactly one place, to say when this page last
   refreshed, and nothing is decided from it. Changing the phone's clock changes
   nothing here, which is the same promise the board makes.

   WHAT IT SHOWS, in the order a glance wants it:
     1. the day, the streak, today's points
     2. four tiles: habits, school, football, wallet (Saturday PS5 on weekends)
     3. the one thing that is open right now, and anything missed
     4. today's next school blocks and football sessions
     5. the week: Golden Boot run, school days banked
     6. what the family owes today, and the next match
     7. doors into the eight zones and the full board
   ══════════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { SOCCER_DAYS, scoreDay } from "../lib/scoring";
// The squad week, Mon–Fri. Points are a WEEKDAY scale: Saturday scores
// nothing and Sunday schedules nothing, so neither day may be shown out of 10.
import { SQUAD_DAYS } from "../lib/goldenBoot";
import { calculateStreak, STREAK_LOOKBACK_DAYS } from "../lib/streak";
import { addDays, weekStartOf } from "../lib/time";
import { scoringHabits } from "../lib/days";
import { saturdayPs5 } from "../lib/weekend";
import { noticesFor, openNotices, type Notice, type NoticeState } from "../lib/notices";
import { footballPillar, schoolPillar, type PillarSummary, type SchoolWeek } from "../dashboard/pillars";
import { planFor } from "../pathway/data/week";
import {
  blockRolls, completedIds, countTone, daysBehind, fraction, habitRoll,
  type MobileHabit, type Tone,
} from "./model";
import styles from "./mobile.module.css";

/* ── What the read routes give back ────────────────────────────────────────
   Declared structurally, exactly as page.tsx declares its own view of the same
   payloads: the routes' own types live in server-only modules, and importing
   them would pull NOTION_TOKEN's module graph into this bundle. */

type ServerTime = { timeZone: string; date: string; weekday: string; clock: string };

type Gate = {
  ok: boolean;
  serverTime: ServerTime;
  restDay?: boolean;
  habits: MobileHabit[];
  habitsError: string | null;
  notionConfigured: boolean;
  serviceRoleConfigured: boolean;
};

type Wallet = {
  available: boolean; unlocked: boolean; lockMessage: string | null;
  itemsDone: number; itemsTotal: number; complete: boolean; rewardLabel: string;
};

type Boot = { ok: boolean; target: number; streak: number; progress: number };

type Pathway = {
  done?: string[];
  nextMatch?: { date: string; opponent: string; isHome: boolean; ground: string; round: string | number } | null;
};

type Lock =
  | { locked: false; facts?: NoticeState["facts"]; unlocked?: boolean }
  | { locked: true; message: string; due: { id: string; kind: string; title: string }[]; facts?: NoticeState["facts"]; unlocked?: boolean };

type SchoolWeekPayload = SchoolWeek & {
  configured: boolean; upcoming: boolean; syncedAt?: string | null;
  totals?: { blocks: number; done: number };
};

/** Habit history, reduced to the two things this screen needs from it. */
type History = { streak: number | null; schoolDays: number | null };

/* ── The eight zones ───────────────────────────────────────────────────────
   Written down here rather than imported from app/os/data: ZONE_OS carries
   seven full curricula — weeks, libraries, heroes, seasons — and pulling it
   into a phone bundle to read eight icons would be the most expensive label
   lookup in the repo. /targets keeps its own copy for the same reason. If a
   zone is ever renamed, both lists move together. */
const ZONES: { href: string; icon: string; label: string }[] = [
  { href: "/pathway",      icon: "⚽",  label: "Football" },
  { href: "/os/scholar",   icon: "📚",  label: "Learning" },
  { href: "/os/languages", icon: "🗣️", label: "Languages" },
  { href: "/os/quran",     icon: "☪️", label: "Qur'an" },
  { href: "/os/digital",   icon: "⌘",   label: "Digital" },
  { href: "/os/outdoors",  icon: "⛺",  label: "Outdoors" },
  { href: "/os/combat",    icon: "🥊",  label: "Boxing" },
  { href: "/os/chess",     icon: "♞",  label: "Chess" },
];

/** The blocks, in the order the day runs. Labels match the board's. */
const BLOCK_LABEL: Record<string, string> = {
  pre_homeschool: "Morning",
  homeschool: "Homeschool",
  afternoon_evening: "Afternoon",
  conditional: "Training",
  saturday_push: "Push",
};
const BLOCK_ORDER = ["pre_homeschool", "homeschool", "afternoon_evening", "conditional", "saturday_push"];

/** How often the screen re-reads the server. A glance should not be stale. */
const REFRESH_MS = 60_000;

const json = async <T,>(url: string): Promise<T | null> => {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
};

export default function MobileMissionControl() {
  const [gate, setGate] = useState<Gate | null>(null);
  const [week, setWeek] = useState<SchoolWeekPayload | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [boot, setBoot] = useState<Boot | null>(null);
  const [pathway, setPathway] = useState<Pathway | null>(null);
  const [lock, setLock] = useState<Lock | null>(null);
  const [history, setHistory] = useState<History>({ streak: null, schoolDays: null });
  const [online, setOnline] = useState(true);
  /** Display only. Nothing on this page is decided from the device's clock. */
  const [refreshedAt, setRefreshedAt] = useState<string>("");
  const [loading, setLoading] = useState(true);

  /**
   * The habit history, for the streak and for how many school days this week
   * have been banked. ONE query feeds both: sixty days is what lib/streak.ts is
   * willing to walk, and this week is inside it.
   *
   * Read with the anon key, which after db/tick_hardening.sql can SELECT and
   * nothing else — the same read the board makes. `today` is the SERVER's
   * Sydney date, so the arithmetic below never asks this phone what day it is.
   */
  const loadHistory = useCallback(async (today: string) => {
    const { data, error } = await supabase
      .from("habit_completions")
      .select("habit_id, completed_date")
      .gte("completed_date", addDays(today, -STREAK_LOOKBACK_DAYS))
      .lte("completed_date", today);
    if (error || !data) return;

    const counts: Record<string, number> = {};
    const byDate: Record<string, Set<string>> = {};
    for (const row of data as { habit_id: string; completed_date: string }[]) {
      counts[row.completed_date] = (counts[row.completed_date] || 0) + 1;
      (byDate[row.completed_date] ??= new Set()).add(row.habit_id);
    }

    // Rule 1 of lib/weekend.ts, counted the way the board counts it: Mon–Fri of
    // this week BY DATE, and `homeschool_session` is the row that says school
    // was finished. A Saturday full of ticks is not a school day.
    const start = weekStartOf(today);
    const schoolDays = [0, 1, 2, 3, 4]
      .map(i => addDays(start, i))
      .filter(d => byDate[d]?.has("homeschool_session")).length;

    setHistory({ streak: calculateStreak(counts, today), schoolDays });
  }, []);

  const load = useCallback(async () => {
    const g = await json<Gate>("/api/tick");
    setGate(g);
    setLoading(false);
    setRefreshedAt(new Intl.DateTimeFormat("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()));

    const date = g?.serverTime?.date ?? null;
    await Promise.all([
      json<SchoolWeekPayload>("/api/school-week").then(setWeek),
      json<Wallet>("/api/stretch").then(setWallet),
      json<Boot>("/api/golden-boot").then(setBoot),
      json<Lock>("/api/assessments/gate").then(setLock),
      date ? json<Pathway>(`/api/pathway?date=${date}`).then(setPathway) : Promise.resolve(),
      date ? loadHistory(date) : Promise.resolve(),
    ]);
  }, [loadHistory]);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    // A phone screen comes back from a pocket far more often than it is
    // refreshed on purpose, so coming into view is itself a reason to re-read.
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [load]);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);

  /* ── Everything below is derived. No state, no clock. ─────────────────── */

  /* "The gate answered" is ok:true WITH a server clock, not a 200. A route that
     returns { ok: false } has told us nothing about today, and an empty habits
     array then means "we never heard", not "nothing is scheduled" — the same
     distinction lib/weekend.ts makes about an empty Saturday Push, and the one
     thing a glance screen must never get wrong. */
  const answered = gate?.ok === true && !!gate.serverTime;
  const serverTime = answered ? gate!.serverTime : null;
  const date = serverTime?.date ?? null;
  const weekday = serverTime?.weekday ?? null;
  const restDay = gate?.restDay === true;
  const habits = answered ? (gate!.habits ?? []) : [];
  const roll = habitRoll(habits);

  // Today's points, off the gate's OWN done states — so the number on the phone
  // cannot disagree with the buttons on the board. Prerequisites are dropped
  // from both id lists, exactly as page.tsx drops them.
  const scored = scoringHabits(habits);
  const score = weekday
    ? scoreDay(
        completedIds(habits),
        weekday,
        scored.filter(h => h.block === "pre_homeschool").map(h => h.id),
        scored.filter(h => h.block !== "conditional").map(h => h.id),
      )
    : null;
  const scoreMax = weekday && SOCCER_DAYS.includes(weekday) ? 11 : 10;

  // Rule 1 and rule 2 of lib/weekend.ts need the Push rows; the third stat
  // needs them too, so they are resolved once here.
  const push = habits.filter(h => h.block === "saturday_push");
  const pushDone = push.filter(h => h.state === "DONE").length;

  /* The third stat changes with the day, because the thing worth knowing does.
     Mon–Fri it is the day's points out of 10 (11 on a training day). Saturday
     has no points at all — the Push is what is being counted — and Sunday
     counts nothing. Printing "0/10" on a Saturday would read as a failed day
     rather than a day that is not scored. */
  const thirdStat = weekday === null ? { value: "—", label: "points" }
    : SQUAD_DAYS.includes(weekday) ? { value: score === null ? "—" : `${score.total}/${scoreMax}`, label: "points" }
    : weekday === "Saturday" ? { value: push.length === 0 ? "—" : `${pushDone}/${push.length}`, label: "push" }
    : { value: "—", label: "rest day" };

  const school: PillarSummary | null = week && week.configured && Array.isArray(week.days) && week.days.length > 0
    ? schoolPillar(week)
    : null;
  const football: PillarSummary | null = weekday
    ? footballPillar(planFor(weekday), pathway?.done ?? [])
    : null;

  /* Rule 1 and rule 2 of lib/weekend.ts, met or not. SATURDAY ONLY — the
     verdict is about the Push, and the Push rows exist on exactly one day.
     Drawing it on Sunday would report "not loaded" against rows that were
     never scheduled, and Sunday is a day the board itself switches off. */
  const ps5 = weekday === "Saturday"
    ? saturdayPs5(history.schoolDays ?? 0, pushDone, push.length)
    : null;

  // The clearing rules are the board's own: a notice goes away when the thing
  // it asks for is visibly done. `done` is empty here on purpose — the per-day
  // ticks live in the board's localStorage, which this phone is not.
  const notices: Notice[] = date
    ? openNotices(noticesFor(date), {
        unlocked: lock?.unlocked === true,
        facts: lock?.facts ?? null,
        done: [],
      })
    : [];

  const behind = daysBehind(week?.syncedAt, date ?? "");

  const tiles: { id: string; icon: string; label: string; value: string; detail: string; tone: Tone; href: string }[] = [
    {
      id: "habits", icon: "✅", label: "Habits", href: "/",
      value: !answered || roll.total === 0 ? "—" : fraction(roll.done, roll.total),
      detail: !answered ? "no answer"
        : restDay ? "rest day"
        : roll.total === 0 ? "none scheduled"
        : roll.missed.length > 0 ? `${roll.missed.length} missed`
        : roll.live.length > 0 ? `${roll.live.length} open now`
        : roll.done === roll.total ? "all done" : "waiting",
      tone: answered ? roll.tone : "off",
    },
    {
      id: "school", icon: "🎓", label: "School", href: "/school",
      value: school ? fraction(school.done, school.total) : "—",
      detail: school === null ? (week === null ? "no answer" : "not loaded")
        : school.total === 0 ? "no blocks today"
        : school.done === school.total ? "all done" : `${school.total - school.done} to go`,
      tone: school === null ? "off" : countTone(school.done, school.total),
    },
    {
      id: "football", icon: "⚽", label: "Football", href: "/pathway",
      value: football ? fraction(football.done, football.total) : "—",
      detail: football === null ? "—"
        : football.total === 0 ? "rest day"
        : football.subtitle,
      tone: football === null ? "off" : countTone(football.done, football.total),
    },
    ps5
      ? {
          id: "ps5", icon: "🎮", label: "Saturday PS5", href: "/",
          value: ps5.ready ? "ON" : "OFF",
          detail: ps5.weekUnlocked ? `Push ${ps5.pushDone}/${ps5.pushTotal}` : "week not earned",
          tone: ps5.ready ? "done" : ps5.weekUnlocked ? "wait" : "missed",
        }
      : {
          id: "wallet", icon: "🎁", label: "Wallet", href: "/",
          value: wallet ? fraction(wallet.itemsDone, wallet.itemsTotal) : "—",
          detail: wallet === null ? "no answer"
            : !wallet.available ? "closed today"
            : wallet.complete ? wallet.rewardLabel
            : wallet.unlocked ? "earning"
            : "locked",
          tone: wallet === null ? "off"
            : !wallet.available ? "off"
            : wallet.complete ? "done"
            : wallet.unlocked ? "live" : "wait",
        },
  ];

  const blocks = blockRolls(habits, BLOCK_ORDER);

  return (
    <main className={styles.phone} aria-label="ANSAR OS mission control">
      <header className={styles.top}>
        <div className={styles.mark}>
          <span className={styles.crest} aria-hidden="true">♛</span>
          <span className={styles.markText}>
            <strong>ANSAR OS</strong>
            <small>Mission control</small>
          </span>
        </div>
        <div className={styles.topRight}>
          {serverTime ? (
            <span className={styles.clock} title="Server clock — every gate uses this">
              {serverTime.clock.slice(0, 5)}
            </span>
          ) : null}
          <span className={styles.conn}>
            <span className={online ? styles.dotLive : styles.dotOff} aria-hidden="true" />
            {online ? "Live" : "Offline"}
          </span>
        </div>
      </header>

      {/* A due paper covers the whole board. On a phone it is the first thing
          worth knowing, so it sits above everything and says what is owed. */}
      {lock?.locked ? (
        <section className={styles.alert} aria-label="Paper due">
          <h2>Paper due</h2>
          <p>{lock.message}</p>
          <ul>{lock.due.map(p => <li key={p.id}>{p.kind === "exam" ? "📝" : "🧾"} {p.title}</li>)}</ul>
          <Link href="/tests" className={styles.alertLink}>Open Tests →</Link>
        </section>
      ) : null}

      {/* ── 1. The day ───────────────────────────────────────────────── */}
      <section className={styles.day} aria-label="Today">
        <p className={styles.dayName}>
          {serverTime ? `${serverTime.weekday} · ${serverTime.date}` : loading ? "Reading the board…" : "The board did not answer"}
        </p>
        <div className={styles.dayStats}>
          <span className={styles.stat}>
            <b>{roll.total === 0 ? "—" : `${roll.percent}%`}</b>
            <small>today</small>
          </span>
          <span className={styles.stat}>
            <b>{history.streak === null ? "—" : history.streak}</b>
            <small>🔥 streak</small>
          </span>
          <span className={styles.stat}>
            <b>{thirdStat.value}</b>
            <small>{thirdStat.label}</small>
          </span>
        </div>
        <div className={styles.bar} role="img" aria-label={`${roll.percent}% of today's habits done`}>
          <span className={styles.barFill} style={{ width: `${roll.percent}%` }} />
        </div>
        {score?.perfect ? <p className={styles.perfect}>★ Perfect day</p> : null}
      </section>

      {/* ── 2. Four tiles ────────────────────────────────────────────── */}
      <section className={styles.tiles} aria-label="Status">
        {tiles.map(t => (
          <Link key={t.id} href={t.href} className={styles.tile} data-tone={t.tone} data-testid="m-tile">
            <span className={styles.tileTop}><span aria-hidden="true">{t.icon}</span>{t.label}</span>
            <strong className={styles.tileValue}>{t.value}</strong>
            <small className={styles.tileDetail}>{t.detail}</small>
          </Link>
        ))}
      </section>

      {/* ── 3. Right now ─────────────────────────────────────────────── */}
      <section className={styles.card} aria-label="Right now">
        <h2 className={styles.cardTitle}>Right now</h2>
        {!answered ? (
          <p className={styles.quiet}>{loading ? "Reading the gate…" : "The gate did not answer, so nothing here is today's."}</p>
        ) : restDay ? (
          <p className={styles.quiet}>Sunday is a rest day. Nothing is scheduled and nothing can be ticked.</p>
        ) : roll.total === 0 ? (
          <p className={styles.quiet}>
            {gate?.habitsError ? `Habits could not be read: ${gate.habitsError}` : "Nothing is scheduled today."}
          </p>
        ) : roll.next === null ? (
          <p className={styles.done}>Every habit done today. ✅</p>
        ) : (
          <div className={styles.now} data-state={roll.next.state}>
            <span className={styles.nowState}>{roll.next.state}</span>
            <strong className={styles.nowName}>{roll.next.name}</strong>
            <span className={styles.nowMeta}>
              {roll.next.label}
              {roll.next.window ? ` · ${roll.next.window}` : ""}
            </span>
            {roll.next.message ? <p className={styles.nowMessage}>{roll.next.message}</p> : null}
          </div>
        )}

        {blocks.length > 0 ? (
          <ul className={styles.blocks} aria-label="Blocks today">
            {blocks.map(b => (
              <li key={b.block} data-tone={b.tone}>
                <span>{BLOCK_LABEL[b.block] ?? b.block}</span>
                <b>{b.done}/{b.total}</b>
              </li>
            ))}
          </ul>
        ) : null}

        {roll.missed.length > 0 ? (
          <div className={styles.missed} aria-label="Missed today">
            <h3>Missed · {roll.missed.length}</h3>
            <ul>{roll.missed.map(h => <li key={h.id}>{h.name}{h.window ? <small> · {h.window}</small> : null}</li>)}</ul>
          </div>
        ) : null}
      </section>

      {/* ── 4. The two academies ─────────────────────────────────────── */}
      <section className={styles.card} aria-label="School today">
        <h2 className={styles.cardTitle}>
          School
          {school ? <span className={styles.cardCount}>{school.done}/{school.total}</span> : null}
        </h2>
        {school === null ? (
          <p className={styles.quiet}>{week === null ? "The school week did not answer." : "No school week is loaded."}</p>
        ) : (
          <>
            <p className={styles.cardSub}>{school.subtitle}</p>
            {school.rows.length > 0 ? (
              <ol className={styles.rows}>
                {school.rows.map((r, i) => (
                  <li key={r.id}>
                    <span className={styles.rowHead}>
                      <b>{r.title}</b>
                      {i === 0 ? <em>next</em> : null}
                      {r.meta ? <small>{r.meta}</small> : null}
                    </span>
                    {r.detail ? <p>{r.detail}</p> : null}
                  </li>
                ))}
              </ol>
            ) : null}
            {school.note ? <p className={styles.quiet}>{school.note}</p> : null}
            {week?.upcoming ? <p className={styles.quiet}>This is next week — the board is back Monday.</p> : null}
            {behind !== null && behind > 0 ? (
              <p className={styles.quiet}>Snapshot is {behind} day{behind === 1 ? "" : "s"} old — a week edited today arrives tonight.</p>
            ) : null}
          </>
        )}
        <Link href="/school" className={styles.cardLink}>Open School →</Link>
      </section>

      <section className={styles.card} aria-label="Football today">
        <h2 className={styles.cardTitle}>
          Football
          {football ? <span className={styles.cardCount}>{football.done}/{football.total}</span> : null}
        </h2>
        {football === null ? (
          <p className={styles.quiet}>Waiting on the server's weekday.</p>
        ) : (
          <>
            <p className={styles.cardSub}>{football.subtitle}</p>
            {football.rows.length > 0 ? (
              <ol className={styles.rows}>
                {football.rows.map((r, i) => (
                  <li key={r.id}>
                    <span className={styles.rowHead}>
                      <b>{r.title}</b>
                      {i === 0 ? <em>next</em> : null}
                      {r.meta ? <small>{r.meta}</small> : null}
                    </span>
                    {r.detail ? <p>{r.detail}</p> : null}
                  </li>
                ))}
              </ol>
            ) : null}
            {football.note ? <p className={styles.quiet}>{football.note}</p> : null}
            {pathway?.nextMatch ? (
              <p className={styles.match}>
                Next match · {pathway.nextMatch.isHome ? "vs" : "at"} {pathway.nextMatch.opponent}
                <small> {pathway.nextMatch.date.slice(0, 10)} · {pathway.nextMatch.ground}</small>
              </p>
            ) : null}
          </>
        )}
        <Link href="/pathway" className={styles.cardLink}>Open Football →</Link>
      </section>

      {/* ── 5. The week ──────────────────────────────────────────────── */}
      <section className={styles.card} aria-label="This week">
        <h2 className={styles.cardTitle}>This week</h2>
        <ul className={styles.weekList}>
          <li>
            <span>School days banked</span>
            <b>{history.schoolDays === null ? "—" : `${history.schoolDays}/5`}</b>
          </li>
          <li>
            <span>School blocks done</span>
            <b>{week?.totals ? `${week.totals.done}/${week.totals.blocks}` : "—"}</b>
          </li>
          <li>
            <span>Golden Boot run</span>
            <b>{boot?.ok ? `${boot.progress}/${boot.target}` : "—"}</b>
          </li>
          <li>
            <span>Full weeks in a row</span>
            <b>{boot?.ok ? boot.streak : "—"}</b>
          </li>
        </ul>
        {ps5 ? <p className={styles.ps5}>{ps5.message}</p> : null}
        <Link href="/progress" className={styles.cardLink}>Open Progress →</Link>
      </section>

      {/* ── 6. What the family owes today ────────────────────────────── */}
      {notices.length > 0 ? (
        <section className={styles.card} aria-label="Noticeboard">
          <h2 className={styles.cardTitle}>
            Notices
            <span className={styles.cardCount}>{notices.length}</span>
          </h2>
          <ul className={styles.notices}>
            {notices.slice(0, 4).map(n => (
              <li key={n.text}><strong>{n.who}</strong> {n.text}</li>
            ))}
          </ul>
          {notices.length > 4 ? (
            <p className={styles.quiet}>{notices.length - 4} more on the board. Ticking one off happens there.</p>
          ) : null}
        </section>
      ) : null}

      {/* ── 7. Doors ─────────────────────────────────────────────────── */}
      <section className={styles.card} aria-label="Zones">
        <h2 className={styles.cardTitle}>Zones</h2>
        <div className={styles.zones}>
          {ZONES.map(z => (
            <Link key={z.href} href={z.href} className={styles.zone}>
              <span aria-hidden="true">{z.icon}</span>{z.label}
            </Link>
          ))}
        </div>
      </section>

      <footer className={styles.foot}>
        <Link href="/" className={styles.full}>Open the full board →</Link>
        <p>
          Read-only. Ticks, PINs and the Push live on the board.
          {serverTime ? ` Gates run on ${serverTime.timeZone}.` : ""}
          {refreshedAt ? ` Refreshed ${refreshedAt}.` : ""}
        </p>
        {gate && !gate.serviceRoleConfigured ? <p className={styles.warn}>This deploy has no service role — some numbers will read “—”.</p> : null}
      </footer>
    </main>
  );
}
