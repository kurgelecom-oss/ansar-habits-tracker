"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { todayMelbourne } from "../../pathway/components/usePathwayStore";
import type { OsDay, ZoneOS } from "../data/types";
import { formatTime, type Section } from "./sections";
import { useZoneStore } from "./useZoneStore";
import styles from "../../pathway/pathway.module.css";
import zoneStyles from "../os.module.css";

const WEEKDAY_FMT = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", weekday: "long" });
const MONTH_FMT = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", month: "long" });
const CLOCK_FMT = new Intl.DateTimeFormat("en-GB", { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit", hour12: false });
const toMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

/* Calendar reminders: one weekly-repeating event per session, 10-min alarm. */
const BYDAY: Record<string, string> = { Monday: "MO", Tuesday: "TU", Wednesday: "WE", Thursday: "TH", Friday: "FR", Saturday: "SA", Sunday: "SU" };
function nextDateFor(day: string): string {
  const idx = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(day);
  const d = new Date();
  d.setDate(d.getDate() + ((idx - d.getDay() + 7) % 7));
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
function downloadIcs(os: ZoneOS) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//ANSAR OS//${os.shortName}//EN`, "CALSCALE:GREGORIAN"];
  for (const day of os.week) for (const s of day.sessions) {
    const endMin = toMin(s.start) + Math.max(s.minutes, 10);
    const end = `${String(Math.floor(endMin / 60)).padStart(2, "0")}${String(endMin % 60).padStart(2, "0")}00`;
    const date = nextDateFor(day.day);
    lines.push("BEGIN:VEVENT", `UID:os-${os.id}-${s.id}@ansar-os`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
      `DTSTART;TZID=Australia/Melbourne:${date}T${s.start.replace(":", "")}00`, `DTEND;TZID=Australia/Melbourne:${date}T${end}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[day.day]}`, `SUMMARY:${s.icon} ${s.title}`, `DESCRIPTION:${s.what.join(" · ").replace(/[,;]/g, " ")}`,
      "BEGIN:VALARM", "TRIGGER:-PT10M", "ACTION:DISPLAY", `DESCRIPTION:${s.title} in 10 minutes`, "END:VALARM", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar" }));
  a.download = `ansar-${os.id}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function ZoneToday({ os, sections }: { os: ZoneOS; sections: Section[] }) {
  const [today] = useState(todayMelbourne);
  const [weekday, setWeekday] = useState<string | null>(null);
  const [nowMin, setNowMin] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [focusDraft, setFocusDraft] = useState("");
  const { state, toggle, saveFocus } = useZoneStore(os.id, today);
  const base = `/os/${os.id}`;

  useEffect(() => {
    const tick = () => { const d = new Date(); setWeekday(WEEKDAY_FMT.format(d)); setNowMin(toMin(CLOCK_FMT.format(d))); };
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  if (!weekday) return <p className={styles.muted} style={{ padding: 30 }}>Warming up…</p>;

  const plan = os.week.find(d => d.day === weekday) as OsDay;
  const viewing = selected ? os.week.find(d => d.day === selected) : undefined;
  const sessions = plan.sessions;
  const done = state.done.filter(id => sessions.some(s => s.id === id));
  const pct = sessions.length ? Math.round((done.length / sessions.length) * 100) : 0;
  const next = sessions.find(s => toMin(s.start) + s.minutes > nowMin && !state.done.includes(s.id));
  const month = os.season.months.find(m => m.month === MONTH_FMT.format(new Date()));
  const monthItem = month?.libraryId ? os.library.items.find(i => i.id === month.libraryId) : undefined;
  const weekMinutes = os.week.reduce((n, d) => n + d.sessions.reduce((m, s) => m + s.minutes, 0), 0);
  const itemName = (id?: string) => os.library.items.find(i => i.id === id)?.name;

  return (
    <>
      <header className={`${styles.hero} ${zoneStyles.zoneHero}`}>
        <span className={zoneStyles.mark} aria-hidden="true">{os.icon}</span>
        <div className={styles.heroInner}>
          <div>
            <p className={styles.kicker}>{os.kicker} · {weekday.toUpperCase()}</p>
            <h1 className={styles.title}>{plan.theme}</h1>
            <p className={styles.lead}>{plan.headline}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              {sessions.length === 0 ? <span className={`${styles.pill} ${styles.pillLime}`}>🌿 Rest day. Recharge.</span>
                : next ? <span className={`${styles.pill} ${styles.pillLime}`}>⏭ Next: {next.icon} {next.title} · {formatTime(next.start)}</span>
                : <span className={`${styles.pill} ${styles.pillLime}`}>{done.length === sessions.length ? "✅ Every session done today" : "🌙 Session times are over. Tick what you really did."}</span>}
              {month ? <span className={`${styles.pill} ${styles.pillGold}`}>📅 {month.month}: {month.focus}</span> : null}
            </div>
          </div>
          <div className={styles.scoreboard} aria-label={`${done.length} of ${sessions.length} done`}>
            <small>Today&apos;s score</small>
            <span className={styles.score}>{done.length}<span style={{ color: "#6d7a82" }}>–</span>{sessions.length}</span>
            <span style={{ fontSize: 28 }} aria-hidden="true">{os.icon}</span>
            <small>{sessions.length === 0 ? "REST DAY" : pct === 100 ? "PERFECT DAY" : `${pct}% complete`}</small>
          </div>
        </div>
      </header>

      <div className={styles.grid2}>
        <section className={styles.card} aria-labelledby="plan-h">
          <p className={styles.kicker}>Times are suggestions · homeschool always comes first</p>
          <h2 id="plan-h">Today&apos;s plan</h2>
          {sessions.length === 0 ? <p className={styles.muted}>{plan.tip}</p> : (
            <div className={styles.timeline}>
              {sessions.map(s => (
                <div key={s.id} className={`${styles.slot} ${next?.id === s.id ? styles.slotNext : ""}`}>
                  <span className={styles.slotTime}>{formatTime(s.start)}</span>
                  <span className={styles.slotIcon} aria-hidden="true">{s.icon}</span>
                  <div>
                    <h3>{s.title}<span className={styles.muted} style={{ fontWeight: 600, fontSize: 13 }}> · {s.minutes} min</span></h3>
                    <ul>{s.what.map(w => <li key={w}>{w}</li>)}</ul>
                    {s.libraryId && itemName(s.libraryId) ? <Link href={`${base}/library#${s.libraryId}`}>Open {itemName(s.libraryId)} →</Link> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={styles.card} aria-labelledby="check-h">
          <p className={styles.kicker}>Tick it when it&apos;s real</p>
          <h2 id="check-h">Today&apos;s checklist</h2>
          <div className={styles.bar} style={{ marginBottom: 14 }}><div className={styles.barFill} style={{ width: `${pct}%` }} /></div>
          <div className={styles.checks}>
            {sessions.map(s => {
              const on = state.done.includes(s.id);
              return (
                <button key={s.id} type="button" className={`${styles.check} ${on ? styles.checkDone : ""}`} aria-pressed={on} onClick={() => toggle(s.id)} disabled={state.storage === "loading"}>
                  <span className={styles.checkBox} aria-hidden="true">{on ? "✓" : s.icon}</span>
                  <span className={styles.checkLabel}>{s.title}<br /><span className={styles.checkDetail}>{s.minutes} min · {s.what[0]}</span></span>
                </button>
              );
            })}
            {sessions.length === 0 ? <p className={styles.muted}>Nothing to tick today.</p> : null}
          </div>
          <p className={styles.storageNote}>{state.storage === "supabase" ? "✅ Saved to your record." : state.storage === "local" ? "📱 Saved on this device for now." : "Loading your ticks…"}</p>
        </section>
      </div>

      <div className={styles.grid3} style={{ marginTop: 14 }}>
        <section className={styles.card}>
          <p className={styles.kicker}>🤝 From Mum</p>
          <h3>This week&apos;s ONE focus</h3>
          {state.focus ? <p className={styles.bigQuote}>&ldquo;{state.focus}&rdquo;</p> : <p className={styles.muted}>Set it on Sunday. Nothing set yet.</p>}
          <form className={styles.focusForm} onSubmit={e => { e.preventDefault(); saveFocus(focusDraft); setFocusDraft(""); }}>
            <label className="sr-only" htmlFor="focus-in">This week&apos;s focus</label>
            <input id="focus-in" className={styles.input} placeholder="One thing to get better at this week" value={focusDraft} onChange={e => setFocusDraft(e.target.value)} maxLength={140} />
            <button className={styles.btn} type="submit">Set</button>
          </form>
        </section>
        <section className={styles.card}>
          <p className={styles.kicker}>📅 This month</p>
          <h3>{month?.focus ?? "Keep building"}</h3>
          {monthItem ? <p className={styles.muted}>Signature skill: <Link href={`${base}/library#${monthItem.id}`} style={{ color: "var(--pw-lime)" }}>{monthItem.name} →</Link></p> : null}
          <Link href={`${base}/season`} className={`${styles.btn} ${styles.btnGhost}`}>See the year</Link>
        </section>
        <section className={styles.card}>
          <p className={styles.kicker}>⏰ Reminders</p>
          <h3>Put the week in your calendar</h3>
          <p className={styles.muted}>Every session repeats weekly with a 10-minute reminder. Open the file on the MacBook and add it to Calendar.</p>
          <button type="button" className={styles.btn} onClick={() => downloadIcs(os)}>🔔 Add reminders</button>
        </section>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>The week</h2><span className={styles.muted}>{(weekMinutes / 60).toFixed(1)} h a week of {os.shortName}</span></div>
        <div className={styles.weekStrip}>
          {os.week.map(d => (
            <button key={d.day} type="button" className={`${styles.dayChip} ${d.day === weekday ? styles.dayChipToday : ""} ${selected === d.day ? styles.dayChipSelected : ""}`} onClick={() => setSelected(selected === d.day ? null : d.day)} aria-pressed={selected === d.day}>
              <b>{d.day.slice(0, 3)}</b><span aria-hidden="true">{d.sessions[0]?.icon ?? "🌿"}</span><small>{d.theme}</small>
            </button>
          ))}
        </div>
        {viewing ? (
          <div className={styles.card} style={{ marginTop: 10 }}>
            <h3>{viewing.day}: {viewing.theme}</h3>
            {viewing.sessions.length ? <ul className={styles.list}>{viewing.sessions.map(s => <li key={s.id}>{formatTime(s.start)} · {s.icon} {s.title} ({s.minutes} min)</li>)}</ul> : <p className={styles.muted}>Rest day.</p>}
            <p className={styles.small}><b>Tip:</b> <span className={styles.muted}>{viewing.tip}</span></p>
          </div>
        ) : null}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>The {os.shortName} OS</h2></div>
        <nav className={styles.tiles} aria-label={`${os.shortName} sections`}>
          {sections.slice(1).map(s => <Link key={s.href} href={s.href} className={styles.tile}><i aria-hidden="true">{s.icon}</i><b>{s.label}</b><small>{s.blurb}</small></Link>)}
        </nav>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>🤝 Mum&apos;s corner</h2></div>
        <div className={styles.card}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>{os.family.role.map(r => <span key={r.text} className={styles.pill}>{r.icon} {r.text}</span>)}</div>
          <div className={styles.rules3}>
            <div className={styles.ruleCol}><h4>✅ Always</h4><ul className={styles.list}>{os.family.always.map(x => <li key={x}>{x}</li>)}</ul></div>
            <div className={`${styles.ruleCol} ${styles.ruleColNo}`}><h4>⛔ Never</h4><ul className={styles.list}>{os.family.never.map(x => <li key={x}>{x}</li>)}</ul></div>
            <div className={`${styles.ruleCol} ${styles.ruleColAsk}`}><h4>🙋 Ask Mum first</h4><ul className={styles.list}>{os.family.askFirst.map(x => <li key={x}>{x}</li>)}</ul></div>
          </div>
        </div>
      </section>
    </>
  );
}
