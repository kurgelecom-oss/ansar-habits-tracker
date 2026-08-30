import { describe, expect, it } from "vitest";
import { normalizeMatch, selectRealMadridMatch } from "./normalize";

const NOW = Date.parse("2026-08-30T04:00:00Z");

function match(overrides: Record<string, unknown> = {}) {
  return {
    id: 100,
    utcDate: "2026-08-31T19:00:00Z",
    status: "TIMED",
    lastUpdated: "2026-08-29T10:00:00Z",
    competition: { id: 2014, name: "Primera Division", code: "PD" },
    homeTeam: { id: 86, name: "Real Madrid CF", shortName: "Real Madrid", crest: "https://crests.football-data.org/86.png" },
    awayTeam: { id: 92, name: "Real Sociedad de Fútbol", shortName: "Real Sociedad", crest: "https://crests.football-data.org/92.png" },
    score: { fullTime: { home: null, away: null }, halfTime: { home: null, away: null } },
    ...overrides,
  };
}

describe("selectRealMadridMatch", () => {
  it("prefers an active match over a recent result and the next fixture", () => {
    const selected = selectRealMadridMatch([
      match({ id: 1, status: "FINISHED", utcDate: "2026-08-30T01:00:00Z" }),
      match({ id: 2, status: "IN_PLAY", utcDate: "2026-08-30T03:00:00Z" }),
      match({ id: 3, status: "TIMED", utcDate: "2026-09-03T19:00:00Z" }),
    ], NOW);
    expect(selected?.id).toBe(2);
  });

  it("shows a finished result for 24 hours before advancing to the next fixture", () => {
    expect(selectRealMadridMatch([
      match({ id: 4, status: "FINISHED", utcDate: "2026-08-29T05:00:01Z" }),
      match({ id: 5, status: "TIMED", utcDate: "2026-09-03T19:00:00Z" }),
    ], NOW)?.id).toBe(4);

    expect(selectRealMadridMatch([
      match({ id: 6, status: "FINISHED", utcDate: "2026-08-29T03:59:59Z" }),
      match({ id: 7, status: "SCHEDULED", utcDate: "2026-09-02T19:00:00Z" }),
    ], NOW)?.id).toBe(7);
  });
});

describe("normalizeMatch", () => {
  it("normalizes a real finished match without inventing names, crests or scores", () => {
    const normalized = normalizeMatch(match({
      status: "FINISHED",
      score: { fullTime: { home: 3, away: 1 }, halfTime: { home: 1, away: 0 } },
    }), "2026-08-30T04:00:00.000Z");

    expect(normalized).toMatchObject({
      available: true,
      phase: "FINISHED",
      competition: "Primera Division",
      home: { id: 86, name: "Real Madrid", crest: "https://crests.football-data.org/86.png", score: 3 },
      away: { id: 92, name: "Real Sociedad", crest: "https://crests.football-data.org/92.png", score: 1 },
      updatedAt: "2026-08-30T04:00:00.000Z",
      stale: false,
    });
  });

  it("keeps scheduled scores null and rejects non-provider crest hosts", () => {
    const normalized = normalizeMatch(match({
      homeTeam: { id: 86, name: "Real Madrid CF", shortName: "Real Madrid", crest: "https://example.com/fake.png" },
    }), "2026-08-30T04:00:00.000Z");
    expect(normalized.home.score).toBeNull();
    expect(normalized.away.score).toBeNull();
    expect(normalized.home.crest).toBeNull();
  });
});
