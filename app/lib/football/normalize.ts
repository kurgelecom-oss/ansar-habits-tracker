import type {
  FootballDataMatch, MatchCentreAvailable, MatchCentreData, MatchPhase, MatchTeam,
} from "./types";

const ACTIVE = new Set(["LIVE", "IN_PLAY", "PAUSED"]);
const UPCOMING = new Set(["SCHEDULED", "TIMED"]);
const FINISHED_WINDOW_MS = 24 * 60 * 60 * 1000;

export function selectRealMadridMatch(
  matches: FootballDataMatch[], nowMs = Date.now(),
): FootballDataMatch | null {
  const live = matches
    .filter(match => ACTIVE.has(match.status))
    .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate))[0];
  if (live) return live;

  const recent = matches
    .filter(match => match.status === "FINISHED")
    .filter(match => {
      const age = nowMs - Date.parse(match.utcDate);
      return age >= 0 && age <= FINISHED_WINDOW_MS;
    })
    .sort((a, b) => Date.parse(b.utcDate) - Date.parse(a.utcDate))[0];
  if (recent) return recent;

  return matches
    .filter(match => UPCOMING.has(match.status) && Date.parse(match.utcDate) >= nowMs)
    .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate))[0] ?? null;
}

/**
 * The one match a league without Real Madrid puts on the bar. Same order as
 * Madrid's own rule: live, then a result for 24 hours, then the next round.
 * Where several qualify, the top match wins: the fixture whose two clubs sit
 * highest in the table (lowest positions added together), earliest kick-off
 * breaking a tie. A club missing from the table counts as bottom.
 */
export function selectTopMatch(
  matches: FootballDataMatch[], positions: Map<number, number>, nowMs = Date.now(),
): FootballDataMatch | null {
  const rank = (match: FootballDataMatch) =>
    (positions.get(match.homeTeam.id) ?? 99) + (positions.get(match.awayTeam.id) ?? 99);
  const top = (pool: FootballDataMatch[]) => [...pool].sort(
    (a, b) => rank(a) - rank(b) || Date.parse(a.utcDate) - Date.parse(b.utcDate),
  )[0] ?? null;

  const live = matches.filter(match => ACTIVE.has(match.status));
  if (live.length) return top(live);

  const recent = matches.filter(match => {
    const age = nowMs - Date.parse(match.utcDate);
    return match.status === "FINISHED" && age >= 0 && age <= FINISHED_WINDOW_MS;
  });
  if (recent.length) return top(recent);

  const upcoming = matches
    .filter(match => UPCOMING.has(match.status) && Date.parse(match.utcDate) >= nowMs)
    .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate));
  if (!upcoming.length) return null;
  return top(upcoming.filter(match => match.matchday === upcoming[0].matchday));
}

/** How long the CDN may keep a bar: seconds while live, an hour while waiting. */
export function matchCacheControl(data: MatchCentreData): string {
  if (!data.available) return "no-store";
  if (data.phase === "LIVE") return "public, s-maxage=30, stale-while-revalidate=30";
  if (data.phase === "FINISHED") return "public, s-maxage=300, stale-while-revalidate=300";
  return "public, s-maxage=3600, stale-while-revalidate=3600";
}

function safeCrest(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "crests.football-data.org"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function phase(status: string): MatchPhase {
  if (ACTIVE.has(status)) return "LIVE";
  if (status === "FINISHED") return "FINISHED";
  return "SCHEDULED";
}

function team(
  raw: FootballDataMatch["homeTeam"], score: number | null,
): MatchTeam {
  return {
    id: raw.id,
    name: raw.shortName?.trim() || raw.name.trim(),
    crest: safeCrest(raw.crest),
    score,
  };
}

export function normalizeMatch(
  match: FootballDataMatch, updatedAt = new Date().toISOString(),
): MatchCentreAvailable {
  const matchPhase = phase(match.status);
  const score = matchPhase === "SCHEDULED"
    ? { home: null, away: null }
    : match.score.fullTime ?? match.score.regularTime ?? match.score.halfTime
      ?? { home: null, away: null };

  return {
    available: true,
    matchId: match.id,
    phase: matchPhase,
    competition: match.competition.name,
    competitionCode: match.competition.code,
    startTime: match.utcDate,
    home: team(match.homeTeam, score.home),
    away: team(match.awayTeam, score.away),
    updatedAt,
    stale: false,
  };
}
