"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WEEK, WEEKLY_CAP_HOURS, checklistFor, formatTime, planFor, weeklyLoadMinutes, type DayPlan } from "../data/week";
import { MONTH_FOCUS } from "../data/scouts";
import { SEASON, fixtureOn, kickoff, opponentOf } from "../data/matches";
import { drillById } from "../data/drills";
import { ALWAYS, ASK_MUM, MUM_ROLE, NEVER } from "../data/lifestyle";
import { GreenBall, SECTIONS } from "./ui";
import { todayMelbourne, usePathwayStore } from "./usePathwayStore";
import styles from "../pathway.module.css";

const WEEKDAY_FMT = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", weekday: "long" });
const MONTH_FMT = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", month: "long" });
const CLOCK_FMT = new Intl.DateTimeFormat("en-GB", { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit", hour12: false });
const toMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

/* ── Calendar reminders: one weekly-repeating event per session, 10-min alarm ── */
const BYDAY: Record<string, string> = { Monday: "MO", Tuesday: "TU", Wednesday: "WE", Thursday: "TH", Friday: "FR", Saturday: "SA", Sunday: "SU" };
function nextDateFor(day: string): string {
  const idx = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(day);
  const d = new Date();
  d.setDate(d.getDate() + ((idx - d.getDay() + 7) % 7));
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
export function buildIcs(week: DayPlan[] = WEEK): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ANSAR FC//Football Pathway//EN", "CALSCALE:GREGORIAN"];
  for (const day of week) for (const s of day.sessions) {
    if (s.kind === "rest") continue;
    const start = s.start.replace(":", "") + "00";
    const endMin = toMin(s.start) + Math.max(s.minutes, 10);
    const end = `${String(Math.floor(endMin / 60)).padStart(2, "0")}${String(endMin % 60).padStart(2, "0")}00`;
    const date = nextDateFor(day.day);
    lines.push("BEGIN:VEVENT", `UID:pathway-${s.id}-${day.day}@ansar-fc`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
      `DTSTART;TZID=Australia/Melbourne:${date}T${start}`, `DTEND;TZID=Australia/Melbourne:${date}T${end}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[day.day]}`, `SUMMARY:⚽ ${s.title}`, `DESCRIPTION:${s.what.join(" · ").replace(/[,;]/g, " ")}`,
      "BEGIN:VALARM", "TRIGGER:-PT10M", "ACTION:DISPLAY", `DESCRIPTION:${s.title} in 10 minutes`, "END:VALARM", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
function downloadIcs() {
  const blob = new Blob([buildIcs()], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ansar-football-pathway.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function TodayBoard() {
  const [today] = useState(todayMelbourne);
  const [weekday, setWeekday] = useState<string | null>(null);
  const [nowMin, setNowMin] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [focusDraft, setFocusDraft] = useState("");
  const { state, toggle, saveFocus } = usePathwayStore(today);

  useEffect(() => {
    const tick = () => { const d = new Date(); setWeekday(WEEKDAY_FMT.format(d)); setNowMin(toMin(CLOCK_FMT.format(d))); };
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  if (!weekday) return <p className={styles.muted} style={{ padding: 30 }}>Warming up…</p>;

  const plan = planFor(weekday);
  const viewing = planFor(selected ?? weekday);
  const checklist = checklistFor(plan);
  const done = state.done.filter(id => checklist.some(c => c.id === id));
  const pct = checklist.length ? Math.round((done.length / checklist.length) * 100) : 0;
  const next = plan.sessions.find(s => s.kind !== "rest" && toMin(s.start) + s.minutes > nowMin && !state.done.includes(s.id));
  const month = MONTH_FOCUS.find(m => m.month === MONTH_FMT.format(new Date()));
  const monthDrill = month ? drillById(month.drill) : undefined;
  const loadH = (weeklyLoadMinutes() / 60).toFixed(1);
  const isWeekday = !["Saturday", "Sunday"].includes(weekday);
  const matchToday = fixtureOn(SEASON.fixtures, today);

  return (
    <>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div>
            <p className={styles.kicker}>ANSAR FC · THE FOOTBALL PATHWAY · {weekday.toUpperCase()}</p>
            <h1 className={styles.title}>{plan.theme}</h1>
            <p className={styles.lead}>{plan.headline}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              {next ? <span className={`${styles.pill} ${styles.pillLime}`}>⏭ Next: {next.icon} {next.title} · {formatTime(next.start)}</span> : <span className={`${styles.pill} ${styles.pillLime}`}>{plan.sessions.every(s => s.kind === "rest" || state.done.includes(s.id)) ? "✅ Every session done today" : "🌙 Session times are over — tick what you really did"}</span>}
              {plan.treatWindow ? <span className={`${styles.pill} ${styles.pillGold}`}>🍕 Treat window today</span> : null}
              <span className={styles.pill}>🌙 Lights out {plan.lightsOut}</span>
              {matchToday ? <Link href="/pathway/matches" className={`${styles.pill} ${styles.pillGold}`} style={{ textDecoration: "none" }}>🏟️ MATCH DAY · {matchToday.isHome ? "vs" : "@"} {opponentOf(matchToday)} · {kickoff(matchToday.date)}</Link> : null}
            </div>
          </div>
          <div className={styles.scoreboard} aria-label={`${done.length} of ${checklist.length} done`}>
            <small>Today&apos;s score</small>
            <span className={styles.score}>{done.length}<span style={{ color: "#6d7a82" }}>–</span>{checklist.length}</span>
            <GreenBall size={30} spin={pct === 100} />
            <small>{pct === 100 ? "FULL TIME · PERFECT DAY" : `${pct}% complete`}</small>
          </div>
        </div>
      </header>

      <div className={styles.grid2}>
        <section className={styles.card} aria-labelledby="plan-h">
          <p className={styles.kicker}>Match-day timeline</p>
          <h2 id="plan-h">Today&apos;s plan</h2>
          <div className={styles.timeline}>
            {plan.sessions.map((s, i) => (
              <div key={s.id}>
                {isWeekday && i === 1 ? <div className={styles.homeschoolBand} style={{ marginBottom: 10 }}><span className={styles.slotTime}>8:30</span><span aria-hidden="true">📚</span><span><b>Homeschool until 1:30pm.</b> Football waits. Champions finish their work first.</span></div> : null}
                <div className={`${styles.slot} ${next?.id === s.id ? styles.slotNext : ""}`}>
                  <span className={styles.slotTime}>{formatTime(s.start)}</span>
                  <span className={styles.slotIcon} aria-hidden="true">{s.icon}</span>
                  <div>
                    <h3>{s.title}{s.minutes ? <span className={styles.muted} style={{ fontWeight: 600, fontSize: 13 }}> · {s.minutes} min</span> : null}</h3>
                    <ul>{s.what.map(w => <li key={w}>{w}</li>)}</ul>
                    {s.href ? <Link href={s.href}>Open the drills →</Link> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.card} aria-labelledby="check-h">
          <p className={styles.kicker}>Tick it when it&apos;s real</p>
          <h2 id="check-h">Today&apos;s checklist</h2>
          <div className={styles.bar} style={{ marginBottom: 14 }}><div className={styles.barFill} style={{ width: `${pct}%` }} /></div>
          <div className={styles.checks}>
            {checklist.map(c => {
              const on = state.done.includes(c.id);
              return (
                <button key={c.id} type="button" className={`${styles.check} ${on ? styles.checkDone : ""}`} aria-pressed={on} onClick={() => toggle(c.id)} disabled={state.storage === "loading"}>
                  <span className={styles.checkBox} aria-hidden="true">{on ? "✓" : c.icon}</span>
                  <span className={styles.checkLabel}>{c.label}{c.detail ? <><br /><span className={styles.checkDetail}>{c.detail}</span></> : null}</span>
                </button>
              );
            })}
          </div>
          <p className={styles.storageNote}>{state.storage === "supabase" ? "✅ Saved to your record — Mum sees this in Nihal OS." : state.storage === "local" ? "📱 Saved on this device for now (the Pathway database isn't switched on yet)." : "Loading your ticks…"}</p>
        </section>
      </div>

      <div className={styles.grid3} style={{ marginTop: 14 }}>
        <section className={styles.card}>
          <p className={styles.kicker}>🤝 From your agent (Mum)</p>
          <h3>This week&apos;s ONE focus</h3>
          {state.focus ? <p className={styles.bigQuote}>&ldquo;{state.focus}&rdquo;</p> : <p className={styles.muted}>Set at Sunday&apos;s agent meeting. Nothing set yet.</p>}
          <form className={styles.focusForm} onSubmit={e => { e.preventDefault(); saveFocus(focusDraft); setFocusDraft(""); }}>
            <label className="sr-only" htmlFor="focus-in">This week&apos;s focus</label>
            <input id="focus-in" className={styles.input} placeholder="e.g. Scan before every receive" value={focusDraft} onChange={e => setFocusDraft(e.target.value)} maxLength={140} />
            <button className={styles.btn} type="submit">Set</button>
          </form>
        </section>
        <section className={styles.card}>
          <p className={styles.kicker}>📅 This month</p>
          <h3>{month?.focus ?? "Keep building"}</h3>
          {monthDrill ? <p className={styles.muted}>Signature drill: <Link href={`/pathway/drills#${monthDrill.id}`} style={{ color: "var(--pw-lime)" }}>{monthDrill.name} →</Link></p> : null}
          <Link href="/pathway/season" className={`${styles.btn} ${styles.btnGhost}`}>See the year</Link>
        </section>
        <section className={styles.card}>
          <p className={styles.kicker}>⏰ Reminders</p>
          <h3>Put the week in your calendar</h3>
          <p className={styles.muted}>Every session repeats weekly with a 10-minute reminder. Open the file on the iPad or phone and tap Add.</p>
          <button type="button" className={styles.btn} onClick={downloadIcs}>🔔 Add reminders</button>
        </section>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>The week</h2><span className={styles.muted}>{loadH} h of football · cap {WEEKLY_CAP_HOURS} h (1 hour per year of age)</span></div>
        <div className={styles.weekStrip}>
          {WEEK.map(d => (
            <button key={d.day} type="button" className={`${styles.dayChip} ${d.day === weekday ? styles.dayChipToday : ""} ${selected === d.day ? styles.dayChipSelected : ""}`} onClick={() => setSelected(selected === d.day ? null : d.day)} aria-pressed={selected === d.day}>
              <b>{d.day.slice(0, 3)}</b><span aria-hidden="true">{d.sessions.find(s => s.kind !== "touches")?.icon ?? "⚽"}</span><small>{d.theme}</small>
            </button>
          ))}
        </div>
        {selected ? (
          <div className={styles.card} style={{ marginTop: 10 }}>
            <h3>{viewing.day}: {viewing.theme}</h3>
            <ul className={styles.list}>{viewing.sessions.map(s => <li key={s.id}>{formatTime(s.start)} · {s.icon} {s.title}{s.minutes ? ` (${s.minutes} min)` : ""}</li>)}</ul>
            <p className={styles.small}><b>Fuel:</b> <span className={styles.muted}>{viewing.fuel}</span></p>
          </div>
        ) : null}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>The pathway</h2></div>
        <nav className={styles.tiles} aria-label="Pathway sections">
          {SECTIONS.filter(s => s.href !== "/pathway").map(s => <Link key={s.href} href={s.href} className={styles.tile}><i aria-hidden="true">{s.icon}</i><b>{s.label}</b><small>{s.blurb}</small></Link>)}
        </nav>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>🤝 Mum&apos;s corner — your agent</h2></div>
        <div className={styles.card}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>{MUM_ROLE.map(r => <span key={r.text} className={styles.pill}>{r.icon} {r.text}</span>)}</div>
          <div className={styles.rules3}>
            <div className={styles.ruleCol}><h4>✅ Always</h4><ul className={styles.list}>{ALWAYS.map(x => <li key={x}>{x}</li>)}</ul></div>
            <div className={`${styles.ruleCol} ${styles.ruleColNo}`}><h4>⛔ Never</h4><ul className={styles.list}>{NEVER.map(x => <li key={x}>{x}</li>)}</ul></div>
            <div className={`${styles.ruleCol} ${styles.ruleColAsk}`}><h4>🙋 Ask Mum first</h4><ul className={styles.list}>{ASK_MUM.map(x => <li key={x}>{x}</li>)}</ul></div>
          </div>
        </div>
      </section>
    </>
  );
}
