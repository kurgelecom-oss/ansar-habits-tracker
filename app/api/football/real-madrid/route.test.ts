import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const originalToken = process.env.FOOTBALL_DATA_API_TOKEN;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalToken === undefined) delete process.env.FOOTBALL_DATA_API_TOKEN;
  else process.env.FOOTBALL_DATA_API_TOKEN = originalToken;
});

describe("GET /api/football/real-madrid", () => {
  it("returns an explicit non-cacheable unavailable state when the server token is missing", async () => {
    delete process.env.FOOTBALL_DATA_API_TOKEN;
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ available: false, reason: "not_configured" });
  });

  it("caches a scheduled real fixture for an hour without exposing the token", async () => {
    process.env.FOOTBALL_DATA_API_TOKEN = "server-secret";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ matches: [{
      id: 901,
      utcDate: "2099-09-02T19:00:00Z",
      status: "TIMED",
      competition: { id: 2014, name: "Primera Division", code: "PD" },
      homeTeam: { id: 86, name: "Real Madrid CF", shortName: "Real Madrid", crest: "https://crests.football-data.org/86.png" },
      awayTeam: { id: 81, name: "FC Barcelona", shortName: "Barcelona", crest: "https://crests.football-data.org/81.png" },
      score: { fullTime: { home: null, away: null } },
    }] }), { status: 200 })));

    const response = await GET();
    const body = await response.json();
    expect(response.headers.get("cache-control")).toContain("s-maxage=3600");
    expect(body).toMatchObject({ available: true, phase: "SCHEDULED", matchId: 901 });
    expect(JSON.stringify(body)).not.toContain("server-secret");
  });
});
