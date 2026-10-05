"use client";

import { useEffect, useState } from "react";
import MatchCentre from "./MatchCentre";
import { MATCH_BAR_LEAGUES, type MatchBarLeague, type MatchCentreData } from "../../lib/football/types";
import styles from "./dashboard.module.css";

/**
 * The match bar with a league switch (tk, 5 Oct 2026): one bar, four pills,
 * one league at a time.
 *
 * Until a pill is tapped the bar shows exactly what it always has, Real
 * Madrid's current match, and the pill for that match's competition is lit.
 * Tapping another league fetches that league's match and draws it in the same
 * plate. The bar itself is MatchCentre, untouched.
 */

const waiting = (message: string): MatchCentreData => ({
  available: false, reason: "upstream_unavailable", message, updatedAt: null, stale: false,
});

export default function MatchBoard({ data }: { data: MatchCentreData }) {
  const [picked, setPicked] = useState<MatchBarLeague | null>(null);
  const [byLeague, setByLeague] = useState<Partial<Record<MatchBarLeague, MatchCentreData>>>({});

  const madridCode = data.available ? data.competitionCode : undefined;
  // Madrid's own league needs no second fetch: the page already polls that match.
  const showMadrid = picked === null || picked === madridCode;
  const active = showMadrid ? madridCode : picked;

  useEffect(() => {
    if (picked === null || picked === madridCode) return;
    let stale = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const load = () => fetch(`/api/football/match-bar/${picked}`)
      .then(res => res.json() as Promise<MatchCentreData>)
      .catch(() => waiting("Fixture unavailable right now"))
      .then(match => {
        if (stale) return;
        setByLeague(all => ({ ...all, [picked]: match }));
        // The provider allows ten calls a minute; a refusal clears by itself, so ask again.
        if (!match.available && match.reason === "upstream_unavailable") retry = setTimeout(load, 20000);
      });
    void load();
    return () => { stale = true; clearTimeout(retry); };
  }, [picked, madridCode]);

  return (
    <>
      <div className={styles.matchLeagues} role="group" aria-label="League shown on the match bar">
        {MATCH_BAR_LEAGUES.map(league => (
          <button
            type="button"
            key={league.code}
            className={`${styles.matchLeague} ${active === league.code ? styles.matchLeagueOn : ""}`}
            aria-pressed={active === league.code}
            onClick={() => setPicked(league.code)}
          >
            {league.label}
          </button>
        ))}
      </div>
      <MatchCentre data={showMadrid ? data : byLeague[picked] ?? waiting("Loading the fixture…")} />
    </>
  );
}
