import { describe, expect, it } from "vitest";
import { evidenceFromSnapshot } from "./quran-os";

describe("evidenceFromSnapshot", () => {
  it("keeps only Ansar's finished sessions, one per day", () => {
    const byDate = evidenceFromSnapshot({
      members: [
        { id: "taylan", sessions: [{ date: "2026-09-06", minutes: 40, finished: true, endedAt: "x" }] },
        { id: "ansar", sessions: [
          { date: "2026-09-06", minutes: 7, finished: true, endedAt: "2026-09-06T08:46:33.127Z" },
          { date: "2026-09-06", minutes: 3, finished: true, endedAt: "2026-09-06T09:00:00.000Z" },
          { date: "2026-09-05", minutes: 2, finished: false, endedAt: null },
        ] },
      ],
    });
    expect(byDate).toEqual({ "2026-09-06": { minutes: 7, endedAt: "2026-09-06T08:46:33.127Z" } });
  });
  it("is empty when Ansar is absent or has no sessions", () => {
    expect(evidenceFromSnapshot({ members: [] })).toEqual({});
    expect(evidenceFromSnapshot({})).toEqual({});
  });
});
