"use client";
// The week film: Friday's homeschool report played as a short story (tk, 18 Oct 2026).
// Read-only. Caption and timing edits stay in this browser. ?sample=1 plays an invented week.
import { useEffect, useMemo, useState } from "react";
import ClubNavigation from "../../components/dashboard/ClubNavigation";
import { StoryPlayer, Big, Ring, Columns, stagger, ease } from "../../components/week-story/StoryPlayer";
import { BLOCKS, buildWeekStory, type Call, type Scene, type WeekReport } from "../../lib/week-story";
import styles from "../school.module.css";
import "../../components/week-story/story.css";

type Week = { week: string; label: string; call: string };
const TONE: Record<Call, string> = { GREEN: "ok", "PROVISIONAL GREEN": "ok", YELLOW: "gold", RED: "bad" };

export default function WeekFilm() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [report, setReport] = useState<WeekReport | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "locked" | "error">("loading");
  const [sample, setSample] = useState(false);

  const load = (week?: string) => {
    const s = new URLSearchParams(location.search).has("sample");
    setSample(s);
    const q = s ? "?sample=1" : week ? `?week=${week}` : "";
    fetch(`/api/assessments/week-story${q}`, { cache: "no-store" }).then(async r => {
      if (r.status === 401) return setState("locked");
      if (!r.ok) return setState("error");
      const d = await r.json(); setWeeks(d.weeks); setReport(d.report); setState("ready");
    }).catch(() => setState("error"));
  };
  useEffect(() => load(), []);
  const scenes = useMemo(() => report ? buildWeekStory(report) : [], [report]);

  return (
    <>
      <ClubNavigation activeLabel="School" />
      <main className={styles.page}>
        <div className={styles.content}>
          <header>
            <p className={styles.kicker}>Ansar OS · School · Week film{sample ? " · SAMPLE" : ""}</p>
            <h1 className={styles.title}>{report?.label ?? "Week film"}</h1>
            <p className={styles.sub}>Friday&apos;s report, played as a story. Press play, watch it together, then do the three things.</p>
          </header>

          {weeks.length > 1 && (
            <div className="wk-weeks" role="group" aria-label="Choose a week">{weeks.map(w => (
              <button key={w.week} type="button" aria-pressed={w.week === report?.week} onClick={() => load(w.week)}>
                <span className={`wk-dot ${TONE[w.call as Call] ?? ""}`} />{w.label}</button>))}</div>
          )}

          {state === "loading" && <p className={styles.sub}>Loading…</p>}
          {state === "locked" && <p className={styles.warn}>This film shows Ansar&apos;s own words, so it only opens on a device unlocked with the parent PIN. Unlock it on the <a href="/tests">Tests</a> page, then come back.</p>}
          {state === "error" && <p className={styles.warn}>The week film could not be loaded. Try again in a minute.</p>}
          {state === "ready" && !report && <p className={styles.warn}>No week film yet. The first one arrives after Friday&apos;s report at 6 pm. <a href="/school/week?sample=1">Watch the sample</a>.</p>}
          {report && <StoryPlayer key={report.week} scenes={scenes} storageKey={`week-film-${report.week}`} brand={<>ANSAR <span style={{ color: "var(--ansar-gold)" }}>FC</span> · School</>} render={(s, p) => <Visual s={s} p={p} />} />}
          {report && <p className={styles.sub} style={{ marginTop: 12 }}>Space plays and pauses, arrows step through scenes. Press Present for full screen. Numbers come from the Friday report ({report.sources.tally} Tally logs, {report.sources.notion} Notion rows).</p>}
        </div>
      </main>
    </>
  );
}

function Visual({ s, p }: { s: Scene; p: number }) {
  switch (s.id) {
    case "call": return (
      <div className="sty-split">
        <div className={`wk-call ${TONE[s.call]}`} style={{ opacity: ease(p * 1.4), transform: `scale(${0.92 + 0.08 * ease(p * 1.4)})` }}>{s.call}<small>{s.week}</small></div>
        <div><Big v={Math.round(s.full * p)} l="full days out of 4" /><p className="wk-why" style={{ opacity: ease(p * 1.6 - 0.4) }}>{s.why}</p></div>
      </div>);
    case "days": return (
      <div className="wk-grid" role="table" aria-label="Blocks done each day">
        <div className="wk-row wk-head" role="row"><span />{BLOCKS.map(([, l]) => <span key={l}>{l}</span>)}<span>Logs</span><span>Start</span></div>
        {s.days.map((d, i) => { const e = stagger(p, i, 0.12); return (
          <div className="wk-row" role="row" key={d.day}><b>{d.day}</b>
            {BLOCKS.map(([k], j) => <i key={k} className={d[k] ? "on" : "off"} style={{ opacity: ease(e * 1.4 - j * 0.1) }} aria-label={d[k] ? "done" : "missed"} />)}
            <b>{Math.round(d.logs * e)}</b><span>{d.start ?? "—"}</span></div>); })}
      </div>);
    case "device": return s.held === null
      ? <div className="wk-note" style={{ opacity: ease(p) }}><b>?</b>Not recorded this week</div>
      : <div className="sty-split"><Ring part={s.held} of={4} p={p} /><Big v={Math.round(s.held * p)} l="mornings the device rule held" /></div>;
    case "areas": { const max = Math.max(1, ...s.areas.flatMap(a => [a.now, a.before])); return (
      <div className="sty-bars">{s.areas.map((a, i) => { const e = stagger(p, i, 0.07); return (
        <div key={a.area} className={`sty-bar${a.now ? "" : " hot"}`}><span className="lb">{a.area}{a.note && <small>{a.note}</small>}</span>
          <span className="tr wk-tr"><i style={{ width: `${(a.now / max) * 100 * e}%`, background: a.now ? "var(--school)" : undefined }} /><em style={{ left: `${(a.before / max) * 100}%` }} title={`Last week ${a.before}`} /></span>
          <b>{Math.round(a.now * e)}</b></div>); })}
        <small className="wk-key">Blue bar = this week · white tick = last week</small></div>); }
    case "evidence": return (
      <div className="sty-split"><Ring part={s.unique} of={s.submissions} p={p} />
        <div><Big v={Math.round(s.withFile * p)} l={`of ${s.submissions} logs had a photo`} />{s.withFile > s.unique && <Big v={Math.round((s.withFile - s.unique) * p)} l="photos used twice" red />}</div></div>);
    case "topics": return (
      <div className="wk-list">{s.topics.map((t, i) => { const e = stagger(p, i, 0.15, 1.8); return (
        <div key={t.area + t.topic} className={`wk-item ${t.plateau ? "bad" : "ok"}`} style={{ opacity: e, transform: `translateY(${(1 - e) * 10}px)` }}>
          <small>{t.area}</small><b>{t.topic}</b><span>{t.plateau ? `Same for ${t.weeks} weeks` : t.weeks > 1 ? `Week ${t.weeks}, still moving` : "New this week"}</span></div>); })}</div>);
    case "journals": return <Columns steps={[{ label: "3 weeks ago", v: s.before[0] }, { label: "2 weeks ago", v: s.before[1] }, { label: "Last week", v: s.before[2] }, { label: "This week", v: s.now }]} p={p} />;
    case "words": return (
      <div className="wk-list">{s.words.map((w, i) => { const e = stagger(p, i, 0.18, 1.8); return (
        <blockquote key={w.theme} className="wk-quote" style={{ opacity: e, transform: `translateX(${(1 - e) * -14}px)` }}>
          <small>{w.theme} · {w.days} {w.days === 1 ? "day" : "days"}</small>“{w.quote}”</blockquote>); })}</div>);
    case "flags": return s.flags.length ? (
      <div className="wk-list">{s.flags.map((f, i) => { const e = stagger(p, i, 0.12, 1.8); return (
        <div key={f.date + i} className="wk-item gold" style={{ opacity: e }}><small>{f.kind} · {f.date.slice(8)}/{f.date.slice(5, 7)}</small><span>{f.detail}</span></div>); })}</div>)
      : <div className="wk-note ok" style={{ opacity: ease(p) }}><b>✓</b>No record problems</div>;
    default: return (
      <ol className={`wk-points ${s.id}`}>{s.items.map((t, i) => { const e = stagger(p, i, 0.2, 1.8); return (
        <li key={i} style={{ opacity: e, transform: `translateY(${(1 - e) * 12}px)` }}><b>{s.id === "next" ? i + 1 : s.id === "strong" ? "✓" : "✕"}</b>{t}</li>); })}</ol>);
  }
}
