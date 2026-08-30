import { describe, expect, it, vi } from "vitest";
import { createFootballDataProvider } from "./football-data";

const scheduled = {
  id: 901,
  utcDate: "2026-09-02T19:00:00Z",
  status: "TIMED",
  competition: { id: 2014, name: "Primera Division", code: "PD" },
  homeTeam: { id: 86, name: "Real Madrid CF", shortName: "Real Madrid", crest: "https://crests.football-data.org/86.png" },
  awayTeam: { id: 81, name: "FC Barcelona", shortName: "Barcelona", crest: "https://crests.football-data.org/81.png" },
  score: { fullTime: { home: null, away: null } },
};

describe("football-data.org provider", () => {
  it("fetches Real Madrid's current-season matches with a server-only token", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ matches: [scheduled] }), { status: 200 }));
    const provider = createFootballDataProvider({
      token: "server-secret",
      fetchImpl,
      now: () => new Date("2026-08-30T04:00:00Z"),
    });

    const result = await provider.getTeamMatchCentre(86);
    expect(result).toMatchObject({ available: true, matchId: 901, phase: "SCHEDULED" });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.football-data.org/v4/teams/86/matches?limit=100",
      expect.objectContaining({
        headers: { "X-Auth-Token": "server-secret" },
        cache: "no-store",
      }),
    );
  });

  it("returns a deliberate unavailable result without calling upstream when no token exists", async () => {
    const fetchImpl = vi.fn();
    const result = await createFootballDataProvider({ token: "", fetchImpl })
      .getTeamMatchCentre(86);
    expect(result).toEqual({
      available: false,
      reason: "not_configured",
      message: "Real Madrid season data is not configured yet",
      updatedAt: null,
      stale: false,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("contains upstream failures without leaking provider responses or credentials", async () => {
    const fetchImpl = vi.fn(async () => new Response("token invalid: server-secret", { status: 429 }));
    const result = await createFootballDataProvider({ token: "server-secret", fetchImpl })
      .getTeamMatchCentre(86);
    expect(result).toMatchObject({
      available: false,
      reason: "upstream_unavailable",
      message: "Real Madrid season data is temporarily unavailable",
    });
    expect(JSON.stringify(result)).not.toContain("server-secret");
  });
});
