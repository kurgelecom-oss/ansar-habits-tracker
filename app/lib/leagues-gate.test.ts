import { describe, expect, it } from "vitest";
import { leaguesLockFor } from "./leagues-gate";
import { BLOCK_PRE, BLOCK_SCHOOL, type GateContext, type GateHabit } from "./gating";

const habit = (id: string, block: string): GateHabit =>
  ({ id, name: id, block, order: 1, windowStart: null, windowEnd: null, dwellSeconds: null } as GateHabit);

const ctx = (serverDate: string, done: string[], over: Partial<GateContext> = {}): GateContext => ({
  habits: [habit("bed_dressed", BLOCK_PRE), habit("homeschool_session", BLOCK_SCHOOL)],
  completions: done.map(habit_id => ({ habit_id, completed_at: `${serverDate}T02:00:00Z` })),
  serverDate, nowMinutes: 600, nowMs: 0, defaultDwellSeconds: 90, habitsLoaded: true,
  ...over,
});

const MONDAY = "2026-10-05", SATURDAY = "2026-10-10", SUNDAY = "2026-10-11";

describe("leagues after school", () => {
  it("is locked on a school day until the Homeschool session is done", () => {
    expect(leaguesLockFor(ctx(MONDAY, [])).locked).toBe(true);
    expect(leaguesLockFor(ctx(MONDAY, ["bed_dressed"])).locked).toBe(true);
  });

  it("opens once the Homeschool block is complete", () => {
    expect(leaguesLockFor(ctx(MONDAY, ["homeschool_session"]))).toEqual({ locked: false });
  });

  it("is open all weekend with nothing ticked", () => {
    expect(leaguesLockFor(ctx(SATURDAY, []))).toEqual({ locked: false });
    expect(leaguesLockFor(ctx(SUNDAY, []))).toEqual({ locked: false });
  });

  it("is open on a weekday that schedules no schoolwork", () => {
    expect(leaguesLockFor(ctx(MONDAY, [], { habits: [habit("bed_dressed", BLOCK_PRE)] }))).toEqual({ locked: false });
  });

  it("stays locked when the habit list could not be read", () => {
    expect(leaguesLockFor(ctx(MONDAY, [], { habits: [], habitsLoaded: false })).locked).toBe(true);
  });
});
