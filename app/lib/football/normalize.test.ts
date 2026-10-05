import { describe, expect, it } from "vitest";
import { normalizeMatch, selectRealMadridMatch, selectTopMatch } from "./normalize";

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

describe("selectTopMatch", () => {
  // Table positions by team id: 1 and 2 are the top two, 9 and 10 mid-table.
  const table = new Map([[1, 1], [2, 2], [9, 9], [10, 10]]);
  const game = (id: number, home: number, away: number, extra: Record<string, unknown> = {}) => match({
    id, matchday: 8, homeTeam: { id: home, name: `Team ${home}` }, awayTeam: { id: away, name: `Team ${away}` }, ...extra,
  });

  it("picks the next round's fixture between the highest-placed clubs, not the first kick-off", () => {
    const selected = selectTopMatch([
      game(1, 9, 10, { utcDate: "2026-08-31T12:00:00Z" }),
      game(2, 1, 2, { utcDate: "2026-08-31T19:00:00Z" }),
      game(3, 1, 9, { utcDate: "2026-09-07T19:00:00Z", matchday: 9 }),
    ], table, NOW);
    expect(selected?.id).toBe(2);
  });

  it("puts a live match ahead of a result, and a result within 24 hours ahead of the next round", () => {
    const result = game(1, 9, 10, { status: "FINISHED", utcDate: "2026-08-30T01:00:00Z" });
    const next = game(2, 1, 2);
    expect(selectTopMatch([result, next], table, NOW)?.id).toBe(1);
    expect(selectTopMatch([result, next, game(3, 9, 2, { status: "IN_PLAY" })], table, NOW)?.id).toBe(3);
    expect(selectTopMatch([game(4, 9, 10, { status: "FINISHED", utcDate: "2026-08-28T01:00:00Z" }), next], table, NOW)?.id).toBe(2);
  });
});
