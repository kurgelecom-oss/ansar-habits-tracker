"use client";

import { useEffect, useState } from "react";
import { SEASON, forTeam, kickoff, mapsUrl, opponentOf, summarise, type Fixture, type Ladder } from "../data/matches";
import { todayMelbourne, usePathwayStore } from "./usePathwayStore";
import styles from "../pathway.module.css";

const shortTeam = (name: string) => name.replace(/\s+(U\d{2}).*$/i, " $1").replace(/\s+(SC|FC)\b/g, "").trim();

function Crest({ src, name }: { src: string | null; name: string }) {
  // Dribl logos are hosted on ocean.dribl.com — plain <img>, no Next optimisation needed.
  return src ? <img src={src} alt="" width={56} height={56} style={{ borderRadius: 10, background: "#fff", objectFit: "contain", padding: 4 }} /> : <span aria-hidden="true" style={{ display: "grid", placeItems: "center", width: 56, height: 56, borderRadius: 10, background: "#12303a", fontWeight: 900 }}>{name.slice(0, 2).toUpperCase()}</span>;
}

function Countdown({ iso }: { iso: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);
  if (now === null) return null;
  const mins = Math.max(0, Math.round((new Date(iso).getTime() - now) / 60_000));
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
  return <span className={styles.score} style={{ fontSize: 34 }}>{d ? `${d}d ` : ""}{h}h {String(m).padStart(2, "0")}m</span>;
}

function NextMatch({ f }: { f: Fixture }) {
  const map = mapsUrl(f);
  return (
    <section className={styles.card} style={{ borderColor: "var(--pw-lime)" }}>
      <p className={styles.kicker}>⏭ Next match · {f.round ?? ""} · {f.league ?? f.competition}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", margin: "10px 0" }}>
        <Crest src={f.homeLogo} name={f.home} /><b style={{ fontSize: 18 }}>{shortTeam(f.home)}</b>
        <span className={styles.muted}>vs</span>
        <b style={{ fontSize: 18 }}>{shortTeam(f.away)}</b><Crest src={f.awayLogo} name={f.away} />
      </div>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
        <div><div className={styles.small} style={{ color: "var(--pw-sub)" }}>KICK-OFF</div><b>{kickoff(f.date)}</b></div>
        <div><div className={styles.small} style={{ color: "var(--pw-sub)" }}>KICK-OFF IN</div><Countdown iso={f.date} /></div>
        <div><div className={styles.small} style={{ color: "var(--pw-sub)" }}>GROUND</div><b>{f.ground ?? "TBC"}{f.field ? ` · ${f.field}` : ""}</b> {map ? <a href={map} target="_blank" rel="noopener noreferrer" style={{ color: "var(--pw-lime)" }}>Map ↗</a> : null}</div>
        <span className={`${styles.pill} ${f.isHome ? styles.pillLime : styles.pillGold}`}>{f.isHome ? "🏠 Home" : "🚌 Away"}</span>
      </div>
      <p className={styles.small} style={{ marginBottom: 0 }}><b>Match-day fuel:</b> <span className={styles.muted}>main meal 3 hours before, banana 1 hour before, water all morning. Set 3 personal goals before kick-off.</span></p>
    </section>
  );
}

function MatchLogForm({ days, onSave }: { days: string[]; onSave: (v: { day: string; min: number; goals: number; assists: number; rating: number; learn: string }) => void }) {
  const [v, setV] = useState({ day: days[0] ?? todayMelbourne(), min: "60", goals: "0", assists: "0", rating: "7", learn: "" });
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV(s => ({ ...s, [k]: e.target.value }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ day: v.day, min: Number(v.min), goals: Number(v.goals), assists: Number(v.assists), rating: Number(v.rating), learn: v.learn }); setV(s => ({ ...s, learn: "" })); }}
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, alignItems: "end" }}>
      <label className={styles.small} style={{ display: "grid", gap: 4 }}>Match day<input className={styles.input} type="date" value={v.day} onChange={set("day")} max={todayMelbourne()} /></label>
      <label className={styles.small} style={{ display: "grid", gap: 4 }}>Minutes<input className={styles.input} inputMode="numeric" value={v.min} onChange={set("min")} /></label>
      <label className={styles.small} style={{ display: "grid", gap: 4 }}>Goals<input className={styles.input} inputMode="numeric" value={v.goals} onChange={set("goals")} /></label>
      <label className={styles.small} style={{ display: "grid", gap: 4 }}>Assists<input className={styles.input} inputMode="numeric" value={v.assists} onChange={set("assists")} /></label>
      <label className={styles.small} style={{ display: "grid", gap: 4 }}>My rating (1–10)<input className={styles.input} inputMode="numeric" value={v.rating} onChange={set("rating")} /></label>
      <label className={styles.small} style={{ gridColumn: "1 / -1", display: "grid", gap: 4 }}>One thing I learned<input className={styles.input} value={v.learn} onChange={set("learn")} maxLength={200} placeholder="e.g. I scanned more in the second half and it worked" /></label>
      <button className={styles.btn} type="submit" style={{ justifySelf: "start", whiteSpace: "nowrap" }}>Log my match</button>
    </form>
  );
}

// Per season, so next year he is asked again when the new age group has more than one team.
const TEAM_KEY = `pathway-v1-team-${SEASON.season ?? "none"}`;

function LadderTable({ l }: { l: Ladder }) {
  return (
    <section className={`${styles.card} ${styles.section}`}>
      <p className={styles.kicker}>🏆 League table · {l.league}</p>
      <div style={{ overflowX: "auto" }}>
        <table className={styles.weekTable}>
          <thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
          <tbody>{l.rows.map(r => (
            <tr key={r.team} style={r.us ? { background: "rgba(143,227,90,.14)", fontWeight: 800 } : undefined}>
              <td>{r.position}</td><td>{r.us ? "⚽ " : ""}{shortTeam(r.team)}</td><td>{r.played}</td><td>{r.won}</td><td>{r.drawn}</td><td>{r.lost}</td><td>{r.gd > 0 ? `+${r.gd}` : r.gd}</td><td><b>{r.points}</b></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}

type RealMadrid = { available: boolean; phase?: string; competition?: string; startTime?: string; home?: { name: string; score: number | null }; away?: { name: string; score: number | null } };

export default function MatchCentre() {
  const { state, saveMatch } = usePathwayStore();
  const [rm, setRm] = useState<RealMadrid | null>(null);
  const [allResults, setAllResults] = useState(false);
  const followed = SEASON.followed ?? [];
  const [team, setTeam] = useState<string | null>(null);
  const [teamLoaded, setTeamLoaded] = useState(false);
  useEffect(() => {
    try { const saved = localStorage.getItem(TEAM_KEY); if (saved && followed.some(t => t.name === saved)) setTeam(saved); else if (followed.length === 1) setTeam(followed[0].name); } catch { /* private mode */ }
    setTeamLoaded(true);
  }, [followed]);
  const pickTeam = (name: string) => { setTeam(name); try { localStorage.setItem(TEAM_KEY, name); } catch { /* private mode */ } };
  const teamLabel = followed.find(t => t.name === team)?.label;
  const ladder = (SEASON.ladders ?? []).find(l => l.team === team) ?? null;
  useEffect(() => { fetch("/api/football/real-madrid").then(r => r.json()).then(setRm).catch(() => setRm({ available: false })); }, []);
  const s = summarise(forTeam(SEASON.fixtures, team));
  const logs = state.matches;
  const totals = logs.reduce((t, m) => ({ n: t.n + 1, min: t.min + m.min, g: t.g + m.goals, a: t.a + m.assists, r: t.r + m.rating }), { n: 0, min: 0, g: 0, a: 0, r: 0 });
  const recentDays = s.results.slice(0, 3).map(p => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(new Date(p.f.date)));

  return (
    <>
      {SEASON.configured && followed.length > 1 && teamLoaded ? (
        <section className={styles.card} style={{ marginBottom: 14, borderColor: team ? "var(--pw-line)" : "var(--pw-gold)" }}>
          <p className={styles.kicker}>{team ? "Your team" : "👋 Which one is your team?"}</p>
          <div className={styles.chips} style={{ margin: "6px 0 0" }}>
            {followed.map(t => <button key={t.name} type="button" className={`${styles.chip} ${team === t.name ? styles.chipOn : ""}`} aria-pressed={team === t.name} onClick={() => pickTeam(t.name)}>{t.label}</button>)}
          </div>
          {!team ? <p className={styles.small} style={{ color: "var(--pw-sub)", marginBottom: 0 }}>Tap one — this device remembers it. Until then you see both teams together.</p> : null}
        </section>
      ) : null}

      {!SEASON.configured ? (
        <section className={styles.card} style={{ borderColor: "var(--pw-gold)" }}>
          <p className={styles.kicker}>🔌 Connect his team</p>
          <h2>His fixtures and results plug in from Football Victoria</h2>
          <p className={styles.muted}>Every junior game in Victoria is on Football Victoria&apos;s Dribl Match Centre. Once his club and team are set, this page fills itself every night: every upcoming match, kick-off, ground with a map, results and the season record. When the 2027 fixtures are published, they appear here automatically.</p>
          <p className={styles.small} style={{ marginBottom: 0 }}>Set once in <code>app/pathway/data/team.json</code> — his club&apos;s name as it appears on <a href="https://fv.dribl.com/fixtures/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--pw-lime)" }}>fv.dribl.com</a> and his age group/team.</p>
        </section>
      ) : s.next ? <NextMatch f={s.next} /> : (
        <section className={styles.card}><p className={styles.kicker}>{SEASON.club} · {SEASON.season}</p><h2>No upcoming matches</h2><p className={styles.muted} style={{ margin: 0 }}>The season&apos;s done or the next fixtures aren&apos;t published yet. They&apos;ll appear here the night Football Victoria releases them.</p></section>
      )}

      {SEASON.configured ? (
        <div className={`${styles.grid3} ${styles.section}`}>
          <section className={styles.card}>
            <p className={styles.kicker}>📊 Team season · {SEASON.season}</p>
            <h3>{teamLabel ?? (SEASON.team ? `${SEASON.club} · ${SEASON.team}` : SEASON.club)}</h3>
            {ladder ? <p className={styles.small} style={{ margin: "0 0 6px", color: "var(--pw-gold)" }}>{(() => { const us = ladder.rows.find(r => r.us); return us ? `${us.position}${["th","st","nd","rd"][us.position % 10 > 3 || [11,12,13].includes(us.position % 100) ? 0 : us.position % 10]} of ${ladder.rows.length} · ${us.points} pts` : ""; })()}</p> : null}
            <div className={styles.score} style={{ fontSize: 30 }}>{s.record.w}W {s.record.d}D {s.record.l}L</div>
            <p className={styles.muted} style={{ margin: "6px 0" }}>Goals {s.record.gf}–{s.record.ga} · {s.record.p} played</p>
            <div style={{ display: "flex", gap: 6 }}>{s.form.map((o, i) => <span key={i} className={`${styles.pill} ${o === "W" ? styles.pillLime : o === "L" ? styles.pillRed : styles.pillGold}`}>{o}</span>)}</div>
          </section>
          <section className={styles.card} style={{ gridColumn: "span 2" }}>
            <p className={styles.kicker}>📅 Coming up</p>
            {s.upcoming.slice(0, 6).map(f => <div key={f.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--pw-line)" }}><span><b>{kickoff(f.date)}</b> · {f.isHome ? "vs" : "@"} {shortTeam(opponentOf(f))}</span><span className={styles.muted}>{f.ground ?? ""}</span></div>)}
            {!s.upcoming.length ? <p className={styles.muted}>Nothing scheduled yet.</p> : null}
          </section>
        </div>
      ) : null}

      {ladder ? <LadderTable l={ladder} /> : null}

      {SEASON.configured && s.results.length ? (
        <section className={`${styles.card} ${styles.section}`}>
          <p className={styles.kicker}>🏁 Results</p>
          <div style={{ overflowX: "auto" }}><table className={styles.weekTable}><thead><tr><th>Date</th><th>Opponent</th><th>Score</th><th></th></tr></thead>
            <tbody>{(allResults ? s.results : s.results.slice(0, 8)).map(p => <tr key={p.f.id}><td>{kickoff(p.f.date)}</td><td>{p.f.isHome ? "vs" : "@"} {shortTeam(p.opponent)}</td><td><b>{p.us}–{p.them}</b></td><td><span className={`${styles.pill} ${p.outcome === "W" ? styles.pillLime : p.outcome === "L" ? styles.pillRed : styles.pillGold}`}>{p.outcome}</span></td></tr>)}</tbody></table></div>
          {s.results.length > 8 ? <button type="button" className={`${styles.btn} ${styles.btnGhost}`} style={{ marginTop: 12 }} onClick={() => setAllResults(v => !v)}>{allResults ? "Show fewer" : `Show all ${s.results.length} results`}</button> : null}
        </section>
      ) : null}

      <section className={`${styles.card} ${styles.section}`}>
        <p className={styles.kicker}>🧾 My stats (junior stats aren&apos;t published online — so he keeps his own)</p>
        <div className={styles.grid3} style={{ margin: "8px 0 16px" }}>
          <div><div className={styles.score} style={{ fontSize: 32 }}>{totals.n}</div><span className={styles.muted}>games logged · {totals.min} min</span></div>
          <div><div className={styles.score} style={{ fontSize: 32 }}>{totals.g} ⚽ {totals.a} 🅰️</div><span className={styles.muted}>goals · assists</span></div>
          <div><div className={styles.score} style={{ fontSize: 32 }}>{totals.n ? (totals.r / totals.n).toFixed(1) : "–"}</div><span className={styles.muted}>average self-rating</span></div>
        </div>
        <MatchLogForm days={recentDays} onSave={saveMatch} />
        {logs.length ? <ul className={styles.list} style={{ marginTop: 14 }}>{logs.slice(0, 8).map(m => <li key={m.day}><b>{m.day}</b> · {m.min} min · {m.goals}G {m.assists}A · {m.rating}/10{m.learn ? <span className={styles.muted}> — {m.learn}</span> : null}</li>)}</ul> : null}
        <p className={styles.storageNote}>{state.storage === "local" ? "Saved on this device until the Pathway database is switched on." : state.storage === "supabase" ? "Saved to his record — Mum sees it too." : "Loading…"}</p>
      </section>

      <section className={`${styles.card} ${styles.section}`}>
        <p className={styles.kicker}>👑 His club in Spain · live</p>
        {rm?.available && rm.home && rm.away ? (
          <><h3>{rm.home.name} {rm.phase === "SCHEDULED" ? "vs" : `${rm.home.score ?? ""}–${rm.away.score ?? ""}`} {rm.away.name}</h3><p className={styles.muted} style={{ margin: 0 }}>{rm.competition} · {rm.startTime ? kickoff(rm.startTime) : ""} · {rm.phase === "SCHEDULED" ? "Watch one player for 20 minutes = Friday film study" : rm.phase}</p></>
        ) : <p className={styles.muted} style={{ margin: 0 }}>Real Madrid&apos;s next match will show here.</p>}
      </section>

      <p className={styles.footerNote}>{SEASON.configured ? <>Fixtures from <a href={SEASON.source} target="_blank" rel="noopener noreferrer" style={{ color: "var(--pw-lime)" }}>Football Victoria · Dribl</a>, synced nightly{SEASON.syncedAt ? ` (last ${new Date(SEASON.syncedAt).toLocaleDateString("en-AU")})` : ""}.</> : "Fixtures sync nightly from Football Victoria once his team is set."}</p>
    </>
  );
}
