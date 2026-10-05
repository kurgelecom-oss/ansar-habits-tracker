import { normalizeMatch, selectRealMadridMatch, selectTopMatch } from "./normalize";
import { MATCH_BAR_LEAGUES } from "./types";
import type {
  FootballDataMatch, FootballProvider, MatchBarLeague, MatchCentreData,
} from "./types";

type ProviderOptions = {
  token?: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

const unavailable = (
  reason: "not_configured" | "upstream_unavailable" | "no_match",
  message: string,
): MatchCentreData => ({
  available: false,
  reason,
  message,
  updatedAt: null,
  stale: false,
});

export function createFootballDataProvider({
  token = process.env.FOOTBALL_DATA_API_TOKEN ?? "",
  fetchImpl = fetch,
  now = () => new Date(),
}: ProviderOptions = {}): FootballProvider {
  return {
    async getTeamMatchCentre(teamId: number): Promise<MatchCentreData> {
      if (!token) {
        return unavailable("not_configured", "Real Madrid season data is not configured yet");
      }

      try {
        const response = await fetchImpl(
          `https://api.football-data.org/v4/teams/${teamId}/matches?limit=100`,
          {
            headers: { "X-Auth-Token": token },
            // The API route sets phase-aware CDN caching after it sees whether
            // the selected match is live, finished or scheduled.
            cache: "no-store",
          },
        );
        if (!response.ok) {
          return unavailable(
            "upstream_unavailable",
            "Real Madrid season data is temporarily unavailable",
          );
        }

        const payload = await response.json() as { matches?: FootballDataMatch[] };
        const selected = selectRealMadridMatch(payload.matches ?? [], now().getTime());
        if (!selected) {
          return unavailable("no_match", "No Real Madrid fixture is currently available");
        }
        return normalizeMatch(selected, now().toISOString());
      } catch {
        return unavailable(
          "upstream_unavailable",
          "Real Madrid season data is temporarily unavailable",
        );
      }
    },

    /**
     * One league's match for the bar's league switch. A league Real Madrid
     * plays in shows Madrid's match in that competition (one call); the others
     * show the round's top match, which needs the fixtures and the table (two).
     */
    async getLeagueMatchCentre(code: MatchBarLeague, teamId: number): Promise<MatchCentreData> {
      if (!token) return unavailable("not_configured", "Fixture data is not configured yet");

      const get = async (path: string) => {
        const response = await fetchImpl(`https://api.football-data.org/v4/${path}`, {
          headers: { "X-Auth-Token": token }, cache: "no-store",
        });
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      };

      try {
        let selected: FootballDataMatch | null;
        if (MATCH_BAR_LEAGUES.find(league => league.code === code)?.madrid) {
          const payload = await get(`teams/${teamId}/matches?limit=100`) as { matches?: FootballDataMatch[] };
          selected = selectRealMadridMatch(
            (payload.matches ?? []).filter(match => match.competition.code === code), now().getTime(),
          );
        } else {
          const [fixtures, table] = await Promise.all([
            get(`competitions/${code}/matches`) as Promise<{ matches?: FootballDataMatch[] }>,
            get(`competitions/${code}/standings`) as Promise<{
              standings?: { type: string; table: { position: number; team: { id: number } }[] }[];
            }>,
          ]);
          const rows = table.standings?.find(standing => standing.type === "TOTAL")?.table ?? [];
          selected = selectTopMatch(
            fixtures.matches ?? [], new Map(rows.map(row => [row.team.id, row.position])), now().getTime(),
          );
        }
        if (!selected) return unavailable("no_match", "No fixture is currently available in this league");
        return normalizeMatch(selected, now().toISOString());
      } catch {
        return unavailable("upstream_unavailable", "Fixture data is temporarily unavailable");
      }
    },
  };
}
