import { describe, expect, it } from "vitest";
import { isRestDay, saturdayPs5, saturdayStreak, weekendUnlocked, WEEKEND_UNLOCK_MIN_SCHOOL_DAYS } from "./weekend";

describe("weekend rules", () => {
  it("needs school finished on 4 of the 5 weekdays", () => {
    expect(WEEKEND_UNLOCK_MIN_SCHOOL_DAYS).toBe(4);
  });

  it("rule 1: the week decides IF", () => {
    expect(weekendUnlocked(3)).toBe(false);
    expect(weekendUnlocked(4)).toBe(true);
    expect(weekendUnlocked(5)).toBe(true);
  });

  it("rule 2: Saturday decides WHEN — Push cannot rescue a bad week", () => {
    const bad = saturdayPs5(3, 3, 3);
    expect(bad.weekUnlocked).toBe(false);
    expect(bad.pushComplete).toBe(true);
    expect(bad.ready).toBe(false);
    expect(bad.message).toBe("No PS5 this weekend — school was finished on fewer than 4 days. Push still on.");
  });

  it("a good week still waits for the Push", () => {
    const waiting = saturdayPs5(4, 1, 3);
    expect(waiting.ready).toBe(false);
    expect(waiting.message).toBe("PS5 waits — Push 1/3 verified");
    expect(saturdayPs5(4, 3, 3).ready).toBe(true);
  });

  it("an empty Push block is never complete", () => {
    const none = saturdayPs5(4, 0, 0);
    expect(none.pushComplete).toBe(false);
    expect(none.ready).toBe(false);
  });

  it("rule 3: Sunday is the rest day", () => {
    expect(isRestDay("Sunday")).toBe(true);
    expect(isRestDay("Saturday")).toBe(false);
  });
});

describe("saturdayStreak", () => {
  const sats = new Set(["2026-08-22", "2026-08-29", "2026-09-05"]);
  it("counts consecutive Saturdays ending today", () => {
    expect(saturdayStreak(sats, "2026-09-05")).toBe(3);
  });
  it("does not break on an in-progress Saturday", () => {
    expect(saturdayStreak(new Set(["2026-08-22", "2026-08-29"]), "2026-09-05")).toBe(2);
  });
  it("breaks on a missed Saturday", () => {
    expect(saturdayStreak(new Set(["2026-08-22", "2026-09-05"]), "2026-09-05")).toBe(1);
  });
  it("reads from a weekday against the last Saturday", () => {
    expect(saturdayStreak(sats, "2026-09-09")).toBe(3);
    expect(saturdayStreak(new Set(["2026-08-29"]), "2026-09-09")).toBe(0);
  });
});
