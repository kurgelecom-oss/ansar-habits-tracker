export type MatchPhase = "LIVE" | "FINISHED" | "SCHEDULED";

export type MatchTeam = {
  id: number;
  name: string;
  crest: string | null;
  score: number | null;
};

export type MatchCentreAvailable = {
  available: true;
  matchId: number;
  phase: MatchPhase;
  competition: string;
  /** Provider code (PD, CL, PL, SA). Lets the bar's league switch mark the right pill. */
  competitionCode?: string;
  startTime: string;
  home: MatchTeam;
  away: MatchTeam;
  updatedAt: string;
  stale: boolean;
};

export type MatchCentreUnavailable = {
  available: false;
  reason: "not_configured" | "upstream_unavailable" | "no_match";
  message: string;
  updatedAt: string | null;
  stale: boolean;
};

export type MatchCentreData = MatchCentreAvailable | MatchCentreUnavailable;

export type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  matchday?: number | null;
  lastUpdated?: string;
  competition: { id: number; name: string; code?: string };
  homeTeam: { id: number; name: string; shortName?: string; crest?: string | null };
  awayTeam: { id: number; name: string; shortName?: string; crest?: string | null };
  score: {
    fullTime?: { home: number | null; away: number | null };
    regularTime?: { home: number | null; away: number | null };
    halfTime?: { home: number | null; away: number | null };
  };
};

export interface FootballProvider {
  getTeamMatchCentre(teamId: number): Promise<MatchCentreData>;
  getLeagueMatchCentre(code: MatchBarLeague, teamId: number): Promise<MatchCentreData>;
}

/**
 * The leagues the match bar can switch between, in pill order. `madrid` leagues
 * show Real Madrid's own match in that competition; the others show the round's
 * top match, because Madrid does not play in them.
 */
export const MATCH_BAR_LEAGUES = [
  { code: "PD", label: "La Liga", madrid: true },
  { code: "CL", label: "Champions League", madrid: true },
  { code: "PL", label: "Premier League", madrid: false },
  { code: "SA", label: "Serie A", madrid: false },
] as const;
export type MatchBarLeague = typeof MATCH_BAR_LEAGUES[number]["code"];
