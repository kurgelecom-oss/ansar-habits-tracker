import { normalizeMatch, selectRealMadridMatch } from "./normalize";
import type {
  FootballDataMatch, FootballProvider, MatchCentreData,
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
  };
}
