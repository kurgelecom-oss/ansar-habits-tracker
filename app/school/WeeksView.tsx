"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./weeks.module.css";

/* ════════════════════════════════════════════════════════════════════════════
   School → Weeks. Step back and forward through every stored week and read it
   day by day, Monday to Friday: each day's theme, then every lesson in the
   order it is taught, tagged with its subject. No need to open Notion.

   Plan: the nightly programme snapshot (/api/school-week?weekStart=…), every
   dated row with its subject, day topic, full task and subject guide.
   How it went: Friday's report (/api/assessments/week-story?week=…). That
   route only answers on a device unlocked with the parent PIN because the
   report quotes his journal; this screen keeps that gate and says so.
   Read-only: nothing here writes to Notion, the snapshot or the assessments.
   ══════════════════════════════════════════════════════════════════════════ */

type Block = { rowId: string; label: string; duration: string | null; task: string; guide: string[]; done: boolean };
type Day = { date: string; weekday: string; dayTopic: string; note: string; isToday: boolean; blocks: Block[] };
type Week = {
  weekStart: string; weekEnd: string; today: string; configured: boolean; weekTitle: string;
  syncedAt?: string | null; days: Day[]; totals?: { blocks: number; done: number };
  weeks?: { start: string; title: string }[]; currentWeekStart?: string; message?: string;
};
type Call = "GREEN" | "PROVISIONAL GREEN" | "YELLOW" | "RED";
type Report = {
  week: string; label: string; call: Call; callWhy: string;
  days: { day: string; maths: boolean; english: boolean; hass: boolean; rotation: boolean; logs: number }[];
  areas: { area: string; now: number; before: number; note: string }[];
  evidence: { submissions: number; withFile: number; unique: number };
  topics: { area: string; topic: string; weeks: number; plateau: boolean }[];
  strengths: string[]; weaknesses: string[]; actions: string[];
};

/** Subjects in the order the week is taught. `match` reads the programme row's label. */
const SUBJECTS = [
  { key: "maths", name: "Maths", icon: "🔢", tone: "#e0a93b", match: /maths/i },
  { key: "english", name: "English", icon: "📖", tone: "#6aa6ff", match: /english|grammar/i },
  { key: "hass", name: "HASS · History", icon: "🏛️", tone: "#d0794f", match: /hass/i },
  { key: "science", name: "Science", icon: "🔬", tone: "#4fc3a1", match: /science/i },
  { key: "tech", name: "Technologies", icon: "💻", tone: "#9a8cff", match: /technolog/i },
  { key: "arts", name: "The Arts", icon: "🎨", tone: "#f07fa8", match: /arts/i },
  { key: "skills", name: "Skills mix", icon: "⌨️", tone: "#8fb3c9", match: /skills/i },
  { key: "turkish", name: "Turkish", icon: "🇹🇷", tone: "#e45b5b", match: /turkish|languages/i },
  { key: "friday", name: "Friday · review & catch-up", icon: "🔁", tone: "#a7b0be", match: /catch up|teach-back|review|go deeper/i },
] as const;
type SubjectKey = typeof SUBJECTS[number]["key"];
const subjectOf = (label: string): SubjectKey => (SUBJECTS.find(s => s.match.test(label.replace(/^Block \d+ — /, "")))?.key ?? "friday");

const CALL_TONE: Record<Call, string> = { GREEN: "callGood", "PROVISIONAL GREEN": "callGood", YELLOW: "callWarn", RED: "callBad" };
const BLOCK_COLS = [["maths", "Maths"], ["english", "English"], ["hass", "HASS"], ["rotation", "Block 4"]] as const;

const dayShort = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const minutes = (d: string | null) => Number(/(\d+)\s*min/i.exec(d ?? "")?.[1] ?? 0);
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

/** One sentence per step. Decimals ("8.2") and initials have no space after the dot, so they stay whole. */
function steps(text: string) {
  return text.split(/(?<=[.!?])\s+(?=[A-Z0-9'"‘“(])/).map(s => s.trim()).filter(Boolean);
}

/** A lesson's heading and its steps. History reads best under the day's topic; everything else leads with its skill. */
function lesson(subject: SubjectKey, b: Block, dayTopic: string) {
  const all = steps(b.task);
  if (subject === "hass" || !all.length) return { head: dayTopic || b.label, body: all };
  const first = all[0].replace(/[.:]$/, "");
  if (first.length <= 110) return { head: first, body: all.slice(1) };
  return { head: dayTopic || b.label, body: all };
}

/** Bold the signposts inside a step ("Topic problem:", "Novel:", "Then 15 min …"). */
function Step({ text }: { text: string }) {
  const m = /^([A-Z][A-Za-z ’'/-]{2,32}:)\s*(.*)$/.exec(text);
  return m ? <li><b>{m[1]}</b> {m[2]}</li> : <li>{text}</li>;
}

export default function WeeksView() {
  const [start, setStart] = useState<string | null>(null);
  const [week, setWeek] = useState<Week | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [report, setReport] = useState<{ status: "loading" | "locked" | "none" | "ready" | "error"; data?: Report }>({ status: "loading" });

  const load = useCallback(async (ws: string | null) => {
    setState("loading");
    try {
      const r = await fetch(`/api/school-week${ws ? `?weekStart=${ws}` : ""}`, { cache: "no-store" });
      if (!r.ok) throw new Error();
      const w: Week = await r.json();
      setWeek(w); setStart(w.weekStart); setState("ready");
      const u = new URL(location.href); u.searchParams.set("week", w.weekStart); history.replaceState(null, "", u);
    } catch { setState("error"); }
  }, []);

  // Open on ?week= when shared, else the API's default (the coming week at the weekend).
  useEffect(() => { load(new URLSearchParams(location.search).get("week")); }, [load]);

  // Friday's report for this week, behind the parent PIN.
  useEffect(() => {
    if (!week) return;
    let live = true;
    const ws = week.weekStart;
    const future = ws > (week.currentWeekStart ?? week.today);
    if (future) { setReport({ status: "none" }); return; }
    setReport({ status: "loading" });
    fetch(`/api/assessments/week-story?week=${ws}`, { cache: "no-store" }).then(async r => {
      if (!live) return;
      if (r.status === 401) return setReport({ status: "locked" });
      if (!r.ok) return setReport({ status: "error" });
      const d = await r.json();
      setReport(d.report?.week === ws ? { status: "ready", data: d.report } : { status: "none" });
    }).catch(() => live && setReport({ status: "error" }));
    return () => { live = false; };
  }, [week]);

  const weeks = week?.weeks ?? [];
  const idx = weeks.findIndex(w => w.start === start);
  const go = useCallback((d: -1 | 1) => { const w = weeks[idx + d]; if (w) load(w.start); }, [weeks, idx, load]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.closest("input,textarea")) return; if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [go]);

  const subjects = useMemo(() => {
    if (!week) return [];
    return SUBJECTS.map(s => {
      const lessons = week.days.flatMap(d => d.blocks.filter(b => subjectOf(b.label) === s.key).map(b => ({ day: d, block: b, ...lesson(s.key, b, d.dayTopic) })));
      const guide = [...new Set(lessons.flatMap(l => l.block.guide))];
      const mins = lessons.reduce((n, l) => n + minutes(l.block.duration), 0);
      return { ...s, lessons, guide, mins, done: lessons.filter(l => l.block.done).length };
    }).filter(s => s.lessons.length);
  }, [week]);

  const cur = week?.currentWeekStart ?? "";
  const rel = !start || !cur ? "" : start === cur ? "This week" : start === addDays(cur, 7) ? "Next week" : start === addDays(cur, -7) ? "Last week"
    : start > cur ? `In ${Math.round((Date.parse(start) - Date.parse(cur)) / 6048e5)} weeks` : `${Math.round((Date.parse(cur) - Date.parse(start)) / 6048e5)} weeks ago`;
  const past = !!start && !!cur && start < cur;
  const totalMins = subjects.reduce((n, s) => n + s.mins, 0);

  return (
    <div className={styles.wrap}>
      {/* ── week switcher ── */}
      <nav className={styles.switcher} aria-label="Choose a week">
        <button className={styles.arrow} onClick={() => go(-1)} disabled={idx <= 0} aria-label="Previous week">‹</button>
        <div className={styles.chips}>{weeks.map((w, i) => {
          const n = /Week (\d+)/.exec(w.title)?.[1] ?? String(i + 1);
          return <button key={w.start} onClick={() => load(w.start)} aria-pressed={w.start === start}
            className={`${styles.chip} ${w.start === start ? styles.chipOn : ""} ${w.start === cur ? styles.chipNow : ""} ${w.start < cur ? styles.chipPast : ""}`}
            title={w.title}>W{n}</button>;
        })}</div>
        <button className={styles.arrow} onClick={() => go(1)} disabled={idx < 0 || idx >= weeks.length - 1} aria-label="Next week">›</button>
      </nav>

      {state === "error" && <p className={styles.warn}>This week could not be loaded. Try again in a minute.</p>}
      {week && <section className={`${styles.hero} ${state === "loading" ? styles.fading : ""}`}>
        <div className={styles.heroTop}>
          <div>
            <span className={styles.rel}>{rel}</span>
            <h2 className={styles.heroTitle}>{week.weekTitle || "No programme stored for this week"}</h2>
            <p className={styles.heroSub}>{dayShort(week.weekStart)} – {dayShort(week.weekEnd)}</p>
          </div>
          <dl className={styles.stats}>
            <div><dt>Subjects</dt><dd>{subjects.filter(s => s.key !== "friday").length}</dd></div>
            <div><dt>Lessons</dt><dd>{week.totals?.blocks ?? 0}</dd></div>
            <div><dt>Planned time</dt><dd>{Math.floor(totalMins / 60)}h {totalMins % 60 ? `${totalMins % 60}m` : ""}</dd></div>
            {(past || rel === "This week") && <div><dt>Ticked done</dt><dd>{week.totals?.done ?? 0}/{week.totals?.blocks ?? 0}</dd></div>}
          </dl>
        </div>
        <ol className={styles.themes}>{week.days.map(d => (
          <li key={d.date} className={d.isToday ? styles.themeToday : ""}><a href={`#day-${d.date}`}><span>{d.weekday.slice(0, 3)}</span><b>{d.dayTopic || "—"}</b></a></li>
        ))}</ol>
      </section>}

      {/* ── how the week went ── */}
      {week && (past || rel === "This week") && <ReportCard report={report} past={past} />}

      {/* ── day by day: Monday to Friday, every lesson in teaching order (tk, 25 Oct 2026) ── */}
      {week && !subjects.length && state === "ready" && <p className={styles.warn}>Nothing is stored for this week yet. Weeks appear here the night after they are written in Notion.</p>}
      <div className={styles.daysList}>
        {week?.days.filter(d => d.blocks.length).map(d => {
          const mins = d.blocks.reduce((n, b) => n + minutes(b.duration), 0), done = d.blocks.filter(b => b.done).length;
          return (
            <section key={d.date} id={`day-${d.date}`} className={`${styles.day} ${d.isToday ? styles.dayToday : ""}`}>
              <header className={styles.dayHead}>
                <div className={styles.dayDate}><b>{d.weekday}</b><span>{dayShort(d.date).replace(/^\w+ /, "")}</span></div>
                <div className={styles.dayTheme}><span>Today&apos;s theme</span><h3>{d.dayTopic || "—"}</h3>{d.note && <p>{d.note}</p>}</div>
                <div className={styles.dayMeta}>{d.blocks.length} lessons · {Math.floor(mins / 60)}h{mins % 60 ? ` ${mins % 60}m` : ""}{(past || rel === "This week") ? ` · ${done}/${d.blocks.length} ticked` : ""}{d.isToday && <em>Today</em>}</div>
              </header>
              <ol className={styles.dayLessons}>{d.blocks.map(b => {
                const sub = SUBJECTS.find(x => x.key === subjectOf(b.label))!;
                const l = lesson(sub.key, b, d.dayTopic);
                const name = sub.key === "english" && /grammar/i.test(b.label) ? "Grammar" : sub.key === "friday" ? b.label : sub.name;
                return (
                  <li key={b.rowId} className={b.done ? styles.lessonDone : ""} style={{ "--tone": sub.tone } as React.CSSProperties}>
                    <div className={styles.subjectTag}>
                      <span className={styles.icon} aria-hidden="true">{sub.icon}</span>
                      <div><b>{name}</b>{b.duration && <span>{b.duration}</span>}{b.done && <i className={styles.tick}>✓ done</i>}</div>
                    </div>
                    <div className={styles.lessonBody}>
                      <h4>{l.head}</h4>
                      {l.body.length > 0 && <ul>{l.body.map((t, i) => <Step key={i} text={t} />)}</ul>}
                    </div>
                  </li>
                );
              })}</ol>
            </section>
          );
        })}
      </div>

      {/* Standing guidance, once per subject, out of the way of the daily view. */}
      {subjects.some(s => s.guide.length) && <details className={styles.guides}>
        <summary>Subject guides · how each subject works</summary>
        <div className={styles.guideGrid}>{subjects.filter(s => s.guide.length).map(s => (
          <div key={s.key} style={{ "--tone": s.tone } as React.CSSProperties}><h4>{s.icon} {s.name}</h4><ul>{s.guide.map((g, i) => <li key={i}>{g}</li>)}</ul></div>
        ))}</div>
      </details>}
      {week?.syncedAt && <p className={styles.foot}>From the stored programme, refreshed nightly (last {new Date(week.syncedAt).toLocaleString("en-AU")}). Use ← → to change week.</p>}
    </div>
  );
}

function ReportCard({ report, past }: { report: { status: string; data?: Report }; past: boolean }) {
  if (report.status === "loading") return <section className={styles.report}><p className={styles.muted}>Loading how the week went…</p></section>;
  if (report.status === "locked") return (
    <section className={styles.report}><h3 className={styles.reportTitle}>How the week went</h3>
      <p className={styles.muted}>Friday&apos;s report quotes Ansar&apos;s journal, so it only opens on a device unlocked with the parent PIN. <a href="/tests">Unlock on the Tests page</a>, then come back.</p></section>);
  if (report.status !== "ready" || !report.data) return (
    <section className={styles.report}><h3 className={styles.reportTitle}>How the week went</h3>
      <p className={styles.muted}>{past ? "No Friday report was saved for this week." : "Friday’s report arrives on Friday at 6 pm."}</p></section>);
  const r = report.data;
  return (
    <section className={styles.report}>
      <div className={styles.reportHead}>
        <h3 className={styles.reportTitle}>How the week went</h3>
        <span className={`${styles.call} ${styles[CALL_TONE[r.call]]}`}>{r.call}</span>
      </div>
      <p className={styles.why}>{r.callWhy}</p>

      <div className={styles.reportGrid}>
        <div>
          <h4>Blocks done each day</h4>
          <table className={styles.days}>
            <thead><tr><th />{BLOCK_COLS.map(([, l]) => <th key={l}>{l}</th>)}<th>Logs</th></tr></thead>
            <tbody>{r.days.map(d => <tr key={d.day}><th>{d.day}</th>{BLOCK_COLS.map(([k]) => <td key={k} className={d[k] ? styles.yes : styles.no}>{d[k] ? "✓" : "✗"}</td>)}<td>{d.logs}</td></tr>)}</tbody>
          </table>
          <p className={styles.muted}>{r.evidence.submissions} work logs · {r.evidence.withFile} with a photo · {r.evidence.unique} unique</p>
        </div>
        <div>
          <h4>What he actually covered</h4>
          <ul className={styles.covered}>{r.topics.map((t, i) => <li key={i}><b>{t.area}</b> {t.topic}{t.plateau ? <em> · stuck</em> : null}</li>)}</ul>
        </div>
      </div>

      <div className={styles.areas}>{r.areas.map(a => {
        const max = Math.max(1, ...r.areas.map(x => Math.max(x.now, x.before)));
        return <div key={a.area} title={a.note || undefined}><span>{a.area}</span><i style={{ width: `${a.now / max * 100}%` }} /><b>{a.now}<small>{a.now > a.before ? " ▲" : a.now < a.before ? " ▼" : ""}</small></b></div>;
      })}</div>

      <div className={styles.three}>
        <div className={styles.good}><h4>What went well</h4><ul>{r.strengths.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
        <div className={styles.warnBox}><h4>To fix</h4><ul>{r.weaknesses.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
        <div className={styles.next}><h4>Next week&apos;s three</h4><ol>{r.actions.map((t, i) => <li key={i}>{t}</li>)}</ol></div>
      </div>
    </section>
  );
}
