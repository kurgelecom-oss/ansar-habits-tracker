import type {
  FootballDataMatch, MatchCentreAvailable, MatchPhase, MatchTeam,
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
    startTime: match.utcDate,
    home: team(match.homeTeam, score.home),
    away: team(match.awayTeam, score.away),
    updatedAt,
    stale: false,
  };
}
