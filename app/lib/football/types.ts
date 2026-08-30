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
}
