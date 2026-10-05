"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ClubNavigation from "../components/dashboard/ClubNavigation";
import styles from "./leaderboards.module.css";

type Row = {
  position: number;
  teamId: number;
  team: string;
  crest: string | null;
  points: number;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};
type Table = { name: string; code: string; emblem: string | null; season: string | null; table: Row[] | null };
type Side = { id: number | null; name: string; crest: string | null };
type Match = { id: number; utcDate: string; status: string; home: Side; away: Side; homeScore: number | null; awayScore: number | null };
type Scorer = { player: string; team: string; crest: string | null; goals: number; penalties: number };
type Detail = { available: boolean; matches?: Match[] | null; scorers?: Scorer[] | null };
type Result = "W" | "D" | "L";

const MADRID = 86;
const VIEWS = ["Matches", "Standings", "Stats"] as const;
const LIVE = ["IN_PLAY", "PAUSED"];
const OFF = ["POSTPONED", "CANCELLED", "SUSPENDED"];

// Where a finishing position leads. Only formats that are fixed by the competition's
// own rules are listed; a league whose European places move year to year gets no key.
const ZONES: Record<string, { to: number; label: string; tone: string }[]> = {
  CL: [
    { to: 8, label: "Round of 16", tone: "zoneTop" },
    { to: 24, label: "Knockout play-offs", tone: "zoneMid" },
  ],
};

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
const zoneName = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value;

function Crest({ src, size = 24 }: { src: string | null; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={styles.crest} src={src} alt="" width={size} height={size} loading="lazy" />
  ) : (
    <span className={styles.crest} style={{ width: size, height: size }} />
  );
}

function MatchCard({ m }: { m: Match }) {
  const done = m.status === "FINISHED";
  const live = LIVE.includes(m.status);
  const scored = done || live;
  const date = new Date(m.utcDate);
  const madrid = m.home.id === MADRID || m.away.id === MADRID;
  return (
    <article className={madrid ? `${styles.match} ${styles.matchMadrid}` : styles.match}>
      <div className={styles.sides}>
        {[
          [m.home, m.homeScore] as const,
          [m.away, m.awayScore] as const,
        ].map(([team, score], i) => (
          <div className={styles.side} key={i}>
            <Crest src={team.crest} />
            <strong>{team.name}</strong>
            {scored && <b>{score ?? "–"}</b>}
          </div>
        ))}
      </div>
      <div className={styles.when}>
        {done ? (
          <>
            <b>FT</b>
            <span>{dayFmt.format(date)}</span>
          </>
        ) : live ? (
          <b className={styles.live}>LIVE</b>
        ) : OFF.includes(m.status) ? (
          <>
            <span>{dayFmt.format(date)}</span>
            <span>{m.status.toLowerCase()}</span>
          </>
        ) : (
          <>
            <span>{dayFmt.format(date)}</span>
            <span>{timeFmt.format(date)}</span>
          </>
        )}
      </div>
    </article>
  );
}

function StandingsTable({ rows, code, form, compact }: { rows: Row[]; code: string; form?: Map<number, Result[]>; compact?: boolean }) {
  const zones = ZONES[code] ?? [];
  return (
    <table className={compact ? `${styles.table} ${styles.compact}` : styles.table}>
      <thead>
        <tr>
          <th scope="col" colSpan={2}>Team</th>
          {!compact && <th scope="col">MP</th>}
          <th scope="col">W</th>
          <th scope="col">D</th>
          <th scope="col">L</th>
          {!compact && (
            <>
              <th scope="col">GF</th>
              <th scope="col">GA</th>
              <th scope="col">GD</th>
            </>
          )}
          <th scope="col" className={styles.pts}>PTS</th>
          {form && <th scope="col" className={styles.formHead}>Last 5</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const zone = zones.find((z) => r.position <= z.to);
          const last = form?.get(r.teamId) ?? [];
          return (
            <tr className={r.teamId === MADRID ? styles.madrid : undefined} key={r.teamId}>
              <td className={`${styles.pos} ${zone ? styles[zone.tone] : ""}`}>{r.position}</td>
              <th scope="row">
                <span className={styles.team}>
                  <Crest src={r.crest} />
                  {r.team}
                </span>
              </th>
              {!compact && <td>{r.played}</td>}
              <td>{r.won}</td>
              <td>{r.draw}</td>
              <td>{r.lost}</td>
              {!compact && (
                <>
                  <td>{r.goalsFor}</td>
                  <td>{r.goalsAgainst}</td>
                  <td>{r.goalDifference}</td>
                </>
              )}
              <td className={styles.pts}>{r.points}</td>
              {form && (
                <td>
                  <span className={styles.form} aria-label={last.length ? `Last ${last.length}: ${last.join(" ")}` : "No matches played"}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <i className={last[i] ? styles[`form${last[i]}`] : undefined} key={i} aria-hidden="true">
                        {last[i] ?? ""}
                      </i>
                    ))}
                  </span>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function Leaderboards() {
  const [data, setData] = useState<{ available: boolean; tables: Table[]; message?: string } | null>(null);
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [active, setActive] = useState("");
  const [view, setView] = useState<(typeof VIEWS)[number]>("Matches");
  const [allMatches, setAllMatches] = useState(false);
  const [stat, setStat] = useState<"goals" | "penalties">("goals");
  const nextDay = useRef<HTMLElement | null>(null);

  useEffect(() => {
    fetch("/api/football/real-madrid/standings")
      .then((r) => r.json())
      .then((x) => {
        setData(x);
        setActive(x.tables?.[0]?.code || "");
      })
      .catch(() => setData({ available: false, tables: [], message: "Competition tables are unavailable." }));
  }, []);

  useEffect(() => {
    if (!active || details[active]) return;
    fetch(`/api/football/competitions/${active}`)
      .then((r) => r.json())
      .then((x: Detail) => setDetails((d) => ({ ...d, [active]: x })))
      .catch(() => setDetails((d) => ({ ...d, [active]: { available: false } })));
  }, [active, details]);

  // The provider allows ten calls a minute, so a league opened in a burst can come back empty.
  // Forget that answer after a pause and the effect above asks again.
  useEffect(() => {
    if (!active || details[active]?.available !== false) return;
    const retry = setTimeout(() => setDetails(({ [active]: _dropped, ...rest }) => rest), 20000);
    return () => clearTimeout(retry);
  }, [active, details]);

  const comp = data?.tables.find((t) => t.code === active);
  const detail = details[active];
  const matches = detail?.matches;

  const { upcoming, days, nextKey, form } = useMemo(() => {
    const sorted = [...(matches ?? [])].sort((a, b) => a.utcDate.localeCompare(b.utcDate));
    const pending = sorted.filter((m) => m.status !== "FINISHED" && !OFF.includes(m.status));
    const days = new Map<string, Match[]>();
    const form = new Map<number, Result[]>();
    const push = (id: number | null, r: Result) => id != null && form.set(id, [...(form.get(id) ?? []), r].slice(-5));
    for (const m of sorted) {
      const key = new Date(m.utcDate).toLocaleDateString("en-CA");
      days.set(key, [...(days.get(key) ?? []), m]);
      if (m.status === "FINISHED" && m.homeScore != null && m.awayScore != null) {
        const diff = m.homeScore - m.awayScore;
        push(m.home.id, diff > 0 ? "W" : diff < 0 ? "L" : "D");
        push(m.away.id, diff < 0 ? "W" : diff > 0 ? "L" : "D");
      }
    }
    const nextKey = pending[0] ? new Date(pending[0].utcDate).toLocaleDateString("en-CA") : [...days.keys()].pop();
    // Season over: the overview falls back to the last results.
    return { upcoming: pending.length ? pending.slice(0, 6) : sorted.slice(-6), days: [...days], nextKey, form };
  }, [matches]);

  // The full schedule opens on the next match day, with the results above it.
  useEffect(() => {
    if (allMatches && view === "Matches") nextDay.current?.scrollIntoView({ block: "start" });
  }, [allMatches, view, active]);

  const pick = (code: string) => {
    setActive(code);
    setAllMatches(false);
  };

  const rows = comp?.table ?? null;
  const madridRow = rows?.find((r) => r.teamId === MADRID);
  const brief = rows ? [...rows.slice(0, 6), ...(madridRow && rows.indexOf(madridRow) > 5 ? [madridRow] : [])] : null;
  const scorers = detail?.scorers ?? null;
  const ranked = scorers ? [...scorers].filter((s) => s[stat] > 0).sort((a, b) => b[stat] - a[stat]) : null;
  const zones = ZONES[active];
  const loadingDetail = <p className={styles.note}>{!detail ? "Loading…" : detail.available ? "The live provider has not published this yet." : "The live provider is busy. Trying again shortly…"}</p>;

  return (
    <main className={styles.page} aria-label="ANSAR OS Leaderboards">
      <ClubNavigation activeLabel="Leaderboards" />
      <section className={styles.content}>
        <header className={styles.header}>
          <p>{madridRow ? "REAL MADRID · SEASON CENTRE" : "SEASON CENTRE"}</p>
          <div className={styles.title}>
            {comp?.emblem && (
              <span className={styles.emblem}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={comp.emblem} alt="" width={44} height={44} />
              </span>
            )}
            <div>
              <h1>{comp?.name || "Competition tables"}</h1>
              <span>{comp?.season ? `${comp.season} Season` : "Live competition data"}</span>
            </div>
          </div>
        </header>

        {!data ? (
          <p className={styles.loading}>Loading season data…</p>
        ) : !data.available ? (
          <p className={styles.loading}>{data.message}</p>
        ) : (
          <>
            <nav className={styles.tabs} aria-label="Competition">
              {data.tables.map((t) => (
                <button onClick={() => pick(t.code)} className={active === t.code ? styles.active : ""} aria-pressed={active === t.code} key={t.code}>
                  {t.name}
                </button>
              ))}
            </nav>
            <div className={styles.views} role="tablist" aria-label="Season view">
              {VIEWS.map((v) => (
                <button role="tab" aria-selected={view === v} onClick={() => { setView(v); setAllMatches(false); }} className={view === v ? styles.active : ""} key={v}>
                  {v}
                </button>
              ))}
            </div>

            {view === "Matches" && !allMatches && (
              <div className={styles.overview}>
                <section className={styles.panel} aria-label="Matches">
                  {upcoming.length ? (
                    <>
                      <div className={styles.fixtures}>{upcoming.map((m) => <MatchCard m={m} key={m.id} />)}</div>
                      <button className={styles.more} onClick={() => setAllMatches(true)}>See more matches</button>
                    </>
                  ) : (
                    loadingDetail
                  )}
                </section>
                <section className={styles.panel} aria-label="Standings">
                  <h2>Standings</h2>
                  {brief ? (
                    <>
                      <StandingsTable rows={brief} code={active} compact />
                      <button className={styles.more} onClick={() => setView("Standings")}>See full standings</button>
                    </>
                  ) : (
                    <p className={styles.note}>This competition has no published league table.</p>
                  )}
                </section>
              </div>
            )}

            {view === "Matches" && allMatches && (
              <div className={styles.schedule}>
                {days.map(([key, list]) => (
                  <section key={key} ref={key === nextKey ? nextDay : undefined} className={styles.day}>
                    <h2>{dayFmt.format(new Date(list[0].utcDate))}</h2>
                    <div className={`${styles.panel} ${styles.fixtures}`}>{list.map((m) => <MatchCard m={m} key={m.id} />)}</div>
                  </section>
                ))}
              </div>
            )}

            {view === "Standings" &&
              (rows ? (
                <div className={styles.standings}>
                  <section className={`${styles.panel} ${styles.scroll}`}>
                    <StandingsTable rows={rows} code={active} form={form} />
                  </section>
                  {zones && (
                    <aside className={styles.panel}>
                      <h2>Qualification Key</h2>
                      {zones.map((z) => <p className={`${styles.key} ${styles[z.tone]}`} key={z.label}>{z.label}</p>)}
                    </aside>
                  )}
                </div>
              ) : (
                <section className={styles.panel}><p className={styles.note}>This competition has no published league table.</p></section>
              ))}

            {view === "Stats" && (
              <section className={`${styles.panel} ${styles.stats}`}>
                <div className={styles.statTabs} role="tablist" aria-label="Statistic">
                  {(["goals", "penalties"] as const).map((s) => (
                    <button role="tab" aria-selected={stat === s} onClick={() => setStat(s)} className={stat === s ? styles.active : ""} key={s}>
                      {s === "goals" ? "Goals" : "Penalties"}
                    </button>
                  ))}
                </div>
                {ranked?.length ? (
                  <table className={`${styles.table} ${styles.players}`}>
                    <thead>
                      <tr>
                        <th scope="col">Player</th>
                        <th scope="col">{stat === "goals" ? "Goals" : "Penalties"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranked.map((s) => (
                        <tr key={`${s.player}-${s.team}`}>
                          <th scope="row">
                            <span className={styles.team}>
                              <Crest src={s.crest} size={30} />
                              <span>
                                {s.player}
                                <small>{s.team}</small>
                              </span>
                            </span>
                          </th>
                          <td className={styles.pts}>{s[stat]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : ranked ? (
                  <p className={styles.note}>No {stat} recorded yet this season.</p>
                ) : (
                  loadingDetail
                )}
                <p className={styles.note}>Assists and cards are not published by the live provider, so they are not shown.</p>
              </section>
            )}

            {view === "Matches" && <p className={styles.zone}>All times are in {zoneName || "your local time"}</p>}
          </>
        )}
      </section>
    </main>
  );
}
